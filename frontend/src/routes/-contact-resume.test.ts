import { createMemoryHistory } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getRouter } = await import('~/router');

async function load(path: string) {
  const router = getRouter();
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load();
  const meta = router.state.matches.flatMap((match) => match.meta ?? []);
  const title = meta.findLast((tag) => tag && 'title' in tag);
  return {
    router,
    meta,
    title: title && 'title' in title ? title.title : undefined,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/contact route', () => {
  it('redirects to the form on the home page', async () => {
    const { router } = await load('/contact');
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.hash).toBe('contact');
  });
});

type Handler = (ctx: { next: () => unknown }) => Promise<unknown>;

async function getResume(): Promise<{ result: unknown; next: ReturnType<typeof vi.fn> }> {
  const { Route } = await import('./resume');
  const handlers = Route.options.server?.handlers;
  const get = (typeof handlers === 'object' && handlers && 'GET' in handlers
    ? handlers.GET
    : undefined) as unknown as Handler;
  const next = vi.fn(() => ({ isNext: true }));
  return { result: await get({ next }), next };
}

describe('/resume route', () => {
  it('answers with the PDF the API serves', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
      );
    vi.stubGlobal('fetch', fetchImpl);
    const { result, next } = await getResume();
    expect(next).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(await res.text()).toBe('%PDF-1.7');
    expect(String(fetchImpl.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/resume$/);
  });

  it('falls through to the explanation page when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ error: 'could not load resume' }, { status: 502 })),
    );
    const { result, next } = await getResume();
    expect(next).toHaveBeenCalledOnce();
    expect(result).toEqual({ isNext: true });
  });

  it('renders the explanation page with its own title', async () => {
    const { router, title } = await load('/resume');
    expect(router.state.location.pathname).toBe('/resume');
    expect(title).toBe('Resume, Alex Cash');
  });

  it('asks crawlers not to index the explanation page, which answers 200', async () => {
    const { meta } = await load('/resume');
    expect(meta).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});
