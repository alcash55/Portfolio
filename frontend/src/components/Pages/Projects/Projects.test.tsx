import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Projects from './Projects';
import { staticProjects } from './staticProjects';
import type { ApiProject } from './useProjects';

const apiProject = (overrides: Partial<ApiProject> = {}): ApiProject => ({
  name: 'Little-Town',
  description: 'from GitHub, should never be shown -- the static description owns this card',
  url: 'https://github.com/alcash55/Little-Town',
  homepage: 'https://littletown.gay/',
  language: 'TypeScript',
  stars: 42,
  topics: [],
  updatedAt: '2026-08-01T12:00:00Z',
  ...overrides,
});

const okResponse = (projects: ApiProject[]) =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ projects, stale: false }),
  }) as unknown as Response;

describe('Projects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows skeletons (not the project cards) while the fetch is in flight (F2)', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const { container } = render(<Projects />);

    expect(
      screen.queryByText('Game Competition Website'),
      'a static project title must not render yet while loading',
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('.MuiSkeleton-root').length,
      'expected skeleton placeholders while the request is in flight',
    ).toBeGreaterThan(0);
  });

  it('renders exactly one skeleton grid item per static project, so the grid layout does not jump once data lands (F2)', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const { container } = render(<Projects />);

    const skeletonGridItems = container.querySelectorAll('.MuiGrid-item');
    expect(
      skeletonGridItems.length,
      `expected ${staticProjects.length} skeleton grid items (one per static project), got ${skeletonGridItems.length}`,
    ).toBe(staticProjects.length);
  });

  it('renders every static project from its own data when the API call succeeds, with live metadata merged in (F1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse([apiProject({ name: 'Little-Town', stars: 42 })])),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    // All four static cards render regardless of which ones the API matched.
    for (const project of staticProjects) {
      expect(
        screen.getByText(project.name),
        `expected the static card "${project.name}" to render`,
      ).toBeInTheDocument();
    }

    // Live metadata for the matched repo is shown.
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('the static description always wins over the API description (F1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse([
          apiProject({
            name: 'Little-Town',
            description: 'THIS SHOULD NEVER APPEAR ON SCREEN',
          }),
        ]),
      ),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    expect(
      screen.getByText(/A fullstack website for video game competitions/i),
      'expected the hand-written description to render',
    ).toBeInTheDocument();
    expect(
      screen.queryByText('THIS SHOULD NEVER APPEAR ON SCREEN'),
      'the API description must never override a hand-written one',
    ).not.toBeInTheDocument();
  });

  it('a project with no matching API entry still renders purely from static data', async () => {
    // The API only knows about Little-Town; the other three repos are absent
    // from the response entirely (e.g. allow-list drift, or a 404 the
    // backend chose to skip).
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse([apiProject({ name: 'Little-Town' })])),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Portfolio Website')).toBeInTheDocument());

    expect(screen.getByText('AC Composite Actions')).toBeInTheDocument();
    expect(screen.getByText('VS Code Royalty Theme')).toBeInTheDocument();
  });

  it('falls back to the static list, indistinguishable from today, on a 502 (F3)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: 'could not load projects' }),
      } as unknown as Response),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    for (const project of staticProjects) {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    }
    // No error banner, no empty section -- and no live metadata, since none
    // was ever received.
    expect(screen.queryByText(/error|failed|unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      consoleError,
      'the only allowed console noise on a 502 fallback is a single console.error',
    ).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('falls back to the static list, indistinguishable from today, on a network throw (F3)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    for (const project of staticProjects) {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('falls back to the static list, indistinguishable from today, after a 60s timeout (F3)', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );
    render(<Projects />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    for (const project of staticProjects) {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
