import vsCodeTheme from '../../../assets/images/vsCodeTheme.webp';
import littleTown from '../../../assets/images/littleTown.webp';
import compositeActions from '../../../assets/images/compositeActions.webp';
import portfolio from '../../../assets/images/portfolio.webp';
import theCliperEr from '../../../assets/images/theCliperEr.webp';

/**
 * Hand-written project card: display name, copy, image, and link. This is
 * the override layer the live API is never allowed to clobber -- three of
 * these (littletown.gay, the VS Code Marketplace listing, The Cliper-er's
 * YouTube channel) don't link to GitHub at all.
 *
 * `repoName` never decides what is shown or linked, only what the API is
 * matched against -- e.g. the Royalty theme card still links to the
 * Marketplace even though its repoName matches a real GitHub repo.
 */
export interface StaticProject {
  /**
   * GitHub repo name (owner `alcash55`), used *only* to match this entry
   * against `GET /api/v1/projects` for live metadata.
   *
   * Omitted for projects that don't live on GitHub at all (The Cliper-er
   * is private and local-only). Such an entry simply never matches the API and
   * renders from this file alone -- it is not a lookup that fails, so it must
   * not be given a placeholder repo name to keep the type happy.
   */
  repoName?: string;
  name: string;
  /** Omitted when there's no screenshot; the card draws a placeholder panel. */
  img?: string;
  href: string;
  /** Only meaningful alongside `img` -- there is nothing else to describe. */
  alt?: string;
  description: string;
}

/**
 * The curated project list. This is the source of truth for *which* projects
 * appear and for their descriptions, screenshots, and links -- the API only
 * layers live metadata (stars, language, last updated) on top, matched by
 * `repoName`. Entries render from this data alone when the API is
 * unavailable, so nothing here may depend on a response arriving.
 *
 * Note two entries deliberately link somewhere other than their GitHub repo
 * (a live site and a Marketplace listing), which is why `href` is never
 * derived from the API's `url`.
 */
export const staticProjects: StaticProject[] = [
  {
    repoName: 'Little-Town',
    name: 'Game Competition Website',
    img: littleTown,
    href: 'https://littletown.gay/',
    alt: 'Fullstack game competition platform with tournament management',
    description:
      'A fullstack website for video game competitions built with React, featuring real-time tournament management and user engagement',
  },
  {
    repoName: 'ac-composite-actions',
    name: 'AC Composite Actions',
    img: compositeActions,
    href: 'https://github.com/alcash55/ac-composite-actions',
    alt: 'Composite actions code',
    description: 'A repository of workflows and composite actions to use in CI/CD pipelines',
  },
  {
    repoName: 'Royalty-VS-Code-Theme',
    name: 'VS Code Royalty Theme',
    img: vsCodeTheme,
    href: 'https://marketplace.visualstudio.com/items?itemName=Alcash55.royaltytheme',
    alt: 'Royalty VS Code Theme',
    description: 'A custom theme for VS Code inspired by the colors of royalty',
  },
  {
    repoName: 'Portfolio',
    name: 'Portfolio Website',
    img: portfolio,
    href: 'https://github.com/alcash55/Portfolio',
    alt: 'Portfolio website built with React, TypeScript, and Material UI',
    description:
      'A website built to showcase my skills and experiences using modern web technologies',
  },
  {
    // No `repoName`: the code is private and local-only, so there is no API
    // entry to match and the card renders from this entry alone. The link
    // goes to the channel the pipeline publishes to -- the output is the only
    // public face this project has.
    name: 'The Cliper-er',
    // The channel's own logo, masked to a transparent circle (the source is a
    // square JPEG whose white corners would have shown as a white box against
    // the dark themes' tinted image panel).
    img: theCliperEr,
    href: 'https://www.youtube.com/@TheCliper-er',
    alt: "The Cliper-er's channel logo: a play button being cut by scissors",
    description:
      'An automation pipeline that turns YouTube and Twitch clips into captioned, upload-ready YouTube Shorts',
  },
];
