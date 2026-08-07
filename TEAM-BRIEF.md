# TEAM-BRIEF — Sprint 9: Responsive and smallest-screen

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
Reintroduced three sprints running; `grep -rn "TEAM-BRIEF" frontend/src` before you commit.

## Goal

Alex: *"In the smallest mobile screen most of the sections (projects, skills & tech, experience,
and the images on the home page) are not responsive and a lot of content is not viewable"* and
*"the nav has the far left and far right icons getting cut off the screen."*

**The critical fact: the page does not scroll horizontally.** `document.scrollWidth` equals the
viewport width at 320/360/390 px, yet elements sit outside it. So overflowing content is **clipped
and genuinely unreachable**, not merely awkward. Alex's "not viewable" is literal.

## Measured before writing this — real numbers, don't re-derive

Taken at 320/360/390 px against `bun run dev`:

| What | Measurement |
| --- | --- |
| **Bottom nav, first item** | `x = [-35, 30]` at 320 px — **35 px off the left edge** |
| **Bottom nav, last item** | `x = [290, 355]` at 320 px — **35 px off the right** |
| **Experience card** | `x = [299, 443]` at 320 px — starts 21 px from the right edge, runs **123 px** past it |
| **Skills chips** | `x = [401, 453]` and `[389, 440]` at 390 px — far outside a 390 px viewport |
| **Horizontal page scroll** | `0 px` at every width — nothing is reachable by scrolling |

**Root cause already found for the chips:** `Skills.tsx:71` (and the two identical blocks below it)
is `<CardContent sx={{ display: 'flex', gap: 1 }}>` with **no `flexWrap`**. Flex defaults to
`nowrap`. Fixing it is one property in three places — but see S-tasks, the cards need more than that.

## Ground rules

- **65 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend untouched. **No `any`.** MUI is **v9** — check v9 API, not v5 answers.
- **320 px is the supported floor.** Test at 320, 360, 390. Nothing may sit outside the viewport
  at any of them.
- **Measure with `getBoundingClientRect()`, not screenshots.** Every number above came from
  measurement; a screenshot at 320 px looks plausible while content is clipped off-screen.
- **Restart the dev server immediately before each measurement pass.** It dies after ~2–4 minutes
  and Vite's watcher does not reliably pick up edits on this `/mnt/c` mount. Sprint 7 burned three
  passes measuring stale output and drew a wrong conclusion from it.
- This is responsive repair, **not the redesign** — Sprint 11 redesigns About, Skills, and Footer.
  Make things fit and stay legible; don't restyle.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **chrome** | `frontend/src/components/AppShell/**`, `frontend/src/components/Pages/Experience/**` | `Skills`, `Projects`, `Landing` |
| **sections** | `frontend/src/components/Pages/{Skills,Projects,Landing}/**` | `AppShell/**`, `Experience/**` |

---

## CHROME tasks

### C1 — Bottom nav items are cut off at both edges

35 px off each side at 320 px (numbers above). Six items sharing a fixed width with padding that
doesn't shrink.

Sprint 8 just fixed icon baseline alignment here (labels forced to `nowrap` with a fixed `pt`) —
**do not regress that.** All six icons must still share a common `y`.

Options worth weighing rather than jumping at the first: shrink per-item padding and label size
below a breakpoint; allow horizontal scroll within the nav; or drop labels at the smallest widths
and rely on the `aria-label`s that already exist. Say which you chose and why.

Verify every item's `x` range sits within `[0, viewportWidth]` at 320/360/390.

### C2 — The Experience timeline does not fit a phone

**This is the hard one, and Sprint 7 deliberately deferred it rather than force a bad fix. Read
this whole section before writing code.**

The row is `[175px date][36px dot][card]` side by side. At 320 px the section is 272 px wide, so
the first two columns consume 211 px and leave ~60 px for the card. The row overflows and the card
falls back to its own min-content width.

**This is pre-existing** — it overflowed on MUI v5 too, just uniformly (every card 209 px). After
the `@mui/lab` removal each card takes its own min-content width instead (178/195/208/208/190 at
390 px), which adds ~560 px of page height.

**Three fixes were tried in Sprint 7 and all are wrong. Do not repeat them:**

| Attempt | Result |
| --- | --- |
| `minWidth: 0` on the content box | Cards collapse to **4 px** |
| `alignItems: 'stretch'` on the container | No change — rows are already `width: 100%` |
| Narrower responsive date column (96 px) | Uniform but **28 px** wide; page gets *taller* once text wraps |

**The actual fix is to stack the date above the card below `sm`** rather than beside it — one
column on phones, the current two-column timeline from `sm` up. The dot/connector rail needs a
sensible treatment in the stacked form; keeping it as a left rail is fine, dropping it on phones
is also fine — your call, say which.

Desktop (`sm` and up) must remain **pixel-identical** to today. Verify that explicitly.

---

## SECTIONS tasks

### S1 — Skills chips don't wrap, and the cards overflow

Root cause is `display: flex` with no `flexWrap` in three identical `CardContent` blocks
(`Skills.tsx:71`, and the Frameworks and Tools blocks below).

`flexWrap: 'wrap'` is necessary but confirm it is *sufficient* — the measurements show chips at
`x = [401, 453]` on a 390 px viewport, which is further out than a missing wrap alone explains.
Check the card's own width and padding at 320 px too.

The three blocks are identical; there is already a shared `skillCardSx` in this file, so put the
shared content styling somewhere similarly single-sourced rather than editing the same thing three
times.

### S2 — Projects cards at the smallest widths

Verify and fix. The Grid moved to the v2 API in Sprint 7 (`size={{ xs: 12, sm: 6, md: 4 }}`), so
confirm the breakpoints still behave at 320–390 px, and that card content — image, title,
description — stays inside the card and inside the viewport.

### S3 — Landing images at the smallest widths

Alex reports the hero images are not responsive at the smallest sizes. Measure them at 320/360/390
and make them fit. Note Sprint 4 sized these assets to ~2× their *measured* render size, so
changing display dimensions has a bundle implication — if you materially change how large they
render, say so, because the assets may want regenerating (that would be a follow-up, not this
sprint).

### S4 — While you are in Landing

There is a decorative "mouse-following gradient" `Box` (`opacity 0.1`, `primary.main`) that **has
no mouse tracking wired up at all** — it sits permanently at its default position, parked behind
the hero caption, and it is the last remaining Lighthouse `color-contrast` failure (3.33:1 in the
blue theme).

**Report on it; do not redesign it.** If it is genuinely dead decoration, say so and propose
removal — Sprint 10 owns themes and contrast and will make the call. If removing it is trivially
safe and fixes a measured contrast failure, you may remove it, but say clearly that you did.

---

## Acceptance

At **320, 360, and 390 px**, in all three layouts:

- No element's bounding box falls outside `[0, viewportWidth]`.
- `document.documentElement.scrollWidth === window.innerWidth` (no horizontal overflow).
- Every section's content is readable — not clipped, not 28 px wide, not requiring a horizontal drag.

Then confirm nothing above `sm` changed: desktop at 1280 px should be visually identical.

Re-run Lighthouse on a production build and report performance and accessibility. Current deployed
baseline: **98 / 96 / 100 / 100**, with **CLS 0.016** — CLS is the one to watch, since Sprint 8
found a single layout shift silently costing 21 performance points.

## Reporting

1. Commands run, with actual output.
2. Before/after `getBoundingClientRect()` numbers at all three widths for everything you fixed.
3. Which option you chose for C1 and C2's stacked form, and why.
4. Confirmation that desktop is unchanged.
5. Anything belonging to Sprint 10 (themes) or 11 (redesign) — log it, don't fix it.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
