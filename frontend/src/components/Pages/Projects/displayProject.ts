import type { StaticProject } from './staticProjects';
import type { ApiProject } from './useProjects';

/**
 * A static project entry merged with live metadata (F1). The static entry
 * always wins for name/img/href/alt -- `description` falls back to the
 * live entry's only when the static one is blank, which none of the
 * current five are. `live` is `null` when there is no matching API entry,
 * the API is unreachable, or the request is still in flight -- any of
 * which means "render this card from static data alone".
 *
 * Lives in its own module rather than in `Projects.tsx` because the dialog
 * needs the same shape, and a component importing a type from the component
 * that renders it is how this repo shipped a runtime circular import once
 * before.
 */
export interface DisplayProject extends StaticProject {
  live: ApiProject | null;
}

export const mergeProject = (
  project: StaticProject,
  apiProjects: ApiProject[] | null,
): DisplayProject => {
  // An entry with no `repoName` isn't on GitHub, so there is nothing to match.
  // Guarded explicitly rather than left to `find` -- `p.name === undefined`
  // would be false for every real repo today, but that's an accident of the
  // data, not a rule, and a single API entry with a missing name would quietly
  // attach itself to every non-GitHub project.
  const live = project.repoName
    ? (apiProjects?.find((p) => p.name === project.repoName) ?? null)
    : null;
  return {
    ...project,
    description: project.description || live?.description || '',
    live,
  };
};

export const formatUpdatedAt = (iso: string): string | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
