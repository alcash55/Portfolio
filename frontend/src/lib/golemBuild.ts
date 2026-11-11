import { apiEndpoint } from './apiUrl';

// Workers static assets cap one file at 25 MiB and WebGL.data.unityweb is 51 MB, so the
// build does not ship with the site. The Go API reads the newest Production WebGL release
// from the private Golem-Miners repo, checks it, and serves four files under the release
// tag. This module is the browser's only door to that: the token stays in the API.

const BUILD_ROOT = '/api/v1/golem-miners';

// The tag is in every file URL, so a cached copy can never be the wrong build and one year
// is safe. Only latest.json is short-lived, which is how a new build reaches players.
const FILE_CACHE_SECONDS = 31_536_000;
const LATEST_FRESH_MS = 60_000;
// Failed answers must not stick. A browser that got a stale copy asks again soon.
const LATEST_STALE_BROWSER_SECONDS = 10;

// A cold Render instance wakes in about 30 seconds and then downloads and checks the zip,
// and the first visitor after a release waits for both. Only the wait for headers counts.
export const GOLEM_TIMEOUT_MS = 120_000;

// The release tags the API accepts. Anything else never reaches the API.
const TAG = /^webgl-v[A-Za-z0-9._-]{1,120}$/;

interface GolemFile {
  contentType: string;
  encoding: 'gzip' | undefined;
}

// Unity wrote the .unityweb files gzipped. The loader fetches them as plain URLs and
// relies on Content-Encoding to inflate them, so the header has to reach the browser.
const FILES: Record<string, GolemFile> = {
  'WebGL.data.unityweb': { contentType: 'application/octet-stream', encoding: 'gzip' },
  'WebGL.framework.js.unityweb': { contentType: 'application/javascript', encoding: 'gzip' },
  'WebGL.wasm.unityweb': { contentType: 'application/wasm', encoding: 'gzip' },
  'WebGL.loader.js': { contentType: 'application/javascript', encoding: undefined },
};

export interface GolemBuildFile extends GolemFile {
  tag: string;
  name: string;
}

/**
 * Reads the splat of /play/golem-miners/Build/<tag>/<file>. Returns null for anything but
 * a release tag and one of the four Unity files, so the route cannot proxy arbitrary paths.
 */
export function golemBuildFile(splat: string): GolemBuildFile | null {
  const parts = splat.split('/');
  if (parts.length !== 2) return null;
  const [tag = '', name = ''] = parts;
  if (!TAG.test(tag) || !Object.hasOwn(FILES, name)) return null;
  const file = FILES[name];
  return file ? { tag, name, ...file } : null;
}

export interface GolemDeps {
  readonly fetch: typeof fetch;
  /** Base URL of the Go API. Empty means none is configured. */
  readonly apiUrl: string;
}

/** fetch() with a timer that covers the wait for headers only, not the body stream. */
async function fetchWithin(deps: GolemDeps, url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOLEM_TIMEOUT_MS);
  try {
    return await deps.fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const unavailable = (status: 404 | 502 | 503, message: string): Response =>
  new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/** Streams one file of a build from the API, with the headers Unity's loader needs. */
export async function serveGolemBuildFile(splat: string, deps: GolemDeps): Promise<Response> {
  const file = golemBuildFile(splat);
  if (!file) return unavailable(404, 'Not found');
  if (deps.apiUrl === '') return unavailable(503, 'Build unavailable');

  let upstream: Response;
  try {
    upstream = await fetchWithin(
      deps,
      apiEndpoint(deps.apiUrl, `${BUILD_ROOT}/builds/${file.tag}/${file.name}`),
      {
        // The API sends the stored gzip as opaque octet-stream bytes with no
        // Content-Encoding, because fetch() inflates anything labeled gzip, even with an
        // explicit Accept-Encoding. The encoding is declared below instead.
        // cacheEverything keeps the 51 MB file at the edge so Render sends it about once
        // per build.
        cf: { cacheEverything: true, cacheTtl: FILE_CACHE_SECONDS },
      } as RequestInit,
    );
  } catch {
    return unavailable(502, 'Build unavailable');
  }
  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel();
    return unavailable(upstream.status === 404 ? 404 : 502, 'Build unavailable');
  }

  const headers = new Headers({
    'Content-Type': file.contentType,
    'Cache-Control': `public, max-age=${FILE_CACHE_SECONDS}, immutable`,
    'X-Content-Type-Options': 'nosniff',
  });
  // Unity's loader keeps the data file in IndexedDB keyed on these, so a new build replaces it.
  for (const name of ['ETag', 'Last-Modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (file.encoding) headers.set('Content-Encoding', file.encoding);
  const length = upstream.headers.get('Content-Length');
  if (length) headers.set('Content-Length', length);

  // encodeBody manual: the bytes are already gzipped, so the runtime must not compress them again.
  return new Response(upstream.body, {
    status: 200,
    headers,
    encodeBody: 'manual',
  } as ResponseInit);
}

/** What the launcher needs to pick a build. */
export interface GolemLatest {
  tag: string;
  version: string;
  builtAt: string;
}

/**
 * Keeps only the fields the launcher uses, and only when the tag is one this Worker would
 * serve. Anything else is treated as a failed answer.
 */
export function parseGolemLatest(value: unknown): GolemLatest | null {
  if (typeof value !== 'object' || value === null) return null;
  const { tag, version, builtAt } = value as Record<string, unknown>;
  if (typeof tag !== 'string' || !TAG.test(tag)) return null;
  if (typeof version !== 'string' || typeof builtAt !== 'string') return null;
  return { tag, version, builtAt };
}

/** The slice of the Workers Cache API this module uses. */
export interface EdgeCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

export interface GolemLatestDeps extends GolemDeps {
  /** Per-datacenter cache. Undefined where there is none, such as plain Node. */
  readonly cache: EdgeCache | undefined;
  readonly now: () => number;
}

const FETCHED_AT = 'X-Golem-Fetched-At';

function latestResponse(latest: GolemLatest, browserSeconds: number): Response {
  return new Response(JSON.stringify(latest), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${browserSeconds}`,
    },
  });
}

/**
 * The newest build for the launcher. A copy under a minute old is reused so visitors do not
 * each wake Render. When the API fails, the last good copy is served instead, however old,
 * because the build it names is still being served from the API's disk or the edge cache.
 */
export async function serveGolemLatest(deps: GolemLatestDeps): Promise<Response> {
  if (deps.apiUrl === '') return unavailable(503, 'Build unavailable');
  const url = apiEndpoint(deps.apiUrl, `${BUILD_ROOT}/latest`);

  let saved: GolemLatest | null = null;
  let savedAt = 0;
  try {
    const hit = await deps.cache?.match(url);
    if (hit) {
      saved = parseGolemLatest(await hit.json());
      savedAt = Number(hit.headers.get(FETCHED_AT));
    }
  } catch {
    saved = null;
  }
  if (saved && deps.now() - savedAt < LATEST_FRESH_MS) {
    return latestResponse(saved, 60);
  }

  try {
    const upstream = await fetchWithin(deps, url, {});
    if (upstream.ok) {
      const fresh = parseGolemLatest(await upstream.json());
      if (fresh) {
        // Cache-Control keeps the entry long enough to serve as the fallback, and
        // X-Golem-Fetched-At is what decides whether it is still fresh.
        const copy = new Response(JSON.stringify(fresh), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400',
            [FETCHED_AT]: String(deps.now()),
          },
        });
        try {
          await deps.cache?.put(url, copy);
        } catch {
          // A failed cache write only costs the next visitor a refetch.
        }
        return latestResponse(fresh, 60);
      }
    } else {
      await upstream.body?.cancel();
    }
  } catch {
    // Fall through to the saved copy.
  }

  return saved
    ? latestResponse(saved, LATEST_STALE_BROWSER_SECONDS)
    : unavailable(502, 'Build unavailable');
}

/** The Workers default cache, or undefined outside a Worker. */
export function defaultEdgeCache(): EdgeCache | undefined {
  const storage = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return storage?.default;
}
