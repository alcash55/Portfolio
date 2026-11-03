import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '~/components/contact/ContactPage';
import { CONTACT_PAGE } from '~/content/people';
import { pageHead } from '~/lib/seo';

export const Route = createFileRoute('/contact')({
  head: () =>
    pageHead({
      title: CONTACT_PAGE.title,
      description: CONTACT_PAGE.description,
      path: '/contact',
    }),
  component: ContactPage,
});
