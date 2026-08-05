# TEAM-BRIEF — Sprint 2.5: Fix the bugs Sprint 2's tests found

Scratch file. Deleted at the end of the sprint.

## Goal

Sprint 2 built the test suite under a deliberate rule: **tests pin current behavior, they don't
fix it.** Five real defects were found, pinned by passing tests that assert the *wrong* behavior,
and deferred. This sprint fixes all five.

This is **not** all of Sprint 3. Sprint 3's other items (cold-start handling, keep-alive, honeypot,
rate limiting, real API error surfacing, `<form>` element) are explicitly **out of scope**. Fix the
five bugs, nothing else.

## The one rule that governs this whole sprint

**Every fix turns a test red. That is the point. Update the test in the same commit as the fix.**

Each defect below is currently held in place by a test asserting the broken behavior. When you fix
the code, that test *must* fail — if it doesn't, your fix didn't do anything, and that is a finding
worth reporting. Rewrite the test to assert the new, correct behavior in the same commit. Never
delete a test to make a fix pass, and never weaken one to "not care" about the case it was pinning.

Corollary: run the relevant test **before** your fix and confirm it passes, then after your fix and
confirm it fails for the reason you expect. Report both. A fix whose test never went red is
unverified.

## Test quality bar — unchanged from Sprint 2

- Failure messages must be diagnostic — `t.Errorf("Load() with ALLOWED_ORIGINS=%q returned err=%v, want error mentioning ALLOWED_ORIGINS", raw, err)`, never a bare `t.Fail()`.
- Table-driven (Go) and `it.each`-style (Vitest) so a new case is one line.
- Test the boundaries and the error paths, not just the happy path.
- No test that restates the implementation.

## Ownership — strict file boundaries

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **backend** | `backend/**` | `frontend/**`, `.github/**`, `README.md`, `render.yaml` |
| **frontend** | `frontend/**` | `backend/**`, `.github/**`, `README.md` |

Report cross-boundary findings instead of fixing them. There is no interface contract to
coordinate this sprint — the two halves do not touch each other's behavior.

---

## BACKEND tasks — 2 bugs, both in `pkg/config/config.go`

### B1 — A malformed `ALLOWED_ORIGINS` silently downgrades production to dev-permissive CORS

**This is the highest-severity item in the sprint** and the only one with real production blast
radius. Fix it first and commit it separately from B2.

Current behavior (`config.go:41-52`): `parseOrigins` returns an empty slice for a value like
`" , , "` — exactly what a broken deploy-time template substitution produces. `Load()` then cannot
distinguish that from *unset*, so `usingDefaults` becomes true and it falls back to the default
origin list **and flips `AllowAnyLocalhost` to `true`**. A misconfigured production deploy silently
gets permissive localhost CORS instead of failing loudly.

**Required fix — use `os.LookupEnv` to distinguish unset from set-but-useless:**

- `ALLOWED_ORIGINS` **unset** (`ok == false`) → defaults + `AllowAnyLocalhost = true`. Unchanged;
  this is the local-dev path and it is correct.
- `ALLOWED_ORIGINS` **set to anything that parses to zero origins** → return an error naming
  `ALLOWED_ORIGINS`. This includes `" , , "`, `","`, `"   "`, **and the empty string `""`**.

**On `""` specifically — a deliberate decision, do not relitigate.** The recorded plan said "treat
non-empty-but-unparseable as an error," which would let `""` through to the defaults. Treat `""` as
an error too. Reasoning: in production the variable is always set; in local dev it is never set. An
explicitly-set-but-empty value is never intentional, and empty string is *the* most likely output of
a broken template substitution — the exact failure this fix exists to catch. Letting it fall through
to dev-permissive CORS would leave the main hole open.

**No deployment risk:** `render.yaml` sets `ALLOWED_ORIGINS` to the literal
`https://alcash55.github.io`, not a template, so the live API cannot be affected by this change.
Do not edit `render.yaml` — it is outside your boundary and needs no change.

`parseOrigins` itself keeps its current behavior and its doc comment stays accurate; the decision
about what empty means belongs in `Load()`, which is where the caller context is.

**Tests that will go red** — in `pkg/config/config_test.go`, the case pinning `" , , "` → defaults
+ `AllowAnyLocalhost == true`. Rewrite it to assert the error. Add cases for `""`, `","`, and
`"   "`. Keep a case proving genuinely-unset still yields defaults + `AllowAnyLocalhost == true` —
that path must not regress, and it is the one people actually depend on locally.

### B2 — `Load()` returns inconsistent state on error

Current behavior: a missing/invalid `PORT` returns a zero `Config{}` (`config.go:38`), but a missing
`WEBHOOK_URL` returns a **populated** `Config` alongside its error (`config.go:59`). Not
live-exploitable — `main.go` checks `err` and calls `log.Fatalf` — but it is a trap for any future
caller that reads the config on a non-nil error.

**Required fix:** every error path returns `Config{}`. Make the new B1 error path do the same.

**Tests that will go red** — the `config_test.go` case pinning the populated-cfg-on-
`WEBHOOK_URL`-error behavior. Rewrite it to assert a zero `Config{}`.

Verify with `go vet ./...`, `go test ./... -v`, and `go build ./...`. **Note `-race` cannot run in
this environment** — there is no `gcc`, so cgo can't build and `go test -race` fails with
`cgo: C compiler "gcc" not found`. That is expected; use plain `go test`. CI runs `-race` on
`ubuntu-latest` where it works.

---

## FRONTEND tasks — 3 bugs, in `ConnectForm.tsx` and `useConnectForm.ts`

### F1 — `validateEmail()` ignores its caller's argument and reads hook state

`useConnectForm.ts:42` — `validateEmail` takes no parameter and closes over the hook's own `email`
state, while `validateForm(name, email, message)` is shaped as if it validates its arguments. Any
caller passing an `email` that hasn't also been pushed through `setEmail` gets the format check run
against a stale or empty value.

**Required fix:** give `validateEmail` an `email: string` parameter and thread `validateForm`'s own
argument through to it. Do not fix this by syncing state harder. Note the JSDoc already documents a
`@param {string} - email` that doesn't exist — it describes the intended signature, so the doc
becomes correct once you make the change.

**Test that will go red:** the `BUG:`-prefixed test in `useConnectForm.test.ts` documenting the
trap. Rewrite it to assert the fixed behavior — that `validateForm` is now a pure function of its
arguments, i.e. passing a valid email as an argument validates *that* email even when hook state
holds something different. Keep it as a real test, not a deleted one; it is the regression guard.

### F2 — Uncontrolled inputs; the form never clears after a successful submit

`ConnectForm.tsx:51-76` — all three `TextField`s have `onChange` but no `value`, so React state and
the DOM can drift and nothing resets the fields after a successful send.

**Required fix:** bind `value={name}` / `value={email}` / `value={message}`, and clear all three on
a **successful** submit only. On failure the user's text must survive — losing a typed message
because the API was cold is a worse bug than the one being fixed.

`handleClick` (`ConnectForm.tsx:19`) currently shadows the outer `message` state with its own
`const message = await sendMessage()`. Rename the local to something like `sent` while you are in
there — with `value={message}` bound, that shadowing becomes genuinely confusing.

**Test that will go red:** the single `it.skip()` in `ConnectForm.test.tsx` — "form fields do NOT
clear after a successful submit". **Un-skip it**, and it should pass once the fix lands; it was
written against the desired behavior. Add a companion test asserting the fields **retain** their
values after a *failed* submit.

### F3 — Validation errors render before the user has typed anything

`ConnectForm.tsx:15` — `formErrors = validateForm(...)` runs unconditionally on every render, so the
section loads showing a red "Please Fill out all required sections (name)*" on an untouched form.

**Required fix:** track touched/dirty state and suppress the error banner until the user has
actually interacted. Send must still be disabled on mount — the button's disabled state derives from
validity, which is independent of whether the message is *shown*. Do not make an invalid form
submittable in the process.

**Scope limit:** the recorded Sprint 3 plan also wants these errors moved onto the fields themselves
(`error` / `helperText`) instead of one banner. **That is out of scope here** — it is a UX
redesign, not a bug fix. Keep the banner, just don't show it prematurely. Leave the field-level
work for Sprint 3.

**Test that will go red:** the active test in `ConnectForm.test.tsx` asserting the error text *is*
visible on mount. Rewrite it to assert the opposite, and add one proving the error **does** appear
once the user types into a field and leaves it invalid — otherwise you have only tested that the
banner is permanently hidden, which would pass with the feature deleted.

Verify with `bun run test`, `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`, and
`bun run build`.

**Browser verification is required, not optional.** A passing jsdom suite is not proof the form
works. Drive the real UI and confirm: the contact section loads with no red error text, the Send
button is disabled, typing a valid name/email/message enables it, and a successful submit clears
the fields. Note that the Playwright MCP tools may not actually be available to you despite being
in your allowlist — if they aren't, use `playwright-core` directly via a script against
`bun run dev` rather than skipping the browser check. Say in your report which routes and states
you exercised and how.

---

## Reporting

End your report with:

1. Every command you ran, with actual output — full verbose test runs.
2. **For each bug: the test output BEFORE your fix (passing, pinning the bug) and AFTER (failing,
   proving the fix landed), then the final rewritten test passing.** This is the core evidence that
   the sprint did anything. A fix without this is unverified.
3. Anything you wanted to touch but couldn't because of the ownership boundary.
4. Anything out of scope you found, for a later sprint.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
