import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '~/lib/analytics';
import { AnalyticsTracker } from './AnalyticsTracker';

vi.mock('~/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/analytics')>()),
  analytics: { enabled: true, queued: 0, start: vi.fn(), capture: vi.fn(), pageview: vi.fn() },
}));

async function mount(path = '/') {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <AnalyticsTracker />
        <Outlet />
      </>
    ),
  });
  const page = (routePath: string) =>
    createRoute({ getParentRoute: () => rootRoute, path: routePath, component: () => null });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page('/'), page('/projects/$slug'), page('/contact')]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

const urls = () => vi.mocked(analytics.pageview).mock.calls.map(([url]) => url);

describe('AnalyticsTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts analytics once and records the first page', async () => {
    await mount('/contact');

    expect(analytics.start).toHaveBeenCalledTimes(1);
    expect(urls()).toEqual([`${window.location.origin}/contact`]);
  });

  it('records one pageview per client-side navigation', async () => {
    const router = await mount('/');

    await act(() => router.navigate({ to: '/projects/$slug', params: { slug: 'clipper' } }));
    await act(() => router.navigate({ to: '/contact' }));

    expect(urls()).toEqual([
      `${window.location.origin}/`,
      `${window.location.origin}/projects/clipper`,
      `${window.location.origin}/contact`,
    ]);
  });

  it('leaves the query string out of the pageview url', async () => {
    // A campaign link can carry an address in its query. No page here reads a query.
    await mount('/contact?email=ada%40example.com&utm_source=mail');

    expect(urls()).toEqual([`${window.location.origin}/contact`]);
  });

  it('ignores a hash-only change, which is a scroll on the same page', async () => {
    const router = await mount('/');

    await act(() => router.navigate({ to: '/', hash: 'projects' }));

    expect(urls()).toEqual([`${window.location.origin}/`]);
  });
});
