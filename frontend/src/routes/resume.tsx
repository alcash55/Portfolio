import { createFileRoute, redirect } from '@tanstack/react-router';
import { ResumePage } from '~/components/people/ResumePage';
import { RESUME_PAGE } from '~/content/people';
import { RESUME_FILE, resumeInfo } from '~/lib/resume';
import { pageHead } from '~/lib/seo';

export const Route = createFileRoute('/resume')({
  beforeLoad: () => {
    // 302, not 301: the file behind it changes with each build.
    if (resumeInfo.available) throw redirect({ href: RESUME_FILE, statusCode: 302 });
  },
  head: () =>
    pageHead({
      title: RESUME_PAGE.title,
      description: RESUME_PAGE.description,
      path: '/resume',
      // This head only renders when the PDF is missing. The page answers 200, so without
      // noindex a crawler could index the explanation as if it were the resume.
      indexable: false,
    }),
  component: ResumePage,
});
