# TEAM-BRIEF — Sprint 11: Redesign and content

Scratch file, deleted at sprint end. **Never cite this file in a code comment** — it won't exist.
`grep -rn "TEAM-BRIEF" frontend/src` before you commit.

## Goal

Alex: *"Redesign (take inspiration from the home section) and add content"* — About Me is text-only
with no visuals at half screen width; Skills & Tech is extremely minimal; the Footer is very empty.
Plus, from him directly:

- *"About me is accurate enough, there is maybe some more information that can be grabbed from the vault"*
- *"the footer is just very empty and needs more content, make sure all links are included and the sitemap is accurate"*
- *"create some branding/icons... to fill some of the gaps where we need content"*

**The landing/home section is the visual reference.** Match its language — generous spacing, layered
surfaces, restrained type — don't invent a second visual system.

## Almost everything you need already exists. Use it before inventing.

Verified while scoping. Do not re-derive:

1. **`About/aboutme.MD` is a dead file** — nothing imports it (grepped). It holds real content Alex
   wrote: bio, a "What Drives Me" list, a tech snapshot, and an "Outside of Work" section
   (coaching lacrosse, two dogs). `About.tsx` renders its *own* separate hardcoded copy.
   **Two sources of truth, one invisible.** Alex confirms the MD is "accurate enough" — treat it as
   canonical, reconcile with what's rendered, and do not end the sprint with both still present.
2. **11 tech icon components are imported nowhere**: `Bun`, `Docker`, `Express`, `Git`, `Github`,
   `Go`, `Javascript`, `Next`, `Node`, `React`, `Typescript`. Skills renders plain text chips.
   These are the visuals Skills is missing — already built, and made theme-aware in Sprint 10.
3. **`aboutme.MD`'s tech list is richer than Skills'.** Skills has 11 chips; the MD also names SQL,
   Single-SPA, MUI, Tailwind, Vite, Couchbase, PostgreSQL, GitHub Actions, REST APIs, CI/CD.
4. **A new `Logo` monogram exists** (`assets/icons/Logo.tsx`) and is wired up nowhere yet.
   `SettingsDrawer.tsx:66` still contains the literal placeholder text **"Insert Logo/Brand"**.

### From Alex's Obsidian vault — real content, cleared for use

`Learning/Frontend Masters (Master.dev)/` contains **7 completed courses**: API Design in Node,
Basics of Go, Complete Intro to Containers, Fullstack for Frontend, Interviewing for Frontend
Engineers, Intro to Databases, Web Authentication APIs.

That is genuine, verifiable professional development and a strong answer to "About needs more
content". Use it if it earns its place — **do not invent additional courses, dates, employers,
credentials, or claims about Alex.** If you want content that isn't listed here or in
`aboutme.MD`, leave a clearly-marked placeholder and say so in your report.

## Ground rules

- **70 frontend tests must pass**, plus `bun run lint` (`--max-warnings 0`), `bunx tsc --noEmit`,
  `bun run build`. Backend untouched. **No `any`.** MUI is **v9**.
- **Four dimensions must hold for every piece of new markup**: three themes (dark, blue, **light**),
  three layouts (default, mobile, sideNav), desktop **and 320 px**, plus reduced-motion.
- Deployed baseline to protect: **Performance 98 · Accessibility 100 with zero failures ·
  SEO 100**, CLS 0.016.
- Heading levels are enforced and tested: one `<h1>` per page (the hero), `h2` per section,
  `h3` per card. Do not introduce a second `h1`.
- **Contrast measured, not judged** — AA 4.5:1 body, 3:1 large text and UI. Composite ancestor
  backgrounds; translucent overlays have produced wrong answers twice on this project.
- **Restart the dev server immediately before each measurement pass.** Vite's watcher is unreliable
  on this `/mnt/c` mount; this has bitten four sprints including me personally.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **about** | `frontend/src/components/Pages/About/**`, `frontend/src/components/Pages/Skills/**` | `AppShell/**`, `Landing/**` |
| **footer** | `frontend/src/components/AppShell/InternalComponents/Footer.tsx`, `SettingsDrawer.tsx`, `NavBar.tsx`, `SidebarNav.tsx` | `Pages/**` |

Both may **use** `assets/icons/**` (import only). If the monogram itself needs changing, say so —
Alex has said there may be a few iterations on it, so report rather than restyle it unilaterally.

---

## ABOUT tasks

### A1 — Resolve the two-sources-of-truth problem

`aboutme.MD` is the better copy and Alex has confirmed it. Decide how it should live: rendered from
the markdown, or lifted into a typed data module beside the component like `staticProjects.ts` and
`experienceData.tsx` already do. **A typed module is likely the better fit** — it matches existing
convention, avoids adding a markdown pipeline, and lets sections be laid out individually. Say
which you chose and why. Either way, **one source survives.**

### A2 — Redesign About

Currently a half-width text block with no visuals. It should use the full width and have visual
structure. The content is already sectioned — bio, What Drives Me, Tech Snapshot, Outside of Work —
so it wants a layout that gives those distinct shapes rather than one paragraph run.

**On visuals:** there is **no headshot in the repo**, and all four personal photos
(`joshua_tree`, `rmu_lacrosse`, `troy_leon`, `west_ms_coaching`) are already used in the Landing
hero — reusing them here reads as repetition. So build the visual interest from what you have:
the monogram, the tech icons, iconography for the "What Drives Me" points, and layered surfaces in
the hero's idiom. **Do not generate or invent photographs of Alex.**

The Frontend Masters courses are good material for a "continuous learning" element if it fits.

### A3 — Redesign Skills & Tech

Replace text-only chips with the 11 existing icon components, and expand the list using
`aboutme.MD`'s own tech snapshot. Keep the category structure (Languages / Frameworks / Tools) or
improve it — the MD implies richer grouping (Databases, CI/CD) that the current three don't cover.

Sprint 9 fixed chip wrapping and card stacking here; **do not regress it** — verify at 320 px.

Six of those icons are brand marks with their own colours and three were fixed in Sprint 10 for
theme-awareness. Check each renders legibly on **light** as well as dark — that is the case nobody
has seen yet, since none were mounted when Sprint 10 ran.

---

## FOOTER tasks

### F1 — Fill the footer out

Currently a "Sitemap" heading and a few links at 50 % width. Alex wants real content, **all links
included, and the sitemap accurate.**

- **Make the sitemap actually accurate.** `navLinks.ts` is the single source for section links
  (Sprint 8 consolidated four separate lists into it, which is how the About section went four
  sprints with nothing linking to it). The footer must derive from it, not maintain a fourth list.
- **All links** means the section links plus the external ones — GitHub, LinkedIn, email, and the
  resume PDF. Check the hero's social buttons and About's resume link for what already exists so
  nothing is missed and nothing points somewhere different from its counterpart elsewhere.
- Give it structure — columns, a brand area, a copyright line — in the hero's visual language.

External links need `rel="noopener noreferrer"` with `target="_blank"`, and every icon-only link
needs an accessible name. Sprint 8 fixed exactly these and accessibility is at 100 — do not
regress it.

### F2 — Wire up the monogram

`SettingsDrawer.tsx:66` has the literal placeholder **"Insert Logo/Brand"**. Replace it with
`<Logo />`.

Then use the mark where it earns its place: the footer's brand area, `NavBar`, and `SidebarNav`'s
header — note `SidebarNav` currently renders "Alex Cash" as a `<div>` styled to look like a
heading, and the collapsed rail (72 px) is a natural home for the mark alone.

**The monogram must follow the theme.** It is stroke-drawn with `currentColor` and there are tests
pinning that (`Logo.test.tsx`). Verify in a **real browser across all three themes** once mounted —
that has not been possible until now because nothing rendered it. If it reads poorly at any size or
on any theme, **report it**; Alex expects to iterate on the mark and would rather hear it than have
it quietly restyled.

Optional, only if clean: the favicon set predates this mark. Regenerating it from the monogram
would unify the brand — but `manifest.json` icon paths were fixed in Sprint 1 after being broken in
production, so touch that only if you can verify every path still resolves in `dist/`.

---

## Acceptance

- One source of truth for About's copy; `aboutme.MD` not left orphaned alongside a duplicate.
- Skills renders real icons, drawn from existing components.
- Footer derives its sitemap from `navLinks.ts` and includes every external link.
- The monogram renders correctly in all three themes, at nav size and footer size.
- **Accessibility stays at 100 with zero failures**, in every theme.
- Nothing outside `[0, viewportWidth]` at 320 px; `scrollWidth === innerWidth`.
- Performance and CLS no worse than the baseline above.

## Reporting

1. Commands run, with actual output.
2. Which content came from `aboutme.MD`, which from the vault course list, and **anything you left
   as a placeholder rather than inventing**.
3. Measured contrast per theme for new markup — numbers.
4. Browser verification: themes × layouts × widths, and how you measured.
5. Your honest read on the monogram at real sizes, since Alex expects to iterate on it.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
