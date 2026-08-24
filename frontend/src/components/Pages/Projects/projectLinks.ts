import type { StaticProject } from './staticProjects';

/**
 * Every repo here lives under one account, and `StaticProject.repoName` is
 * documented as being that account's repo name. Kept as one constant so the
 * owner appears once rather than five times.
 */
const GITHUB_OWNER_URL = 'https://github.com/alcash55';

export interface ProjectLink {
  /** Button label. Says where the link *goes*, not "Learn more". */
  label: string;
  href: string;
}

/**
 * The outbound links for one project, primary first.
 *
 * The dialog's primary link is the **GitHub repo** for every project that has
 * one, which is a deliberate change from the card's old behaviour: two cards
 * used to lead somewhere else entirely (littletown.gay and the VS Code
 * Marketplace listing), so a visitor who wanted the source had nowhere to go
 * from this page. The old destination is not dropped though -- it comes back
 * as a second button, because "the live thing" is still the more interesting
 * link for anyone who is not reading code.
 *
 * The Cliper-er has no `repoName` (private, local-only), so its only link is
 * the channel the pipeline publishes to -- the output is the project's whole
 * public face.
 *
 * Derived rather than hand-listed so the GitHub URL cannot drift from the
 * `repoName` the live API is matched against, and deliberately *not* taken
 * from the API's `url` field: the section has to render identically when the
 * API is unreachable, and a link that only exists on a good day is exactly the
 * kind of difference that fallback is supposed to hide.
 */
export const projectLinks = (project: StaticProject): ProjectLink[] => {
  const links: ProjectLink[] = [];

  if (project.repoName) {
    links.push({ label: 'GitHub repo', href: `${GITHUB_OWNER_URL}/${project.repoName}` });
  }

  // The card's own `href`. Added second unless it is the repo we just added --
  // three of the five entries already point at their own GitHub page, and two
  // identical buttons side by side is a bug, not a choice.
  if (project.href && !links.some((link) => link.href === project.href)) {
    links.push({ label: project.hrefLabel ?? 'Project link', href: project.href });
  }

  return links;
};
