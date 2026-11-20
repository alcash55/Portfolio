import { describe, expect, it } from 'vitest';
import { isWorkersPreviewBuild } from './preview-analytics.mjs';

describe('isWorkersPreviewBuild', () => {
  it('treats a Workers Builds run on a PR branch as a Preview', () => {
    const env = { WORKERS_CI: '1', WORKERS_CI_BRANCH: 'fix/workers-builds-pr-check' };

    expect(isWorkersPreviewBuild(env)).toBe(true);
  });

  it('treats a Workers Builds run on dev as a Preview', () => {
    expect(isWorkersPreviewBuild({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'dev' })).toBe(true);
  });

  it('keeps analytics for the production build on main', () => {
    expect(isWorkersPreviewBuild({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' })).toBe(false);
  });

  it('treats a Workers Builds run with no branch as a Preview, so a missing variable never leaks events', () => {
    expect(isWorkersPreviewBuild({ WORKERS_CI: '1' })).toBe(true);
  });

  it('leaves local and GitHub Actions builds alone', () => {
    expect(isWorkersPreviewBuild({})).toBe(false);
    expect(isWorkersPreviewBuild({ CI: 'true', GITHUB_REF_NAME: 'dev' })).toBe(false);
  });
});
