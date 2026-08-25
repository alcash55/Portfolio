import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * The one check that actually proves generate-sitemap.mjs and the app agree:
 * read the *real* dist/sitemap.xml this run's build just wrote, and load
 * every URL in it in a real browser. Everything else (the unit tests in
 * scripts/generate-sitemap.test.mjs) compares two in-process computations of
 * the same slug; this instead drives the built site the way a crawler or a
 * shared link would, off the literal file that would ship.
 *
 * Depends on the webServer's build step already having produced
 * dist/sitemap.xml (see playwright.config.ts) -- reads it directly rather
 * than re-deriving expectations, since re-deriving is exactly the
 * duplication this whole feature exists to avoid.
 */
const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = path.resolve(e2eDir, '../dist/sitemap.xml');
const SITE_URL = 'https://alcash55.github.io/Portfolio/';

function sitemapLocs(): string[] {
  const xml = readFileSync(SITEMAP_PATH, 'utf-8');
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

/** `https://alcash55.github.io/Portfolio/#projects/x` -> `#projects/x`; `''` for the root entry. */
function fragmentOf(loc: string): string {
  if (!loc.startsWith(SITE_URL)) throw new Error(`sitemap entry ${loc} is not under ${SITE_URL}`);
  return loc.slice(SITE_URL.length);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
});

async function gotoFragment(page: Page, fragment: string) {
  await page.goto(`/${fragment}`);
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

const locs = sitemapLocs();

test('the sitemap has the root plus one entry per project, not just the one stale root entry', () => {
  // Names the exact regression this feature replaces: the generator used to
  // emit exactly one <url>. If it ever falls back to that (a broken SSR
  // load, an empty project list), this fails before any of the per-URL
  // tests below get a chance to trivially pass over zero project entries.
  expect(locs.length).toBeGreaterThan(1);
  expect(locs[0]).toBe(SITE_URL);
});

for (const loc of locs.slice(1)) {
  const fragment = fragmentOf(loc);

  test(`sitemap entry ${fragment} opens a real project dialog naming that project`, async ({
    page,
  }) => {
    await gotoFragment(page, fragment);

    const dialog = page.getByRole('dialog');
    await expect(dialog, `${loc} did not open any dialog`).toBeVisible();

    // The slug is a slugified project name (see projectSlug.ts); the dialog
    // title case-insensitively contains the words that produced it. Checked
    // generically off the URL itself, rather than a hardcoded name-per-slug
    // table, so this test does not carry its own copy of the very mapping
    // it exists to verify.
    const slug = fragment.replace('#projects/', '');
    const words = slug.split('-');
    for (const word of words) {
      await expect(dialog, `${loc}: dialog title is missing "${word}"`).toContainText(
        new RegExp(word, 'i'),
      );
    }
  });
}
