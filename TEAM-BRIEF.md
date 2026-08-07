# TEAM-BRIEF — Sprint 7: MUI v5 → v9

Scratch file. Deleted at the end of the sprint. **Do not cite this file in a code comment** — it
will not exist. This has been reintroduced two sprints running, so check before you commit:
`grep -rn "TEAM-BRIEF" frontend/src`.

## Goal

The frontend is on `@mui/material@5.16.4`. The latest is **9.3.1** — four major versions behind.

This is a **foundation sprint, not a redesign.** Four more sprints of navigation fixes, responsive
work, theming, and redesign are queued behind it, and every one of them touches components whose
API this upgrade changes. Doing them first would mean doing them twice.

**Success is that nothing looks different.** If a user could tell this shipped, something broke.

## Verified before writing this — you can rely on these

- **`9.3.1` is current.** Confirmed against npm.
- **React stays at 18.** MUI v9 peer-depends on `react ^17 || ^18 || ^19`, so this upgrade does
  **not** force a React 19 migration. Do not bundle one in. That is a separate risk for a separate
  day.
- **`Grid` is the main breaking change.** `About.tsx` and `Landing.tsx` use the v5 API
  (`<Grid item xs={12} md={6}>`). v6 replaced it: `<Grid size={{ xs: 12, md: 6 }}>`, no `item` prop.
- **Footprint:** 41 files import MUI, 3 files call `createTheme`, 65 tests exist.
- **`@mui/lab` is beta at v9** (`9.0.0-beta.8`) and `Experience.tsx` is its only consumer.
  **Decision made by Alex: drop it.** See Task 1.

## Ground rules

- **65 frontend tests must pass** at the end, plus `bun run lint` (`--max-warnings 0`),
  `bunx tsc --noEmit`, `bun run build`. Backend is untouched — do not go near `backend/**`.
- **No `any`.** If a migrated generic fights you, solve the type; don't escape it.
- **Test churn is expected and fine. Silently weakened tests are not.** If a test breaks because
  the DOM or API changed, update it. If a test breaks because *behavior* changed, that is a
  **finding** — stop, report it, and say what changed. Do not delete a failing test to get green.
- Browser verification is required and is the real acceptance criterion here. The Playwright MCP
  tools are in your allowlist but frequently are **not** actually available — check, and if absent
  drive `playwright-core` against `bun run dev` (http://localhost:3005/Portfolio/). Dev servers here
  die after ~2–4 min and Vite's watcher is unreliable on `/mnt/c` — restart fresh before each pass.

## Work in this order — each step lands as its own commit

The sequencing is deliberate: it splits one large risky change into steps that can each be
verified on their own. Do not collapse them.

### Task 1 — Remove `@mui/lab` **while still on v5**

Doing this first means the Timeline rewrite is verified against a codebase that otherwise hasn't
moved. If the timeline looks wrong afterwards, you know it wasn't the version upgrade — and when
the upgrade later lands, you know a broken timeline isn't a lab-beta problem.

`Experience.tsx` imports Timeline components from `@mui/lab`. Rebuild that section with stable
`@mui/material` primitives (`Box`, `Stack`, `Divider`, `Paper`, and CSS for the connector line, or
whatever reads cleanest), then remove `@mui/lab` from `package.json` entirely.

**Visual output must be unchanged.** Screenshot before and after at desktop and mobile widths in
all three themes and compare. This is a like-for-like reconstruction, not an improvement — Sprint 11
is where Experience might get redesigned, and pre-empting it here would make this diff impossible
to review.

Keep the heading levels as they are (`h2` section header, `h3` card titles) — those were fixed in
Sprint 4.5 and are covered by tests.

### Task 2 — Upgrade the packages

`@mui/material` and `@mui/icons-material` to `^9.3.1`. React stays at 18. `@mui/lab` should already
be gone.

Note `@mui/material@9` lists `@mui/material-pigment-css` as a peer dependency. Determine whether it
is genuinely required for a plain Emotion setup or is an optional peer, and say what you found —
installing a CSS-in-JS engine this project doesn't use would be a real regression in bundle size.

### Task 3 — Run the official codemods, one major at a time

Do not hand-edit what a codemod can do. Run MUI's codemods **per major version in order** —
v5→v6, v6→v7, v7→v8, v8→v9 — rather than jumping straight to the last one. Each major's codemod
assumes the previous major's shape as input.

**Review every line a codemod changes.** They are good, not infallible, and a blind accept is how
a subtle behavior change ships. Report anything a codemod did that you had to undo or correct.

### Task 4 — `Grid`

The codemods may handle this; verify rather than assume. `About.tsx` and `Landing.tsx` both use
`<Grid item xs={...} md={...}>`, which must become `<Grid size={{ xs: ..., md: ... }}>` with no
`item` prop. Check the rendered layout in a browser at both breakpoints — a Grid that compiles but
lays out differently is exactly the kind of thing that passes CI and looks wrong.

### Task 5 — The three themes

`src/layout/Theme/{darkTheme,blueTheme,redTheme}.ts` each call `createTheme` with `ThemeOptions`.

- v6 introduced CSS-variable theming (`cssVariables: true`). **Decide whether to adopt it or stay
  on the classic runtime theme, and record the reason in your report.** Recommendation: stay
  classic for this sprint — it is a behavioral change dressed as a config flag, and this sprint's
  job is "nothing looks different." Sprint 10 reworks themes and is the right place for it.
- **Verify the `MuiButtonBase` focus-visible override still applies.** MUI clears the outline and
  no theme restored it until Sprint 4.5 added this at theme level; it is precisely the kind of
  component override a major upgrade drops silently. Tab through the UI and confirm a visible ring
  in all three themes.
- `redTheme.ts` needs `palette.mode: 'dark'` to survive — it was missing for a long time and made
  every derived token resolve near-black.

### Task 6 — Tests

Expect churn. Class names, DOM structure, and some props change across four majors.

The tests exist to catch exactly this kind of upgrade, so treat a failure as information. For each
one you touch, say in your report whether it broke because of a **DOM/API change** (update it) or
because **behavior changed** (report it — that is a regression until proven otherwise).

---

## Acceptance — this is the bar

Verify in a real browser: **three themes × three layouts (Default, Mobile, SideNav) × desktop and
mobile widths.** Confirm each of these still holds, because each was hard-won in an earlier sprint
and each is the kind of thing a major upgrade quietly breaks:

- Exactly **one `<h1>`** per page, in **all three layouts**.
- A **visible focus ring** on buttons and nav links in all three themes.
- The settings drawer traps focus, returns it on close, and closes on Escape.
- The contact form: field-level errors appear only after a field is touched, Send is focusable with
  `aria-disabled` while invalid, and a valid submit still works.
- Skeletons render while the projects request is in flight, and the static fallback renders on a
  failure.
- `prefers-reduced-motion` still removes the landing particles.
- The AppShell preserves form state across the 650 px breakpoint.

Report before/after bundle size from `bun run build` — four majors of a UI library is a plausible
size regression and worth knowing either way.

## Reporting

1. Every command you ran, with actual output — full verbose test runs.
2. For every test you touched: DOM/API change, or behavior change?
3. Anything a codemod got wrong that you had to correct.
4. Your `cssVariables` and `material-pigment-css` findings and decisions.
5. Browser verification: which themes, layouts, and widths you exercised, and how.
6. Anything you found that is out of scope — Sprints 8–11 cover navigation, responsive, themes,
   and redesign, so log it rather than fixing it.

If something here is wrong or impossible, stop and say so rather than improvising.
