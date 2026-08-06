import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useProjects, { type ApiProject } from './useProjects';

const apiProject = (overrides: Partial<ApiProject> = {}): ApiProject => ({
  name: 'Little-Town',
  description: 'from GitHub',
  url: 'https://github.com/alcash55/Little-Town',
  homepage: 'https://littletown.gay/',
  language: 'TypeScript',
  stars: 3,
  topics: [],
  updatedAt: '2026-08-01T12:00:00Z',
  ...overrides,
});

describe('useProjects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts in a loading state with no api projects', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const { result } = renderHook(() => useProjects());

    expect(result.current.isLoading, 'expected isLoading=true before the fetch settles').toBe(true);
    expect(
      result.current.apiProjects,
      'expected apiProjects to be null before the fetch settles',
    ).toBeNull();
  });

  it('fetches {VITE_API_URL}/api/v1/projects and returns the parsed list on a 200', async () => {
    const projects = [apiProject()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ projects, stale: false }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.apiProjects,
      'expected the parsed projects array from the response',
    ).toEqual(projects);
    expect(fetchMock, 'fetch should have been called exactly once').toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url, `expected the projects endpoint, got ${url}`).toBe(
      'http://localhost:8080/api/v1/projects',
    );
    expect(options.signal, 'expected an AbortSignal so a cold start can time out').toBeInstanceOf(
      AbortSignal,
    );
  });

  it('resolves apiProjects=null on a non-2xx status, logging exactly once (branches on status, not body)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: 'could not load projects' }),
      } as unknown as Response),
    );

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.apiProjects,
      'a 502 must fall back to null so the caller renders static data',
    ).toBeNull();
    expect(
      consoleError,
      'expected exactly one console.error on a failed fetch',
    ).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('resolves apiProjects=null (does not throw) when fetch rejects with a network error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.apiProjects, 'a network throw must fall back to null').toBeNull();
    expect(
      consoleError,
      'expected exactly one console.error on a network throw',
    ).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('aborts and resolves apiProjects=null after 60s, covering a hung Render cold start', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Never resolves on its own; only rejects when the AbortController fires,
    // exactly like a real fetch against a backend that never wakes up.
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

    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999);
    });
    expect(result.current.isLoading, 'should not have timed out before the 60s mark').toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.isLoading, 'expected isLoading=false once the 60s abort fires').toBe(
      false,
    );
    expect(result.current.apiProjects, 'a timeout must fall back to null').toBeNull();
    expect(consoleError, 'expected exactly one console.error on a timeout').toHaveBeenCalledTimes(
      1,
    );

    consoleError.mockRestore();
  });
});
