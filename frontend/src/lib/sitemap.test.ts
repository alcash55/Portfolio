import { describe, expect, it } from 'vitest';
import { EXPERIENCE_SLUGS, PROJECT_SLUGS } from '~/content/pages';
import { buildSitemap, resolveSiteOrigin, sitemapPaths, workRedirectTarget } from './sitemap';

describe('sitemapPaths', () => {
  it('lists the home page, every project, every experience page and the contact page', () => {
    expect(sitemapPaths()).toEqual([
      '/',
      '/projects/portfolio-website',
      '/projects/game-competition-website',
      '/projects/ac-composite-actions',
      '/projects/clipper',
      '/projects/golem-miners',
      '/projects/vscode-royalty-theme',
      '/experience/ncr-voyix-docs',
      '/experience/starbucks-store-health',
      '/contact',
    ]);
  });

  it('leaves out /resume, which redirects to a PDF when the file exists', () => {
    expect(sitemapPaths()).not.toContain('/resume');
  });

  it('has one entry per content page, plus home and contact', () => {
    expect(sitemapPaths()).toHaveLength(PROJECT_SLUGS.length + EXPERIENCE_SLUGS.length + 2);
  });
});

describe('buildSitemap', () => {
  const xml = buildSitemap('https://example.test');

  it('is a urlset in the sitemap namespace', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it('writes absolute URLs from the origin, and the home page as the bare origin plus a slash', () => {
    expect(xml).toContain('<loc>https://example.test/</loc>');
    expect(xml).toContain('<loc>https://example.test/projects/clipper</loc>');
    expect(xml).toContain('<loc>https://example.test/experience/ncr-voyix-docs</loc>');
    expect(xml).toContain('<loc>https://example.test/contact</loc>');
  });

  it('writes exactly one <loc> per path', () => {
    expect(xml.match(/<loc>/g)).toHaveLength(sitemapPaths().length);
  });

  it('does not double the slash when the origin ends in one', () => {
    expect(buildSitemap('https://example.test/')).toContain(
      '<loc>https://example.test/contact</loc>',
    );
  });

  it('escapes characters that are special in XML', () => {
    expect(buildSitemap('https://example.test/?a=1&b=2')).toContain('&amp;');
  });
});

describe('resolveSiteOrigin', () => {
  it('uses the configured origin and drops a trailing slash', () => {
    expect(resolveSiteOrigin('https://alexcash.dev/', 'http://localhost:4173/sitemap.xml')).toBe(
      'https://alexcash.dev',
    );
  });

  it('falls back to the origin the request arrived on', () => {
    expect(resolveSiteOrigin(undefined, 'http://localhost:4173/sitemap.xml')).toBe(
      'http://localhost:4173',
    );
    expect(resolveSiteOrigin('  ', 'https://x.test/sitemap.xml')).toBe('https://x.test');
  });

  it('ignores a configured value that is not an http(s) origin', () => {
    expect(resolveSiteOrigin('alexcash.dev', 'https://x.test/sitemap.xml')).toBe('https://x.test');
  });
});

describe('workRedirectTarget', () => {
  it.each([
    ['clipper', '/projects/clipper'],
    ['golem-miners', '/projects/golem-miners'],
    ['ac-composite-actions', '/projects/ac-composite-actions'],
    ['portfolio-website', '/projects/portfolio-website'],
    ['game-competition-website', '/projects/game-competition-website'],
    ['vscode-royalty-theme', '/projects/vscode-royalty-theme'],
    ['ncr-voyix-docs', '/experience/ncr-voyix-docs'],
    ['starbucks-store-health', '/experience/starbucks-store-health'],
  ])('sends %s to %s', (slug, target) => {
    expect(workRedirectTarget(slug)).toBe(target);
  });

  it.each(['no-such-thing', '', 'Clipper', '../experience/clipper', 'clipper/'])(
    'returns nothing for %j',
    (slug) => {
      expect(workRedirectTarget(slug)).toBeUndefined();
    },
  );
});
