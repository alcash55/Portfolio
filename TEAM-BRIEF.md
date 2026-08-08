# TEAM-BRIEF — Sprint 14: responsive repair, brand icons, hero controls

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
`grep -rn "TEAM-BRIEF" frontend/src` before you commit.

## Goal

Seven bugs Alex reported. Several are regressions or stale-target drift from earlier sprints, and
the causes are already found — don't re-derive them.

## Root causes I confirmed while scoping

1. **The hover glow is a hardcoded blue.** `Skills.tsx:25` and `Experience.tsx:174` both set
   `boxShadow: '0px 25px 20px -20px rgb(18, 72, 116)'`. A fixed blue against six themes — that is
   the whole inconsistency.
2. **The down arrow hardcodes the wrong target.** `Landing.tsx:417` is
   `scrollToSection('experience')` with `aria-label="Scroll to Experience section"`. It was written
   before About was inserted into the page in Sprint 4, so it now **skips a whole section**, and
   its accessible name is wrong too.
3. **The hero has no theme control at all.** `Landing.tsx` contains no settings/drawer trigger, and
   `useShowNavBar` hides the global NavBar (which carries the gear) while the viewport is on the
   hero. In the `mobile` and `sideNav` layouts the chrome provides its own trigger, so the gap is
   specifically **the `default` layout while on the hero**.
4. **Seven icons genuinely don't exist**: Vite, MUI, shadcn/UI, Tailwind, Supabase, Couchbase,
   PostgreSQL. Existing components are `Bun Docker Express Git Github Go Javascript Logo Ncr Next
   Node React Rmu SoleaEnergy Typescript Voyix`.

## Ground rules

- **78 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend untouched. **No `any`.** MUI is **v9**.
- **Six themes now** — dark, blue, light, red, purple, green. Everything must work in all of them,
  and **light inverts assumptions the other five share.**
- Baseline: **Accessibility 100 with zero failures**, Performance ~95. Don't regress either.
- **Measure with `getBoundingClientRect()` / computed styles, not screenshots.** A 320 px screenshot
  looks plausible while content is clipped.
- **Restart the dev server immediately before each measurement pass.** Vite's watcher is unreliable
  on this `/mnt/c` mount — it has now bitten six sprints, including me twice in the last hour.

### A trap that just cost me several passes — read this

MUI's `Card` sets `overflow: hidden`, and **a flex item only keeps its automatic minimum size while
its overflow is `visible`.** As children of `Home`'s flex column, section cards could therefore
shrink *below their own content* and silently clip the bottom. About was losing 1057 px at 390 px.

All five section cards now carry `overflow: 'visible'` to prevent it. **If you see content
disappearing rather than overflowing, suspect this before anything else** — and note
`height: auto` does *not* fix it; restoring the min-size does.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **responsive** | `Pages/About/**`, `Pages/Experience/**`, `Pages/Projects/**` | `Skills`, `Landing`, `AppShell` |
| **icons** | `assets/icons/**`, `Pages/Skills/**` | `Experience`, `About`, `Projects`, `Landing` |
| **hero** | `Pages/Landing/**`, `AppShell/**` | all other `Pages/**` |

### Shared decision — the glow, agreed up front so two agents converge

The glow lives in both `Skills.tsx` (icons agent) and `Experience.tsx` (responsive agent). There is
no shared file, so **both must apply the same formula**:

> Derive it from the active theme — `alpha(theme.palette.primary.main, …)` — rather than a literal
> colour. Keep the same offset/blur/spread geometry so only the hue changes.

Whoever finishes first, say in your report exactly what you used; the other matches it. If you
think a different token reads better across all six themes, **say so rather than diverging.**

---

## RESPONSIVE tasks

### R1 — About is cut off at many breakpoints

Alex reports it, and the section-card clipping fix above was only part of it. Sweep **320, 360,
390, 414, 600, 768, 900, 1280** and fix everything that clips, overflows, or becomes unreadable.
Report the measurements.

### R2 — The Experience timeline overlaps its dates with the content

Sprint 9 made the date stack above the card below `sm`. Alex reports dates now overlapping content,
so either that breakpoint is wrong or the two-column form persists where it shouldn't.

**History worth knowing so you don't repeat it:** the row is `[date][dot][card]`. At 320 px the
first two columns consumed 211 px of 272 px available. Sprint 7 tried three fixes that all failed —
`minWidth: 0` alone collapsed cards to 4 px, `alignItems: 'stretch'` did nothing, and a narrower
date column gave 28 px cards. Stacking was the answer. Find why it isn't holding.

### R3 — Projects cards cut off content on smaller screens

Same sweep. Note Grid moved to the v2 API in Sprint 7 (`size={{ xs: 12, sm: 6, md: 4 }}`).

### R4 — The Experience glow

Per the shared decision above.

---

## ICONS tasks

### I1 — Seven new brand icons

Vite, MUI, shadcn/UI, Tailwind CSS, Supabase, Couchbase, PostgreSQL.

Match the existing components' shape: a `SvgIcon` wrapper, sized by `TechIcon`. Study two or three
existing icons first — and note `TechIcon` exists specifically because several wrap a nested `<svg>`
with literal pixel dimensions that MUI's `fontSize` can't resize. **Don't reproduce that problem:**
a single `<svg>` with a `viewBox` and no width/height attributes is what you want.

**Theme-awareness is the requirement that matters.** Six themes including light:
- Where a brand mark is genuinely monochrome (shadcn/UI is a black-and-white mark), use
  `currentColor` so it inverts.
- Where a brand has real colours (Vite's gradient, Supabase green, PostgreSQL blue, MUI blue,
  Tailwind cyan), keep them — but **verify each stays visible on light *and* on the five dark
  backgrounds.** A mid-tone brand colour usually works on both; a near-white or near-black one
  won't.
- **Never hardcode white as a knockout** unless it sits on the icon's own opaque shape. That exact
  mistake made six existing icons invisible-on-white and was only caught because a light theme
  finally existed.

Decide per icon and report your reasoning. These are recognisable marks — approximate them
faithfully rather than inventing something unrecognisable, but a simplified geometric take is fine
and often reads better at 16 px.

### I2 — Wire them into Skills, and check the wordmark rule

`skillsData.ts` has a `wordmark` flag: true when the icon already spells the product name, so the
chip shows the mark alone and moves the name to its accessible label. **Set it correctly for each
new icon** — a Vite logo is a glyph (needs the text), a full "supabase" logotype would not be.

Verify at 320 px that Sprint 9's chip wrapping and card stacking still hold.

### I3 — The Skills glow

Per the shared decision above.

---

## HERO tasks

### H1 — The down arrow skips a section

`Landing.tsx:417` hardcodes `scrollToSection('experience')`. About sits between the hero and
Experience, so the arrow jumps past it. **Derive the target from `navLinks` — the first section
after the hero — rather than naming one**, which is what let this go stale in the first place.
Fix the `aria-label` to match, and make sure it can't drift again if a section is inserted.

### H2 — No way to change theme from the hero

In the `default` layout the global NavBar is hidden while the viewport is on the hero
(`useShowNavBar`), and Landing's inline nav has no settings trigger — so themes are unreachable
until you scroll. `mobile` and `sideNav` have their own triggers, so **the gap is `default` + hero.**

Add a settings-drawer trigger to Landing's inline nav, matching how `NavBar` opens the same drawer.
It needs an accessible name and a visible focus ring **in all six themes.**

Do not "fix" this by making the global NavBar always visible — hiding it over the hero is
deliberate design, and Sprint 8 fixed a related bug by making Landing's nav render only in
`default`. Keep that.

---

## Acceptance

- Nothing clips or overflows at 320/360/390/414/600/768/900/1280, in all six themes.
- The glow reads correctly in all six — same geometry, theme-derived hue.
- The down arrow goes to the section that actually follows the hero, with a matching accessible name.
- Themes reachable from the hero in the `default` layout.
- All seven new icons visible and legible on light *and* the five dark themes, at 16 px.
- **Accessibility stays 100 with zero failures.**

## Reporting

1. Commands run, with actual output.
2. Before/after measurements for every responsive fix — numbers, at each width.
3. Per-icon: what colour treatment you chose and why, plus its legibility on light.
4. The exact glow value you used (both agents must match).
5. Browser verification: themes × widths, and how you scripted it.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
