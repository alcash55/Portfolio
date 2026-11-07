import { createFileRoute } from '@tanstack/react-router';
import { ResumePage } from '~/components/people/ResumePage';
import { RESUME_PAGE } from '~/content/people';
import { apiUrl } from '~/lib/apiUrl';
import { fetchResume } from '~/lib/resume';
import { pageHead } from '~/lib/seo';

export const Route = createFileRoute('/resume')({
  server: {
    handlers: {
      // The Worker asks the API for the PDF on each visit, so a new release shows up without
      // a deploy and no build step downloads it. With no PDF, next() renders the page below.
      GET: async ({ next }) =>
        (await fetchResume({ fetch: (input, init) => fetch(input, init), apiUrl: apiUrl() })) ??
        next(),
    },
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
