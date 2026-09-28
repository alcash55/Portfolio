import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useProjectDialog } from './useProjectDialog';
import { staticProjects } from './staticProjects';
import { projectHash } from './projectSlug';

describe('useProjectDialog', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  // The dialog is lazy-loaded, so on a slow connection there is no modal
  // backdrop yet to swallow repeat clicks on the card. Each click used to push
  // its own history entry, and Back after closing reopened the dialog.
  it('pushes one history entry when the same project is opened repeatedly', () => {
    const project = staticProjects[0];
    const { result } = renderHook(() => useProjectDialog());
    const before = window.history.length;

    act(() => result.current.open(project));
    act(() => result.current.open(project));
    act(() => result.current.open(project));

    expect(
      window.history.length - before,
      `three open("${project.name}") calls should add 1 history entry, hash is now ${window.location.hash}`,
    ).toBe(1);
    expect(window.location.hash).toBe(projectHash(project));
    expect(result.current.project).toBe(project);
  });

  it('still pushes an entry when a different project is opened', () => {
    const [first, second] = staticProjects;
    const { result } = renderHook(() => useProjectDialog());
    const before = window.history.length;

    act(() => result.current.open(first));
    act(() => result.current.open(second));

    expect(window.history.length - before).toBe(2);
    expect(window.location.hash).toBe(projectHash(second));
  });
});
