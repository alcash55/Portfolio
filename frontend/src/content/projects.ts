// Page bodies for the six project pages and the two experience pages. Each string
// is a row of the copy deck. Two kinds of row are left out on purpose:
//   - Comp-only placeholders: the pending-domain note, the Lighthouse re-run row
//     and the publish-pending marker. Each has a production fallback, applied here.
//   - The test-count row. Its numbers must come from the test runners, and the
//     generator that writes them is not part of this module.
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
  /** An arrow that leaves the diagram, labelled "The build". */
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
}

export interface Fact {
  readonly lead: string;
  readonly body: string;
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
  readonly facts: readonly Fact[];
}

const GH = 'https://github.com/alcash55/';

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
      'The site you are on: a React and TypeScript front end, a Go API behind it, and a browser suite that gates every deploy. The project list keeps working when GitHub or the API does not.', // PD-03
    stack: 'React, TypeScript, Go, Playwright, GitHub Actions', // PD-04
    links: [
      { label: 'Open the live site', href: 'https://alcash55.github.io/Portfolio/' }, // PD-05 fallback
      { label: 'View on GitHub', href: `${GH}Portfolio` }, // PD-06
    ],
    media: {
      kind: 'reveal',
      src: '/media/hero-reveal.mp4',
      poster: '/media/hero-reveal-poster.webp',
      label:
        'Recording of the live Portfolio Website: the theme changes, the page scrolls to the contact form, and a message is typed into it',
      caption: 'Version 1: the current site',
    },
    diagram: {
      nodes: [
        node('browser', 'Browser', 'Loads the page', 0, 0),
        node('host', 'Web host', '', 1, 0),
        node('react', 'React app', 'Asks for projects', 1, 150),
        node('saved', 'Saved project list', 'Fallback', 0, 150),
        node('api', 'Go API', 'Live stats or stale copy', 2, 150),
        node('cache', 'Cache, 1 hour', 'Checked first', 3, 150),
        node('gh', 'GitHub API', 'One refresh', 4, 150),
        node('discord', 'Discord webhook', 'Validated message', 3, 300),
      ],
      edges: [
        link('browser', 'r', 'host', 'l', 'Browser to Web host: loads the page.'),
        link('react', 'r', 'api', 'l', 'React app to Go API: asks for projects.'),
        link('api', 'r', 'cache', 'l', 'Go API to Cache, 1 hour: checks it first.'),
        link(
          'cache',
          'r',
          'gh',
          'l',
          'Cache to GitHub API: one refresh, however many callers.',
        ),
        link(
          'api',
          'b',
          'react',
          'b',
          'Go API to React app: live stats, or the stale copy, flagged.',
          { fromAt: 0.3, toAt: 0.7 },
        ),
        link(
          'react',
          'l',
          'saved',
          'r',
          'React app to Saved project list: fallback when the API is unreachable.',
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
      ],
      alt: 'The browser loads the page from a web host. The React app asks the Go API for projects. The API checks a one-hour cache and, when it is cold, refreshes once from the GitHub API however many callers are waiting. The API returns live stats, or the stale copy with a flag. If the API is unreachable the app shows a saved project list. The contact form posts to the same API, which limits each IP to 5 messages a minute and forwards the validated message to a Discord webhook.',
    },
    built: [
      'A portfolio is easy to fill with claims a reader cannot check. I built this one so the claims can be checked from outside: a live projects list that keeps working when its API does not, and a browser suite that gates every deploy.', // PD-09
      'The project cards read live GitHub data through a Go API with a one-hour cache and a single-flight refresh. If a refresh fails, the API serves the stale copy and the page says so. If the API is unreachable, the section falls back to a hand-written list.', // PD-10
    ],
    facts: [
      {
        lead: '10 times lighter',
        body: 'The page is 10 times lighter: 4.03 MB down to 397 KB. Resizing eight images to their measured render size did it. Largest paint fell from 4.4 s to 3.2 s.', // PD-12
      },
      {
        lead: '50 requests, 2 calls',
        body: 'The project list holds up under a traffic spike. 50 simultaneous cold requests cost 2 GitHub calls, not 50, and a cached answer takes 0.3 ms instead of 0.54 s.', // PD-13
      },
      {
        lead: '502 to 200',
        body: 'An expired GitHub token turned a working endpoint into a permanent 502. The API now retries once without the token, and the same request returns 200 with all four projects.', // PD-15
      },
      {
        lead: '35 of 40 blocked',
        body: 'I attacked my own contact-form rate limiter. Rotating a forged header got all 40 requests through. After the fix, 35 of 40 were blocked, and the first 5 are the intended burst.', // PD-15a
      },
    ],
  },

  'game-competition-website': {
    slug: 'game-competition-website',
    kind: 'project',
    name: 'Game Competition Website', // GC-01
    summary:
      'A web app for running OSRS bingo competitions. Teams race to complete tasks on a shared board, scores update from the live OSRS hiscores, and admins review proof screenshots from Discord.', // GC-02
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
        'Recording of the Game Competition Website on demo data: log in, create a bingo event, open the overview with player stats, then the board',
      caption: 'Recorded on demo data',
    },
    diagram: {
      nodes: [
        node('player', 'Player browser', '', 0, 130),
        node('api', 'Express API', '', 2, 130),
        node('auth', 'Supabase auth', '', 4, 30),
        node('pg', 'Supabase Postgres', '', 4, 130),
        node('osrs', 'OSRS hiscores API', '', 4, 260),
        node('bot', 'Discord bot', '', 0, 340),
        node('bucket', 'Private screenshot bucket', '', 1, 340),
        node('admin', 'Admin review page', '', 3, 340),
      ],
      edges: [
        link('player', 'r', 'api', 'l', 'Player browser to Express API: requests with a JWT.'),
        link('api', 'r', 'auth', 'l', 'Express API to Supabase auth: checks the role.', {
          fromAt: 0.2,
          toAt: 0.5,
        }),
        link('api', 'r', 'pg', 'l', 'Express API to Supabase Postgres: boards, teams and scores.'),
        link('api', 'r', 'osrs', 'l', 'Express API to OSRS hiscores API: live progress.', {
          fromAt: 0.8,
          toAt: 0.5,
        }),
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
      ],
      alt: "A player's browser sends requests with a JWT to an Express API, which checks the role through Supabase auth and reads boards, teams and scores from Postgres. The API pulls live progress from the OSRS hiscores API. A Discord bot ingests screenshots from a channel into a private storage bucket. An admin approves or denies each one on a review page, and approved drops count toward the team score.",
    },
    built: [
      'Admins build boards, draft teams and review evidence from their own panel. Access is role-based, with JWT auth through Supabase.', // GC-05
      'Tile completions arrive as screenshots. A Discord bot ingests them from a channel into a private bucket, an admin approves or denies each one, and approved drops count toward the team score.', // GC-06
      'The recording logs in, creates a bingo event, opens the overview with player stats, then shows the board. It runs on demo data, not a real competition.', // GC-06a
    ],
    facts: [
      {
        lead: '888 tests',
        body: '888 tests pass: 629 on the backend, run against a real local database, and 259 on the frontend.', // GC-07
      },
      {
        lead: 'Imgur allowlist',
        body: 'Screenshot review accepts Imgur links too, behind an https-only allowlist, no redirects, a 10 second timeout, a 20 MiB cap and a file-type check. The security review found nothing.', // GC-08
      },
      {
        lead: '422 KB to 22 KB',
        body: "A team table that needed sideways scrolling now fits the page. Dropping the data grid cut that page's code from 422 KB to 22 KB.", // GC-08a
      },
    ],
  },

  'ac-composite-actions': {
    slug: 'ac-composite-actions',
    kind: 'project',
    name: 'AC Composite Actions', // AC-01
    summary:
      'Nine GitHub Actions composite actions that my other repos call from CI. They scan pull requests for secrets, run an accessibility check, spellcheck markdown, score a resume PDF and list the changed files. Each check reports back as one pull request comment that it keeps current.', // AC-02
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
        link(
          'wf',
          'r',
          'ats',
          'l',
          'Consumer repo workflow to ats-check: scores the resume PDF.',
          { fromAt: 0.5, toAt: 0.5 },
        ),
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
    facts: [
      {
        lead: '11 repos',
        body: 'The secret scan runs in the CI of 11 of my repos, including Portfolio, Little-Town and Golem Miners. Each one was added by its own rollout pull request.', // AC-07
      },
      {
        lead: '26 minutes',
        body: 'An outside contributor found that the accessibility check never ran, because yarn reserves the word check. The fix merged 26 minutes after they filed it.', // AC-08
      },
      {
        lead: '33 files, not 30',
        body: 'Large pull requests were silently cut off at 30 files. The `diff` action now pages through them: a real pull request returned 33 files, where the old version saw 30.', // AC-08a
      },
      {
        lead: '36 tests',
        body: '36 tests cover the `diff` action. The PR-number tests failed against the first implementation, which is the bug they existed to find.', // AC-08b
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
        'Recording of the Clipper pipeline in a terminal: the run command, clips fetched, formatting and upload logs, then the public Clipper channel page',
      caption: 'One command, start to upload',
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
    facts: [
      {
        lead: '3.0 faces per frame',
        body: 'It tells webcam streams from IRL streams. A threshold of 3.0 face detections per frame passes all 5 true facecams and rejects all 5 IRL clips, calibrated on 15 real clips.', // CL-09
      },
      {
        lead: '58 seconds, 1080x1920',
        body: 'The output is ready for YouTube: up to 58 seconds, 1080x1920, captions burned in.', // CL-10
      },
      { lead: '387 tests', body: '387 tests pass.' }, // CL-11
      {
        lead: '8 of 8',
        body: 'A caption detector scored 8 of 8 on real clips. Five of the 8 came from repost accounts that had already burned in captions, and Clipper now skips its own burn on those.', // CL-11a
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
      text: "Solo play covers digging, crafting, trading, roulette and the golem fights. The Chain, the blast that cracks Golem Prime's armour, is next. Co-op sessions connect, but client digging is off and host edits do not replicate yet.", // GM-03
    },
    stack: 'Unity 6, C#, Unity Test Framework', // GM-04
    // GM-05a. The build is served from /play/, which the deploy fills in.
    links: [{ label: 'Play in your browser', href: '/play/golem-miners/' }],
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
      'Golems sleep in lairs on the way down, their gem eyes dark until something wakes them. Awake, they throw rock and aim ahead of a running miner. The Demi fights with smaller golems at its side, so you duck behind the calcite spars of its lair. Its floor stays sealed while it lives. Kill it and the floor opens onto the stair down to Golem Prime, who hears the whole lair and never forgets a miner. Prime takes a tenth of every hit until the Chain blast cracks its armour. Golems drop rough gems, and their health is set by the size of your crew when they wake.', // GM-06a
      'Gemma Weigh buys rough gems at camp for 120 gold each. Then Roland Dyce makes his pitch: a 100% chance to double your money at his roulette table, which he runs from a hideout off the contract route. The wheel is a fair European one. Red or black pays even money, and the green zero takes every outside bet. Stakes run from 1 to 1,000 gold.', // GM-06b
      'Each session picks a new seed. Mountains change place and height, and the dig site and its tunnels rotate around camp. The camp itself stays put: a company gateway, a campfire plaza and six districts whose NPCs buy and sell. More of their stock unlocks as your contract level rises.', // GM-07
      'Every block change goes through one method, `VoxelWorld.SetBlock`. That choke point is what makes co-op workable. A dig can travel as a block position and type, about 13 bytes, instead of a mesh to sync. FishNet sessions already run, and replicated digs are the next milestone.', // GM-08
      "The game's one scene is assembled in code, because a scene file invites merge conflicts and does not review as a diff.", // GM-08b
    ],
    facts: [
      {
        lead: '1,815 tests',
        body: '1,815 EditMode tests, 0 failing. One manual timing test is skipped.', // GM-09
      },
      {
        lead: '7 GB to 198 MB',
        body: 'The browser build ran out of memory while building the world. Each vertex read the mesh normals, and each read copied the whole array, about 7 GB in one frame. Reading them once brought the peak heap to 198 MB and world generation to under a second.', // GM-09a
      },
      {
        lead: '100 seeded layouts',
        body: 'Managed checks pass for 100 seeded pond and contract layouts, 240 mountain climb models, roulette outcomes, persistence and eight road spawns.', // GM-10
      },
    ],
  },

  'vscode-royalty-theme': {
    slug: 'vscode-royalty-theme',
    kind: 'project',
    name: 'VS Code Royalty Theme', // RV-01
    summary:
      'A VS Code colour theme built from the colours of 16th to 19th century European royalty: white, gold and purple. Version 3 rebuilds it so every colour it ships passes WCAG AA.', // RV-02
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
        'Recording of VS Code with the Royalty theme: a Go file scrolls, a comment is typed, and a TypeScript file opens',
      caption: 'VS Code with the Royalty theme',
    },
    diagram: {
      nodes: [
        node('pal', 'Palette module', 'One source of colour', 0, 90),
        node('gen', 'Theme generator', 'Writes the theme JSON', 1, 0),
        node('json', 'Theme JSON', 'Replaces 2110 lines', 2, 0),
        node('mk', 'VS Code Marketplace', 'v3.0.0 not yet published', 3, 0, true),
        node('cc', 'Contrast check', '174 colour pairs', 1, 180),
      ],
      edges: [
        link('pal', 'r', 'gen', 'l', 'Palette module to Theme generator: one source of colour.', {
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
          'Palette module to Contrast check: 174 colour pairs against their surface.',
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
      alt: 'One palette module is the source of every colour. A generator writes the theme JSON from it, replacing 2110 lines kept by hand. A contrast check measures 174 colour pairs against the surface each one renders on and fails the build on any regression. The theme JSON is packaged for the VS Code Marketplace, where version 3.0.0 is not yet published, so that link is dashed.',
    },
    built: [
      'v3.0.0 was an accessibility rebuild. Five of nine syntax colours were below WCAG AA against the editor background, with keywords at 2.96:1 and storage types at 2.45:1.', // RV-05
      'The background was the cause, since nothing reaches AA against a mid-tone grey-purple. I moved it to a deep plum and rebuilt the palette on top. The theme JSON is now generated from one palette module instead of hand-maintained across 2110 lines.', // RV-06
    ],
    facts: [
      {
        lead: '174 of 174 pass AA',
        body: 'All 174 colour pairs pass WCAG AA, and 158 pass AAA. `npm run check` fails the build on any regression.', // RV-07
      },
      {
        lead: '2.96:1 to 8.1:1',
        body: 'Keyword text went from 2.96:1 to 8.1:1 against the editor background, and storage types from 2.45:1 to 8.1:1. AA asks for 4.5:1.', // RV-07a
      },
      {
        lead: '241 rules to 43',
        body: '241 per-language token rules down to 43 scope-level ones.', // RV-08
      },
      {
        lead: '187 installs',
        body: '187 installs on the Visual Studio Marketplace. The listing still serves version 2.2.0, and v3.0.0 is on GitHub, not yet published.', // RV-10
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
    notice: 'The code belongs to NCR.', // NV-05
    media: { kind: 'none' },
    diagram: {
      nodes: [
        node('repos', 'Product team repos', 'Markdown in GitHub', 0, 0),
        node('pr', 'PR checks', 'Three checks per PR', 1, 0),
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
        link('pr', 'r', 'remark', 'l', 'PR checks to remark: content that passes goes through remark.'),
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
      'Pull requests run checks for spelling, Markdown validity and image alt text. CI reads the changed files from GitHub API diffs, and the review comment updates as new commits arrive.', // NV-08
      'Content that passes goes through remark into Strapi as HTML. The Next.js site maps selected HTML elements to React design-system components when it renders.', // NV-09
      'Four analytics pipelines for accessibility, Google Tag Manager, Qualtrics and FullStory feed BigQuery, and Looker reports on them.', // NV-10
    ],
    facts: [
      { lead: '2,300+ pages', body: 'The rebuilt site navigates 2,300+ pages across 23 products.' }, // NV-11
      { lead: '4 pipelines', body: 'Four analytics pipelines feed BigQuery and Looker.' }, // NV-12
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
    notice: 'The code belongs to NCR.', // SH-05
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
        link('fig', 'r', 'figma', 'l', 'Personas and journeys to Figma designs: designs iterated in Figma.'),
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
      "Alongside Store Health, I built React components for the NCR Design System with its designers. I also added accessibility scoring to CI, which posts each build's result to PRs and Slack, and set up Google Tag Manager and FullStory.", // SH-10
      'Before this role I interned at NCR as a Software Engineer, 7/2020 to 9/2020, working on a REST API on Google Cloud Platform.', // SH-11
    ],
    facts: [
      { lead: '7 users', body: 'I interviewed seven users, one for each persona we identified.' }, // SH-13
      {
        lead: 'Store to country',
        body: 'The dashboard covered many store branches across many UK regions, and rolled technology health up from store to country.', // SH-12
      },
    ],
  },
};

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
