import vsCodeTheme from '../../../assets/images/vsCodeTheme.webp';
import littleTown from '../../../assets/images/littleTown.webp';
import compositeActions from '../../../assets/images/compositeActions.webp';
import portfolio from '../../../assets/images/portfolio.webp';

/**
 * Hand-written project card: display name, copy, image, and link. This is
 * the override layer the live API is never allowed to clobber -- two of
 * these (littletown.gay, the VS Code Marketplace listing) don't even link
 * to GitHub.
 *
 * `repoName` is the GitHub repo name (owner `alcash55`), used only to match
 * this entry against `GET /api/v1/projects` results for live metadata
 * (stars, language, updatedAt). It has no bearing on what's shown or linked
 * -- e.g. the Royalty theme card still links to the Marketplace even though
 * its repoName matches a real GitHub repo.
 */
export interface StaticProject {
  repoName: string;
  name: string;
  img: string;
  href: string;
  alt: string;
  description: string;
}

/** OSRS Bingo description
 * @see https://www.youtube.com/watch?v=MF6LjbPVFtA
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
];
