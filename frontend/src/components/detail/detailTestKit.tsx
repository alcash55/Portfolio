import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { stubIntersectionObserver, stubMedia } from '../figures/figureTestKit';
import { ProjectDetail } from './ProjectDetail';
import { DETAILS, getDetail, type DetailSlug } from '~/content/projects';

/**
 * Mounts ProjectDetail for a slug inside a small router that has the three
 * routes the page links to. The app's own route tree renders <html>, which
 * cannot mount in jsdom, so route wiring is covered by the browser suite.
 */
export async function renderDetail(slug: DetailSlug, options: { form?: ReactNode } = {}) {
  stubIntersectionObserver();
  stubMedia();
  const rootRoute = createRootRoute({ component: Outlet });
  const home = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>Home</p>,
  });
  const detail = (path: '/projects/$slug' | '/experience/$slug') =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: function Page() {
        const { slug: current } = useParams({ strict: false });
        const found = current ? getDetail(current) : undefined;
        return found ? <ProjectDetail slug={found.slug} form={options.form} /> : null;
      },
    });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      home,
      detail('/projects/$slug'),
      detail('/experience/$slug'),
    ]),
    history: createMemoryHistory({
      initialEntries: [
        `${DETAILS[slug].kind === 'experience' ? '/experience' : '/projects'}/${slug}`,
      ],
    }),
  });
  await router.load();
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}
