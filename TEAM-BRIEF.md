# TEAM-BRIEF — Sprint 8: Navigation, layout, and accessibility

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
This has been reintroduced three sprints running, so `grep -rn "TEAM-BRIEF" frontend/src` before
you commit.

## Goal

Alex's navigation and layout bugs, plus the four accessibility failures the first full Lighthouse
run turned up on the live site.

## What I found while scoping — this changes the shape of the work

Do not re-derive these; they are verified.

1. **`navLinks.ts` has no `about` entry.** Sprint 4 wired the About section into `Home` but never
   added it to the shared link list. So the missing About button is **not** just a side-nav bug —
   the top nav and Landing's inline nav are missing it too.
2. **There are four nav link lists, not one.** `navLinks.ts` (shared by `NavBar` + `Landing`),
   plus hardcoded lists in `SidebarNav.tsx` and `MobileChrome.tsx`. That is why they drift.
3. **The "top nav on the landing section" is Landing's own inline nav, not `NavBar`.**
   `AppShellLayout.tsx:44` already gates `NavBar` on `mode === 'default'`, so it cannot be the
   culprit. `Landing.tsx` renders its own nav unconditionally, in every layout.
4. **`MobileChrome.tsx` uses `<Work />` for both Experience and Skills & Tech** — that is the
   duplicate icon. It also routes Home to **`#summary`, an anchor that matches no section**.
5. **A stale comment in `Landing.tsx:57-58`** claims "redTheme doesn't set palette.mode, so it
   defaults to light-mode text.primary". Sprint 4.5 added `mode: 'dark'` to `redTheme`, so the
   premise is now false and the `common.white` workaround it justifies may be unnecessary.
   Verify before removing it — Sprint 10 reworks themes and would rather inherit truth.

## Ground rules

- **65 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend is untouched.
- **No `any`.** MUI is now **v9** — check the v9 API, not v5 answers, when you look things up.
- Browser verification is the acceptance criterion for nearly everything here. The Playwright MCP
  tools are in your allowlist but frequently are **not** actually available — check, and if absent
  drive `playwright-core` against `bun run dev`. **Restart the dev server immediately before each
  measurement pass**: it dies after ~2–4 minutes and Vite's watcher does not reliably pick up edits
  on this `/mnt/c` mount. Sprint 7 wasted three verification passes measuring stale output.
- **Measure, don't eyeball.** Use `getBoundingClientRect()` and computed styles. Sprint 4.5 caught
  a nav link at `x: -46` that looked fine in a screenshot.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **shell** | `frontend/src/components/AppShell/**` | `Pages/**` |
| **landing** | `frontend/src/components/Pages/Landing/**`, and whichever section files hold the `list` and `label-mismatch` defects (likely `Skills`, `Experience`, or `Footer`… but `Footer` is AppShell's — coordinate by reporting, not editing) | `AppShell/**` |

### Interface contract

`navLinks.ts` (shell's file) gains an `about` entry. **landing** consumes it and must not edit it.

Landing's inline nav has to know the current layout mode so it can hide itself outside `default`.
`AppShell` already exposes `AppShellLayoutContext` with a `mode` field — **shell** confirms it is
exported and usable from `Pages/**`; **landing** consumes it. If it is not usable as-is, shell
adjusts it and says so; landing does not reach into `AppShell/**` to fix it.

---

## SHELL tasks

### S1 — Add `about` to `navLinks.ts`, and make every nav use it

Add `{ id: 'about', label: 'About' }` in document order (Home.tsx renders Landing, About,
Experience, Skills, Projects, Contact).

Then **collapse the duplicate lists**: `SidebarNav.tsx` and `MobileChrome.tsx` should derive from
`navLinks` rather than maintaining their own. They legitimately need extra per-link data (icons),
so extend the shared shape rather than copying the list — a link list that lives in four places is
why About went missing for four sprints.

Fix `MobileChrome`'s `#summary` → `#landing` while you are there; it currently points at nothing.

### S2 — Distinct icons in the mobile nav

Experience and Skills & Tech are both `<Work />`. Give Skills & Tech something meaningful —
`Construction` currently sits on Projects and arguably suits Skills better, so consider the whole
set rather than swapping one icon in isolation.

### S3 — The Skills & Tech mobile nav item is pushed up

Its label wraps and shoves the icon out of alignment with its neighbours. Fix so all items align
on a common baseline regardless of label length. Verify by measuring icon `y` positions, not by
looking.

### S4 — The nav bar is covered by the landing images on scroll (mobile layout)

Probably z-index, but **confirm the actual stacking context first**. An element with a transform,
filter, or its own `position` + `z-index` creates a new stacking context, and a bumped number on
the wrong element moves the bug instead of fixing it. Report what you found before changing values.

### S5 — Collapsible side nav

The one feature in this sprint. The side nav should collapse to icons only and expand back.

- Persist the state the way theme and layout already are (see how those are stored).
- Collapsed items still need accessible names — an icon-only button with no label is exactly the
  `button-name` failure the landing agent is fixing. Use `aria-label` and a `Tooltip`.
- The toggle itself needs an accessible name and a visible focus ring.
- Do not break `AppShell`'s state-preservation guarantee: changing the layout must not remount
  page content. There is a test for this.

---

## LANDING tasks

### L1 — Hide Landing's inline nav outside the `default` layout

This is Alex's "we still get a top nav bar in the side nav and mobile layouts" bug. Landing renders
its own nav because `useShowNavBar` hides the global bar while the viewport is on the hero — but
that reasoning only applies to the `default` layout. In `sideNav` and `mobile` there is already a
persistent nav, so Landing's is redundant chrome.

Consume the layout mode from `AppShellLayoutContext` (see the interface contract) and render the
inline nav only in `default`.

### L2 — `button-name`: a button in `#landing` has no accessible name

Lighthouse weight 10, the heaviest failure on the site. Selector:
`section#landing > div > div.MuiStack-root > button`. Find it, give it a real accessible name
describing what it does.

### L3 — `link-name`: three icon-only links announce nothing

`Landing.tsx:266,281,296` — the GitHub, LinkedIn, and email `IconButton href=…` contain only an
SVG and have no `aria-label`. A screen reader announces "link" and nothing more.

Give each a name that says where it goes. While you are there, confirm they carry
`rel="noopener noreferrer"` alongside `target="_blank"`.

### L4 — `list`: `<ul>` elements containing non-`<li>` children

Two places, per Lighthouse: one inside a Card, one inside a Stack. Find them (they are MUI `List`
usages whose children are not `ListItem`) and fix the semantics — either make the children real
list items or stop using a list element. Screen readers currently mis-announce the item count.

**If they turn out to live in `Footer.tsx`, that is AppShell's file — report it, don't edit it.**

### L5 — `label-content-name-mismatch`

A link's visible text does not match its accessible name, so a voice-control user saying what they
see cannot activate it. Lighthouse reports it on
`div.MuiGrid-root > div.MuiStack-root > div.MuiBox-root > a.MuiButtonBase-root`.

### L6 — The stale `redTheme` comment

`Landing.tsx:57-58` justifies a `common.white` workaround with a premise that is no longer true
(see scoping note 5). Verify whether the workaround is still needed on v9 with `redTheme` having
`mode: 'dark'`. If it is, correct the comment's reasoning. If it is not, remove both.
**Check all three themes before removing anything** — this is exactly the kind of "cleanup" that
makes text invisible in one theme.

---

## Acceptance

Re-run Lighthouse against a local production build and report the accessibility score. It was
**86**; these four fixes should move it materially. Command that worked:
`CHROME_PATH=<cached playwright chromium> npx lighthouse@latest <url> --only-categories=accessibility`

Verify in a browser across **three themes × three layouts × desktop and mobile**, and confirm the
things earlier sprints won still hold: exactly one `<h1>` per layout, visible focus rings, drawer
focus trap and Escape, contact form `aria-disabled` behavior, AppShell state preservation across
650 px.

## Reporting

1. Commands run, with actual output.
2. For S4, what the stacking context actually was before you changed anything.
3. Before/after Lighthouse accessibility score.
4. Browser verification: themes, layouts, widths, and how you measured.
5. Anything you found that belongs to Sprint 9 (responsive), 10 (themes), or 11 (redesign) —
   log it, don't fix it.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
