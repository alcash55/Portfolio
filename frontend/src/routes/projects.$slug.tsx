import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { ContentPage } from '~/components/pages/ContentPage';
import { NotFoundSlug } from '~/components/pages/NotFound';
import { NOT_FOUND, findExperience, findProject } from '~/content/pages';

export const Route = createFileRoute('/projects/$slug')({
  beforeLoad: ({ params }) => {
    // Older links put the two experience pages under /projects.
    if (findExperience(params.slug)) {
      throw redirect({ to: '/experience/$slug', params: { slug: params.slug }, statusCode: 301 });
    }
  },
  loader: ({ params }) => {
    const page = findProject(params.slug);
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: loaderData.title }, { name: 'description', content: loaderData.description }]
      : [{ title: NOT_FOUND.title }],
  }),
  component: ProjectPage,
  notFoundComponent: NotFoundSlug,
});

function ProjectPage() {
  const page = Route.useLoaderData();
  return <ContentPage h1={page.h1} back={{ label: 'All projects', hash: 'projects' }} />;
}
