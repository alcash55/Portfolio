# TEAM-BRIEF — Sprint 2: Tests and CI Gates

Scratch file. Deleted at the end of the sprint.

## Goal

The repo currently has **zero tests** in either half, and CI only deploys — nothing verifies
anything before it ships. This sprint builds the safety net.

**Why this is urgent, in one concrete example:** during Sprint 1, a context extraction introduced
a circular import that crashed the app at runtime with `Cannot access 'Default' before
initialization`. Lint, `tsc --noEmit`, and `bun run build` **all stayed green** while that bug was
live. It was caught only because someone loaded the page in a browser. Nothing in this repo would
have caught it automatically. That is the gap you are closing.

## Test quality bar — read this before writing a single test

This project's standing rule: **tests must be accurate, reflect real usage, and be designed to
reveal flaws. No useless tests.** Tests should be verbose enough to serve as debugging tools.

Concretely, for this sprint:

- **No tests that restate the implementation.** A test that asserts `parseOrigins("a,b")` returns
  `["a","b"]` by re-deriving the split is worthless. Test the *contract*: what callers depend on.
- **Prefer table-driven tests** (Go) and `it.each`-style cases (Vitest) so adding a case is one
  line and every case reports independently.
- **Failure messages must be diagnostic.** `t.Errorf("isLocalhost(%q) = %v, want %v", origin, got,
  want)` — never a bare `t.Fail()` or `expect(x).toBe(true)` with no context. When one of these
  fails at 2am in CI, the message alone should identify the problem.
- **Test the boundaries, not the happy path only.** The interesting cases are the off-by-ones
  (exactly 100 chars vs 101), the malformed inputs, and the error paths.
- **Do not change production code to make it easier to test** without saying so explicitly in your
  report. If something is untestable, that is a finding worth reporting, not a license to refactor.

## Decisions already made — do not relitigate

1. **Frontend test runner is Vitest** (+ React Testing Library + jsdom). It shares Vite's config
   and transform pipeline; Jest would need a parallel build setup.
2. **Backend uses the standard library** — `testing` + `net/http/httptest`. No testify, no mocks
   framework. The handler already takes an `*http.Client`, and `httptest.NewServer` covers the
   webhook. Do not add test dependencies to `go.mod`.
3. **CI structure is `ci.yml` as a reusable workflow.** `ci.yml` triggers on `pull_request` **and**
   `workflow_call`. `deploy.yml` keeps its `push: main` trigger, calls `ci.yml` as its first job,
   and its existing deploy job gains `needs: ci`. This gives one definition of "green" with no
   duplication, and avoids the `workflow_run` trigger's known pitfalls (it runs from the default
   branch and does not block the deploy it is meant to gate).
4. **Do not fix bugs the tests uncover.** If a test reveals a genuine defect, leave the production
   code alone, mark the test `t.Skip()` / `it.skip()` with a comment explaining the defect, and
   report it prominently. Sprint 3 covers contact-form hardening and will fix them. A cleanup
   sprint that silently changes behavior is how regressions get shipped.

## Ownership — strict file boundaries

Three agents work in parallel in separate worktrees. **Do not touch files outside your boundary.**
Report cross-boundary findings instead of fixing them.

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **backend** | `backend/**` | `frontend/**`, `.github/**`, `README.md` |
| **frontend** | `frontend/**` | `backend/**`, `.github/**`, `README.md` |
| **devops** | `.github/**` | `frontend/**`, `backend/**` (read them, don't edit) |

### Interface contract between roles — this is the one thing you must get right

The devops agent's CI workflow invokes commands the other two agents create. These names are
**fixed** — agree to them, do not invent alternatives:

| Role | Command devops will call | Working dir | Must exit non-zero on failure |
| --- | --- | --- | --- |
| frontend | `bun run test` | `frontend/` | yes |
| frontend | `bun run lint` | `frontend/` | yes (already exists) |
| frontend | `bunx tsc --noEmit` | `frontend/` | yes (already exists) |
| frontend | `bun run build` | `frontend/` | yes (already exists) |
| backend | `go test ./... -race` | `backend/` | yes |
| backend | `go vet ./...` | `backend/` | yes (already passes) |

**frontend:** `bun run test` must be a single non-watch run. Vitest defaults to watch mode when
it detects a TTY — use `vitest run`, not `vitest`, or CI will hang until it times out. Add a
separate `test:watch` for local use if you want one.

**devops:** you may assume those commands exist even if they don't yet in your worktree — the
other agents are creating them in parallel. Write the workflow against the contract above.

---

## BACKEND tasks

Go version is 1.26.5. Tests go in `_test.go` files beside the code they test.

### B1 — `pkg/config` tests for `Load()`

`Load()` reads process env, so use `t.Setenv` (it handles cleanup and forbids parallel tests,
which is correct here). Cover:

- missing `PORT` → error mentioning PORT
- non-numeric `PORT` (`"abc"`, `""`, `"8080x"`) → error
- missing `WEBHOOK_URL` → error mentioning WEBHOOK_URL
- `ALLOWED_ORIGINS` unset → origins equal the package defaults **and** `AllowAnyLocalhost == true`
- `ALLOWED_ORIGINS` set → exactly that list, `AllowAnyLocalhost == false`
- `ALLOWED_ORIGINS` with whitespace and empty entries (`" a , , b "`) → `["a","b"]`
- `ALLOWED_ORIGINS` set to only commas/whitespace (`" , , "`) → falls back to defaults, because
  `parseOrigins` returns empty and `usingDefaults` becomes true. **Verify this is what actually
  happens** — it is a subtle interaction worth pinning down before someone changes it.

Note the existing `Load()` returns a **populated** `cfg` alongside its error in the
`WEBHOOK_URL` case but a **zero** `Config{}` in the `PORT` case. Pin the current behavior in a
test and flag the inconsistency in your report — do not "fix" it.

### B2 — `internal/routes` tests for `isLocalhost()`

This function is the entire local-dev CORS boundary and is completely untested. Table-driven.

Must accept: `http://localhost:3005`, `http://localhost` (no port), `https://localhost:1234`,
`http://127.0.0.1:8080`, `http://[::1]:3000`.

Must reject: `http://evil.com`, `https://localhost.evil.com`, `http://notlocalhost`,
`file:///etc/passwd`, `ftp://localhost`, `""`, `"localhost:3000"` (no scheme → `url.Parse` gives
no scheme, so it must fail), and anything `url.Parse` errors on.

`https://localhost.evil.com` is the important one — it is the classic prefix/suffix-matching
bypass, and the current implementation uses `u.Hostname()` exact matching, so it should reject.
Prove it.

### B3 — `internal/handlers/contact` tests for `SendMessage`

Use `httptest.NewServer` as the fake Discord webhook and point `cfg.WebhookURL` at it. Use
`gin.SetMode(gin.TestMode)` and drive the handler through a router with `httptest.NewRecorder`.

- **valid payload → 200**, and assert on the body the fake webhook actually received:
  `allowed_mentions.parse` is an empty array (the `@everyone` guard — this is a security control,
  test it explicitly), `username` is `"Portfolio Bot"`, and the content contains the submitted
  name, email, and message.
- **validation → 400**, one case each: missing name, missing email, missing message, malformed
  email, name at 101 chars, email at 255 chars, message at 1501 chars. Also assert the
  **boundary passes**: 100 / 254 / 1500 chars each succeed. Note the 254-char email must still be
  a *valid* email to isolate the length rule from the format rule — construct it deliberately.
- **body > 64 KiB → 413.** Send a body over `maxBodyBytes` and assert the status is 413, not 400.
  This path goes through `errors.AsType[*http.MaxBytesError]`, which is easy to get wrong.
- **webhook unreachable → 502.** Start an `httptest` server, capture its URL, close it, then call.
- **webhook returns non-2xx → 502.** Have the fake webhook return 500, and separately 404.
- **error text does not leak.** When the webhook returns 500 with a body like
  `"internal discord error: token xyz"`, assert that string does **not** appear in the response
  the client receives. This is the whole point of the indirection.

### B4 — Route-level test through `routes.New(cfg)`

- `GET /healthz` → 200 with body `{"status":"ok"}`.
- `GET /` → 200. **Also assert it returns promptly** (Sprint 1 removed a 5-second sleep from this
  handler; a regression test that would have caught it is worth having).
- CORS: with `AllowedOrigins` set and `AllowAnyLocalhost` false, an `OPTIONS` preflight from a
  disallowed origin must not come back with an `Access-Control-Allow-Origin` for that origin.
  With `AllowAnyLocalhost` true, a random localhost port must be allowed.

Run with `-race`. Report the full `go test -v ./...` output.

---

## FRONTEND tasks

### F1 — Install and wire up Vitest

- Add dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`,
  `@testing-library/user-event`.
- Scripts: `"test": "vitest run"` (non-watch — see the interface contract) and optionally
  `"test:watch": "vitest"`.
- Configure `test: { environment: 'jsdom', globals: true, setupFiles: [...] }`. **Note
  `vite.config.ts` currently has no `test` key and importing Vitest's config type into a Vite
  config needs the `/// <reference types="vitest" />` triple-slash directive** or you will get a
  type error. A separate `vitest.config.ts` that imports and extends the Vite config is also
  acceptable — your call, but say which you chose and why.
- Setup file should import `@testing-library/jest-dom` matchers and register a `cleanup` afterEach.
- Confirm `bun run lint` still passes with test files present — the ESLint config may need test
  globals or an override for `*.test.ts(x)`. This is a real and likely snag; handle it.

### F2 — `useConnectForm` tests

Render the hook via a test component or `renderHook`. Cover:

- `validateForm` returns the specific message for each missing field, in the documented priority
  order (name → email → message → invalid email), and `''` when everything is valid.
- Email validation: assert against a **table** of real addresses. Valid:
  `a@b.co`, `first.last@sub.domain.org`, `user+tag@example.com`. Invalid: `not-an-email`,
  `@example.com`, `a@`, `a b@example.com`, `""`.
  Include `user@[192.168.1.1]` — the IP-literal form exercises the bracket that Sprint 1's
  `no-useless-escape` fix touched, so this is a genuine regression guard.
- `sendMessage` posts to `${VITE_API_URL}/api/v1/contact` with method POST, JSON content-type, and
  a body containing name/email/message. Stub `fetch` (`vi.stubGlobal`).
- `sendMessage` returns `false` and does **not** throw when `fetch` rejects. Assert it resolves to
  `false` rather than rejecting — the current implementation catches and logs, and callers depend
  on that.
- `sendMessage` returns `false` on a non-ok response (e.g. 400, 502).

### F3 — `ConnectForm` component tests

Use React Testing Library, query by accessible role/label (not test IDs).

- Send is disabled on mount and while the form is incomplete/invalid.
- Send becomes enabled once name, email, and message are all valid.
- Successful submit (stubbed `fetch` → ok) shows the success notification.
- Failed submit (stubbed `fetch` → not ok) shows the failure notification.

**You will likely find real bugs here.** Known issues already logged for Sprint 3: the inputs are
uncontrolled (no `value` prop, so the form never clears after submit) and validation errors render
before the user has typed anything. Per Decision 4, **do not fix these** — write the test against
current behavior, or `it.skip()` with an explanatory comment, and report them.

MUI note: `TextField` renders the label as a `<label>` bound to the input, so
`getByLabelText(/name/i)` works. Watch for the `required` asterisk in the accessible name.

---

## DEVOPS tasks

You own `.github/**` only. Read `frontend/package.json`, `backend/go.mod`, and the existing
workflows for context, but do not edit outside your boundary.

### D1 — New `.github/workflows/ci.yml`

Per Decision 3: triggers are `pull_request` and `workflow_call`.

- **frontend job**: checkout → `oven-sh/setup-bun@v2` → `bun install` → `bun run lint` →
  `bunx tsc --noEmit` → `bun run test` → `bun run build`, all in `frontend/`.
  Use `working-directory` rather than `cd` in run steps.
- **backend job**: checkout → `actions/setup-go@v5` (pin the Go version to match `go.mod`: 1.26)
  → `go vet ./...` → `go test ./... -race` → `go build ./...`, in `backend/`.
  Enable Go module caching.
- The two jobs run in parallel; neither depends on the other.
- Path filtering was in the original plan so a frontend-only PR skips the Go job. **Only do this
  if it stays simple.** With `workflow_call` in the mix, conditional jobs can end up "skipped"
  in a way that makes `needs:` behave unexpectedly for the deploy gate. The Go job takes seconds;
  correctness beats cleverness. If you skip path filtering, say so and why.

### D2 — Gate `deploy.yml` on CI

- Keep `on: push: branches: [main]` and `workflow_dispatch`.
- Add a first job that calls the reusable workflow: `uses: ./.github/workflows/ci.yml`.
- The existing deploy job gains `needs: <that job>`.
- **Preserve everything that currently works** — the `pages`/`id-token` permissions block, the
  concurrency group, `VITE_API_URL: ${{ vars.VITE_API_URL }}`, the `./frontend/dist` artifact
  path. Note that a called workflow needs its permissions declared appropriately; verify the
  deploy job still has `pages: write` and `id-token: write`.
- Do not let the reusable-workflow call break `workflow_dispatch`.

### D3 — Fix `check-resume.yml`

Currently `workflow_dispatch`-only and runs a full `bun install` purely to read a PDF. Either:
- give it a trigger that makes it useful (a `schedule`, or `push` filtered to
  `frontend/src/assets/AlexResume.pdf`), **and/or**
- drop the pointless `bun install` step if the `ats-check` action does not need it — check the
  action's own definition at `alcash55/ac-composite-actions/ats-check` before concluding.

Keep `workflow_dispatch` so it stays manually runnable. It depends on the `APILAYER_API_KEY`
secret, which may or may not be set — do not make the whole CI red if that action fails; this
workflow should stay independent of the deploy gate.

### D4 — Validate the YAML

You cannot run GitHub Actions locally, so at minimum:
- parse every workflow file with a YAML parser (`python3 -c "import yaml,sys; yaml.safe_load(...)"`)
  and confirm no syntax errors
- if `actionlint` is available (or installable without network hassle), run it and report output
- manually trace the job graph and state, in your report, exactly what runs on: a PR, a push to
  main, and a manual dispatch

Be explicit in your report that these workflows are **unverified against real GitHub Actions** —
they cannot be until pushed. Say what you would watch for on the first run.

---

## Reporting

End your report with:

1. Every command you ran to verify, with actual output — for tests, the full verbose run.
2. **Any real bug your tests uncovered** (per Decision 4: report, don't fix). Be specific about
   what breaks and under what input.
3. Anything you wanted to touch but couldn't because of the ownership boundary.
4. Anything out of scope you found, for a later sprint.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
