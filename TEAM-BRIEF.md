# TEAM-BRIEF — Sprint 4: Performance, SEO, accessibility, consistency

Scratch file. Deleted at the end of the sprint.

## Goal

The site works and is reliable. This sprint makes it hold up to the scrutiny it exists to invite.

The headline number: **`dist/` is 5.0 MB and ~4.3 MB of that is four images** — `joshua_tree.jpg`
(1.9 MB), `troy_leon.jpg` (1.3 MB), `portfolio.png` (455 KB), `west_ms_coaching.jpg` (377 KB) —
several of which render at roughly 200 px. That is the single biggest available win and should cut
page weight by close to an order of magnitude.

Alongside that: the page has no meta description, no Open Graph tags (links shared to LinkedIn or
Discord render bare), no `robots.txt`, a `sitemap.xml` whose `lastmod` says 2024-01-25, **seven
`<h1>` elements**, unconditional animation with no `prefers-reduced-motion` handling, and hardcoded
hex colors that ignore the theme system.

## Ground rules

- **All 50 frontend tests must still pass**, plus `bun run lint` (`--max-warnings 0`),
  `bunx tsc --noEmit`, and `bun run build`. If you change behavior a test pins, update the test in
  the same commit — never delete or weaken one.
- **No `any`.** Project standard.
- **This is a polish sprint, not a redesign.** Visual output should be equivalent or better, never
  arbitrarily different. If a fix requires a visible change, say so explicitly in your report.
- **Browser verification is required** for every role. The Playwright MCP tools are listed in your
  allowlist but are frequently **not** actually available — check, and if they aren't, drive
  `playwright-core` directly against `bun run dev` (http://localhost:3005/Portfolio/) rather than
  skipping it. Screenshot evidence at desktop **and** mobile widths.

## Ownership — strict file boundaries

Three agents in parallel. These boundaries were chosen so nobody shares a file. **Do not edit
outside your list.** Report cross-boundary findings instead of fixing them.

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **seo** | `frontend/index.html`, `frontend/public/**` | all of `frontend/src/**` |
| **perf** | `frontend/src/assets/**`, `frontend/src/components/Pages/Landing/**`, `frontend/src/components/Pages/Projects/**`, `frontend/vite.config.ts` | every other component |
| **a11y** | `frontend/src/components/Pages/{Skills,Experience,Contact,About,Home}/**`, `frontend/src/components/AppShell/InternalComponents/{Footer,SettingsDrawer}.tsx`, `frontend/src/components/Pages/index.ts`, `frontend/src/layout/**` | `Landing/**`, `Projects/**`, `index.html`, `public/**` |

Nobody touches `backend/**`, `.github/**`, `README.md`, or `frontend/src/components/ConnectForm/**`.

---

## SEO tasks

You own `frontend/index.html` and `frontend/public/**` only. Read `src/` for context (e.g. to write
an accurate description) but do not edit it.

The existing `index.html` already has favicons, viewport, theme-color, and JSON-LD structured data.
Preserve all of it — you are adding, not rewriting.

### S1 — Meta description and social cards

- `<meta name="description">` — there is none. The JSON-LD has a description but the HTML doesn't,
  and that is what search results show. Write something accurate for a software engineer's
  portfolio; don't keyword-stuff.
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`.
- Twitter: `twitter:card` (use `summary_large_image`), `twitter:title`, `twitter:description`,
  `twitter:image`.

**`og:image` must be an absolute URL** — relative paths do not work in social crawlers. The site is
served from `https://alcash55.github.io/Portfolio/`, so account for the `/Portfolio/` base path.
Note that everything in `public/` is copied to the site root *under that base*, so a file at
`public/og-image.png` is served at `https://alcash55.github.io/Portfolio/og-image.png`.

You need an actual image to point at. There is no dedicated OG image today. Either point at an
existing suitable asset in `public/` or create a simple one (1200×630 is the standard). Python's
PIL is available (`python3 -c "import PIL"` works, v12.1.1) if you want to generate one. Keep it
tasteful and under ~200 KB. Say what you chose and why.

### S2 — `robots.txt`

There is none. Add one to `public/` allowing crawlers and pointing at the sitemap's absolute URL.

### S3 — Fix the stale sitemap

`public/sitemap.xml` has `lastmod` of `2024-01-25T08:07:32+00:00`. It has exactly one URL entry,
which is correct — the app is a single page with client-side section scrolling, not multiple routes.

Do not hand-edit the date; it will just go stale again. **Generate it at build time** so it cannot.
Keep this simple — a small script invoked from the build, or a tiny Vite plugin in a file you own.
Note `vite.config.ts` belongs to the perf agent, so if your approach needs a config change, **stop
and report that** rather than editing it; prefer an approach that doesn't.

### S4 — `404.html` for GitHub Pages

Pages serves its own 404 for unknown paths, so the app's `Error` page is currently reachable only
via client-side navigation — a direct hit or refresh on `/Portfolio/anything` never loads the app
at all.

Add a `public/404.html`. The standard approach for an SPA on Pages is a redirect shim that sends
the user back to the app while preserving the path. Keep it simple and dependency-free, and make
sure it works with the `/Portfolio/` base path. **Verify it doesn't cause a redirect loop** — that
is the classic failure mode of this pattern, and it makes the whole site unusable.

Verify your changes survive `bun run build` by inspecting `dist/`.

---

## PERF tasks

You own `frontend/src/assets/**`, `Pages/Landing/**`, `Pages/Projects/**`, and `vite.config.ts`.

### P1 — Optimize the images (the headline task)

Four files are ~4.3 MB of a 5.0 MB build.

**First, measure the actual rendered size in a browser.** Don't assume — load the page and read the
real displayed dimensions of each image at both desktop and mobile widths. Resize to roughly 2×
the largest displayed dimension (for crisp rendering on high-DPI screens), not to the original.

**Format decision — made, don't relitigate:** convert to **WebP without JPEG/PNG fallbacks.** The
recorded plan said to keep fallbacks; that is now unnecessary — WebP is supported by every browser
in current use, and maintaining `<picture>` fallback markup for a vanishing tail is complexity this
project doesn't need. If you find a concrete reason this is wrong, say so rather than working
around it.

**Tooling:** Python **PIL 12.1.1 is available** and handles WebP — use it. `ffmpeg` is also present.
**Do not add an npm dependency** for this; the conversion is a one-time build-asset change, not a
runtime concern.

Delete the originals once converted — leaving both doubles the repo's asset weight for no benefit,
and `git` retains the history if anyone needs them.

Report the before/after byte size of every image and the total `dist/` size.

### P2 — Bundle investigation

The main JS chunk is 356 KB (~118 KB gzip), mostly MUI. Investigate:
- Are barrel imports (`import { Box, Button } from '@mui/material'`) pulling in more than needed
  under the current Vite/Rollup setup? Modern MUI + Vite usually tree-shakes these correctly —
  **verify rather than assuming either way**, and don't churn imports across the codebase on a
  hunch.
- Are the lazy page splits actually paying off, given `Home` renders every section anyway?

**Most files you'd need to change here belong to other agents.** So this is primarily an
*investigation*: make changes only within your own files, and **report** everything else with
specifics for a later sprint. A measured finding is worth more than a speculative refactor.

### P3 — `prefers-reduced-motion`

`Landing.tsx` renders 30 randomly-positioned animated particles plus pulse/float animations,
unconditionally. Users who have asked their OS to reduce motion should not get any of it.

Respect `prefers-reduced-motion: reduce` — disable or substantially reduce the particles and
animations. MUI's `useMediaQuery('(prefers-reduced-motion: reduce)')` works, as does a CSS media
query; your call. **Verify it actually works in a browser** by emulating the preference
(Playwright can do this) — not just by reading the code.

### P4 — Landing and Projects consistency

Within your two files only:
- `Landing.tsx:46` hardcodes `bgcolor: '#000'` and the hero hardcodes black-on-white **regardless
  of the selected theme** — so the landing section ignores the theme switcher entirely. Replace
  with theme tokens.
- `Projects.tsx:114` hardcodes `bgcolor: '#202020'`. Replace with a theme token. Note
  `darkTheme.ts` already defines `background.default: '#202020'` — check whether that is the right
  token before inventing a new one. (`layout/Theme/**` belongs to the a11y agent — if you need a
  *new* token added there, report it, don't add it yourself.)
- `Projects.tsx:82` sets `component: 'h1'` on its section header. There must be exactly one `<h1>`
  per document. Change yours to `h2`. (The a11y agent is fixing the other five.)
- `Landing.tsx` has its own inline nav duplicating `NavBar`'s links. Consolidate if you can do it
  cleanly within your files; if it requires touching `AppShell/**`, report instead.

### P5 — Measure

Run Lighthouse against the production build and record before/after. Try `bunx lighthouse` against
a local preview of `dist/`. If it isn't installable or runnable in this environment, **say so
plainly** and instead report measured transfer sizes (total `dist/`, largest chunks, image bytes)
before and after. Do not report a Lighthouse score you did not actually produce.

---

## A11Y tasks

You own `Pages/{Skills,Experience,Contact,About,Home}/**`, `AppShell/InternalComponents/Footer.tsx`
and `SettingsDrawer.tsx`, `Pages/index.ts`, and `layout/**`.

### A1 — Exactly one `<h1>` per document

There are currently **seven**. In your files: `About.tsx:35`, `Contact.tsx:96`, `Experience.tsx:36`,
`Skills.tsx:31` (all `component: 'h1'` on `CardHeader`), plus `Footer.tsx:18` renders "Sitemap" as
`h1` and `SettingsDrawer.tsx:40` does the same. (`Projects.tsx` is the perf agent's.)

Section headers should be `h2`. Decide where the single legitimate `h1` lives and say why —
`Landing` is the natural home, but that file isn't yours, so **if the one true `h1` should live
there, report that as a required follow-up** rather than leaving the page with zero `h1`s. Leaving
zero is worse than leaving several.

Verify the resulting heading outline in a browser (query all `h1`–`h6` in document order and check
it descends sensibly without skipping levels).

### A2 — Replace hardcoded colors with theme tokens

`agents.md` forbids hardcoded colors and there are several in your files: `Experience.tsx:86-87`
(`#18181b`, `2px solid #27272a`) and `Skills.tsx:55-56,74-75,93-94` (same pair, repeated three
times). Use theme tokens. If the palette lacks a suitable token, add one in `layout/Theme/**`
(which you own) rather than inventing a one-off hex.

Check the result in **all three themes** (dark / blue / red) — a token that looks right in one and
unreadable in another is not a fix.

### A3 — Contrast and focus-visible audit

Across all three themes. The known suspect is `rgba(255,255,255,0.5)` text on the landing hero, but
audit broadly. Check contrast ratios against WCAG AA (4.5:1 for body text, 3:1 for large text) and
confirm every interactive element has a visible focus indicator.

Fix what is in your files; **report** what isn't (the landing hero is the perf agent's file).

### A4 — Keyboard-only pass

Tab through the nav, the settings drawer, and the contact form. Confirm: focus order is logical,
nothing is reachable-but-invisible or visible-but-unreachable, the settings drawer traps focus
while open and returns it on close, and Escape closes it.

The contact form is `ConnectForm/**` and belongs to nobody this sprint — **test it, report
findings, do not edit it.**

### A5 — `About` is dead code

`About` is exported from `Pages/index.ts` and has real content (`aboutme.MD`), but `Home` composes
only Landing / Experience / Skills / Projects / Contact — so it renders nowhere.

Decide: wire it into `Home` or delete it. **Recommendation: wire it in** — it is written content
that a portfolio benefits from, and deleting authored material is the less reversible choice. If
you wire it in, place it sensibly in the page order and make sure its heading level fits A1.

### A6 — The resume PDF is unreachable

`src/assets/AlexResume.pdf` is referenced **nowhere in `src/`** — I grepped. It ships in the repo
and a CI workflow reads it, but nothing in the UI links to it. A portfolio whose resume cannot be
reached is a real gap.

Add a link to it somewhere sensible that you own (the About section is a natural home, or the
Footer). Make it open in a new tab with `rel="noopener noreferrer"`, and give it an accessible
name that says what it is. Do not restructure navigation to accomplish this.

---

## Reporting

End your report with:

1. Every command you ran to verify, with actual output.
2. Before/after measurements for anything you claim improved — real numbers, not estimates.
3. Browser verification: which routes, widths, and states you exercised, and how.
4. Anything you wanted to touch but couldn't because of the ownership boundary — be specific, since
   another agent or a later sprint will pick it up.
5. Anything out of scope you found.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
