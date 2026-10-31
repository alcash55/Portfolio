import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { NotFoundSlug } from '~/components/pages/NotFound';
import { workRedirectTarget } from '~/lib/sitemap';

// /work/<slug> is an address the comps used. A permanent redirect keeps any link to it working.
export const Route = createFileRoute('/work/$slug')({
  beforeLoad: ({ params }) => {
    const target = workRedirectTarget(params.slug);
    if (!target) throw notFound();
    throw redirect({ href: target, statusCode: 301 });
  },
  notFoundComponent: NotFoundSlug,
});
