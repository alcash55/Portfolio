import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '~/components/pages/HomePage';
import { HOME } from '~/content/pages';
import { pageHead, personJsonLd } from '~/lib/seo';

export const Route = createFileRoute('/')({
  head: () => ({
    ...pageHead({ title: HOME.title, description: HOME.description, path: '/' }),
    scripts: [{ type: 'application/ld+json', children: personJsonLd() }],
  }),
  component: HomePage,
});
