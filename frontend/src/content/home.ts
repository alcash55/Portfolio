import type { ProjectSlug } from './pages';

/** One row of the chapters index. `id` is the in-page anchor the row links to. */
export interface IndexItem {
  readonly n: number;
  readonly id: string;
  readonly title: string;
}

export interface IndexGroup {
  readonly label: string;
  readonly items: readonly IndexItem[];
}

/**
 * The whole page, in reading order. Experience, Education and Contact are
 * built elsewhere; their rows live here so the numbering stays in one place.
 */
export const CHAPTER_GROUPS: readonly IndexGroup[] = [
  { label: 'About', items: [{ n: 1, id: 'about', title: 'About me' }] },
  {
    label: 'Projects',
    items: [
      { n: 2, id: 'portfolio-website', title: 'Portfolio Website' },
      { n: 3, id: 'game-competition-website', title: 'Game Competition' },
      { n: 4, id: 'ac-composite-actions', title: 'AC Composite Actions' },
      { n: 5, id: 'clipper', title: 'Clipper' },
      { n: 6, id: 'golem-miners', title: 'Golem Miners' },
      { n: 7, id: 'vscode-royalty-theme', title: 'Royalty Theme' },
    ],
  },
  {
    label: 'Experience',
    items: [
      { n: 8, id: 'experience', title: 'Solea Energy' },
      { n: 9, id: 'ncr-voyix', title: 'NCR Voyix' },
      { n: 10, id: 'ncr-store-health', title: 'NCR Store Health' },
      { n: 11, id: 'education', title: 'Education' },
    ],
  },
  { label: 'Contact', items: [{ n: 12, id: 'contact', title: 'Say hi' }] },
];

export const CHAPTER_COUNT = CHAPTER_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

export const CHAPTER_INDEX_TITLE = 'Chapters';

/** The short name of chapter `n`, as the index and the header counter show it. */
export function chapterTitle(n: number): string {
  for (const group of CHAPTER_GROUPS) {
    const item = group.items.find((i) => i.n === n);
    if (item) return item.title;
  }
  throw new Error(`No chapter ${n} in the index`);
}

/** Two-digit chapter number for the header counter, for example "06". */
export function chapterNumber(n: number): string {
  return String(n).padStart(2, '0');
}

export const ABOUT = {
  id: 'about',
  overline: 'About me',
  heading: 'Alex Cash builds the Go API and the page that reads it.',
  paragraph:
    "I'm a software engineer in Memphis, TN. I work the whole stack in Go, TypeScript and React. That means Go or Node.js services, React micro-frontends and everything in between. Outside work I walk two dogs, Troy and Leon, and I coached lacrosse.",
  availability: "Let's work together.",
  message: { label: 'Message Alex', ariaLabel: 'Message Alex (goes to the contact form)' },
  resume: { label: 'View resume', href: '/resume' },
  social: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/alexander-cash/' },
    { label: 'GitHub', href: 'https://github.com/alcash55' },
  ],
  fig: {
    n: 0,
    label: 'Portrait',
    caption: 'Joshua Tree',
    alt: 'Alex at Joshua Tree.',
    src: '/images/joshua_tree.webp',
    width: 565,
    height: 424,
  },
} as const;

export const PROJECTS_INTRO = {
  id: 'projects',
  heading: 'Projects.',
  line: 'Each project links to its source, or says the code is private.',
};

export type Paragraph =
  | { readonly kind: 'body'; readonly text: string }
  | { readonly kind: 'proof'; readonly text: string };

export type ChapterLinkSpec =
  | { readonly kind: 'write-up'; readonly slug: ProjectSlug; readonly label: string }
  | { readonly kind: 'external'; readonly label: string; readonly href: string };

export interface FigSpec {
  /** Figure number shown in the frame header, "Fig 3". */
  readonly n: number;
  readonly label: string;
  readonly caption: string;
  readonly meta?: string;
}

export interface ProjectChapterSpec {
  readonly n: number;
  readonly id: ProjectSlug;
  readonly overline: string;
  readonly heading: string;
  readonly paragraphs: readonly Paragraph[];
  readonly links: readonly ChapterLinkSpec[];
  readonly note?: string;
  /** A short line under the links, used for the Golem Miners play note. */
  readonly afterLinks?: string;
  readonly fig: FigSpec;
  /** True when the figure sits on the left. */
  readonly reverse: boolean;
  /** Tall chapters get extra room so the figure can stay in view. */
  readonly big: boolean;
}

const WRITE_UP = 'Read the write-up';
const GITHUB = 'View on GitHub';
const PRIVATE = 'The code is private.';

export const PROJECT_CHAPTERS: readonly ProjectChapterSpec[] = [
  {
    n: 2,
    id: 'portfolio-website',
    overline: 'Portfolio Website',
    heading: 'A portfolio with a Go API behind it',
    paragraphs: [
      {
        kind: 'body',
        text: 'This site. A React and TypeScript front end, a Go API behind it, and a browser suite that gates every deploy.',
      },
      {
        kind: 'proof',
        text: 'Page weight cut tenfold, 4.03 MB to 397 KB. Lighthouse accessibility 86 to 100.',
      },
    ],
    links: [
      { kind: 'write-up', slug: 'portfolio-website', label: WRITE_UP },
      { kind: 'external', label: GITHUB, href: 'https://github.com/alcash55/Portfolio' },
    ],
    fig: { n: 1, label: 'Recording', caption: 'Version 1: the current site' },
    reverse: true,
    big: true,
  },
  {
    n: 3,
    id: 'game-competition-website',
    overline: 'Game Competition Website',
    heading: 'Scoring bingo from Discord screenshots',
    paragraphs: [
      {
        kind: 'body',
        text: 'A web app for running OSRS bingo competitions. Teams race through a shared board and progress comes live from the OSRS hiscores API.',
      },
      {
        kind: 'proof',
        text: 'Discord screenshots land in an admin review queue, and approved drops score for the team.',
      },
      {
        kind: 'body',
        text: 'The recording logs in, creates a bingo event, opens the overview with player stats, then shows the board. It runs on demo data.',
      },
    ],
    links: [
      { kind: 'write-up', slug: 'game-competition-website', label: WRITE_UP },
      {
        kind: 'external',
        label: 'Open the live site',
        href: 'https://diamond-dogs-bingo.onrender.com/',
      },
      { kind: 'external', label: GITHUB, href: 'https://github.com/alcash55/Little-Town' },
    ],
    fig: {
      n: 2,
      label: 'Recording',
      caption: 'React, TypeScript, Express, Supabase, PostgreSQL',
      meta: 'Demo data',
    },
    reverse: false,
    big: true,
  },
  {
    n: 4,
    id: 'ac-composite-actions',
    overline: 'AC Composite Actions',
    heading: 'CI that 11 of my repos share',
    paragraphs: [
      {
        kind: 'body',
        text: 'Nine GitHub Actions my other repos call from CI, from a secret scan to an accessibility check. Each one reports back as a single pull request comment that stays current.',
      },
      {
        kind: 'proof',
        text: "The secret scan runs in 11 of my repos, and pull requests from forks get its report too. An outside contributor's bug report was fixed and merged in 26 minutes.",
      },
    ],
    links: [
      { kind: 'write-up', slug: 'ac-composite-actions', label: WRITE_UP },
      { kind: 'external', label: GITHUB, href: 'https://github.com/alcash55/ac-composite-actions' },
    ],
    fig: { n: 3, label: 'Actions', caption: 'JavaScript, GitHub Actions, Bun, Vitest' },
    reverse: true,
    big: true,
  },
  {
    n: 5,
    id: 'clipper',
    overline: 'Clipper',
    heading: 'From a clip to a Short with one command',
    paragraphs: [
      {
        kind: 'body',
        text: 'An automation pipeline that turns YouTube and Twitch clips into captioned, upload-ready YouTube Shorts. One command runs every step, from fetching clips to uploading.',
      },
      {
        kind: 'proof',
        text: 'One command turns a YouTube or Twitch clip into a captioned, upload-ready Short. 387 tests pass.',
      },
    ],
    links: [
      { kind: 'write-up', slug: 'clipper', label: WRITE_UP },
      {
        kind: 'external',
        label: 'Watch the channel',
        href: 'https://www.youtube.com/@TheCliper-er',
      },
    ],
    note: PRIVATE,
    fig: {
      n: 4,
      label: 'Recording',
      caption: 'TypeScript, Node.js, FFmpeg, yt-dlp, faster-whisper',
    },
    reverse: false,
    big: true,
  },
  {
    n: 6,
    id: 'golem-miners',
    overline: 'Golem Miners',
    heading: 'Dig deep, get rich, wake the golems',
    paragraphs: [
      {
        kind: 'body',
        text: 'A co-op mining game for one to eight players, built in Unity 6 for Steam. Shafted & Sons Mining Co. drops your crew in Scree Hollow with a contract and nothing else. Dig through ground that breaks block by block, crack open gem veins, and haul the loot back to camp to sell.',
      },
      {
        kind: 'proof',
        text: 'Stone golems sleep in lairs on the way down. Wake one and it hurls rock at you until you beat it for its gems. Then take your gold to Roland Dyce, who promises a 100% chance to double your money at roulette. Ignore the green zero. Under the hood, one fix took the browser build from crashing out of memory to generating the world in under a second.',
      },
    ],
    links: [
      { kind: 'write-up', slug: 'golem-miners', label: WRITE_UP },
      { kind: 'external', label: 'Play in your browser', href: '/play/golem-miners/' },
    ],
    note: PRIVATE,
    afterLinks:
      'Single-player, about 62 MB, for a computer with a keyboard and mouse. Steam co-op does not run in a browser.',
    fig: { n: 5, label: 'Recording', caption: 'Unity 6, C#, Unity Test Framework' },
    reverse: true,
    big: false,
  },
  {
    n: 7,
    id: 'vscode-royalty-theme',
    overline: 'VS Code Royalty Theme',
    heading: 'A colour theme that passes contrast checks',
    paragraphs: [
      {
        kind: 'body',
        text: 'A VS Code theme in white, gold and purple. Version 3 rebuilds it so every colour passes WCAG AA.',
      },
      {
        kind: 'proof',
        text: 'Keyword contrast raised from 2.96:1 to 8.1:1. A build check blocks any colour below WCAG AA.',
      },
    ],
    links: [
      { kind: 'write-up', slug: 'vscode-royalty-theme', label: WRITE_UP },
      {
        kind: 'external',
        label: 'View the Marketplace listing',
        href: 'https://marketplace.visualstudio.com/items?itemName=Alcash55.royaltytheme',
      },
      {
        kind: 'external',
        label: GITHUB,
        href: 'https://github.com/alcash55/Royalty-VS-Code-Theme',
      },
    ],
    fig: { n: 6, label: 'Recording', caption: 'VS Code, Node.js, JSON' },
    reverse: false,
    big: true,
  },
];
