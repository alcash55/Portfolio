# TEAM-BRIEF — Sprint 12: Themes revisited

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
`grep -rn "TEAM-BRIEF" frontend/src` before you commit.

## Goal

Three things from Alex:

1. *"the light theme does not change the colors on the home section... compare it to what the red
   did and what the blue and dark does"*
2. *"I want the red theme to come back but cleaned up — I liked how it looked on the home page,
   but in other sections it was a bit too aggressive"*
3. *"add a purple and green theme"*

## The home-section bug — its cause is documented, don't rediscover it

Sprint 10 decided the landing hero should stay dark in **every** theme and pinned
`background.hero` to a fixed value. **That decision was wrong and is the bug.**

| theme | `background.default` | `background.hero` | |
| --- | --- | --- | --- |
| dark | `#202020` | `#202020` | same — follows the theme |
| blue | `#192231` | `#192231` | same — follows the theme |
| **light** | `#f4f5f7` | **`#202020`** | **pinned dark — the bug** |

For every dark theme the token *is* that theme's own surface, so the hero always followed. Only
light diverged, because it was forced to.

**The real work is not the token value.** `Landing.tsx` has **15 hardcoded
`rgba(255,255,255,…)` / `#fff` references** — that is *why* it was pinned, because white text
vanishes on a light hero. Those must become theme tokens. Once they are, the hero follows for free.

## Red: what "too aggressive" measures as

The deleted palette had `default: #310000` (deep near-black red — the hero Alex liked) and
`paper: #731010`, **a saturated blood red on every card and section surface.**

Blue reads calm because its paper is a *subtle lift* from its default in the same hue. As a
luminance difference, old red's card jumped **0.0340 — 3.4× blue's 0.0179**, and 2–3× every other
theme. That is the aggression, and the fix keeps the hero while dropping the shout.

## Palettes — designed and contrast-validated, use these

White body text unless noted. All clear AA (4.5:1 body, 3:1 large/UI) with margin.

| theme | `default` (hero/page) | `paper` (cards) | accent | text/default | text/paper | paper lift |
| --- | --- | --- | --- | ---: | ---: | ---: |
| dark *(existing)* | `#202020` | `#292929` | `#90caf9` | 16.29:1 | 14.55:1 | 0.0077 |
| blue *(existing)* | `#192231` | `#24344d` | `#7cc0ff` | 15.98:1 | 12.55:1 | 0.0179 |
| light *(existing)* | `#f4f5f7` | `#ffffff` | `#1565c0` | 16.96:1 | 18.50:1 | 0.0875 |
| **red (restore)** | `#2a0d0d` | `#3d1a1a` | `#ffab73` | 18.07:1 | 15.43:1 | 0.0100 |
| **purple (new)** | `#1c1526` | `#2b2038` | `#c9a7f5` | 17.73:1 | 15.37:1 | 0.0091 |
| **green (new)** | `#101f19` | `#1b3026` | `#7ddcae` | 17.04:1 | 14.02:1 | 0.0133 |

These are a validated starting point, not gospel — if measurement shows something off in context,
adjust and report the new numbers. **Do not adjust by eye without measuring.**

## Ground rules

- **70 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend untouched. **No `any`.** MUI is **v9**.
- Deployed baseline: **Performance 95 · Accessibility 100 with zero failures · SEO 100**, CLS 0.04.
  **Accessibility must stay at 100 in all six themes.**
- **Contrast measured, not judged** — composite ancestor backgrounds. Translucent overlays have
  produced wrong answers three times on this project.
- **Six themes × three layouts × 320 px and desktop is a large matrix — script the verification.**
  Clicking through it by hand will miss cases.
- **Restart the dev server immediately before each measurement pass.** Vite's watcher is unreliable
  on this `/mnt/c` mount; this has bitten five sprints including me personally.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **theme** | `frontend/src/layout/**`, `AppShell/InternalComponents/ThemeButton.tsx` | `Pages/**` |
| **hero** | `frontend/src/components/Pages/Landing/**` | `layout/**`, `ThemeButton.tsx` |

### Interface contract

**theme** owns every palette token. **hero** consumes them and must not add or edit a theme file —
if it needs a token that doesn't exist, it **reports** and theme adds it.

`background.hero` currently exists. **theme decides its fate** and tells hero: either it becomes a
per-theme surface that genuinely differs from `background.default`, or it is redundant and should
be removed in favour of `background.default`. Say which, and why, before hero builds against it.

---

## THEME tasks

### T1 — Six themes

Restore red with the toned palette; add purple and green; keep dark, blue, light. Every theme needs:

- `palette.mode` — a missing `mode` is what made the old red resolve near-black tokens for months.
- `palette.focusRing` — Sprint 10's token. A fixed white ring is invisible on light.
- The shared `muiButtonBaseOverrides`.
- **`primary.light` checked, not copied.** It is not automatically "the safe link colour":
  lightening raises contrast on a dark page and lowers it on a light one, which is why light had to
  pin it. Footer, About and Contact all read `primary.light` as their link colour — measure it per
  theme.

Also handle **stored-value migration**: a visitor may have `theme: 'red'` saved from before it was
removed, and red now exists again with a different palette. Make sure that path is sane.

### T2 — Fix the hero token

Per the interface contract, decide what `background.hero` should be now that the hero follows the
theme, and tell the hero agent. Light's hero must end up **light**.

### T3 — The toggle at six options

`ThemeButton` renders one `Button` per theme in a `Stack` — built for three. Six text buttons will
be cramped in the settings drawer, especially at 320 px.

**Direction (Alex may revisit, so keep it easy to change): swatch buttons that preview each
theme's own `default` and `paper` colours** rather than text labels. That scales, is
self-documenting, and shows what you're picking.

Requirements that are not negotiable: each option keeps an **accessible name** (the theme's name —
a colour swatch alone is not a name), `aria-pressed` reflecting selection, and a **visible focus
ring in the theme it switches to**. Verify at 320 px.

---

## HERO tasks

### H1 — Make the hero follow the theme

`Landing.tsx` has 15 hardcoded `rgba(255,255,255,…)` / `#fff` references — nav links, captions,
borders, social buttons, the scroll indicator. Convert them to theme tokens so the hero renders
correctly on **light** as well as the five dark themes.

Notes from earlier sprints that will save you time:

- The hero's caption sits over **ambient blend circles** with `mix-blend-mode`. Sprint 10 raised it
  to `0.82` alpha because it measured **3.81:1** against those circles and failed AA
  *intermittently* — the circles are randomly positioned, so a given audit could miss the overlap.
  **One passing measurement is not evidence here. Sample repeatedly.**
- Those same circles will need checking against a light background; they were only ever seen on
  dark.
- `prefers-reduced-motion` removes 30 particles. Don't regress that.

### H2 — Verify across all six

The hero is the section Alex specifically called out, so it carries the burden of proof. Measure
contrast for every text element against its **actual composited background** in each of the six
themes, and report the numbers.

---

## Acceptance

- The hero visibly follows the theme in all six, and is **light in the light theme**.
- Six themes selectable from the settings drawer, each with an accessible name and a visible focus
  ring in its own theme.
- **Accessibility 100 with zero failures in every theme** — sample the hero contrast repeatedly,
  given the intermittency above.
- Nothing outside `[0, viewportWidth]` at 320 px; `scrollWidth === innerWidth`.
- Performance and CLS no worse than the baseline.

## Reporting

1. Commands run, with actual output.
2. Measured contrast per theme — numbers, and say how many samples for the hero caption.
3. Your decision on `background.hero`'s fate and why.
4. Browser verification: themes × layouts × widths, and how you scripted it.
5. Your honest read on the six palettes in context — they are validated on paper, not in situ.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
