import { describe, expect, it } from 'vitest';
import { pageHead, personJsonLd, readSiteOrigin } from './seo';

const page = { title: 'Clipper, work by Alex Cash', description: 'A clip tool.', path: '/x' };
const ORIGIN = 'https://site.test';

const has = (meta: readonly object[], tag: object) => expect(meta).toContainEqual(tag);
const keys = (meta: readonly object[]) =>
  meta.flatMap((tag) => ('property' in tag ? [String(tag.property)] : []));

describe('readSiteOrigin', () => {
  it('trims trailing slashes and accepts a bare http or https origin', () => {
    expect(readSiteOrigin('https://site.test/')).toBe(ORIGIN);
    expect(readSiteOrigin(' http://localhost:3000 ')).toBe('http://localhost:3000');
  });

  it.each([undefined, '', '   ', 'site.test', 'https://site.test/path', 42])(
    'treats %j as no origin',
    (raw) => {
      expect(readSiteOrigin(raw)).toBeUndefined();
    },
  );
});

describe('pageHead with an origin', () => {
  const head = pageHead(page, ORIGIN);

  it('keeps the title and description', () => {
    has(head.meta, { title: page.title });
    has(head.meta, { name: 'description', content: page.description });
  });

  it('adds Open Graph tags with absolute url and image', () => {
    has(head.meta, { property: 'og:type', content: 'website' });
    has(head.meta, { property: 'og:title', content: page.title });
    has(head.meta, { property: 'og:description', content: page.description });
    has(head.meta, { property: 'og:url', content: `${ORIGIN}/x` });
    has(head.meta, { property: 'og:image', content: `${ORIGIN}/og-image.png` });
    has(head.meta, { property: 'og:image:width', content: '1200' });
    has(head.meta, { property: 'og:image:height', content: '630' });
    expect(keys(head.meta)).toContain('og:image:alt');
  });

  it('adds a large Twitter card with the same image', () => {
    has(head.meta, { name: 'twitter:card', content: 'summary_large_image' });
    has(head.meta, { name: 'twitter:image', content: `${ORIGIN}/og-image.png` });
  });

  it('adds a canonical link for the route', () => {
    expect(head.links).toEqual([{ rel: 'canonical', href: `${ORIGIN}/x` }]);
  });

  it('uses the origin alone for the home path', () => {
    const home = pageHead({ ...page, path: '/' }, ORIGIN);
    has(home.meta, { property: 'og:url', content: `${ORIGIN}/` });
  });
});

describe('pageHead without an origin', () => {
  const head = pageHead(page, undefined);

  it('still describes the page', () => {
    has(head.meta, { property: 'og:type', content: 'website' });
    has(head.meta, { property: 'og:title', content: page.title });
    has(head.meta, { property: 'og:description', content: page.description });
  });

  it('omits every tag that needs an absolute address instead of inventing a domain', () => {
    expect(keys(head.meta)).not.toContain('og:url');
    expect(keys(head.meta)).not.toContain('og:image');
    expect(JSON.stringify(head.meta)).not.toMatch(/https?:\/\//);
    expect(JSON.stringify(head.meta)).not.toContain('twitter:image');
    expect(head.links).toEqual([]);
  });

  it('falls back to a plain summary card, since there is no image to show large', () => {
    has(head.meta, { name: 'twitter:card', content: 'summary' });
  });
});

describe('pageHead for a page that must stay out of search', () => {
  it('sets noindex and leaves out the social and canonical tags', () => {
    const head = pageHead({ ...page, indexable: false }, ORIGIN);
    has(head.meta, { name: 'robots', content: 'noindex' });
    expect(keys(head.meta)).toEqual([]);
    expect(head.links).toEqual([]);
  });
});

describe('personJsonLd', () => {
  it('names the person and links the profiles, with a url only when the origin is known', () => {
    const withOrigin = JSON.parse(personJsonLd(ORIGIN));
    expect(withOrigin).toMatchObject({ '@type': 'Person', name: 'Alex Cash', url: `${ORIGIN}/` });
    expect(withOrigin.sameAs).toContain('https://github.com/alcash55');

    expect(JSON.parse(personJsonLd(undefined))).not.toHaveProperty('url');
  });
});
