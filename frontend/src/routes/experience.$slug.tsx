import { createFileRoute, notFound } from '@tanstack/react-router';
import { ContentPage } from '~/components/pages/ContentPage';
import { NotFoundSlug } from '~/components/pages/NotFound';
import { findExperience } from '~/content/pages';

export const Route = createFileRoute('/experience/$slug')({
  loader: ({ params }) => {
    const page = findExperience(params.slug);
    if (!page) throw notFound();
    return page;
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
  return <ContentPage h1={page.h1} back={{ label: 'All experience', hash: 'experience' }} />;
}
