// Workers static assets cap one file at 25 MiB and WebGL.data.unityweb is 51 MB,
// so the build lives in a GitHub release and the Worker streams it from there.
export const GOLEM_RELEASE_BASE =
  'https://github.com/alcash55/Portfolio/releases/download/golem-miners-webgl-2026-10-29';

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

  // cacheEverything keeps repeat plays off GitHub. The release tag is dated, so the file never changes.
  const upstream = await fetchImpl(asset.url, {
    cf: { cacheEverything: true, cacheTtl: 31536000 },
  } as RequestInit);
  if (!upstream.ok || !upstream.body) return new Response('Build unavailable', { status: 502 });

  const headers = new Headers({
    'Content-Type': asset.contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
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
