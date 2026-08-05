# TEAM-BRIEF — Sprint 3: Make the contact form actually reliable

Scratch file. Deleted at the end of the sprint.

## Goal

The contact form is the only interactive feature on the site, and it is the one a recruiter will
touch. Today it has three ways to look broken: the Render free plan sleeps after ~15 min so the
first submit takes ~50 s with **no feedback at all**; the endpoint is an open, unauthenticated
relay into a Discord channel whose webhook URL is permanently public; and every failure mode shows
the same generic message.

This sprint fixes all of that.

## What is already done — do not redo it

Sprint 2.5 already fixed: controlled inputs that clear on success (and survive failure),
the validation banner not showing until touched, and `validateForm` being pure in its arguments.
Do not re-litigate or "improve" those. There are 30 passing frontend tests and a full Go suite;
**they must all still pass.**

## Test quality bar — unchanged, and it applies to every task here

- Tests must reflect real usage and be designed to reveal flaws. No tests that restate the
  implementation.
- Table-driven (Go) / `it.each`-style (Vitest) so a new case is one line.
- **Failure messages must be diagnostic.** When one fails at 2am in CI the message alone should
  identify the problem.
- Test the boundaries and the error paths, not just the happy path.
- If you change existing behavior, update the test that pinned it **in the same commit** — never
  delete or weaken a test to make a change pass.

---

## Interface contract — the one thing you must get right

Three agents work in parallel. These are **fixed**. Do not invent alternatives.

### HTTP contract for `POST /api/v1/contact`

| Situation | Status | Body | Notes |
| --- | --- | --- | --- |
| success | `200` | `{"status":"ok"}` | unchanged |
| validation failure | `400` | `{"error":"<user-safe message>"}` | **must no longer leak raw gin binding text** |
| honeypot tripped | `200` | `{"status":"ok"}` | **silent drop** — see below |
| body > 64 KiB | `413` | `{"error":"message too large"}` | unchanged |
| rate limited | `429` | `{"error":"too many requests"}` | **must set `Retry-After: <seconds>`** |
| webhook unreachable / non-2xx | `502` | `{"error":"..."}` | unchanged |

### Honeypot field

- JSON field name is **`website`**. A string. Optional — absent and empty both mean "human".
- **Backend:** if `website` is non-empty, return `200 {"status":"ok"}` and **do not forward to
  Discord.** Return success on purpose: telling a bot it was caught teaches it to adapt. A silent
  drop looks identical to success from the outside.
- **Frontend:** render a real input named `website`, visually hidden but *submitted*. Hide it with
  CSS positioning, **not** `display:none`/`hidden` (some bots skip those), and set
  `tabIndex={-1}`, `autoComplete="off"`, and `aria-hidden="true"` so keyboard and screen-reader
  users never reach it. It must never be required and never block a real submit.

### Frontend error mapping is by STATUS CODE, not by error string

The `error` field is for logging and debugging only. **Do not** branch UI copy on its text — that
couples user-facing wording to backend internals and breaks the moment someone rewords a message.
Branch on the status code:

| What the user sees | Trigger |
| --- | --- |
| "Please check your details and try again." | `400` |
| "That message is too long." | `413` |
| "Too many messages — please wait a moment." | `429` |
| "Couldn't send right now — please try again later." | `502`, any other non-ok, or a network throw |
| "Still waking the server up… " → then the failure copy | request aborted by timeout |

Exact wording is yours; the *distinctions* are the contract.

`sendMessage` currently returns `boolean`. It will need to return richer information for this to
work. Changing its signature is expected and fine — **but its tests currently pin the boolean
return**, so update them in the same commit. Do not use `any`; model the result as a discriminated
union or a small typed object.

---

## BACKEND tasks

Owns `backend/**`. Must not touch `frontend/**`, `.github/**`, `README.md`, `render.yaml`.
Go 1.26.5, stdlib `testing` + `httptest`, **no new dependencies in `go.mod`** — a token bucket is
~20 lines and pulling in a library for it is not worth the supply-chain surface.

Note: `go test -race` **cannot run in this environment** (no `gcc`, cgo can't build). Use plain
`go test`. CI runs `-race` on `ubuntu-latest`, where it works.

### B1 — Rate limit `POST /api/v1/contact`

This is the sprint's highest-value item. The Discord webhook URL is **permanently public** (it was
inlined into a deployed bundle and is not being rotated — it points at a test channel). The rate
limiter is now the only thing standing between that known-public URL and a flooded channel.

- Per-IP in-memory token bucket. One instance on Render, so no shared store is needed.
- Suggested budget: **5 requests/minute per IP, burst 5.** A human sends one message. If you
  choose different numbers, justify them in your report.
- Must be **injectable/configurable** so tests can drive it deterministically — no `time.Sleep`-based
  tests. Inject a clock or make the window a parameter.
- **Evict stale buckets.** A map keyed by IP that only ever grows is a memory leak on a public
  endpoint; that is the bug you would be introducing while fixing another. Sweep or lazily expire.
- Concurrency: the limiter will be hit from multiple goroutines. Guard the map. CI runs `-race`
  and will catch you if you don't.
- Return `429` with `{"error":"too many requests"}` **and a `Retry-After` header** per the contract.

**`SetTrustedProxies` / client IP — read this carefully.** Render terminates TLS at its proxy, so
`c.ClientIP()` without configuration returns the *proxy's* IP and every visitor shares one bucket,
which would rate-limit the whole site as a single client. You must configure gin's trusted proxies
so `X-Forwarded-For` is honored. Be aware this is spoofable by design — anyone can set that header
— so the limiter deters casual flooding, not a determined attacker. **That tradeoff is accepted;
say so explicitly in your report rather than trying to solve it.** Do not degrade to a shared
global bucket to avoid spoofing: that would let one abuser lock out every real visitor.

Tests: at minimum — under the limit passes; over the limit gets `429` with `Retry-After`; the
bucket refills after the window; two different IPs get independent buckets; stale entries are
actually evicted.

### B2 — Honeypot rejection

Add `Website string \`json:"website"\`` to the payload struct with **no** `binding:"required"`.
If non-empty → `200 {"status":"ok"}` and no webhook call.

Tests: non-empty `website` returns 200 **and the fake webhook is never called** (make the test
server `t.Fatal` if it is — that is the assertion that actually matters); empty and absent
`website` both still send normally.

### B3 — Stop leaking raw validation errors on 400

`contact.go:63` returns `err.Error()` straight from gin's binding, so a client currently receives
text like `Key: 'message.Email' Error:Field validation for 'Email' failed on the 'email' tag`.
That is internal detail, it is not user-presentable, and the frontend is about to start showing
error text to users.

Return a stable, user-safe message instead. Keep the detail server-side if you want it for
debugging (log it), but it must not reach the client. Update the existing tests that assert on the
400 body.

### B4 — Confirm `/healthz` is cheap and always fast

Devops is about to ping it every ~10 minutes forever. Verify it does no real work, touches no
external service, and is not behind the rate limiter (a keep-alive pinging its own limiter into
`429` would be a self-inflicted outage). Add a test asserting `/healthz` is **not** rate limited.
If it already is fine, say so — this is a verification task, not necessarily a code change.

---

## FRONTEND-FORM tasks

Owns `frontend/src/components/ConnectForm/**`. Must not touch `AppShell.tsx` (another agent has
it), `backend/**`, `.github/**`, `README.md`.

### F1 — Handle the Render cold start

The single most visible problem: first submit after idle takes ~50 s and the UI does nothing.

- `AbortController` with a **60 s** timeout on the fetch (the cold start is ~50 s — a shorter
  timeout would abort requests that were about to succeed).
- Loading state on Send: disabled + a spinner while in flight, so it cannot be double-submitted.
- Copy that explains the wait. Don't show "waking the server…" instantly — it is alarming when the
  request returns in 200 ms. Show the normal spinner first and switch to the explanatory copy
  after a few seconds of waiting.
- On abort, show the timeout copy per the error-mapping contract.

### F2 — Surface real API errors

Implement the status-code mapping table above. `sendMessage` needs to return more than a boolean;
see the interface contract. Update the tests that pin the boolean return in the same commit.

### F3 — Honeypot input

Per the interface contract: an input named `website`, visually hidden but submitted, `tabIndex={-1}`,
`autoComplete="off"`, `aria-hidden="true"`. It must be in the POST body.
Test that a normal user flow submits it empty and still succeeds.

### F4 — Field-level validation errors

This is the half of the validation work Sprint 2.5 deliberately deferred. Move errors from the
single banner onto the fields themselves using MUI's `error` and `helperText` props, per-field and
per-touched-field. Keep the "don't show before the user interacts" behavior that already exists and
is tested — do not regress it.

### F5 — Wrap the inputs in a real `<form>`

Currently a `Stack` with a click handler, so Enter does not submit and the browser applies no
native form semantics. Use a `<form onSubmit={...}>` with the Send button as `type="submit"`, and
`preventDefault()`. Verify Enter-to-submit works **in a real browser**, not just in jsdom.

**Browser verification is required for this whole role.** A green jsdom suite is not proof the form
works. Heads up: the Playwright MCP tools are listed in your allowlist but are frequently **not**
actually available — check, and if they aren't, drive `playwright-core` directly against
`bun run dev` (http://localhost:3005/Portfolio/) rather than skipping it. Mock `/api/v1/contact` to
exercise 200, 400, 429, 502, and a hung request that triggers the timeout. Report which states you
exercised and how.

---

## FRONTEND-SHELL task

Owns `frontend/src/components/AppShell/**`. Must not touch `ConnectForm/**` (another agent has
it), `backend/**`, `.github/**`.

### S1 — Resizing across the 650px breakpoint wipes all app state

Found during Sprint 2.5's browser testing. `AppShellProvider` swaps the whole subtree between
`<Default children={children}/>`, `<Mobile children={children}/>`, and `<SideNav children={children}/>`
based on `useMediaQuery`. Because the wrapper **component type** changes, React unmounts and
remounts everything below it, discarding all state app-wide — even though `children` is the same
element reference. A real window resize or phone orientation change mid-typing throws away the
user's message.

Fix so that crossing the breakpoint **preserves state below the shell**. Render one stable wrapper
whose layout varies by props or CSS rather than swapping component types. If the three layouts are
genuinely too different to unify, the fallback is to keep the tree stable and vary only the chrome
— but try the direct fix first and say what you found.

Do not redesign the layouts. Visual output at each breakpoint should be unchanged; this is a
state-preservation fix, not a redesign.

**Verification is the whole job here** and jsdom cannot do it — `useMediaQuery` + real resize is a
browser behavior. Drive a real browser (same `playwright-core` fallback note as above): type into
the contact form at desktop width, resize below 650px, and assert the typed text **survives**.
Then confirm each layout still renders correctly at its own width. Include before/after evidence.
Add whatever unit test is meaningful, but the browser check is the one that counts.

---

## DEVOPS task

Owns `.github/**`. Read the other directories for context; do not edit them.

### D1 — Keep the Render API warm

The free plan spins down after ~15 min idle. A scheduled workflow pinging `/healthz` mostly removes
the cold start and is much cheaper than upgrading the plan.

- New workflow, `schedule` every ~10 minutes, plus `workflow_dispatch` so it can be run by hand.
- Ping `https://portfolio-api-0mta.onrender.com/healthz` and **fail the job on a non-2xx** — a
  keep-alive that silently 404s forever is worse than none, because it looks green.
- **It must be completely independent of the deploy gate.** It must never be able to make CI or a
  deploy red. Verify it is not referenced by `ci.yml` or `deploy.yml`.
- Keep it cheap: no `bun install`, no checkout if you don't need one. `curl --fail` is enough.

Things to state explicitly in your report, because they are real and easy to miss:
- GitHub's `schedule` trigger is **best-effort** and is frequently delayed under load, sometimes by
  10+ minutes. This mitigates the cold start; it does not eliminate it. Sprint 3's frontend work
  handles the case where it fires late anyway.
- GitHub **disables scheduled workflows in public repos after 60 days of no commit activity.** Note
  it so it isn't a mystery outage later.
- Confirm the cron frequency you chose is actually allowed and sane (GitHub's minimum interval is
  5 minutes).

Validate with a YAML parser and `actionlint` if available. State plainly that the workflow is
unverified against real GitHub Actions until pushed, and what you'd watch for on the first run.

---

## Reporting

End your report with:

1. Every command you ran to verify, with actual output — full verbose test runs.
2. For anything you changed that had an existing test, the before/after of that test.
3. Browser verification: which routes and states you exercised, and how (MCP or `playwright-core`).
4. Anything you wanted to touch but couldn't because of the ownership boundary.
5. Anything out of scope you found, for a later sprint.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
