// @vitest-environment node
//
// Forced to the `node` environment rather than this project's default
// `jsdom` (see vite.config.ts): `loadProjectHashes` spins up a real Vite dev
// server, and Vite's own esbuild call trips over jsdom's global
// `TextEncoder` shim ("Invariant violation: new TextEncoder().encode('')
// instanceof Uint8Array is incorrectly false") the moment both share a
// realm. The XML tests below need a DOMParser, which `node` does not have
// globally -- they get one from the `jsdom` package directly instead,
// scoped to a throwaway `JSDOM` instance rather than the global environment.
//
// The real risk this file guards against is not "does the XML come out
// well-formed" - it is "does the sitemap's list of slugs quietly stop
// matching the app's". generate-sitemap.mjs never hand-writes a slug: it
// loads the *actual* staticProjects.ts and projectSlug.ts through Vite SSR
// (see its top comment for why), so the two can only diverge if that
// loading itself breaks. This suite proves the loading works today, and
// pins the URL shape and count so a regression back to "one entry" (the bug
// this script was written to fix) fails loudly instead of shipping.
import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { staticProjects } from '../src/components/Pages/Projects/staticProjects';
import { projectHash } from '../src/components/Pages/Projects/projectSlug';
import { SITE_URL, buildSitemapXml, loadProjectHashes, sitemapUrls } from './generate-sitemap.mjs';

const { DOMParser } = new JSDOM('').window;

describe('loadProjectHashes', () => {
  // `loadProjectHashes` stands up a real Vite dev server -- expensive enough
  // (~1.5s) that every test in this describe block shares one call rather
  // than each paying for its own server.
  let hashes;
  beforeAll(async () => {
    hashes = await loadProjectHashes();
  });

  it('matches projectHash() computed directly against the app’s own project list', () => {
    // This is the drift test. `loadProjectHashes` loads staticProjects.ts
    // and projectSlug.ts through a separate Vite SSR module graph; this
    // test loads the same two modules the normal Vitest way (the way every
    // other test in this repo does). If a future change ever makes the SSR
    // load resolve a stale copy, skip a project, or compute a different
    // slug, the two lists stop matching and this fails.
    const expected = staticProjects.map((project) => projectHash(project));

    expect(hashes).toEqual(expected);
  });

  it('produces one hash per project, not the single stale entry this replaced', () => {
    // Names the regression by number: before this change,
    // generate-sitemap.mjs emitted exactly one <url> no matter how many
    // projects existed. staticProjects.ts currently has 5 entries; asserting
    // >= 2 (rather than a hardcoded 5) keeps this from becoming the kind of
    // brittle test that has to change every time a project is added, while
    // still failing hard against "back to one".
    expect(hashes.length).toBe(staticProjects.length);
    expect(hashes.length).toBeGreaterThanOrEqual(2);
  });

  it('every hash uses the #projects/<slug> scheme projectFromHash() actually recognises', () => {
    for (const hash of hashes) {
      expect(hash).toMatch(/^#projects\/[a-z0-9-]+$/);
    }
  });
});

describe('sitemapUrls', () => {
  it('puts the root URL first, then one fragment URL per project hash', () => {
    const urls = sitemapUrls(['#projects/a', '#projects/b']);

    expect(urls).toEqual([SITE_URL, `${SITE_URL}#projects/a`, `${SITE_URL}#projects/b`]);
  });

  it('returns just the root when there are no projects', () => {
    expect(sitemapUrls([])).toEqual([SITE_URL]);
  });
});

describe('buildSitemapXml', () => {
  const lastmod = '2026-08-24T00:00:00.000Z';

  it('parses as well-formed XML with the sitemap namespace on the root element', () => {
    const xml = buildSitemapXml([SITE_URL, `${SITE_URL}#projects/a`], lastmod);

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.tagName).toBe('urlset');
    expect(doc.documentElement.getAttribute('xmlns')).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9',
    );
  });

  it('gives every <url> exactly one <loc> and one <lastmod>, matching the sitemap 0.9 schema', () => {
    // Checked by hand against sitemaps.org/schemas/sitemap/0.9/sitemap.xsd:
    // tUrl requires exactly one <loc> (type tLoc: an anyURI, 12-2048 chars)
    // and allows at most one optional <lastmod> (type tLastmod: xsd:date or
    // xsd:dateTime). No xmllint in this sandbox to run the XSD itself, so
    // this asserts the constraints that matter by hand.
    const locs = [SITE_URL, `${SITE_URL}#projects/a`, `${SITE_URL}#projects/b`];
    const xml = buildSitemapXml(locs, lastmod);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');

    const urlNodes = [...doc.getElementsByTagName('url')];
    expect(urlNodes).toHaveLength(locs.length);

    for (const urlNode of urlNodes) {
      const locNodes = urlNode.getElementsByTagName('loc');
      const lastmodNodes = urlNode.getElementsByTagName('lastmod');
      expect(locNodes).toHaveLength(1);
      expect(lastmodNodes).toHaveLength(1);

      const loc = locNodes[0].textContent ?? '';
      expect(loc.length).toBeGreaterThanOrEqual(12);
      expect(loc.length).toBeLessThanOrEqual(2048);
      // xsd:dateTime, e.g. 2026-08-24T00:00:00.000Z.
      expect(lastmodNodes[0].textContent).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
      );
    }
  });

  it('is duplicates-modulo-fragment: every entry resolves to the same URL once the fragment is dropped', () => {
    // The caveat this whole feature has to be reported with: search engines
    // canonicalise a URL by stripping everything from `#` onward, so
    // `.../Portfolio/#projects/little-town` and `.../Portfolio/` are the
    // same document as far as indexing is concerned. This test measures
    // that claim against this script's actual output rather than repeating
    // it as an assumption - if `sitemapUrls` ever starts emitting distinct
    // paths (real routes, not fragments), this is the test that should
    // start failing and prompt updating the report.
    const locs = sitemapUrls(['#projects/a', '#projects/b', '#projects/c']);
    const xml = buildSitemapXml(locs, lastmod);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');

    const withoutFragment = [...doc.getElementsByTagName('loc')].map(
      (node) => new URL(node.textContent ?? '').href.split('#')[0],
    );

    expect(new Set(withoutFragment).size).toBe(1);
  });
});
