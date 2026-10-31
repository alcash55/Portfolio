import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '~/components/pages/HomePage';
import { HOME } from '~/content/pages';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: HOME.title }, { name: 'description', content: HOME.description }],
  }),
  component: HomePage,
});
