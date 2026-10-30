import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { Shell } from '~/components/shell/Shell';

// A small router around the real Shell. The app's own route tree has a root that
// renders <html>, which cannot mount inside jsdom's body, so route wiring is
// covered by the browser suite and this helper covers the shell.
export async function renderShell(path = '/') {
  const rootRoute = createRootRoute({
    component: () => (
      <Shell>
        <Outlet />
      </Shell>
    ),
  });
  const page = (routePath: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: routePath,
      component: () => <h1>Page body</h1>,
    });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page('/'), page('/projects/$slug'), page('/experience/$slug')]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}
