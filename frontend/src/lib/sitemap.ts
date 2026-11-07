import { EXPERIENCE_SLUGS, PROJECT_SLUGS, pageHref } from '~/content/pages';

/**
 * Paths that belong in the sitemap, in page order. Built from the content rows, so a new
 * project shows up here without a second list to keep in step. /resume is left out: it
 * answers with a redirect to the PDF whenever the file exists.
 */
export function sitemapPaths(): string[] {
  return ['/', ...[...PROJECT_SLUGS, ...EXPERIENCE_SLUGS].map(pageHref)];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemap(origin: string): string {
  const base = origin.replace(/\/+$/, '');
  const entries = sitemapPaths()
    .map((path) => `  <url><loc>${escapeXml(base + path)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/**
 * The site's public origin. `VITE_SITE_ORIGIN` wins when it is set at build time. Without
 * it the sitemap uses the origin the request came in on, which is right on any host that
 * serves the site directly, and means a preview deploy lists its own URLs.
 */
export function resolveSiteOrigin(configured: string | undefined, requestUrl: string): string {
  const trimmed = configured?.trim().replace(/\/+$/, '');
  if (trimmed && /^https?:\/\/[^/]+$/.test(trimmed)) return trimmed;
  return new URL(requestUrl).origin;
}

/** Where an old /work/<slug> link now lives, or undefined for a slug that never existed. */
export function workRedirectTarget(slug: string): string | undefined {
  const all: readonly string[] = [...PROJECT_SLUGS, ...EXPERIENCE_SLUGS];
  return all.includes(slug) ? pageHref(slug as Parameters<typeof pageHref>[0]) : undefined;
}
