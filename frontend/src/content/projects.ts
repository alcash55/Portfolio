// Page bodies for the six project pages and the two experience pages. Each string
// is a row of the copy deck. Two kinds of row are left out on purpose:
//   - Comp-only placeholders: the pending-domain note and the publish-pending marker.
//     Each has a production fallback, applied here.
//   - The test-count stat (PD-16) is not typed here. Its numbers come from the test
//     runners through scripts/generate-site-stats.mjs, and the stat is dropped when the
//     build could not read them.
import { siteStats, testCountStat } from '~/lib/siteStats';
import type { ExperienceSlug, ProjectSlug } from './pages';
import { EXPERIENCE_SLUGS, PROJECT_SLUGS } from './pages';

export type DetailSlug = ProjectSlug | ExperienceSlug;

// ---------- Diagram ----------

/** Which side of a node an edge leaves from or arrives at. */
export type Side = 'l' | 'r' | 't' | 'b';

export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  /** Second line under the label. Empty when the label needs two lines itself. */
  readonly sub: string;
  /** Column, in units of the node pitch. */
  readonly col: number;
  /** Top edge in the diagram's own coordinates. */
  readonly y: number;
  /** Drawn dashed: not built yet. */
  readonly planned: boolean;
}

interface EdgeBase {
  readonly from: string;
  readonly fromSide: Side;
  /** 0 to 1 along the side. Defaults to the middle. */
  readonly fromAt?: number;
  readonly planned?: boolean;
}

export type DiagramEdge =
  | (EdgeBase & {
      readonly kind: 'link';
      readonly to: string;
      readonly toSide: Side;
      readonly toAt?: number;
      /** The flow written out. Null draws the arrow without a number or a sentence. */
      readonly text: string | null;
    })
  /** An arrow that leaves the diagram, labeled "The build". */
  | (EdgeBase & { readonly kind: 'exit'; readonly text: string });

export interface Diagram {
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  /** The text version: the same nodes and flows as the drawing, in sentences. */
  readonly alt: string;
}

// ---------- Page ----------

export interface ExternalLink {
  readonly label: string;
  readonly href: string;
  /** Hidden below 1024px, for a link that needs a keyboard and mouse. */
  readonly desktopOnly?: boolean;
}

/** One measured number. Read aloud, the figure and label make a sentence: "387 tests pass." */
export interface Stat {
  readonly figure: string;
  /** Backticks mark code. */
  readonly label: string;
}

export interface GallerySlide {
  readonly src: string;
  readonly poster: string;
  readonly caption: string;
  readonly description: string;
  readonly label: string;
}

export type Media =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'reveal';
      readonly src: string;
      readonly poster: string;
      /** A lighter poster to show first, swapped for `poster` once that has loaded. */
      readonly posterSwap?: string;
      readonly label: string;
      readonly caption: string;
    }
  | { readonly kind: 'gallery'; readonly slides: readonly [GallerySlide, ...GallerySlide[]] };

export interface Detail {
  readonly slug: DetailSlug;
  readonly kind: 'project' | 'experience';
  readonly name: string;
  readonly summary: string;
  readonly status?: { readonly role: string; readonly text: string };
  readonly stack: string;
  readonly links: readonly ExternalLink[];
  /** Shown beside the buttons when the code is not public. */
  readonly notice?: string;
  readonly playNote?: string;
  readonly media: Media;
  readonly diagram: Diagram;
  /** Paragraphs for "What I built". Backticks mark code. */
  readonly built: readonly string[];
  /** The numbers that no other part of the page says. A page with none leaves this out. */
  readonly stats?: readonly Stat[];
}

const GH = 'https://github.com/alcash55/';

function optionalStat(stat: Stat | undefined): Stat[] {
  return stat ? [stat] : [];
}

function node(
  id: string,
  label: string,
  sub: string,
  col: number,
  y: number,
  planned = false,
): DiagramNode {
  return { id, label, sub, col, y, planned };
}

interface LinkOptions {
  readonly fromAt?: number;
  readonly toAt?: number;
  readonly planned?: boolean;
}

function link(
  from: string,
  fromSide: Side,
  to: string,
  toSide: Side,
  text: string | null,
  options: LinkOptions = {},
): DiagramEdge {
  return { kind: 'link', from, fromSide, to, toSide, text, ...options };
}

function exit(from: string, fromSide: Side, text: string): DiagramEdge {
  return { kind: 'exit', from, fromSide, text };
}

/** How many numbered flows a diagram has. Edges with no sentence carry no number. */
export function countFlows(diagram: Diagram): number {
  return diagram.edges.filter((edge) => edge.text !== null).length;
}

export const DETAILS: Readonly<Record<DetailSlug, Detail>> = {
  'portfolio-website': {
    slug: 'portfolio-website',
    kind: 'project',
    name: 'Portfolio Website', // PD-02
    summary:
      'The site you are on: a React and TypeScript front end on Cloudflare Workers, a Go API behind it, and a browser suite that runs on every pull request. The resume, the CI list and the contact form all go through that API.', // PD-03
    stack: 'React, TypeScript, Go, Playwright, GitHub Actions', // PD-04
    links: [
      {
        label: 'Visit the original site (version 1)',
        href: 'https://alcash55.github.io/Portfolio/',
      }, // PD-05
      { label: 'View on GitHub', href: `${GH}Portfolio` }, // PD-06
    ],
    media: {
      kind: 'reveal',
      src: '/media/hero-reveal.mp4',
      poster: '/media/hero-reveal-poster.webp',
      label:
        'Recording of this site: the About headline, the chapter menu opening, a write-up scrolling to its architecture diagram, the Clipper recording playing, and the theme switching from light to dark',
      caption: 'A 20-second tour of this site',
    },
    diagram: {
      nodes: [
        node('browser', 'Browser', 'Loads the page', 0, 0),
        node('host', 'Cloudflare Worker', 'Renders the page', 1, 0),
        node('react', 'React app', 'Asks for the CI list', 1, 150),
        node('saved', 'Built-in CI list', 'Fallback', 0, 150),
        node('api', 'Go API', 'Live copy or stale copy', 2, 150),
        node('cache', 'Cache', 'Checked first', 3, 150),
        node('gh', 'GitHub API', 'One refresh', 4, 150),
        node('discord', 'Discord webhook', 'Validated message', 3, 300),
      ],
      edges: [
        link('browser', 'r', 'host', 'l', 'Browser to Cloudflare Worker: loads the page.'),
        link('react', 'r', 'api', 'l', 'React app to Go API: asks for the CI list.'),
        link('api', 'r', 'cache', 'l', 'Go API to Cache: checks it first.'),
        link('cache', 'r', 'gh', 'l', 'Cache to GitHub API: one refresh, however many callers.'),
        link(
          'api',
          'b',
          'react',
          'b',
          'Go API to React app: the live list, or the stale copy, flagged.',
          { fromAt: 0.3, toAt: 0.7 },
        ),
        link(
          'react',
          'l',
          'saved',
          'r',
          'React app to Built-in CI list: fallback when the API is unreachable.',
        ),
        link(
          'react',
          't',
          'api',
          't',
          'React app to Go API: contact form, limited to 5 per minute per IP.',
          { fromAt: 0.7, toAt: 0.3 },
        ),
        link('api', 'b', 'discord', 't', 'Go API to Discord webhook: the validated message.', {
          fromAt: 0.8,
          toAt: 0.5,
        }),
        link('host', 'r', 'api', 't', 'Cloudflare Worker to Go API: asks for the resume PDF.', {
          fromAt: 0.5,
          toAt: 0.7,
        }),
      ],
      alt: 'The browser loads the page from a Cloudflare Worker. The React app asks the Go API for the CI list. The API checks a cache and, when it is cold, refreshes once from the GitHub API however many callers are waiting. The API returns the live list, or the stale copy with a flag. If the API is unreachable the app shows a built-in list. The contact form posts to the API, which limits each IP to 5 messages a minute and forwards the validated message to a Discord webhook. The Worker also asks the API for the resume PDF, which the API reads from a private GitHub repository through the same cache.',
    },
    built: [
      'A portfolio is easy to fill with claims a reader cannot check. I built this one so the claims can be checked from outside: a resume that streams from a private repository, a CI list read from the repository that defines it, and a browser suite that runs on every pull request.', // PD-09
      'The resume and the CI list come from GitHub through a Go API with a cache and a single-flight refresh. If a refresh fails, the API serves the stale copy and flags it. If the API is unreachable, the CI figure falls back to a built-in list and the resume page offers LinkedIn. The contact form posts to the same API.', // PD-10
    ],
    stats: [
      {
        figure: '10×',
        label:
          'lighter on the first version of this site, 4.03 MB down to 397 KB. Resizing eight images to their measured render size did it, and largest paint fell from 4.4 s to 3.2 s.', // PD-12
      },
      {
        figure: '50 to 2',
        label:
          'GitHub calls when 50 cold requests arrive at once. A cached answer takes 0.3 ms instead of 0.54 s.', // PD-13
      },
      {
        figure: '35 of 40',
        label:
          'requests blocked after I attacked my own contact-form rate limiter and fixed it. Rotating a forged header had let all 40 through, and the first 5 are the intended burst.', // PD-15a
      },
      // PD-16, from the generated test counts
      ...optionalStat(testCountStat(siteStats)),
    ],
  },

  'game-competition-website': {
    slug: 'game-competition-website',
    kind: 'project',
    name: 'Game Competition Website', // GC-01
    summary:
      'A web app for running OSRS bingo competitions. Teams race to complete tasks on a shared board, and admins review proof screenshots from Discord. Scores come from a scheduled ETL pipeline that pulls player stats from the OSRS hiscores into Postgres.', // GC-02
    stack: 'React, TypeScript, MUI, Vite, Node.js, Express, Supabase, PostgreSQL, Discord API', // GC-03
    links: [
      { label: 'Open the live site', href: 'https://diamond-dogs-bingo.onrender.com/' },
      { label: 'View on GitHub', href: `${GH}Little-Town` },
    ], // GC-04
    media: {
      kind: 'reveal',
      src: '/media/bingo-journey.mp4',
      poster: '/media/bingo-journey-poster.webp',
      label:
        'Recording of the Game Competition Website on demo data: the bingo board, the board builder, the team drafter, the hiscores table and the standings by team',
      caption: 'Recorded on demo data',
    },
    diagram: {
      nodes: [
        node('player', 'Player browser', '', 0, 130),
        node('api', 'Express API', '', 2, 130),
        node('auth', 'Supabase auth', '', 4, 30),
        node('pg', 'Supabase Postgres', '', 4, 130),
        node('osrs', 'OSRS hiscores API', '', 3, 260),
        node('bot', 'Discord bot', '', 0, 340),
        node('bucket', 'Private screenshot bucket', '', 1, 340),
        node('admin', 'Admin review page', '', 2, 340),
        node('snap', 'Snapshot job', 'Every 20 minutes', 4, 260),
        node('vocab', 'Vocabulary job', 'Once a day', 4, 480),
        node('wom', 'Wise Old Man', 'Approved renames', 4, 370),
        node('drift', 'Drift check', 'Health endpoint', 4, 590),
      ],
      edges: [
        link('player', 'r', 'api', 'l', 'Player browser to Express API: requests with a JWT.'),
        link('api', 'r', 'auth', 'l', 'Express API to Supabase auth: checks the role.', {
          fromAt: 0.2,
          toAt: 0.5,
        }),
        link('api', 'r', 'pg', 'l', 'Express API to Supabase Postgres: boards, teams and scores.'),
        link(
          'api',
          'r',
          'osrs',
          'l',
          'Express API to OSRS hiscores API: looks a player up when they register.',
          {
            fromAt: 0.8,
            toAt: 0.5,
          },
        ),
        link(
          'bot',
          'r',
          'bucket',
          'l',
          'Discord bot to Private screenshot bucket: ingests channel screenshots.',
        ),
        link(
          'admin',
          't',
          'api',
          'b',
          'Admin review page to Express API: approve or deny each one.',
        ),
        link(
          'api',
          't',
          'pg',
          't',
          'Express API to Supabase Postgres: approved drops count toward the team score.',
          { fromAt: 0.7, toAt: 0.3 },
        ),
        link(
          'snap',
          'l',
          'osrs',
          'r',
          "Snapshot job to OSRS hiscores API: extracts every player's stats each 20 minutes, retrying failures and serving a cached copy if the API is down.",
        ),
        link(
          'snap',
          't',
          'pg',
          'b',
          "Snapshot job to Supabase Postgres: loads each player's skills and activities as a snapshot, which the scoring engine reads.",
        ),
        link(
          'snap',
          'b',
          'wom',
          't',
          'Snapshot job to Wise Old Man: when a name stops resolving, follows approved renames and checks the new name on the hiscores.',
        ),
        link(
          'vocab',
          'l',
          'osrs',
          'b',
          'Vocabulary job to OSRS hiscores API: reads the skill and activity names from one hiscores response.',
        ),
        link(
          'vocab',
          'r',
          'pg',
          'r',
          'Vocabulary job to Supabase Postgres: stores the names the board builder offers.',
        ),
        link(
          'drift',
          't',
          'vocab',
          'b',
          'Drift check to Vocabulary job: compares the stored names with a fresh hiscores probe and flags any mismatch.',
        ),
      ],
      alt: "A player's browser sends requests with a JWT to an Express API, which checks the role through Supabase auth and reads boards, teams and scores from Postgres. The API looks a player up on the OSRS hiscores API when they register. A Discord bot ingests screenshots from a channel into a private storage bucket. An admin approves or denies each one on a review page, and approved drops count toward the team score. Separately, a snapshot job runs every 20 minutes: it extracts each player's stats from the OSRS hiscores API and loads them into Postgres as snapshots, and when a name stops resolving it follows approved renames on Wise Old Man. A daily vocabulary job stores the skill and activity names from the hiscores, and a drift check compares them with a fresh probe.",
    },
    built: [
      'Admins build boards, draft teams and review evidence from their own panel. Access is role-based, with JWT auth through Supabase.', // GC-05
      'Tile completions arrive as screenshots. A Discord bot ingests them from a channel into a private bucket, an admin approves or denies each one, and approved drops count toward the team score.', // GC-06
      "The scores run on a small ETL pipeline. While a bingo runs, a job extracts each player's stats from the OSRS hiscores API every 20 minutes. It retries failed calls and serves cached data if the API is down. It shapes the response into skills and activities and loads a snapshot into Postgres. The scoring engine reads those snapshots, so a tile clears when the numbers move.", // GC-06b
      "Two more jobs keep it accurate. A daily job refreshes the skill and activity names, bosses included, that the board builder offers, taken from the same hiscores response the scorer reads, and a health check flags any drift. When a player's name stops resolving, the job follows approved renames on Wise Old Man, checks the new name on the hiscores, then updates the player and logs the change.", // GC-06c
      'The recording runs on demo data, not a real competition.', // GC-06a
    ],
    stats: [
      {
        figure: '888',
        label:
          'tests pass: 629 on the backend, run against a real local database, and 259 on the frontend.', // GC-07
      },
      {
        figure: '422 to 22 KB',
        label:
          'of code on the team table page after dropping the data grid. The table used to need sideways scrolling and now fits the page.', // GC-08a
      },
    ],
  },

  'ac-composite-actions': {
    slug: 'ac-composite-actions',
    kind: 'project',
    name: 'AC Composite Actions', // AC-01
    summary:
      'Reusable GitHub Actions that my other repos call from CI. They scan pull requests for secrets, run an accessibility check, spellcheck markdown, score a resume PDF and list the changed files. Each check reports back as one pull request comment that it keeps current.', // AC-02
    stack: 'JavaScript, GitHub Actions, Bun, Vitest', // AC-03
    links: [{ label: 'View on GitHub', href: `${GH}ac-composite-actions` }], // AC-04
    // The diagram already names the actions, and the home page lists them.
    media: { kind: 'none' },
    diagram: {
      nodes: [
        node('wf', 'Consumer repo workflow', '', 1, 150),
        node('diff', 'diff', 'Lists changed files', 1, 0),
        node('gh', 'GitHub API', '', 3, 0),
        node('spell', 'markdown-checks', 'spellcheck', 3, 120),
        node('ats', 'ats-check', 'Scores a resume PDF', 3, 210),
        node('dc', 'notifications', 'PR comment or Discord', 3, 300),
        node('leak', 'security/betterleaks', 'Scans PR commits for secrets', 1, 300),
      ],
      edges: [
        link(
          'wf',
          't',
          'diff',
          'b',
          'Consumer repo workflow to the diff action: calls it at @main with a PR number.',
          { fromAt: 0.3, toAt: 0.3 },
        ),
        link('diff', 'r', 'gh', 'l', 'diff action to GitHub API: lists changed files, 30 a page.'),
        link(
          'diff',
          'b',
          'wf',
          't',
          'diff action to Consumer repo workflow: returns DIFF and the file list.',
          { fromAt: 0.7, toAt: 0.7 },
        ),
        link(
          'wf',
          'r',
          'spell',
          'l',
          'Consumer repo workflow to markdown-checks spellcheck: checks the changed markdown.',
          { fromAt: 0.2, toAt: 0.5 },
        ),
        link('wf', 'r', 'ats', 'l', 'Consumer repo workflow to ats-check: scores the resume PDF.', {
          fromAt: 0.5,
          toAt: 0.5,
        }),
        link(
          'wf',
          'r',
          'dc',
          'l',
          'Consumer repo workflow to notifications: posts the result as a PR comment or a Discord message.',
          { fromAt: 0.8, toAt: 0.5 },
        ),
        link(
          'wf',
          'b',
          'leak',
          't',
          'Consumer repo workflow to security/betterleaks: scans the pull request commits for secrets at a pinned commit.',
          { fromAt: 0.5, toAt: 0.5 },
        ),
      ],
      alt: 'A workflow in a consumer repo calls the diff action at @main with a pull request number. The action lists the changed files from the GitHub API, 30 to a page, and returns the diff and the file list. The same workflow can then run markdown-checks spellcheck on the changed markdown, run ats-check on a resume PDF, and post the result through the notifications action as a PR comment or a Discord message. Separately, the workflow runs the security/betterleaks secret scan on the pull request commits, pinned to one reviewed commit of the repo.',
    },
    built: [
      'Consumers reference the actions at `@main`, so every change is live the moment it lands and renaming an input breaks callers at once. That is why I rebuilt the `diff` action.', // AC-05
      'It ran, but it was wrong in four ways. Two outputs were set by the script and never declared in `action.yml`. An empty pull request exited before setting `DIFF`. The file list was unpaginated, so any pull request over 30 files was truncated. And `parseInt` accepted `12abc` as PR 12.', // AC-06
      'The newest action, `security/betterleaks`, scans for secrets. It downloads a pinned Betterleaks release and checks its SHA256 before running it. A finding fails the check and is reported with the secret redacted.', // AC-06a
      "The scan job can only read. A separate reporter job posts the comment, so pull requests from forks and Dependabot get one too. Before posting, the reporter checks that the result belongs to the pull request's latest commit, so a stale scan cannot overwrite a newer one. Consumers pin a reviewed commit for this action instead of `@main`.", // AC-06b
    ],
    stats: [
      {
        figure: '11',
        label:
          'of my repos run the secret scan in CI, including Portfolio, Little-Town and Golem Miners. Each was added by its own rollout pull request.', // AC-07
      },
      {
        figure: '26 min',
        label:
          "from an outside contributor's report to the merged fix. The accessibility check never ran, because yarn reserves the word check.", // AC-08
      },
      {
        figure: '36',
        label:
          'tests cover the `diff` action. The PR-number tests failed against the first implementation, which is the bug they existed to find.', // AC-08b
      },
    ],
  },

  clipper: {
    slug: 'clipper',
    kind: 'project',
    name: 'Clipper', // CL-01
    summary:
      'An automation pipeline that turns YouTube and Twitch clips into captioned, upload-ready YouTube Shorts. One command runs every step, from fetching clips to uploading.', // CL-02
    stack:
      'TypeScript, Node.js, FFmpeg, yt-dlp, faster-whisper, YouTube Data API, Twitch Helix API', // CL-03
    links: [{ label: 'Watch the channel', href: 'https://www.youtube.com/@TheCliper-er' }], // CL-04
    notice: 'The code is private.', // CL-05
    media: {
      kind: 'reveal',
      src: '/media/clipper-run.mp4',
      poster: '/media/clipper-run-poster.webp',
      label:
        'Animation of the Clipper pipeline: a long stream narrows to its best moment, the stages from fetch to upload run, a 9:16 Short builds with a facecam split and captions, then Shorts queue into the 15:00 and 21:00 slots',
      caption: 'Long streams in, Shorts out',
    },
    diagram: {
      nodes: [
        node('run', 'Daily run script', 'No schedule calls it yet', 1, 0, true),
        node('yt', 'YouTube channel', 'Top videos', 0, 130),
        node('tw', 'Twitch channel', 'Top clips', 0, 234),
        node('fetch', 'Fetch', 'Candidate clips', 1, 182),
        node('dl', 'Download', 'yt-dlp', 2, 182),
        node('an', 'Analyze', 'Best engagement window', 3, 182),
        node('fmt', 'Format', 'FFmpeg, 1080x1920', 4, 182),
        node('cap', 'Captions', 'faster-whisper', 4, 340),
        node('up', 'Upload', 'YouTube API', 3, 340),
        node('sh', 'Shorts channel', '', 2, 340),
      ],
      edges: [
        link(
          'yt',
          'r',
          'fetch',
          'l',
          'YouTube channel and Twitch channel to Fetch: top videos and top clips.',
        ),
        link('tw', 'r', 'fetch', 'l', null),
        link('fetch', 'r', 'dl', 'l', 'Fetch to Download, yt-dlp.'),
        link('dl', 'r', 'an', 'l', 'Download to Analyze: finds the best engagement window.'),
        link('an', 'r', 'fmt', 'l', 'Analyze to Format, FFmpeg: 1080x1920, blurred background.'),
        link('fmt', 'b', 'cap', 't', 'Format to Captions, faster-whisper: optional, burned in.'),
        link('cap', 'l', 'up', 'r', 'Captions to Upload, YouTube API: OAuth2.'),
        link('up', 'l', 'sh', 'r', 'Upload to Shorts channel.'),
        link(
          'run',
          'b',
          'fetch',
          't',
          'Daily run script to Fetch: starts the run. The script exists, and no schedule calls it yet.',
          { fromAt: 0.5, toAt: 0.5, planned: true },
        ),
      ],
      alt: 'A daily run script starts the pipeline. It fetches top videos from a YouTube channel and top clips from a Twitch channel, downloads them with yt-dlp, and finds the best engagement window. FFmpeg reformats the clip to 1080x1920 with a blurred background. Captions from faster-whisper are optional and burned in. The upload step publishes the Short to a YouTube channel through the YouTube API with OAuth2.',
    },
    built: [
      'A clips channel is repetitive work: find a clip, download it, find the best moment, crop it to vertical, caption it, upload it. Every step is mechanical, so I built the pipeline instead.', // CL-06
      'It fetches candidate clips from a source channel, downloads them with yt-dlp, finds the best engagement window, reformats to 1080x1920 with FFmpeg, burns in captions from faster-whisper and uploads through the YouTube Data API.', // CL-07
      'Facecam detection splits real webcams from IRL streams by crowd density. IRL footage runs 3.7 to 10.2 face detections per frame, against 0.6 to 2.6 for a genuine facecam.', // CL-08
    ],
    stats: [
      {
        figure: '3.0',
        label:
          'face detections per frame is the line between a webcam and an IRL stream. It passes all 5 true facecams and rejects all 5 IRL clips, calibrated on 15 real clips.', // CL-09
      },
      {
        figure: '387',
        label: 'tests pass.', // CL-11
      },
      {
        figure: '8 of 8',
        label:
          'real clips scored right by the caption detector. Five of the 8 came from repost accounts that had already burned in captions, and Clipper now skips its own burn on those.', // CL-11a
      },
    ],
  },

  'golem-miners': {
    slug: 'golem-miners',
    kind: 'project',
    name: 'Golem Miners', // GM-01
    summary:
      'Dig deep, get rich, and try not to wake the golems. A co-op mining game for Steam, for one to eight players. Shafted & Sons Mining Co. drops your crew in Scree Hollow with a contract and nothing else. Dig through ground that breaks block by block, fight the stone golems that guard the deep lairs, and haul your gems back to camp to sell.', // GM-02
    status: {
      role: 'Prototype.',
      text: "Solo play covers digging, crafting, trading, roulette and the golem fights. The Chain, the blast that cracks Golem Prime's armor, is next. Co-op sessions connect, but client digging is off and host edits do not replicate yet.", // GM-03
    },
    stack: 'Unity 6, C#, Unity Test Framework', // GM-04
    // GM-05a. The build is served from /play/, which the deploy fills in.
    links: [{ label: 'Play in your browser', href: '/play/golem-miners/', desktopOnly: true }],
    playNote:
      'Single-player, about 62 MB, for a computer with a keyboard and mouse. Steam co-op does not run in a browser.',
    notice: 'The code is private.', // GM-05
    media: {
      kind: 'gallery', // GM-11
      slides: [
        {
          src: '/media/golem-gameplay.mp4',
          poster: '/media/golem-gameplay-poster.webp',
          caption: 'Camp',
          description:
            'Walk out of the forest, chop a tree for logs and enter the camp through its gate.',
          label:
            'Recording of Golem Miners in the browser build: walk into the forest, chop a tree for logs, enter the camp through its gate, then pan across the campfire and district signs',
        },
      ],
    },
    diagram: {
      nodes: [
        node('input', 'Player input', '', 0, 0),
        node('hot', 'Hotbar, held item', '', 1, 0),
        node('dig', 'Digger, tool tier', '', 2, 0),
        node('sb', 'VoxelWorld.SetBlock', '', 3, 0),
        node('chunk', 'Chunk', '', 4, 0),
        node('mesh', 'Chunk mesh builder', '', 4, 150),
        node('screen', 'Screen', '', 4, 300),
        node('fish', 'FishNet', 'Sessions only', 2, 150, true),
      ],
      edges: [
        link('input', 'r', 'hot', 'l', 'Player input to Hotbar, held item.'),
        link('hot', 'r', 'dig', 'l', 'Hotbar to Digger, tool tier: reads what is in hand.'),
        link(
          'dig',
          'r',
          'sb',
          'l',
          'Digger to VoxelWorld.SetBlock: every block change goes through it.',
        ),
        link('sb', 'r', 'chunk', 'l', 'VoxelWorld.SetBlock to Chunk: updates the block.'),
        link('chunk', 'b', 'mesh', 't', 'Chunk to Chunk mesh builder: remeshes.'),
        link('mesh', 'b', 'screen', 't', 'Chunk mesh builder to Screen.'),
        link(
          'sb',
          'b',
          'fish',
          't',
          'VoxelWorld.SetBlock to FishNet: replicated block edits are planned, dashed.',
          { fromAt: 0.2, toAt: 0.8, planned: true },
        ),
      ],
      alt: 'Player input selects a hotbar slot, and the held item sets the tool tier that a dig reads. The dig calls VoxelWorld.SetBlock, the single method every block change goes through. It updates a chunk, the chunk mesh builder remeshes it, and the result reaches the screen. A dashed link shows the planned connection from SetBlock to FishNet for replicated block edits. FishNet already handles sessions, but block edits do not replicate yet.',
    },
    built: [
      'You arrive with nothing. Bare hands chop trees but cannot break stone, however long you swing. Wood and loose flint make a flint pickaxe at the camp workbench, and each better pickaxe opens harder rock, down to iron and gem veins. The tier comes from the item in your active hotbar slot, not from what is in your pack.', // GM-06
      'Golems sleep in lairs on the way down, their gem eyes dark until something wakes them. Awake, they throw rock and aim ahead of a running miner. The Demi fights with smaller golems at its side, so you duck behind the calcite spars of its lair. Its floor stays sealed while it lives. Kill it and the floor opens onto the stair down to Golem Prime, who hears the whole lair and never forgets a miner. Prime takes a tenth of every hit until the Chain blast cracks its armor. Golems drop rough gems, and their health is set by the size of your crew when they wake.', // GM-06a
      'Gemma Weigh buys rough gems at camp for 120 gold each. Then Roland Dyce makes his pitch: a 100% chance to double your money at his roulette table, which he runs from a hideout off the contract route. The wheel is a fair European one. Red or black pays even money, and the green zero takes every outside bet. Stakes run from 1 to 1,000 gold.', // GM-06b
      'Each session picks a new seed. Mountains change place and height, and the dig site and its tunnels rotate around camp. The camp itself stays put: a company gateway, a campfire plaza and six districts whose NPCs buy and sell. More of their stock unlocks as your contract level rises.', // GM-07
      'Every block change goes through one method, `VoxelWorld.SetBlock`. That choke point is what makes co-op workable. A dig can travel as a block position and type, about 13 bytes, instead of a mesh to sync. FishNet sessions already run, and replicated digs are the next milestone.', // GM-08
      "The game's one scene is assembled in code, because a scene file invites merge conflicts and does not review as a diff.", // GM-08b
    ],
    stats: [
      {
        figure: '1,815',
        label: 'EditMode tests, 0 failing. One manual timing test is skipped.', // GM-09
      },
      {
        figure: '7 GB to 198 MB',
        label:
          'of heap while building the world in the browser build. Each vertex read the mesh normals, and each read copied the whole array. Reading them once also brought world generation to under a second.', // GM-09a
      },
    ],
  },

  'vscode-royalty-theme': {
    slug: 'vscode-royalty-theme',
    kind: 'project',
    name: 'VS Code Royalty Theme', // RV-01
    summary:
      'A VS Code color theme built from the colors of 16th to 19th century European royalty: white, gold and purple. Version 3 rebuilds it so every color it ships passes WCAG AA.', // RV-02
    stack: 'VS Code, Node.js, JSON', // RV-03
    links: [
      {
        label: 'View the Marketplace listing',
        href: 'https://marketplace.visualstudio.com/items?itemName=Alcash55.royaltytheme',
      },
      { label: 'View on GitHub', href: `${GH}Royalty-VS-Code-Theme` },
    ], // RV-04
    media: {
      kind: 'reveal',
      src: '/media/royalty-vscode.mp4',
      poster: '/media/royalty-vscode-poster.webp',
      label:
        'Animation about the Royalty theme: a keyword color at 2.96 to 1 contrast, the new theme with code typing in, the eight palette colors with their contrast ratios, then 174 color pairs checked with 0 failures',
      caption: 'From 2.96:1 to 174 passing pairs',
    },
    diagram: {
      nodes: [
        node('pal', 'Palette module', 'One source of color', 0, 90),
        node('gen', 'Theme generator', 'Writes the theme JSON', 1, 0),
        node('json', 'Theme JSON', 'Replaces 2110 lines', 2, 0),
        node('mk', 'VS Code Marketplace', 'v3.0.0 not yet published', 3, 0, true),
        node('cc', 'Contrast check', '174 color pairs', 1, 180),
      ],
      edges: [
        link('pal', 'r', 'gen', 'l', 'Palette module to Theme generator: one source of color.', {
          fromAt: 0.3,
          toAt: 0.5,
        }),
        link(
          'gen',
          'r',
          'json',
          'l',
          'Theme generator to Theme JSON: replaces 2110 hand-kept lines.',
        ),
        link(
          'pal',
          'r',
          'cc',
          'l',
          'Palette module to Contrast check: 174 color pairs against their surface.',
          { fromAt: 0.7, toAt: 0.5 },
        ),
        exit('cc', 'r', 'Contrast check to the build: fails on any regression.'),
        link(
          'json',
          'r',
          'mk',
          'l',
          'Theme JSON to VS Code Marketplace: packaged for it. v3.0.0 is not yet published, so the link is dashed.',
          { fromAt: 0.5, toAt: 0.5, planned: true },
        ),
      ],
      alt: 'One palette module is the source of every color. A generator writes the theme JSON from it, replacing 2110 lines kept by hand. A contrast check measures 174 color pairs against the surface each one renders on and fails the build on any regression. The theme JSON is packaged for the VS Code Marketplace, where version 3.0.0 is not yet published, so that link is dashed.',
    },
    built: [
      'v3.0.0 was an accessibility rebuild. Five of nine syntax colors were below WCAG AA against the editor background, with keywords at 2.96:1 and storage types at 2.45:1.', // RV-05
      'The background was the cause, since nothing reaches AA against a mid-tone gray-purple. I moved it to a deep plum and rebuilt the palette on top. The theme JSON is now generated from one palette module instead of hand-maintained across 2110 lines.', // RV-06
    ],
    stats: [
      {
        figure: '174 of 174',
        label:
          'color pairs pass WCAG AA, and 158 pass AAA. `npm run check` fails the build on any regression.', // RV-07
      },
      {
        figure: '8.1:1',
        label:
          'contrast for keyword text and storage types against the editor background, up from below 3:1. AA asks for 4.5:1.', // RV-07a
      },
      {
        figure: '241 to 43',
        label: 'token rules, from per-language rules down to scope-level ones.', // RV-08
      },
      {
        figure: '187',
        label:
          'installs on the Visual Studio Marketplace. The listing still serves version 2.2.0, and v3.0.0 is on GitHub, not yet published.', // RV-10
      },
    ],
  },

  'ncr-voyix-docs': {
    slug: 'ncr-voyix-docs',
    kind: 'experience',
    name: 'NCR Voyix docs site', // NV-01
    summary:
      'The Voyix documentation site, rebuilt in Next.js with navigation for 2,300+ pages across 23 products. Product teams keep their Markdown in their own repositories, and a pipeline publishes it through Strapi.', // NV-02
    status: {
      role: 'Software Engineer II.',
      text: 'NCR Voyix, 4/2023 to 6/2024. This page has a diagram and no screenshots, because the site and its code belong to NCR.', // NV-03
    },
    stack: 'Next.js, Strapi, remark, GitHub Actions, BigQuery, Looker', // NV-04
    links: [],
    media: { kind: 'none' },
    diagram: {
      nodes: [
        node('repos', 'Product team repos', 'Markdown in GitHub', 0, 0),
        node('pr', 'PR checks', 'Spelling, Markdown, alt text', 1, 0),
        node('remark', 'remark', 'Content that passes', 2, 0),
        node('strapi', 'Strapi', 'Stored as HTML', 3, 0),
        node('site', 'Next.js docs site', '2,300+ pages', 4, 0),
        node('cmt', 'PR review comment', 'Updates on new commits', 1, 150),
        node('ds', 'Design-system components', '', 4, 150),
        node('four', 'Four analytics pipelines', '', 0, 300),
        node('bq', 'BigQuery', '', 1, 300),
        node('lk', 'Looker', '', 2, 300),
      ],
      edges: [
        link(
          'repos',
          'r',
          'pr',
          'l',
          'Product team repos to PR checks: every pull request runs checks for spelling, Markdown validity and image alt text.',
        ),
        link(
          'pr',
          'r',
          'remark',
          'l',
          'PR checks to remark: content that passes goes through remark.',
        ),
        link('remark', 'r', 'strapi', 'l', 'remark to Strapi: loads the content as HTML.'),
        link(
          'strapi',
          'r',
          'site',
          'l',
          'Strapi to Next.js docs site: serves 2,300+ pages across 23 products.',
        ),
        link(
          'pr',
          'b',
          'cmt',
          't',
          'PR checks to PR review comment: posts the results, and the comment updates as new commits arrive.',
        ),
        link(
          'ds',
          't',
          'site',
          'b',
          'Design-system components to Next.js docs site: selected HTML renders as React components.',
        ),
        link(
          'four',
          'r',
          'bq',
          'l',
          'Four analytics pipelines to BigQuery: accessibility, Google Tag Manager, Qualtrics and FullStory data.',
        ),
        link('bq', 'r', 'lk', 'l', 'BigQuery to Looker: the reports.'),
      ],
      alt: 'Product teams keep Markdown in their own GitHub repositories. Each pull request runs checks for spelling, Markdown validity and image alt text, and the review comment on the pull request updates as new commits arrive. Content that passes goes through remark into Strapi as HTML. The Next.js docs site serves 2,300+ pages across 23 products, and renders selected HTML as React design-system components. Separately, four analytics pipelines for accessibility, Google Tag Manager, Qualtrics and FullStory feed BigQuery, and Looker reports on them.', // NV-06
    },
    built: [
      'Product teams kept Markdown in their own GitHub repositories. CI/CD pulls it into Strapi, so documentation ships from the teams that own the products.', // NV-07
      'I extended the static analysis composite GitHub Actions that gate every merge on the Voyix Doc Site. Pull requests run checks for spelling, Markdown validity and image alt text. CI reads the changed files from GitHub API diffs, and the review comment updates as new commits arrive.', // NV-08
      'Content that passes goes through remark into Strapi as HTML. The Next.js site maps selected HTML elements to React design-system components when it renders.', // NV-09
      'I also restructured and expanded the Commerce Design Docs that product teams build against.', // NV-09a
      'Four analytics pipelines for accessibility, Google Tag Manager, Qualtrics and FullStory feed BigQuery, and Looker reports on them.', // NV-10
    ],
  },

  'starbucks-store-health': {
    slug: 'starbucks-store-health',
    kind: 'experience',
    name: 'Starbucks UK Store Health', // SH-01
    summary:
      'A React dashboard that shows technology health for Starbucks UK stores, rolled up from store to country. It runs on live API data and was used in management presentations.', // SH-02
    status: {
      role: 'UI Engineer I.',
      text: 'NCR, 7/2021 to 4/2023. This page has a diagram and no screenshots, because the dashboard belongs to NCR.', // SH-03
    },
    stack: 'React, MUI, Figma, FigJam, Design Systems, Accessibility, Google Tag Manager', // SH-04
    links: [],
    media: { kind: 'none' },
    diagram: {
      nodes: [
        node('int', 'User interviews', 'Starbucks UK', 0, 0),
        node('fig', 'Personas and journeys', 'Mapped in FigJam', 1, 0),
        node('figma', 'Figma designs', 'Store to country views', 2, 0),
        node('dash', 'React dashboard', 'Live API data', 3, 0),
        node('store', 'Store view', 'Technology health', 4, 0),
        node('country', 'Country view', 'Rolled up from stores', 4, 150),
        node('api', 'Digital Connected Services API', '', 3, 150),
        node('mgmt', 'Management presentations', '', 2, 150),
      ],
      edges: [
        link(
          'int',
          'r',
          'fig',
          'l',
          'User interviews to Personas and journeys: what users said shaped the personas and journeys mapped in FigJam.',
        ),
        link(
          'fig',
          'r',
          'figma',
          'l',
          'Personas and journeys to Figma designs: designs iterated in Figma.',
        ),
        link(
          'figma',
          'r',
          'dash',
          'l',
          'Figma designs to React dashboard: the dashboard is built from the designs.',
        ),
        link(
          'dash',
          'r',
          'store',
          'l',
          'React dashboard to Store view: shows technology health for each store.',
        ),
        link(
          'store',
          'b',
          'country',
          't',
          'Store view to Country view: rolls the stores up to country level.',
        ),
        link(
          'api',
          't',
          'dash',
          'b',
          'Digital Connected Services API to React dashboard: supplies live data.',
        ),
        link(
          'dash',
          'b',
          'mgmt',
          't',
          'React dashboard to Management presentations: the dashboard was used in them.',
          { fromAt: 0.2, toAt: 0.8 },
        ),
      ],
      alt: 'Alex interviewed Starbucks UK users, mapped personas and journeys in FigJam, and iterated designs in Figma. The React dashboard was built from those designs. It reads live data from the API of the Digital Connected Services team, shows technology health for each store, and rolls the stores up to country level. Management used the dashboard in presentations.', // SH-06
    },
    built: [
      'I interviewed seven Starbucks UK users, one for each persona the team identified, then mapped personas and journeys in FigJam.', // SH-07
      'Designs for the store-to-country views went through several rounds in Figma before I built the React dashboard.', // SH-08
      'The dashboard reads live data from an API. I partnered with the Digital Connected Services team on the design of that API.', // SH-09
      "Alongside Store Health, I built React components for the NCR Design System with its designers. I also added accessibility scoring to CI, which posts each build's result to PRs and Slack, and instrumented digital connected services with Google Tag Manager and FullStory.", // SH-10
      'Before this role I interned at NCR as a Software Engineer, 7/2020 to 9/2020, working on a REST API on Google Cloud Platform.', // SH-11
    ],
  },
};

// ---------- Home diagrams ----------
//
// The home page draws three tall diagrams at every width, readable at 390px. The
// wide `Diagram` above cannot draw them: its nodes are all one size and its
// text sits left, where these need centered text, boxes of three heights and a
// box inside a box. Each node and edge below carries its own coordinates.

/** An x, y pair in the diagram's own units. */
export type HomePoint = readonly [x: number, y: number];

export interface HomeNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Medium weight lines, one per drawn row. */
  readonly label: readonly string[];
  /** Regular weight lines under the label. */
  readonly sub: readonly string[];
  /** Small boxes drawn inside the node, left to right, with an arrow between. */
  readonly chips?: readonly string[];
}

export interface HomeEdge {
  /** Start, any corners, end. Every segment runs along x or y. The arrowhead sits on the last point. */
  readonly points: readonly HomePoint[];
}

export interface HomeDiagram {
  /** Names the SVG's ids, so two diagrams on one page never share one. */
  readonly key: 'solea' | 'ncr-voyix' | 'ncr-store-health';
  /** The image's accessible name. */
  readonly title: string;
  readonly nodes: readonly HomeNode[];
  readonly edges: readonly HomeEdge[];
  /** The text version, one sentence per step. Read by screen readers, not printed. */
  readonly steps: readonly string[];
}

function box(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: readonly string[],
  sub: readonly string[] = [],
  chips?: readonly string[],
): HomeNode {
  return { id, x, y, w, h, label, sub, chips };
}

function path(...points: HomePoint[]): HomeEdge {
  return { points };
}

export const HOME_DIAGRAMS = {
  solea: {
    key: 'solea',
    title: 'Architecture of the seven-market submission platform',
    nodes: [
      box('traders', 120, 0, 200, 48, ['Traders']),
      box('excel', 0, 96, 200, 76, ['v3 Excel', 'submission tool'], ['Built in React']),
      box('mfe', 240, 96, 200, 76, ['React', 'micro-frontends']),
      box('api', 0, 204, 440, 48, ['Go API']),
      box('lib', 0, 300, 200, 60, ['Shared Go', 'v3 library']),
      box('sf', 240, 300, 200, 60, ['Snowflake', 'models']),
      box(
        'iso',
        0,
        408,
        440,
        100,
        ['Seven ISO submission APIs'],
        ['CAISO, ERCOT, MISO, NEISO,', 'NYISO, PJM, SPP'],
      ),
    ],
    edges: [
      path([150, 48], [150, 72], [100, 72], [100, 96]),
      path([290, 48], [290, 72], [340, 72], [340, 96]),
      path([220, 48], [220, 204]),
      path([100, 172], [100, 204]),
      path([340, 172], [340, 204]),
      path([100, 252], [100, 300]),
      path([340, 252], [340, 300]),
      path([100, 360], [100, 408]),
    ],
    steps: [
      'Traders use the v3 Excel-based submission tool, which was built in React.',
      'Traders use the React micro-frontends.',
      'Traders also call the Go API directly.',
      'The Excel-based tool submits through the Go API.',
      'The React micro-frontends call the Go API behind them.',
      'The Go API runs on the shared Go v3 library, which replaced the legacy Python submit and withdraw endpoints.',
      'The Go API reads from Snowflake models.',
      'The shared library submits to the APIs of seven ISO markets: CAISO, ERCOT, MISO, NEISO, NYISO, PJM and SPP.',
    ],
  },
  'ncr-voyix': {
    key: 'ncr-voyix',
    title: 'Pipeline from team repositories to the Voyix docs site',
    nodes: [
      box('repos', 0, 0, 250, 60, ['Product team repos'], ['Markdown stays with the team']),
      box('checks', 0, 96, 250, 60, ['PR checks'], ['Spelling, Markdown, alt text']),
      box('remark', 0, 192, 250, 60, ['remark'], ['Content that passes']),
      box('strapi', 0, 288, 250, 60, ['Strapi'], ['Stored as HTML']),
      box('site', 0, 384, 250, 60, ['Voyix docs site'], ['Next.js, 2,300+ pages']),
      box('comment', 290, 88, 150, 76, ['PR comment'], ['Updates on new', 'commits']),
      box('ds', 290, 376, 150, 76, ['Design-system', 'components']),
    ],
    edges: [
      path([125, 60], [125, 96]),
      path([125, 156], [125, 192]),
      path([125, 252], [125, 288]),
      path([125, 348], [125, 384]),
      path([250, 126], [290, 126]),
      path([290, 414], [250, 414]),
    ],
    steps: [
      'Product teams keep their Markdown in their own GitHub repositories.',
      'Pull requests run checks for spelling, Markdown validity and image alt text.',
      'The checks post a review comment on the pull request, and the comment updates as new commits arrive.',
      'Content that passes goes through remark.',
      'remark loads it into Strapi as HTML.',
      'The Next.js docs site reads from Strapi and serves 2,300+ pages across 23 products.',
      'The site renders selected HTML as React design-system components.',
    ],
  },
  'ncr-store-health': {
    key: 'ncr-store-health',
    title: 'Store Health workflow from user interviews to the React dashboard',
    nodes: [
      box('interviews', 0, 0, 250, 60, ['User interviews'], ['Starbucks UK']),
      box('personas', 0, 96, 250, 60, ['Personas and journeys'], ['Mapped in FigJam']),
      box('figma', 0, 192, 250, 60, ['Figma designs'], ['Iterated']),
      box(
        'dashboard',
        0,
        288,
        250,
        118,
        ['React dashboard'],
        ['Live API data'],
        ['Store', 'Country'],
      ),
      box('present', 0, 442, 250, 60, ['Management presentations'], ['Country-level view']),
      box('api', 274, 309, 166, 76, ['Digital Connected', 'Services API']),
    ],
    edges: [
      path([125, 60], [125, 96]),
      path([125, 156], [125, 192]),
      path([125, 252], [125, 288]),
      path([125, 406], [125, 442]),
      path([274, 347], [250, 347]),
    ],
    steps: [
      'Alex interviewed Starbucks UK users.',
      'Personas and journeys were mapped in FigJam.',
      'Designs were iterated in Figma.',
      'The React dashboard was built from the designs.',
      'The dashboard reads live data from the API of the Digital Connected Services team.',
      'The dashboard rolls technology health up from the store level to the country level.',
      'Management used the dashboard in presentations.',
    ],
  },
} as const satisfies Readonly<Record<HomeDiagram['key'], HomeDiagram>>;

/** Projects first, then experience, each in the order its list is shown. */
export const DETAIL_SLUGS: readonly DetailSlug[] = [...PROJECT_SLUGS, ...EXPERIENCE_SLUGS];

export function getDetail(slug: string): Detail | undefined {
  return DETAIL_SLUGS.find((known) => known === slug) && DETAILS[slug as DetailSlug];
}

/** The next page in the same list (PD-17), or null at the end of it. */
export function nextAfter(slug: DetailSlug): Detail | null {
  const list = DETAILS[slug].kind === 'project' ? PROJECT_SLUGS : EXPERIENCE_SLUGS;
  const next = list[(list as readonly DetailSlug[]).indexOf(slug) + 1];
  return next ? DETAILS[next] : null;
}
