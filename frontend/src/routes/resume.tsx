import { createFileRoute, redirect } from '@tanstack/react-router';
import { ResumePage } from '~/components/people/ResumePage';
import { RESUME_PAGE } from '~/content/people';
import { RESUME_FILE, resumeInfo } from '~/lib/resume';

export const Route = createFileRoute('/resume')({
  beforeLoad: () => {
    // 302, not 301: the file behind it changes with each build.
    if (resumeInfo.available) throw redirect({ href: RESUME_FILE, statusCode: 302 });
  },
  head: () => ({
    meta: [{ title: RESUME_PAGE.title }, { name: 'description', content: RESUME_PAGE.description }],
  }),
  component: ResumePage,
});
