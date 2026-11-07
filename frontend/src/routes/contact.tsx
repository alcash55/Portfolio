import { createFileRoute, redirect } from '@tanstack/react-router';

// The form lives in the home page's last chapter. /contact was a second page with the same form,
// so a permanent redirect keeps old links, the sitemap entry and search results working.
export const Route = createFileRoute('/contact')({
  beforeLoad: () => {
    throw redirect({ href: '/#contact', statusCode: 301 });
  },
});
