# TEAM-BRIEF — Sprint 10: Themes

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
This has been reintroduced or mis-merged four sprints running; `grep -rn "TEAM-BRIEF" frontend/src`
before you commit.

## Goal

Alex: *"I do like the idea of having more than just one theme but I think the others may need some
work, the blue theme looks pretty good, but the red theme is not great and probably should be
replaced with a light theme."*

Replace red with a light theme, polish blue, and verify contrast across all three.

## What I found while scoping — this is bigger than swapping a palette

Verified; don't re-derive.

1. **All three current themes are `palette.mode: 'dark'`.** A light theme is the first to invert
   that, so every dark assumption baked into components surfaces at once.
2. **`Landing.tsx` has 15 hardcoded `rgba(255,255,255,…)` / `#fff` references.** The hero is built
   entirely white-on-dark — nav links, captions, borders, social buttons.
3. **6 of the 15 tech icons hardcode white fills** — `Ncr`, `Docker`, `Go`, `Node`, `Bun`,
   `Typescript`. On a light background they render **white on white: invisible**. This is the one
   most likely to be missed, because the Skills section looks fine until you switch themes.
4. **Theme init has the bug that cost 21 performance points last sprint.**
   `Theme/Context.tsx` does `useState(darkTheme)` then corrects in a `useEffect` — so a user with
   blue or light saved gets a **dark first paint** that then swaps. This is exactly the pattern
   fixed in `AppShell.tsx` (CLS 0.725 → 0.016). Fix it the same way: a lazy initializer reading
   `localStorage` synchronously.

## A design decision, made — do not relitigate

**The landing hero stays dark in every theme, including light.** A dark hero above a light page is
a deliberate and common pattern, Alex has said the home section is the visual reference for the
Sprint 11 redesign (so it is the look he wants kept), and reworking 15 white-on-dark references is
both risky and off-goal for a theming sprint.

So: the hero keeps its dark surface and white text in all themes. **Everything below the hero must
follow the theme.** If you find the hero's dark surface fighting a light page at its boundary, fix
the seam, not the hero.

This is reversible — say so in your report if you think it reads badly in light, but do not change
it unilaterally.

## Ground rules

- **65 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend untouched. **No `any`.** MUI is **v9** — check v9 API.
- **Contrast is measured, not judged.** WCAG AA: **4.5:1** body text, **3:1** large text and UI
  boundaries. Composite every ancestor background layer — Sprint 4 got a wrong answer by ignoring
  translucent layers, and Sprint 8 found a failure caused by a decorative overlay nobody suspected.
- Deployed baseline to protect: **Performance 98 · Accessibility 100 · Best Practices 96 · SEO 100**,
  **CLS 0.016**. Accessibility is at 100 with zero failures — **do not regress it.**
- **Restart the dev server immediately before each measurement pass.** It dies after a few minutes
  and Vite's watcher does not reliably pick up edits on this `/mnt/c` mount. This has now bitten
  Sprint 7, Sprint 9's agents, and me. Assume any measurement is stale unless the server started
  after the edit.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **theme** | `frontend/src/layout/**`, `frontend/src/components/AppShell/InternalComponents/ThemeButton.tsx` | `Pages/**`, `assets/**` |
| **components** | `frontend/src/assets/icons/**`, `frontend/src/components/Pages/**` | `layout/**`, `ThemeButton.tsx` |

### Interface contract

**theme** creates `lightTheme` and defines the tokens. **components** makes icons and sections read
from the theme — it must not add a theme file or edit palettes. If a token needed by a component
does not exist, **components reports it and theme adds it.**

---

## THEME tasks

### T1 — Create `lightTheme`, replace `redTheme`

`palette.mode: 'light'`. Match the structure of the existing themes so the same component overrides
apply — in particular the **`MuiButtonBase` focus-visible override** added in Sprint 4.5.

That override is a specific trap here: it uses a **fixed white outline**, chosen because every
theme then had a dark page background. On a light theme a white focus ring is invisible. Make it
theme-aware — `contrastText`-style logic or a per-theme value, your call, but state which.

Delete `redTheme.ts` and everything referencing it (`Context.tsx`, `ColorModeContext.ts`,
`ThemeButton`, any `localStorage` value of `'red'`). **Handle the migration**: a returning visitor
has `theme: 'red'` in `localStorage` and must not get a broken or blank theme — fall back cleanly.

### T2 — Resolve the theme before first paint

`Theme/Context.tsx` currently starts at `darkTheme` and corrects in a `useEffect`. Convert to a
lazy initializer reading `localStorage` synchronously, exactly as `AppShell.tsx` now does — read
that file first, it has the reasoning in a comment.

Then **measure CLS before and after** on a production build. The AppShell version of this bug was
worth 21 Lighthouse performance points, and this one additionally causes a visible colour flash.

### T3 — Polish blue

Alex says blue is closest to right. Do not redesign it — tighten what is measurably off. Sprint 4
found `primary.main` links at **3.98:1 in blue only** and moved them to `primary.light`; check
whether that is still the right call now.

### T4 — The toggle exposes all three

Dark, blue, light, all reachable from the settings drawer by clicking. The red toggle was commented
out for over a year before Sprint 4.5 restored it — do not ship a theme that only `localStorage`
can reach. Each option needs an accessible name and a visible focus ring **in the theme it
switches to**.

---

## COMPONENTS tasks

### C1 — Six tech icons are invisible on a light background

`Ncr`, `Docker`, `Go`, `Node`, `Bun`, `Typescript` hardcode `fill="#fff"` / `#ffffff`. Make them
follow the theme — `currentColor` inheriting from a themed parent is usually cleanest, but some of
these are multi-colour brand marks where white is part of the mark, not a default.

**Judgement required per icon:** a brand's white is sometimes deliberate (a knockout on a coloured
shape) and sometimes just "the page is dark." Do not blanket-replace. For genuine brand marks,
consider a neutral surface behind the icon instead of recolouring it.

Check the other 9 too — this list came from a `#fff` grep and may miss `fill` values set another
way.

### C2 — Sections must follow the theme

Everything below the hero. Sprints 4 and 4.5 replaced hardcoded hex in Skills, Experience,
Projects, and NavBar with tokens, so most of this should already work — **verify in light rather
than assuming**, since no theme has ever been light and a token that resolves correctly in three
dark themes can still be wrong in a light one.

The hero itself stays dark by decision (see above). Its 15 white references are in scope only where
they leak past the hero's own boundary.

### C3 — Report contrast failures; fix what is yours

Measure across all three themes, compositing ancestor backgrounds. Fix what lives in your files;
**report anything needing a palette change** — that is theme's to make, per the contract.

---

## Acceptance

- All three themes reachable from the UI, each rendering correctly at desktop and 320 px.
- **Zero Lighthouse accessibility failures in every theme** — it is at 100 now, with none.
- No element invisible or below AA in any theme. Explicitly re-check the six icons in light.
- CLS no worse than **0.016**; ideally better once T2 lands.
- Desktop dark theme visually unchanged — it is the default and most visitors see only it.

## Reporting

1. Commands run, with actual output.
2. Measured contrast ratios per theme — numbers, not impressions.
3. CLS before/after T2.
4. Which icons you recoloured, which you left, and why per icon.
5. Your view on the dark-hero-in-light-theme decision, having seen it.
6. Anything belonging to Sprint 11 (redesign) — log it, don't fix it.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
