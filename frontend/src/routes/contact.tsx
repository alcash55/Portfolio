import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '~/components/contact/ContactPage';
import { CONTACT_PAGE } from '~/content/people';

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title: CONTACT_PAGE.title },
      { name: 'description', content: CONTACT_PAGE.description },
    ],
  }),
  component: ContactPage,
});
