import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { ContactForm } from '~/components/contact/ContactForm';
import { ProjectDetail } from '~/components/detail/ProjectDetail';
import { NotFoundSlug } from '~/components/pages/NotFound';
import { findExperience, findProject } from '~/content/pages';
import { getDetail } from '~/content/projects';

export const Route = createFileRoute('/projects/$slug')({
  beforeLoad: ({ params }) => {
    // Older links put the two experience pages under /projects.
    if (findExperience(params.slug)) {
      throw redirect({ to: '/experience/$slug', params: { slug: params.slug }, statusCode: 301 });
    }
  },
  loader: ({ params }) => {
    const page = findProject(params.slug);
    const detail = getDetail(params.slug);
    if (!page || !detail) throw notFound();
    // Only the slug crosses to the client. The page body is looked up from the content module.
    return { ...page, detailSlug: detail.slug };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: loaderData.title }, { name: 'description', content: loaderData.description }]
      : [], // the not-found page sets its own title
  }),
  component: ProjectPage,
  notFoundComponent: NotFoundSlug,
});

function ProjectPage() {
  const page = Route.useLoaderData();
  return <ProjectDetail slug={page.detailSlug} form={<ContactForm />} />;
}
