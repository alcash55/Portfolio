// Strings come from the copy deck rows named in each comment. Page bodies arrive
// in later work, so this module holds only what the shell and the head need.

export interface PageCopy {
  readonly h1: string;
  readonly title: string;
  readonly description: string;
}

export interface ContentPage extends PageCopy {
  readonly slug: string;
}

export const SITE_NAME = 'Alex Cash';

// HO-01, and the home row of the meta table.
export const HOME: PageCopy = {
  h1: 'Alex Cash builds the Go API and the page that reads it.',
  title: 'Alex Cash, software engineer',
  description:
    'Alex Cash is a software engineer in Memphis, TN. He builds the Go API and the React page that reads it.',
};

const PROJECTS = [
  {
    slug: 'portfolio-website',
    h1: 'Portfolio Website',
    title: 'Portfolio Website, work by Alex Cash',
    description:
      'How this portfolio was built: a React front end, a Go API, a page 10 times lighter and a browser suite that gates every deploy.',
  },
  {
    slug: 'game-competition-website',
    h1: 'Game Competition Website',
    title: 'Game Competition Website, work by Alex Cash',
    description:
      'A web app for running OSRS bingo competitions, with live hiscores progress, team drafting and screenshot review.',
  },
  {
    slug: 'ac-composite-actions',
    h1: 'AC Composite Actions',
    title: 'AC Composite Actions, work by Alex Cash',
    description:
      "CI/CD building blocks shared across Alex Cash's repos, each one a GitHub Actions composite action.",
  },
  {
    slug: 'clipper',
    h1: 'Clipper',
    title: 'Clipper, work by Alex Cash',
    description:
      'An automation pipeline that turns YouTube and Twitch clips into captioned, upload-ready YouTube Shorts with one command.',
  },
  {
    slug: 'golem-miners',
    h1: 'Golem Miners',
    title: 'Golem Miners, work by Alex Cash',
    description:
      'A co-op mining game in Unity 6. Dig down through ground that breaks block by block, fight stone golems for their gems, and bet the take at roulette.',
  },
  {
    slug: 'vscode-royalty-theme',
    h1: 'VS Code Royalty Theme',
    title: 'VS Code Royalty Theme, work by Alex Cash',
    description:
      'A VS Code theme in white, gold and purple. Version 3 rebuilds it so every colour passes WCAG AA.',
  },
] as const satisfies readonly ContentPage[];

// NV-01 and SH-01 are the h1s. The meta table titles differ from them on purpose.
const EXPERIENCE = [
  {
    slug: 'ncr-voyix-docs',
    h1: 'NCR Voyix docs site',
    title: 'NCR Voyix documentation site, work by Alex Cash',
    description:
      'How Alex Cash rebuilt the Voyix documentation site in Next.js, with a GitHub to Strapi publishing pipeline and PR checks.',
  },
  {
    slug: 'starbucks-store-health',
    h1: 'Starbucks UK Store Health',
    title: 'Starbucks Store Health, work by Alex Cash',
    description:
      'User research and the React dashboard that rolls Starbucks UK store health up to country level on live API data.',
  },
] as const satisfies readonly ContentPage[];

export type ProjectSlug = (typeof PROJECTS)[number]['slug'];
export type ExperienceSlug = (typeof EXPERIENCE)[number]['slug'];

export const PROJECT_SLUGS: readonly ProjectSlug[] = PROJECTS.map((page) => page.slug);
export const EXPERIENCE_SLUGS: readonly ExperienceSlug[] = EXPERIENCE.map((page) => page.slug);

export function findProject(slug: string): ContentPage | undefined {
  return PROJECTS.find((page) => page.slug === slug);
}

export function findExperience(slug: string): ContentPage | undefined {
  return EXPERIENCE.find((page) => page.slug === slug);
}

/** Experience slugs live under /experience, project slugs under /projects. */
export function pageHref(slug: ProjectSlug | ExperienceSlug): string {
  const isExperience = EXPERIENCE.some((page) => page.slug === slug);
  return `${isExperience ? '/experience' : '/projects'}/${slug}`;
}

// NF-01 to NF-07, ST-20 and the 404 row of the meta table.
export const NOT_FOUND = {
  title: 'Page not found, Alex Cash',
  description: 'That page does not exist.',
  route: {
    h1: "That page doesn't exist.",
    line: 'The address may have changed, or it was mistyped.',
    homeLink: 'Go to the home page',
    projectsLink: 'See the projects',
  },
  slug: {
    h1: 'There is no project at that address.',
    allLink: 'See all projects',
    homeLink: 'Go to the home page',
  },
} as const;
