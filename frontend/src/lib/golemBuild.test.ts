import { describe, expect, it, vi } from 'vitest';
import { GOLEM_RELEASE_BASE, golemAsset, serveGolemAsset } from './golemBuild';

describe('golemAsset', () => {
  it('reads from the moving latest tag, not a dated release', () => {
    expect(GOLEM_RELEASE_BASE).toMatch(/\/golem-miners-webgl-latest$/);
  });

  it.each([
    ['WebGL.data.unityweb', 'application/octet-stream', 'gzip'],
    ['WebGL.framework.js.unityweb', 'application/javascript', 'gzip'],
    ['WebGL.wasm.unityweb', 'application/wasm', 'gzip'],
    ['WebGL.loader.js', 'application/javascript', undefined],
  ])('maps %s to its content type and encoding', (name, type, encoding) => {
    expect(golemAsset(name)).toEqual({
      url: `${GOLEM_RELEASE_BASE}/${name}`,
      contentType: type,
      encoding,
    });
  });

  it.each(['', 'index.html', '../secret', 'WebGL.data.unityweb/x', 'webgl.data.unityweb'])(
    'rejects %j so the route cannot proxy arbitrary release files',
    (name) => {
      expect(golemAsset(name)).toBeNull();
    },
  );
});

describe('serveGolemAsset', () => {
  it('streams the release file and declares the gzip the Unity loader expects', async () => {
    const upstream = new Response('bytes', {
      status: 200,
      headers: { ETag: '"abc"', 'Last-Modified': 'Tue, 03 Nov 2026 05:00:00 GMT' },
    });
    const fetchImpl = vi.fn().mockResolvedValue(upstream);
    const res = await serveGolemAsset('WebGL.wasm.unityweb', fetchImpl);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${GOLEM_RELEASE_BASE}/WebGL.wasm.unityweb`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/wasm');
    expect(res.headers.get('Content-Encoding')).toBe('gzip');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(res.headers.get('ETag')).toBe('"abc"');
    expect(res.headers.get('Last-Modified')).toBe('Tue, 03 Nov 2026 05:00:00 GMT');
    expect(await res.text()).toBe('bytes');
  });

  it('returns 404 for a name outside the allowlist without calling upstream', async () => {
    const fetchImpl = vi.fn();
    const res = await serveGolemAsset('nope', fetchImpl);
    expect(res.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 502 when the release download fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('x', { status: 500 }));
    const res = await serveGolemAsset('WebGL.loader.js', fetchImpl);
    expect(res.status).toBe(502);
  });
});
