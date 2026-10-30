import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
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

  it('does not treat a known page as not found', async () => {
    expect((await load('/projects/clipper')).notFound).toBe(false);
  });
});
