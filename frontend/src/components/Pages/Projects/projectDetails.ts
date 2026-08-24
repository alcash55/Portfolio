// FIRST DRAFT -- written to be edited, not shipped as-is.
//
// Alex: every word below was drafted from your Obsidian notes in
// `Dev Projects/` plus what could be verified in this repo, so it is accurate
// as far as the notes go but it is not your writing. Rewrite freely. The
// structure is the part worth keeping; the sentences are a starting point so
// there was something to react to instead of an empty file.
//
// Two projects get the long-form treatment (The problem / What was hard /
// What I'd do differently) because they are the two finished ones. The other
// three get a single paragraph on what they are and how they work. Adding
// `sections` to one of those three is all it takes to promote it.
//
// Rules this copy tries to follow, so edits stay consistent with it:
//   - No adjective that cannot be checked. "Fast" is marketing; "0.54s cold,
//     0.0003s warm" is evidence.
//   - Every number here is one that was actually measured. If you cannot
//     point at where a number came from, cut it rather than round it.
//   - Test counts are NOT typed here -- they come from `siteStats`, which the
//     build regenerates from the test runners themselves.
import { siteStats } from '../../../generated/siteStats';

/**
 * Lighthouse scores are the one set of numbers on this page that cannot be
 * generated: they need a real audit against the deployed site, which no build
 * step here runs. **So they are hand-maintained, and they are the first thing
 * to go stale.** Re-run Lighthouse against the live site after any significant
 * change, update these four numbers and the date, and leave the date honest --
 * a visitor can tell the difference between "measured last week" and a number
 * with no date on it at all.
 */
export const LIGHTHOUSE_SCORES = {
  performance: 93,
  accessibility: 100,
  bestPractices: 96,
  seo: 100,
  /** When these four were last actually measured. Update it with them. */
  measured: 'August 2026',
} as const;

export interface ProjectDetailSection {
  /** Rendered as an `<h3>` inside the dialog, under the dialog's own title. */
  heading: string;
  /** One string per paragraph. */
  body: string[];
}

export interface ProjectDetail {
  /**
   * What it is and how it works, in one paragraph. Every project has one --
   * this is the whole body for a project without `sections`, and the lead-in
   * for one with them.
   */
  summary: string;
  /**
   * The long-form treatment. Present only for the projects finished enough to
   * have a story worth telling; absent means the summary stands alone, which
   * is a deliberate state and not a TODO.
   */
  sections?: ProjectDetailSection[];
  /** What it is built with. Rendered as chips, in rough order of weight. */
  tech: string[];
  /**
   * Short measured facts, rendered as a caption list under the tech. Numbers
   * only, and only ones that were actually measured -- this list is the part
   * that makes the paragraphs above it checkable.
   */
  facts?: string[];
}

/**
 * Keyed by `StaticProject.name`, which is what the cards render and what the
 * dialog looks up. A project with no entry here still opens a dialog: it gets
 * its card description, its metadata and its links, just no long copy. That
 * matters because `staticProjects.ts` is the source of truth for which
 * projects exist, and a new project must never be able to break the dialog by
 * simply not having been written about yet.
 */
export const projectDetails: Partial<Record<string, ProjectDetail>> = {
  'Portfolio Website': {
    summary:
      'This site. React, TypeScript and MUI on the front, a Go API on the back, built by Vite and deployed to GitHub Pages by GitHub Actions. Six themes and three layout modes, live GitHub metadata on the project cards, and a browser suite that gates every deploy.',
    sections: [
      {
        heading: 'The problem',
        body: [
          'A portfolio is the worst format for showing how someone works. It is easy to write "accessible, responsive, tested" and impossible for a reader to check any of it, so the words are worth nothing. The only way out is to build the site so that the claims are checkable from the outside.',
          `That is what everything here is for. Six themes and three layout modes, each measured for contrast rather than eyeballed. A live projects list that keeps working when its API does not. ${siteStats.unitTests} unit tests and ${siteStats.browserTests} browser tests that gate the deploy. Even the two numbers in that sentence are generated at build time by the test runners, because a hand-typed count is wrong the moment somebody writes a test.`,
        ],
      },
      {
        heading: 'What was hard',
        body: [
          'Contrast, twice, from one cause. The blue theme failed WCAG AA and the code looked correct both times: MUI\'s `getContrastText` flips its text to white as soon as a background clears *its* 3:1 threshold — but 3:1 is the bar for large text and UI components, not the 4.5:1 that body text has to meet. Pinning `contrastText` explicitly took that palette from 4.99:1 to 12.72:1. All six themes are measured now, against the surface a colour actually renders on, with translucent overlays composited in before the ratio is taken.',
          'Then the honest failure states. The project cards are live GitHub data through a Go API with a one-hour in-memory cache and a single-flight refresh — probed with 50 concurrent requests against a cold cache, which produced 2 upstream calls rather than 50, and 0.54s cold against 0.0003s warm. When a refresh fails the API serves the stale copy and the section says so out loud. When the API is unreachable altogether the section falls back to the hand-written list and is meant to be indistinguishable from a normal render. That last case is the harder half and the one the tests actually pin down.',
          'And the tests themselves lie if you let them. The browser suite passed three times locally and failed on its first CI run: a Go backend happened to be running on my machine, so "zero console errors on load" had quietly been asserting that the API was up. The fallback was right; the test was environment-dependent. It stubs the request now.',
        ],
      },
      {
        heading: "What I'd do differently",
        body: [
          'Measure from the first commit instead of from the audit. Every contrast bug here was found by computing ratios with the ancestor backgrounds composited, and none of them by looking at the screen — three SVG marks rendered black-on-black across five dark themes for weeks, because a dark glyph on a dark chip still reads as "an icon is there".',
          'And read the CSS before fixing it. One rule — `section { height: calc(100vh - 73.98px) }` — produced four different-looking bug reports across three sprints, and I fixed it wrongly twice before deleting it. The tell was on screen the whole time: three sections with unrelated content all reporting exactly 826px. When several elements measure the same, stop debugging the content.',
        ],
      },
    ],
    tech: [
      'React',
      'TypeScript',
      'MUI',
      'Vite',
      'Go',
      'Gin',
      'Playwright',
      'Vitest',
      'GitHub Actions',
    ],
    facts: [
      `${siteStats.unitTests} unit tests and ${siteStats.browserTests} browser tests gate every deploy`,
      `Lighthouse ${LIGHTHOUSE_SCORES.performance} performance / ${LIGHTHOUSE_SCORES.accessibility} accessibility / ${LIGHTHOUSE_SCORES.bestPractices} best practices / ${LIGHTHOUSE_SCORES.seo} SEO, measured ${LIGHTHOUSE_SCORES.measured}`,
      'Six themes and three layout modes, all measured against WCAG AA',
      'Projects API: 1h cache, single-flight refresh — 0.54s cold, 0.0003s warm',
      'Image weight of the built site: 5.0 MB down to 1.2 MB',
    ],
  },

  'The Cliper-er': {
    summary:
      'An automation pipeline that turns YouTube and Twitch clips into captioned, upload-ready YouTube Shorts. Fetch candidates from the source channel, download with yt-dlp, find the best engagement window, reformat to 1080x1920 with FFmpeg, burn in captions from faster-whisper, and upload through the YouTube Data API. It runs unattended on a daily schedule.',
    sections: [
      {
        heading: 'The problem',
        body: [
          'A clips channel is an evening a week in an editor, and almost none of that evening is creative. Find a clip worth posting, download it, find the thirty seconds that actually land, crop 16:9 into 9:16 without cutting the action out of frame, caption it, write a title and tags, upload, repeat. Every one of those steps is mechanical, which makes the whole thing a pipeline problem rather than an editing problem.',
        ],
      },
      {
        heading: 'What was hard',
        body: [
          'Deciding what is in the frame, because the obvious signals do not work. Facecam detection is the clearest case: IRL streams kept triggering the split-screen layout meant for a webcam, since on an IRL stream the whole frame *is* the camera. The signals I expected to separate the two — face scale, boundary continuity — did not, measured across all 15 real clips I had. What did was crowd density: IRL footage runs 3.7 to 10.2 face detections per frame against 0.6 to 2.6 for a genuine facecam. A threshold at 3.0 passes all five true facecams and rejects all five IRL clips.',
          'The second hard part was not a code problem at all. Thirteen uploads in a row got zero views, and reading YouTube\'s own policy text rather than the SEO blogs pointed at "inauthentic content" — templated output produced at scale — more than at reused content. Cropping and captioning are production polish, not a narrative, which is the bar the policy actually describes. So the pipeline now writes a per-clip story line and an on-screen hook card, and hashtags went from padding to fifteen with generic filler down to three to five real ones with `#shorts` dropped, since YouTube has classified Shorts by aspect ratio and duration since 2023 and that tag is now a wasted slot.',
        ],
      },
      {
        heading: "What I'd do differently",
        body: [
          'Calibrate on real footage before writing the detector. The facecam gates were built from a hypothesis about which signals would separate the classes, and every one of those signals turned out not to. An afternoon with the fifteen clips already sitting in `downloads/` and a calibration script would have found crowd density on day one. That script exists now and it is the piece of the work I would keep.',
          'I would also put the repo under git before the second overhaul rather than after it, and I would treat "the platform is suppressing me" as the last hypothesis instead of the first — the check that would have settled it (YouTube Studio, per-video restriction notices) takes about a minute and rules out the interesting explanation for free.',
        ],
      },
    ],
    tech: [
      'TypeScript',
      'Node.js',
      'FFmpeg',
      'yt-dlp',
      'faster-whisper',
      'YouTube Data API',
      'Twitch Helix API',
      'Ollama',
    ],
    facts: [
      '227 tests',
      'Shorts up to 58s at 1080x1920, captions burned in',
      'Facecam gate calibrated on 15 real clips: 5/5 true cams pass, 5/5 IRL reject',
      'No public repo — the channel is the output',
    ],
  },

  'Game Competition Website': {
    summary:
      'A web app for running OSRS bingo competitions: teams race to complete tasks on a shared board, progress is pulled live from the OSRS hiscores API, and admins build boards, draft teams and review evidence from their own panel. React, TypeScript and MUI on the front; an Express and TypeScript API on the back; Postgres, storage and auth through Supabase with JWT role-based access. Tile completions arrive as screenshots, so a Discord bot ingests them straight from a channel into a private bucket, an admin approves or denies each one, and approved drops count toward the team score — with pasted image links accepted through the same hardened path.',
    tech: [
      'React',
      'TypeScript',
      'MUI',
      'Vite',
      'Node.js',
      'Express',
      'Supabase',
      'PostgreSQL',
      'Discord API',
    ],
    facts: ['104 backend tests', 'Screenshot review pipeline live since July 2026'],
  },

  'AC Composite Actions': {
    summary:
      'The CI/CD building blocks my other repos share: a pull-request diff action, a résumé ATS check, markdown spellchecking, and Discord notifications, each a GitHub Actions composite action. Consumers reference them at `@main`, so every change is live the moment it lands and renaming an input is immediately breaking — which is exactly why the `diff` action was rebuilt. It ran, but it was quietly wrong in four ways: two outputs were set by the script and never declared in `action.yml`, so no caller could read them; an empty pull request exited before setting `DIFF`; `listFiles` was unpaginated, and GitHub returns 30 files a page, so any larger PR was silently truncated (a real one returned 33); and `parseInt` accepted `12abc` as PR 12 rather than failing. It ships with 36 tests now, and the PR-number tests failed against the first implementation — which is the bug they existed to find.',
    tech: ['JavaScript', 'GitHub Actions', 'Bun', 'Vitest'],
    facts: ['36 tests on the `diff` action', 'Consumed at `@main` — no tagged releases yet'],
  },

  'VS Code Royalty Theme': {
    summary:
      'A published VS Code colour theme built from the colours of 16th-19th century European royalty — white, gold and purple. v3.0.0 was an accessibility rebuild, because measurement showed why the theme was hard to read: five of nine syntax colours were below WCAG AA against the editor background, with keywords at 2.96:1 and storage types at 2.45:1, roughly half the readable minimum on two of the most common token types in any file. The cause was the background rather than the syntax colours — nothing reaches AA against a mid-tone grey-purple — so it moved to a deep plum and the palette was rebuilt on top of that. The theme JSON is generated from a single palette module now rather than hand-maintained across 2110 lines, contrast is measured against the surface each colour actually renders on, and `npm run check` fails the build on any regression: 174 colour pairs, 0 failures, 158 at AAA.',
    tech: ['VS Code', 'Node.js', 'JSON'],
    facts: [
      '174 colour pairs checked, 0 failures, 158 at AAA',
      '241 per-language token rules down to 43 scope-level ones',
    ],
  },
};

export default projectDetails;
