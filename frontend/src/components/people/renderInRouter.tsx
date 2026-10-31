import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

// The app's route tree has a root that renders <html>, which cannot mount in
// jsdom. This small router gives <Link> the routes the people sections point at.
export async function renderInRouter(ui: ReactNode, path = '/') {
  const rootRoute = createRootRoute();
  const leaf = (routePath: string, component: () => ReactNode) =>
    createRoute({ getParentRoute: () => rootRoute, path: routePath, component });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      leaf('/', () => ui),
      leaf('/experience/$slug', () => null),
      leaf('/projects/$slug', () => null),
      leaf('/contact', () => null),
      leaf('/resume', () => null),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}
