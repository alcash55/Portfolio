import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

// Test helper. Home pieces use router links, so they need a router around them.
export async function renderInRouter(ui: ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui });
  const child = (path: string) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null });
  const router = createRouter({
    routeTree: rootRoute.addChildren([child('/projects/$slug'), child('/experience/$slug')]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}
