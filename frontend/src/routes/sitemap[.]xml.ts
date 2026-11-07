import { createFileRoute } from '@tanstack/react-router';
import { buildSitemap, resolveSiteOrigin } from '~/lib/sitemap';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(
          buildSitemap(resolveSiteOrigin(import.meta.env.VITE_SITE_ORIGIN, request.url)),
          { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
        ),
    },
  },
});
