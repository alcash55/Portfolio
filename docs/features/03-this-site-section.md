# 03 — "This site" section

**Status:** spec, not started · **Addresses:** the theme/layout system is invisible (#5 in the review)

## The problem

The site has **six themes** and **three layout modes**, and both are behind a settings
drawer most visitors will never open. Every theme's contrast was measured rather than
eyeballed — the blue theme failed WCAG AA twice from one cause (MUI's
`getContrastText` flips to white at _its_ 3:1 threshold, which is the large-text bar,
not AA's 4.5:1 for body text) and the fix took the palette from 4.99:1 to 12.72:1.
That is real work and it is completely undiscoverable.

Same story for the engineering: Go API, 1h single-flight cache, static fallback, 102
unit tests, 9 browser tests gating the deploy, Lighthouse 93/100/96/100.

## Proposal

A short section that makes the site itself the exhibit — swatches that switch the
theme live, the three layout modes, and the numbers underneath.

```
── This site ────────────────────────────────
Built with React, TypeScript, MUI and a Go API.
Try it:

 ● ● ● ● ● ●   six themes, each measured against
 dark blue light red purple green    WCAG AA

 [default] [sidebar] [mobile]   three layouts

102 unit tests · 9 browser tests gate every
deploy · Lighthouse 93/100/96/100
```

## How it fits the current code

- Themes come from `THEME_OPTIONS` in `ThemeButton.tsx` (six entries: dark, blue,
  light, red, purple, green). Switching goes through `toggleColorMode` on
  `ColorModeContext` and persists to `localStorage['theme']`. A swatch row is a second
  consumer of the same context — no new state.
- Layout modes are `default` / `sideNav` / `mobile` via `localStorage['layout']`,
  owned by `AppShell.tsx`.
- **Adding a section is a four-place change**, by design: `Home.tsx` (render order),
  `navLinks.ts` (single source of truth for all four navs), and the e2e list
  `CLIPPABLE_SECTION_IDS` in `e2e/smoke.spec.ts`, which currently reads
  `['about','experience','skills','projects','contact']`. Git history has a section
  that was rendered but never added to `navLinks`, so it went missing from every nav
  for four sprints — worth not repeating.
- The numbers must not be hand-typed and left to rot. Test counts can be generated at
  build time the way `scripts/generate-sitemap.mjs` already generates the sitemap.

## Decisions to make

**1. Its own section, or folded into the Portfolio project dialog (spec 01)?**
Recommendation: its own section. In the dialog it is only seen by someone who already
clicked the least interesting-looking card.
**Your call:** Show it in the dialog

\*_2. Idea to present the different themes_. when looking at the home screen/hero section remove the hamburger menu in the top nav bar and replace some of the background dots that float around with little icon buttons that have the ability to switch the theme and layout. There may need to be more added to the screeen to cover all themes and layouts. All of these buttons should be tab-able and fully A11y compliant\*

## Your direction

<!-- Copy you want verbatim, what to include or leave out, whether the WCAG story is
     worth the space, how technical to go. -->

## Done when

- [ ] Home screen/hero section renders in all themes and the two layouts, top nav and side nav. If the user is on mobile then it does not show the other layouts
- [ ] Each theme and layout button is keyboard-reachable with visible focus, labelled for screen readers
- [ ] No horizontal overflow at 320px
- [ ] The theme and layout buttons are tab-able and fully A11y compliant
- [ ] New tests are generated and are all green

## Risks

- **Reads as bragging.** Numbers without a "so what" invite an eye-roll. The contrast
  story is what turns it from a scoreboard into evidence of how you work.
- **Rot.** 102 tests becomes wrong on the next commit unless it is generated.
