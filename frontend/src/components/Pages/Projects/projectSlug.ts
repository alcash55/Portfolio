import { staticProjects, type StaticProject } from './staticProjects';

/**
 * The deep-link scheme for the project dialog: `#projects/<slug>`.
 *
 * It has to nest *under* the section's own anchor rather than sit beside it.
 * The Projects header already renders an `IconButton href="#projects"` whose
 * whole job is to scroll the page to `<section id="projects">`, and the browser
 * resolves a bare `#projects` against element ids. So the scheme adds a path
 * segment instead of a new top-level fragment: `#projects` keeps working as an
 * in-page anchor (no element has the id `projects/portfolio-website`, so the
 * browser simply scrolls nowhere and leaves the position alone), and anything
 * after the slash is ours.
 */
const HASH_PREFIX = 'projects/';

/**
 * `Game Competition Website` -> `game-competition-website`.
 *
 * Derived from the display name rather than stored on the project, so a slug
 * cannot drift from the card it opens and `staticProjects.ts` stays the source
 * of truth for which projects exist. The cost is that renaming a project
 * breaks any link somebody had already shared -- acceptable for five entries
 * that have never been renamed, and the alternative (a hand-maintained `slug`
 * field) is one more thing to forget on the sixth.
 */
export const projectSlug = (project: StaticProject | { name: string }): string =>
  project.name
    .toLowerCase()
    // Anything that is not a letter, digit or dash becomes a dash, so the slug
    // is safe both in a URL fragment and inside an attribute selector.
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** `#projects/portfolio-website` for sharing, and for `history.pushState`. */
export const projectHash = (project: StaticProject | { name: string }): string =>
  `#${HASH_PREFIX}${projectSlug(project)}`;

/**
 * The project a hash points at, or `null` for anything else -- including the
 * bare `#projects` anchor, an unknown slug (a stale shared link, or a project
 * that has since been renamed), and an empty hash.
 *
 * Returning the project rather than the raw slug means the caller cannot open
 * a dialog for something that no longer exists.
 */
export const projectFromHash = (hash: string): StaticProject | null => {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!fragment.startsWith(HASH_PREFIX)) return null;

  const slug = decodeURIComponent(fragment.slice(HASH_PREFIX.length));
  if (!slug) return null;

  return staticProjects.find((project) => projectSlug(project) === slug) ?? null;
};

/**
 * What the URL goes back to when the dialog closes: the section anchor, not an
 * empty fragment. The visitor is looking at the Projects section either way, so
 * the URL should still say so, and it keeps a reload after closing from
 * bouncing back to the top of the page.
 */
export const SECTION_HASH = '#projects';
