import { createMemoryHistory } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRouter } from '~/router';

// Loads the real route tree without rendering it. The root route renders <html>,
// which cannot mount in jsdom, so this checks what the server would put in <head>
// and which status it would send. The browser suite checks the rendered pages.
async function load(path: string) {
  const router = getRouter();
  router.update({
    ...router.options,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const meta = router.state.matches.flatMap((match) => match.meta ?? []);
  const title = meta.findLast((tag) => tag && 'title' in tag);
  // The server turns a notFound match into a 404 response. The status, and the unknown-path case
  // that the router tracks internally, are checked over HTTP in the browser suite.
  const notFound = router.state.matches.some((match) => match.status === 'notFound');
  return { router, notFound, title: title && 'title' in title ? title.title : undefined };
}

describe('route head', () => {
  it.each([
    ['/', 'Alex Cash, software engineer'],
    ['/projects/portfolio-website', 'Portfolio Website, work by Alex Cash'],
    ['/projects/vscode-royalty-theme', 'VS Code Royalty Theme, work by Alex Cash'],
    ['/experience/ncr-voyix-docs', 'NCR Voyix documentation site, work by Alex Cash'],
    ['/experience/starbucks-store-health', 'Starbucks Store Health, work by Alex Cash'],
  ])('%s has the title %s', async (path, expected) => {
    const { title } = await load(path);
    expect(title).toBe(expected);
  });

  it('sets a description on the home route', async () => {
    const { router } = await load('/');
    const meta = router.state.matches.flatMap((match) => match.meta ?? []);
    expect(meta).toContainEqual({
      name: 'description',
      content:
        'Alex Cash is a software engineer in Memphis, TN. He builds the Go API and the React page that reads it.',
    });
  });
});

describe('routing', () => {
  it('sends the two experience slugs from /projects to /experience', async () => {
    const { router } = await load('/projects/ncr-voyix-docs');
    expect(router.state.location.pathname).toBe('/experience/ncr-voyix-docs');
  });

  it.each([
    ['an unknown project slug', '/projects/no-such-project'],
    ['an unknown experience slug', '/experience/no-such-job'],
    ['a project slug under /experience', '/experience/clipper'],
  ])('treats %s as not found', async (_name, path) => {
    expect((await load(path)).notFound).toBe(true);
  });

  it.each(['/projects/no-such-project', '/experience/no-such-job'])(
    'leaves the title to the not-found page on %s, so the document has one title',
    async (path) => {
      expect((await load(path)).title).toBeUndefined();
    },
  );

  it('does not treat a known page as not found', async () => {
    expect((await load('/projects/clipper')).notFound).toBe(false);
  });
});

describe('social and canonical tags per route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadWithOrigin(path: string, origin: string) {
    vi.stubEnv('VITE_SITE_ORIGIN', origin);
    vi.resetModules();
    const { getRouter: freshRouter } = await import('~/router');
    const router = freshRouter();
    router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [path] }) });
    await router.load();
    return {
      meta: router.state.matches.flatMap((match) => match.meta ?? []),
      links: router.state.matches.flatMap((match) => match.links ?? []),
    };
  }

  it('gives a route its own og title and no absolute tags while the origin is unset', async () => {
    const { router } = await load('/projects/clipper');
    const meta = router.state.matches.flatMap((match) => match.meta ?? []);
    expect(meta).toContainEqual({
      property: 'og:title',
      content: 'Clipper, work by Alex Cash',
    });
    expect(JSON.stringify(meta)).not.toMatch(/og:url|og:image"|https?:\/\//);
    expect(router.state.matches.flatMap((match) => match.links ?? [])).not.toContainEqual(
      expect.objectContaining({ rel: 'canonical' }),
    );
  });

  it.each([
    ['/', 'https://site.test/'],
    ['/contact', 'https://site.test/contact'],
    ['/projects/clipper', 'https://site.test/projects/clipper'],
    ['/experience/ncr-voyix-docs', 'https://site.test/experience/ncr-voyix-docs'],
  ])('%s names its own canonical url once the origin is set', async (path, url) => {
    const { meta, links } = await loadWithOrigin(path, 'https://site.test');
    expect(links).toContainEqual({ rel: 'canonical', href: url });
    expect(meta).toContainEqual({ property: 'og:url', content: url });
    expect(meta).toContainEqual({
      property: 'og:image',
      content: 'https://site.test/og-image.png',
    });
  });
});

describe('server head and the ingest host', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('carries no preconnect even in a build that has a PostHog token', async () => {
    // A hint in the server HTML would open a connection for visitors who send
    // Do Not Track, before any script can read the signal.
    vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', 'phc_testtoken');
    vi.resetModules();
    const { getRouter: freshRouter } = await import('~/router');
    const router = freshRouter();
    router.update({ ...router.options, history: createMemoryHistory({ initialEntries: ['/'] }) });
    await router.load();
    const links = router.state.matches.flatMap((match) => match.links ?? []);
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter((link) => link?.rel === 'preconnect')).toEqual([]);
  });
});
