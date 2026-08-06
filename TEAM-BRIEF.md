# TEAM-BRIEF — Sprint 4.5: Follow-up bugs and stale-comment cleanup

Scratch file. Deleted at the end of the sprint.

> **Read this first, it is the whole theme of the sprint:** this file gets **deleted** when the
> sprint ends. That is exactly why the codebase currently contains **eight source comments saying
> "See TEAM-BRIEF.md"** — pointers into a file that does not exist. Do not add another one. When
> you need to explain *why*, write the reason in the comment itself.

## Goal

Two categories, both "things that are wrong in the repo right now":

1. **Comments that lie.** Several comments contradict the code they sit on, or point at a deleted
   file. A wrong comment is worse than no comment — it is confidently misleading, and it survives
   long after anyone remembers it was wrong.
2. **Seven real defects** carried over from Sprint 4, all pre-existing and all found by browser
   verification rather than by the test suite.

## Ground rules

- **All 50 frontend tests and the full Go suite must still pass**, plus `bun run lint`
  (`--max-warnings 0`), `bunx tsc --noEmit`, `bun run build`, `go vet ./...`, `gofmt -l .`.
- **No `any`.** Project standard.
- If you change behavior a test pins, update the test in the same commit. Never delete or weaken
  a test to make a change pass.
- `go test -race` **cannot run in this environment** (no `gcc`, cgo can't build). Use plain
  `go test`. CI runs `-race` on `ubuntu-latest`.
- **Browser verification required** for the frontend roles. The Playwright MCP tools are listed in
  your allowlist but are frequently **not** actually available — check, and if absent drive
  `playwright-core` against `bun run dev` (http://localhost:3005/Portfolio/) rather than skipping.
  Note: background dev servers in this sandbox get killed after ~2–4 minutes and Vite's watcher
  does not fire reliably on this `/mnt/c` mount — restart fresh immediately before each pass.

## Ownership — strict file boundaries

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **backend** | `backend/**` | all of `frontend/**` |
| **shell** | `frontend/src/components/AppShell/**`, `frontend/src/components/Pages/Landing/**` | `ConnectForm/**`, `Skills/**`, `Experience/**`, `Pages/index.ts` |
| **content** | `frontend/src/components/ConnectForm/**`, `frontend/src/components/Pages/{Skills,Experience}/**`, `frontend/src/components/Pages/index.ts` | `AppShell/**`, `Landing/**` |

---

## BACKEND tasks

### B1 — Two comments in `internal/routes/routes_test.go` contradict their own code

- **`testConfig`** (~line 58) says *"WebhookURL is left empty since none of these route-level tests
  exercise the contact handler's webhook call"*. Both halves are false: the function sets
  `WebhookURL: "http://example.invalid/webhook"`, and the rate-limit tests below **do** exercise the
  webhook via `contactRouterWithWebhook`. Rewrite it to describe what the function actually does and
  why the placeholder URL is what it is.
- **`TestRateLimit_PerIPIndependent`** (~line 248) says it uses *"the real ClientIP() resolution
  path"*. It does not — the rate limiter deliberately bypasses gin's `ClientIP()` entirely and keys
  on the rightmost `X-Forwarded-For` entry, falling back to `RemoteAddr`. This is the same stale
  claim already corrected on `postContactFrom` a few lines above; this one was missed. Fix it to
  match.

While you are in this file, read every other comment in it and confirm it is still true. Report
anything else you correct.

### B2 — Eight comments point at the deleted `TEAM-BRIEF.md`

In `internal/handlers/contact/contact.go` (×2), `internal/routes/routes.go` (×2),
`internal/routes/routes_test.go`, `internal/ratelimit/ratelimit_test.go` (×3),
`internal/handlers/contact/contact_test.go`, and `pkg/config/config_test.go`.

Every one is a dangling pointer — the file is deleted at the end of each sprint by design.

**Do not just delete the references.** Each one is standing in for a real reason that is worth
keeping. Replace each with the actual reasoning, stated inline. For example, "see TEAM-BRIEF.md
B3" on the validation-error path should become a sentence explaining that gin's binding error text
is internal detail that must not reach the client. Where the reason is genuinely obvious from the
code, drop the comment instead of padding it.

Use `grep -rn "TEAM-BRIEF" backend/` to find them all and confirm zero remain when you are done.

### B3 — Audit the rest of the backend for the same class of error

Comments that contradict their code, reference things that no longer exist, or describe behavior
that has since changed. The backend has been through four sprints; assume some drift. Check in
particular anything describing `SetTrustedProxies`, `ClientIP()`, `AllowAnyLocalhost`,
`ALLOWED_ORIGINS` handling, or the rate limiter's guarantees — those all changed recently.

Report what you found and fixed. If a comment is merely thin rather than wrong, leave it.

---

## SHELL tasks

You own `AppShell/**` and `Pages/Landing/**`.

### S1 — The Red theme is unreachable

`AppShell/InternalComponents/ThemeButton.tsx` has its Red toggle **commented out**, so the theme
can only be reached by injecting `localStorage.theme` by hand. Its palette exists, is maintained,
and Sprint 4's work made it fully legible and AA-contrast-compliant.

Shipping a maintained-but-unreachable theme is the worst of both worlds. **Restore the toggle.**
Verify in a browser that all three themes are selectable from the UI and each renders correctly.

If you find a concrete reason it was disabled — something actually broken about the red theme —
stop and report that instead of forcing it live.

### S2 — `NavBar.tsx` hardcodes `black`/`white`

It ignores the selected theme entirely. This is the same defect Sprint 4 fixed in Landing,
Projects, Skills, and Experience — this file was outside that sprint's boundaries. Replace with
theme tokens and verify the nav adapts across all three themes.

### S3 — `SettingsDrawer.tsx` headings are not headings

Its "Select a Theme" / "Select a Layout" titles render as plain `<span>` (MUI `CardHeader`'s
default `titleTypographyProps`), so they look like sub-headings but are absent from the
accessibility tree. Give them real heading elements at a level consistent with the drawer's own
`h2` title. Verify the drawer's heading outline in a browser.

### S4 — Landing's inline nav duplicates `NavBar`

Investigated in Sprint 4 and deliberately deferred: `useShowNavBar.ts` hides the global `NavBar`
while `scrollY <= innerHeight`, so Landing's own nav fills that gap **by design**. That is why the
duplication exists and why it is not simply removable.

**Scope this narrowly: deduplicate the link *definitions*, not the rendering.** Extract the
nav-link list (labels + anchors) into one shared module that both `NavBar` and `Landing` import, so
adding or renaming a section is a one-line change in one place instead of two files that silently
drift. Both components keep their own presentation and their own show/hide behavior.

**Do not redesign the scroll/visibility behavior.** If you conclude the two link lists have already
drifted apart, say what differs before unifying — that divergence may be intentional.

---

## CONTENT tasks

You own `ConnectForm/**`, `Pages/{Skills,Experience}/**`, and `Pages/index.ts`.

### C1 — The Send button is unreachable by keyboard while the form is invalid

`ConnectForm` disables Send with the native `disabled` attribute, which removes it from the tab
sequence entirely. A keyboard user tabbing through an empty form never encounters Send at all, and
gets no explanation of why they cannot submit — the button is simply absent from their experience.

Switch to the accessible pattern: keep the button **focusable**, mark it `aria-disabled="true"`,
and make activating it while invalid do something useful rather than nothing — surface the
validation state and move focus to the first invalid field. Keep it visually styled as disabled.

Note this changes behavior that existing tests pin (Send being `disabled` on mount and while
incomplete). Update those tests in the same commit to assert the new contract — the *concept* to
preserve is "an invalid form cannot be submitted", which must still hold.

### C2 — Card titles are not headings

Same defect as S3, in your files: `Skills` and `Experience` card titles render as plain `<span>`
via MUI `CardHeader`. Give them real heading elements. Their section headers are `h2`, so the card
titles should be `h3`. Verify the outline descends without skipping levels.

### C3 — The lazy page splits are pure overhead

`Pages/index.ts` wraps five sections in `React.lazy()`. But `Router.tsx` has exactly **one** route,
and `Home` renders all five sections **unconditionally** — so the browser loads Home's chunk,
discovers five dynamic imports, then fetches five more chunks plus a Suspense stall, for content
nothing ever conditionally hides.

Convert those to static imports. **Be careful with two things:**
- Check what `Router.tsx` and any `Suspense` boundary expect before changing the shape of what
  `Pages/index.ts` exports. `Router.tsx` is not yours — if it needs a change, **report it**.
- `Loading.tsx` / the `Suspense` fallback may become dead code. Say so; don't delete files outside
  your boundary.

Report before/after chunk counts and sizes from `bun run build`. If it turns out the splits *do*
pay off, report that instead of forcing the change — measurement decides.

### C4 — Two comments reference a deleted file

`contactErrors.ts:9` and `useConnectForm.ts:6` both cite "the Sprint 3 interface contract", which
lived in a `TEAM-BRIEF.md` that no longer exists. State the actual contract inline instead: the
frontend maps **status codes** to user-facing copy and deliberately never branches on the
backend's `error` string, because coupling UI wording to backend internals breaks the moment
someone rewords a message.

---

## Reporting

End your report with:

1. Every command you ran to verify, with actual output.
2. For each behavior change, the before/after of any test that pinned it.
3. Browser verification: which routes, widths, themes, and states you exercised, and how.
4. Anything you wanted to touch but couldn't because of the ownership boundary.
5. Anything out of scope you found.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
