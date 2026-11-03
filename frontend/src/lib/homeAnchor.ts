import { PROJECT_CHAPTERS } from '~/content/home';
import { EXPERIENCE } from '~/content/people';
import type { ExperienceSlug, ProjectSlug } from '~/content/pages';

/**
 * The home page chapter a write-up opens from. The breadcrumb returns there, so a
 * visitor lands on the chapter they left instead of the top of the list. Each
 * project chapter is keyed by its slug, but the first one answers to the shared
 * projects anchor, and an experience write-up belongs to the role that links it.
 */
export function homeAnchor(slug: ProjectSlug | ExperienceSlug): string {
  const project = PROJECT_CHAPTERS.find((chapter) => chapter.id === slug);
  if (project) return project.anchor ?? project.id;
  const role = EXPERIENCE.find((item) => item.writeUp?.slug === slug);
  if (role) return role.id;
  throw new Error(`No home chapter links the write-up "${slug}"`);
}
