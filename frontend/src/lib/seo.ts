import { ABOUT } from '~/content/home';
import { CONTACT_EMAIL } from '~/content/people';
import { SITE_NAME } from '~/content/pages';

export type MetaTag =
  { title: string } | { name: string; content: string } | { property: string; content: string };

export interface PageMeta {
  title: string;
  description: string;
  /** The route path, such as "/projects/clipper". */
  path: string;
  /** False keeps the page out of search and leaves off its social and canonical tags. */
  indexable?: boolean;
}

const OG_IMAGE_PATH = '/og-image.png';
const OG_IMAGE_ALT = `${SITE_NAME}, software engineer`;

/**
 * The public origin from `VITE_SITE_ORIGIN`, or undefined when it is unset or not a bare
 * http(s) origin. Social cards and canonical links need an absolute address, and there is
 * no honest default: a guessed domain would point every shared link at the wrong site.
 */
export function readSiteOrigin(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/]+$/.test(trimmed) ? trimmed : undefined;
}

/** The origin this build was made for. Read at build time, so server and browser agree. */
export const SITE_ORIGIN = readSiteOrigin(import.meta.env.VITE_SITE_ORIGIN);

/** Title, description, Open Graph, Twitter card and canonical for one route. */
export function pageHead(
  page: PageMeta,
  origin: string | undefined = SITE_ORIGIN,
): { meta: MetaTag[]; links: Array<{ rel: 'canonical'; href: string }> } {
  const { title, description, path, indexable = true } = page;
  const base: MetaTag[] = [{ title }, { name: 'description', content: description }];

  if (!indexable) return { meta: [...base, { name: 'robots', content: 'noindex' }], links: [] };

  const url = origin ? `${origin}${path}` : undefined;
  const image = origin ? `${origin}${OG_IMAGE_PATH}` : undefined;
  const meta: MetaTag[] = [
    ...base,
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    ...(url ? [{ property: 'og:url', content: url }] : []),
    ...(image
      ? [
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:image:alt', content: OG_IMAGE_ALT },
        ]
      : []),
    // The large card needs an image to show. Without one, a plain summary reads better.
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    ...(image ? [{ name: 'twitter:image', content: image }] : []),
  ];
  return { meta, links: url ? [{ rel: 'canonical', href: url }] : [] };
}

/** The home page's Person data for search engines, as a JSON string for a script tag. */
export function personJsonLd(origin: string | undefined = SITE_ORIGIN): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_NAME,
    jobTitle: 'Software engineer',
    email: CONTACT_EMAIL,
    ...(origin ? { url: `${origin}/` } : {}),
    sameAs: ABOUT.social.map((link) => link.href),
  });
}
