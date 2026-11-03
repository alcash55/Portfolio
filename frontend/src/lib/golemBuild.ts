// Workers static assets cap one file at 25 MiB and WebGL.data.unityweb is 51 MB,
// so the build lives in a GitHub release and the Worker streams it from there.
// The tag is a moving pointer: scripts/publish-golem-build.sh replaces its files, so a new
// build goes live without a site deploy.
export const GOLEM_RELEASE_BASE =
  'https://github.com/alcash55/Portfolio/releases/download/golem-miners-webgl-latest';

// Short because the files change under a fixed URL. An hour keeps a replay off GitHub
// while a new build still reaches players the same day.
const CACHE_SECONDS = 3600;

interface GolemAsset {
  url: string;
  contentType: string;
  encoding: 'gzip' | undefined;
}

// Unity wrote the .unityweb files gzipped. The loader fetches them as plain URLs and
// relies on Content-Encoding to inflate them, so the header has to come from us.
const FILES: Record<string, Omit<GolemAsset, 'url'>> = {
  'WebGL.data.unityweb': { contentType: 'application/octet-stream', encoding: 'gzip' },
  'WebGL.framework.js.unityweb': { contentType: 'application/javascript', encoding: 'gzip' },
  'WebGL.wasm.unityweb': { contentType: 'application/wasm', encoding: 'gzip' },
  'WebGL.loader.js': { contentType: 'application/javascript', encoding: undefined },
};

export function golemAsset(name: string): GolemAsset | null {
  if (!Object.hasOwn(FILES, name)) return null;
  const file = FILES[name];
  return file ? { url: `${GOLEM_RELEASE_BASE}/${name}`, ...file } : null;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function serveGolemAsset(name: string, fetchImpl: FetchLike): Promise<Response> {
  const asset = golemAsset(name);
  if (!asset) return new Response('Not found', { status: 404 });

  const upstream = await fetchImpl(asset.url, {
    cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
  } as RequestInit);
  if (!upstream.ok || !upstream.body) return new Response('Build unavailable', { status: 502 });

  const headers = new Headers({
    'Content-Type': asset.contentType,
    'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
  });
  // Unity's loader keeps the data file in IndexedDB keyed on these, so a new build replaces it.
  for (const name of ['ETag', 'Last-Modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (asset.encoding) headers.set('Content-Encoding', asset.encoding);
  const length = upstream.headers.get('Content-Length');
  if (length) headers.set('Content-Length', length);

  // encodeBody manual: the bytes are already gzipped, so the runtime must not compress them again.
  return new Response(upstream.body, {
    status: 200,
    headers,
    encodeBody: 'manual',
  } as ResponseInit);
}
