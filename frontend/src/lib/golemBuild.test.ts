import { describe, expect, it, vi } from 'vitest';
import {
  type EdgeCache,
  GOLEM_TIMEOUT_MS,
  golemBuildFile,
  parseGolemLatest,
  serveGolemBuildFile,
  serveGolemLatest,
} from './golemBuild';

const TAG = 'webgl-v1.0.6-8ae0558d8559-42903441642.1';
const API = 'https://api.example.test';

const deps = (fetchImpl: ReturnType<typeof vi.fn>, apiUrl = API) => ({
  fetch: fetchImpl as unknown as typeof fetch,
  apiUrl,
});

describe('golemBuildFile', () => {
  it.each([
    ['WebGL.data.unityweb', 'application/octet-stream', 'gzip'],
    ['WebGL.framework.js.unityweb', 'application/javascript', 'gzip'],
    ['WebGL.wasm.unityweb', 'application/wasm', 'gzip'],
    ['WebGL.loader.js', 'application/javascript', undefined],
  ])('maps %s to its content type and encoding', (name, contentType, encoding) => {
    expect(golemBuildFile(`${TAG}/${name}`)).toEqual({ tag: TAG, name, contentType, encoding });
  });

  it.each([
    '',
    'WebGL.loader.js', // no tag: the old URL shape must not resolve
    `${TAG}`,
    `${TAG}/`,
    `${TAG}/index.html`,
    `${TAG}/version.json`,
    `${TAG}/WebGL.loader.js/extra`,
    `${TAG}/webgl.loader.js`,
    `${TAG}/../WebGL.loader.js`,
    'v1.0.6/WebGL.loader.js',
    'webgl-v/WebGL.loader.js',
    `${TAG}%2F..%2Fsecret/WebGL.loader.js`,
    `main/WebGL.loader.js`,
  ])('rejects %j so the route cannot proxy arbitrary API paths', (splat) => {
    expect(golemBuildFile(splat)).toBeNull();
  });
});

describe('serveGolemBuildFile', () => {
  it('streams the tag-pinned API file and declares the gzip the Unity loader expects', async () => {
    const upstream = new Response('bytes', {
      status: 200,
      headers: {
        ETag: '"abc"',
        'Last-Modified': 'Tue, 10 Nov 2026 21:49:05 GMT',
        'Content-Length': '5',
        'Content-Type': 'text/html', // whatever the API says, the allowlist decides
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue(upstream);
    const res = await serveGolemBuildFile(`${TAG}/WebGL.wasm.unityweb`, deps(fetchImpl));

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `${API}/api/v1/golem-miners/builds/${TAG}/WebGL.wasm.unityweb`,
    );
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit & { cf?: Record<string, unknown> };
    expect(init.cf).toEqual({ cacheEverything: true, cacheTtl: 31_536_000 });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/wasm');
    expect(res.headers.get('Content-Encoding')).toBe('gzip');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('ETag')).toBe('"abc"');
    expect(res.headers.get('Last-Modified')).toBe('Tue, 10 Nov 2026 21:49:05 GMT');
    expect(res.headers.get('Content-Length')).toBe('5');
    expect(await res.text()).toBe('bytes');
  });

  // Node's Response ignores encodeBody, so this watches the init the Worker hands to the
  // constructor. With 'automatic' the Workers runtime would gzip the stored gzip a second time.
  it('tells the Workers runtime not to encode a body that is already gzip', async () => {
    const inits: Array<ResponseInit & { encodeBody?: string }> = [];
    const RealResponse = Response;
    vi.stubGlobal(
      'Response',
      class extends RealResponse {
        constructor(body?: BodyInit | null, init?: ResponseInit) {
          super(body, init);
          if (init) inits.push(init);
        }
      },
    );
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new RealResponse('bytes', { status: 200 }));
      const res = await serveGolemBuildFile(`${TAG}/WebGL.data.unityweb`, deps(fetchImpl));
      expect(res.headers.get('Content-Encoding')).toBe('gzip');
    } finally {
      vi.unstubAllGlobals();
    }
    expect(inits.at(-1)?.encodeBody).toBe('manual');
  });

  it('sends no Content-Encoding for the loader script', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('js'));
    const res = await serveGolemBuildFile(`${TAG}/WebGL.loader.js`, deps(fetchImpl));
    expect(res.headers.get('Content-Encoding')).toBeNull();
    expect(res.headers.get('Content-Type')).toBe('application/javascript');
  });

  it('returns 404 for a path outside the allowlist without calling the API', async () => {
    const fetchImpl = vi.fn();
    const res = await serveGolemBuildFile('WebGL.loader.js', deps(fetchImpl));
    expect(res.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 503 without calling anything when no API is configured', async () => {
    const fetchImpl = vi.fn();
    const res = await serveGolemBuildFile(`${TAG}/WebGL.loader.js`, deps(fetchImpl, ''));
    expect(res.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [404, 404],
    [429, 502],
    [500, 502],
    [502, 502],
    [503, 502],
  ])('maps an API %i to %i and never caches the failure', async (from, to) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('secret detail', { status: from }));
    const res = await serveGolemBuildFile(`${TAG}/WebGL.loader.js`, deps(fetchImpl));
    expect(res.status).toBe(to);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).not.toContain('secret');
  });

  it('returns 502 when the API cannot be reached', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('failed to lookup address'));
    const res = await serveGolemBuildFile(`${TAG}/WebGL.loader.js`, deps(fetchImpl));
    expect(res.status).toBe(502);
  });

  it('gives up on a silent API after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      );
      const pending = serveGolemBuildFile(`${TAG}/WebGL.loader.js`, deps(fetchImpl));
      await vi.advanceTimersByTimeAsync(GOLEM_TIMEOUT_MS + 1);
      expect((await pending).status).toBe(502);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('parseGolemLatest', () => {
  it('keeps the tag, version and build time, and drops the rest', () => {
    expect(
      parseGolemLatest({
        tag: TAG,
        version: '1.0.6',
        builtAt: '2026-11-10T21:49:05Z',
        files: [],
        gitSha: 'x',
      }),
    ).toEqual({ tag: TAG, version: '1.0.6', builtAt: '2026-11-10T21:49:05Z' });
  });

  it.each([
    null,
    'text',
    [],
    {},
    { tag: 'v1.0.6', version: '1', builtAt: 'x' },
    { tag: `${TAG}/../x`, version: '1', builtAt: 'x' },
    { tag: TAG, version: 1, builtAt: 'x' },
    { tag: TAG, version: '1' },
  ])('rejects %j', (value) => {
    expect(parseGolemLatest(value)).toBeNull();
  });
});

function memoryCache(): EdgeCache & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    match: (key) => Promise.resolve(store.get(key)?.clone()),
    put: (key, res) => {
      store.set(key, res);
      return Promise.resolve();
    },
  };
}

const latestJson = (tag: string, version = '1.0.6') =>
  Response.json({ tag, version, builtAt: '2026-11-10T21:49:05Z', files: [] });

describe('serveGolemLatest', () => {
  const OLD = 'webgl-v1.0.5-aaaaaaaaaaaa-100.1';

  it('returns the newest build and caches it for a minute', async () => {
    const cache = memoryCache();
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(latestJson(TAG)));
    let now = 1_000_000;
    const d = { ...deps(fetchImpl), cache, now: () => now };

    const first = await serveGolemLatest(d);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      tag: TAG,
      version: '1.0.6',
      builtAt: '2026-11-10T21:49:05Z',
    });
    expect(first.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${API}/api/v1/golem-miners/latest`);

    now += 59_000;
    await serveGolemLatest(d);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    now += 2_000;
    await serveGolemLatest(d);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('picks up a new build once the cached copy is a minute old', async () => {
    const cache = memoryCache();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(latestJson(OLD, '1.0.5'))
      .mockResolvedValueOnce(latestJson(TAG));
    let now = 0;
    const d = { ...deps(fetchImpl), cache, now: () => now };

    expect(((await (await serveGolemLatest(d)).json()) as { tag: string }).tag).toBe(OLD);
    now = 61_000;
    expect(((await (await serveGolemLatest(d)).json()) as { tag: string }).tag).toBe(TAG);
  });

  it.each([
    ['a 500', () => Promise.resolve(new Response('boom', { status: 500 }))],
    ['a network error', () => Promise.reject(new TypeError('failed to lookup address'))],
    ['a non-JSON body', () => Promise.resolve(new Response('<html>'))],
    ['a tag that is not a WebGL build', () => Promise.resolve(latestJson('v9.9.9'))],
  ])('serves the last good copy when the API answers with %s', async (_name, failure) => {
    const cache = memoryCache();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(latestJson(OLD, '1.0.5'))
      .mockImplementation(failure);
    let now = 0;
    const d = { ...deps(fetchImpl), cache, now: () => now };
    await serveGolemLatest(d);

    now = 10 * 60_000;
    const res = await serveGolemLatest(d);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { tag: string }).tag).toBe(OLD);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=10');
  });

  it('returns 502 when the API fails and nothing was ever cached', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    const res = await serveGolemLatest({ ...deps(fetchImpl), cache: memoryCache(), now: () => 0 });
    expect(res.status).toBe(502);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('works with no cache at all', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(latestJson(TAG)));
    const res = await serveGolemLatest({ ...deps(fetchImpl), cache: undefined, now: () => 0 });
    expect(res.status).toBe(200);
  });

  it('returns 503 without calling anything when no API is configured', async () => {
    const fetchImpl = vi.fn();
    const res = await serveGolemLatest({
      ...deps(fetchImpl, ''),
      cache: memoryCache(),
      now: () => 0,
    });
    expect(res.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
