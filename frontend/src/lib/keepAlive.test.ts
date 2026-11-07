import { describe, expect, it, vi } from 'vitest';
import { KEEP_ALIVE_TIMEOUT_MS, pingApi } from './keepAlive';

const API = 'https://api.example.test';

function setup(fetchImpl: typeof fetch, apiUrl = API, timeoutMs?: number) {
  const warn = vi.fn<(line: string) => void>();
  const fetchSpy = vi.fn(fetchImpl);
  const done = pingApi({ fetch: fetchSpy, apiUrl, warn, timeoutMs });
  return { done, warn, fetchSpy };
}

describe('pingApi', () => {
  it('sends GET /healthz to the API and stays quiet when it answers 200', async () => {
    const { done, warn, fetchSpy } = setup(async () => new Response('ok', { status: 200 }));
    await done;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(`${API}/healthz`);
    expect(warn).not.toHaveBeenCalled();
  });

  it('uses one slash when the API URL ends with one', async () => {
    const { done, fetchSpy } = setup(async () => new Response('ok'), `${API}/`);
    await done;
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(`${API}/healthz`);
  });

  it('logs one line with the status when the API answers non-200', async () => {
    const { done, warn } = setup(async () => new Response('down', { status: 503 }));
    await expect(done).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe('keep-alive: GET /healthz returned 503');
  });

  it('logs one line and does not throw when the network fails', async () => {
    const { done, warn } = setup(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(done).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe('keep-alive: GET /healthz failed: TypeError');
  });

  it('aborts a request that outlasts the timeout and says it timed out', async () => {
    const { done, warn } = setup(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
      API,
      20,
    );
    await expect(done).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe('keep-alive: GET /healthz failed: TimeoutError');
  });

  it('waits longer than a Render cold start by default', () => {
    expect(KEEP_ALIVE_TIMEOUT_MS).toBe(60_000);
  });

  it('makes no request and no noise when no API URL is configured', async () => {
    const { done, warn, fetchSpy } = setup(async () => new Response('ok'), '');
    await done;
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
