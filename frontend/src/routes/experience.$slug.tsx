import { createFileRoute, notFound } from '@tanstack/react-router';
import { ProjectDetail } from '~/components/detail/ProjectDetail';
import { NotFoundSlug } from '~/components/pages/NotFound';
import { findExperience } from '~/content/pages';
import { getDetail } from '~/content/projects';

export const Route = createFileRoute('/experience/$slug')({
  loader: ({ params }) => {
    const page = findExperience(params.slug);
    const detail = getDetail(params.slug);
    if (!page || !detail) throw notFound();
    return { ...page, detailSlug: detail.slug };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: loaderData.title }, { name: 'description', content: loaderData.description }]
      : [], // the not-found page sets its own title
  }),
  component: ExperiencePage,
  notFoundComponent: NotFoundSlug,
});

function ExperiencePage() {
  const page = Route.useLoaderData();
  return <ProjectDetail slug={page.detailSlug} />;
}
