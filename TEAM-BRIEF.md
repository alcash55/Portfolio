# TEAM-BRIEF — Sprint 15: close out the plan

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
`grep -rn "TEAM-BRIEF" frontend/src backend` before you commit.

## Goal

Empty the remaining actionable items. The site is deployed at **93 / 100 / 96 / 100** with zero
accessibility failures — this is closing the last real gaps, not rescuing anything.

Two entries in the plan were stale and I disproved them by measurement; don't go looking for them:

- **"The mobile FAB overlaps About/Experience cards"** — does not reproduce. At 390 px the FAB sits
  at `[312,687,360,735]` and intersects **zero** section cards. The section-height work fixed it.
- **"Six existing icons invisible on white"** — down to one. Only `Node` still carries a literal
  white fill, and it is probably a legitimate knockout on its own green hexagon, the same reason
  `Ncr`, `Docker` and `Bun` were deliberately left alone. Verify, don't assume it's broken.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **ci** | `.github/**`, `frontend/e2e/**` (new), `frontend/package.json` | `frontend/src/**` |
| **theme** | `frontend/src/layout/Theme/**` | everything else |
| **cleanup** | `frontend/src/components/Pages/Contact/**`, `frontend/src/assets/icons/**`, `frontend/vite.config.ts` | `layout/**`, `package.json` |

`package.json` belongs to **ci** alone — if cleanup's bundle work needs a script or dependency
change, it **reports** and ci adds it.

## Ground rules

- **78 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend must stay untouched. **No `any`.** MUI is **v9**.
- **Six themes** (dark, blue, light, red, purple, green) × **three layouts** (default, mobile,
  sideNav). Light inverts assumptions the other five share.
- **Contrast is measured, not judged** — composite ancestor backgrounds. AA is 4.5:1 body, 3:1
  large text and UI.
- **Restart the dev server immediately before each measurement pass.** Vite's watcher is unreliable
  on this `/mnt/c` mount. It has bitten seven sprints, including me three times.

---

## CI tasks — the Playwright smoke test

This is the headline item and the case for it is entirely empirical. **Every sprint on this project
produced at least one bug that lint, typecheck, tests and the build all passed and only a real
browser caught:** a runtime circular import, PWA icons 404ing in production, an invisible focus
ring app-wide, a duplicate `<h1>` in one of three layouts, a nav link at `x: -46`, a **fully
bypassable rate limiter**, hero images rendering at 40 px, a 285 ms flash of the wrong theme, and
sections silently clipping their own content.

### C1 — A narrow, fast, reliable smoke test

**Start small and make it trustworthy.** A flaky suite that everyone learns to re-run is worse than
no suite. Cover only things that have actually broken here:

- The page loads and renders, with **exactly one `<h1>`** — check in all three layouts.
- **No horizontal overflow at 320 px**: `document.documentElement.scrollWidth === window.innerWidth`.
- **No section card clips its own content** (`scrollHeight <= clientHeight + 1`) — this is the bug
  class that hid About's "Outside of Work" entirely.
- The contact form submits against a **stubbed** `/api/v1/contact` and shows the success state.
- **Zero console errors** on load.

Use `@playwright/test`. Run it against a production build via `vite preview`, not the dev server —
dev-only warnings and HMR make it noisy and slow.

### C2 — Wire it into CI without making CI fragile

Add it to `ci.yml` as its own job so a smoke failure is distinguishable from a unit-test failure.
Install only the Chromium browser, and cache it — a full browser download on every run is the
fastest way to make people resent the suite.

**It must gate the deploy the same way the existing jobs do.** Check how `deploy.yml` consumes
`ci.yml` before wiring it; the reusable-workflow call and `needs:` relationship already exist.

### C3 — Make it runnable locally

A `bun run test:e2e` script, and a line in `README.md`'s testing section so it is discoverable.
**Note the environment here has no system Chrome** — the cached Playwright Chromium at
`~/.cache/ms-playwright` is what works locally. Say in your report exactly how you ran it.

---

## THEME task — the blue theme fails AA

### T1 — Blue's `primary.main` is too light for white text and too dark for its own paper

Measured just now, reproduced live:

| context | measured | needs |
| --- | ---: | ---: |
| `sideNav` contained button — white on `#5893df` | **3.16:1** | 4.5 |
| `mobile` selected label — `#5893df` on `#24344d` | **3.98:1** | 4.5 |
| the same control in `dark` | 7.22:1 ✓ | |

It is specific to blue. Lighthouse has never caught it because it tests **one theme in one layout**
— the failure lives in the other 17 combinations.

**This is harder than nudging one hex**, which is why it is its own task. `primary.main` is used for
contained buttons (white text on it), for the mobile nav's selected label (it as text on paper),
and `primary.light` is the site-wide link colour. Those pull in opposite directions: darkening
helps the button, hurts the label.

Consider giving contained buttons an explicit `contrastText` rather than forcing one hex to satisfy
both roles — MUI computes `contrastText` from `main`, and its default threshold is more permissive
than AA. Whatever you choose, **measure every role**: contained button text, the selected label,
links via `primary.light`, and the focus ring.

**Do not regress the other five themes.** Re-measure all six after the change and report a table.

---

## CLEANUP tasks

### K1 — `Contact.tsx`'s stale `primary.light` comment

It cites themes and contrast ratios that no longer hold after Sprint 12 (it references the red
theme's old palette and a three-theme world; there are six now). Correct it to state what is
actually true, or delete it if the reason is obvious from the code. **Do not leave a comment that
asserts numbers nobody has re-measured** — that is the exact rot that needed its own sprint.

### K2 — The `Node` icon's remaining white fill

Verify whether it is a legitimate knockout on the icon's own opaque shape (like `Ncr`/`Docker`/
`Bun`) or genuinely invisible on a light background. **Render it on white and look.** Fix only if
actually broken; say which you found.

### K3 — Bundle investigation — measure, then decide

Current production build: **630 kB raw / 206.5 kB gzip, single chunk.** The plan says 179 kB, so it
has grown since the MUI upgrade — seven new icons and a redesign landed in between.

This is **investigation first**. Report where the weight is before changing anything. Specifically:

- What proportion is MUI, and is anything obviously unused being pulled in? Sprint 7 already proved
  barrel imports tree-shake correctly here (grepping the bundle for `MuiSlider`, `MuiTable` etc.
  found **zero** matches), so **do not redo that** — look for something new.
- Sprint 4.5 removed `React.lazy()` deliberately, having measured 13 chunks/517 kB against 1
  chunk/513 kB. **Do not reintroduce code-splitting without a measurement that beats that**, and if
  you do propose it, note that a single route rendering every section is why it lost last time.
- Page transfer weight is ~400 KB and Performance is 93, so this is **not urgent**. A confident
  "here is where it went, and nothing is worth changing" is a perfectly good outcome. Do not churn
  imports on a hunch.

---

## Acceptance

- The smoke test runs in CI, gates the deploy, and passes. It must be **fast and not flaky** —
  run it at least three times and report whether the result was identical each time.
- Blue clears AA in every role, in `mobile` and `sideNav` as well as `default`, with the other five
  themes re-measured and unregressed.
- No comment left asserting a number nobody re-measured.
- Deployed baseline held or improved: **93 / 100 / 96 / 100**, zero accessibility failures.

## Reporting

1. Commands run, with actual output.
2. The blue contrast table — every role, all six themes, before and after.
3. Smoke test: what it covers, how long it takes, and its result across repeated runs.
4. Bundle: where the weight actually is, and your recommendation with the measurement behind it.
5. Anything you found that should be someone else's task.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
