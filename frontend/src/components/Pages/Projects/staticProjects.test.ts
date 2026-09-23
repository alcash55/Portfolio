import { describe, expect, it } from 'vitest';
import { staticProjects } from './staticProjects';

/**
 * Senior-signal pass (TEAM-BRIEF.md item 6): the grid used to open with a
 * VS Code theme, ahead of the fullstack game platform and the CI/CD tooling
 * consumed by other repos. Lead with the engineering; the hobby projects
 * (theme, Unity prototype, clip pipeline) fall to the back.
 */
describe('project ordering', () => {
  it('leads with the two projects that carry real engineering', () => {
    const names = staticProjects.map((project) => project.name);

    expect(names.slice(0, 2)).toEqual(['Game Competition Website', 'AC Composite Actions']);
  });

  it('puts the hobby projects last', () => {
    const names = staticProjects.map((project) => project.name);
    const hobby = ['VS Code Royalty Theme', 'Golem Miners', 'The Cliper-er'];

    expect(names.slice(-3).sort()).toEqual([...hobby].sort());
  });
});
