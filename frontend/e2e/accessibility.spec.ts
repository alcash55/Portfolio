import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * The accessibility sweep: @axe-core/playwright against every theme, on the
 * routes the rest of this suite already knows about. Runs against `vite
 * preview` (see playwright.config.ts), i.e. the production build that ships.
 *
 * Why this file exists: `accessibility-analysis.yml` in the shared actions
 * repo has been `run: echo config axe` for two years, while several recent
 * sprints here were spent on exactly what axe reports automatically --
 * contrast failures across themes, an invisible focus ring, a duplicate
 * `<h1>`, a nav link rendering off-screen. Lint, `tsc`, Vitest and the build
 * cannot see any of that; this is the first check in the suite that can.
 *
 * CAVEAT -- read this before treating a green run as proof of anything much:
 * axe-core's own documentation puts its automated coverage at roughly a third
 * of WCAG success criteria. It finds missing labels, contrast failures, bad
 * ARIA and focus-order violations with a mechanical DOM signature; it cannot
 * tell you a label is technically present but meaningless, that a tab order
 * is legal but confusing, or anything a screen-reader user would only notice
 * by attempting the actual task. This file passing is a floor, not a
 * certificate: "nothing mechanical is broken," not "this site is
 * accessible." If you are reading this because a run went green and you are
 * about to say the site passed accessibility review, don't -- go find a
 * human who uses assistive tech and hasn't seen the site yet.
 */

const e2eDir = path.dirname(fileURLToPath(import.meta.url));

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

/**
 * Reads THEME_OPTIONS's `name` values straight out of the source file rather
 * than importing `themeOptions.ts`. Importing it pulls in the real theme
 * objects, and every one of them (`darkTheme.ts` etc.) does `import
 * '@fontsource/oxygen'` and friends -- plain CSS files that Vite and Vitest
 * both know how to load, but that the Playwright test runner (plain Node, no
 * bundler in front of it) does not: it fails at collection with `TypeError:
 * Unknown file extension ".css"` before a single test runs. Parsing the
 * array literal instead keeps this spec driven off the same file every
 * picker uses, so a hardcoded list here doesn't silently stop covering a
 * seventh theme the day one is added -- without executing a module this
 * runtime can't load. The regex is intentionally
 * narrow: if themeOptions.ts's shape changes enough to break it, this throws
 * loudly instead of silently sweeping a stale or empty list.
 */
function readThemeNames(): string[] {
  const themeOptionsPath = path.resolve(
    e2eDir,
    '../src/components/AppShell/InternalComponents/themeOptions.ts',
  );
  const source = readFileSync(themeOptionsPath, 'utf-8');
  const arrayMatch = source.match(/THEME_OPTIONS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!arrayMatch) {
    throw new Error(
      `accessibility.spec.ts could not find the THEME_OPTIONS array literal in ` +
        `${themeOptionsPath} -- its parser needs updating to match the file's new shape.`,
    );
  }
  const names = [...arrayMatch[1].matchAll(/name:\s*'([a-zA-Z0-9_-]+)'/g)].map((m) => m[1]);
  if (names.length === 0) {
    throw new Error(
      `accessibility.spec.ts found the THEME_OPTIONS array in ${themeOptionsPath} but no ` +
        'theme names inside it -- its parser needs updating to match the file\'s new shape.',
    );
  }
  return names;
}

const THEME_NAMES = readThemeNames();

/**
 * Reads the real `dist/sitemap.xml` the current build produced, exactly as
 * `sitemap-urls.spec.ts` does and for the same reason: it is the one source
 * that proves the generator and the app agree, and re-deriving the project
 * list from `src` would duplicate the very mapping this is meant to verify
 * against. Depends on the webServer's build step already having run (see
 * playwright.config.ts).
 */
const SITEMAP_PATH = path.resolve(e2eDir, '../dist/sitemap.xml');
const SITE_URL = 'https://alcash55.github.io/Portfolio/';

function projectDialogFragments(): string[] {
  const xml = readFileSync(SITEMAP_PATH, 'utf-8');
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return locs
    .filter((loc) => loc !== SITE_URL)
    .map((loc) => {
      if (!loc.startsWith(SITE_URL)) {
        throw new Error(`sitemap entry ${loc} is not under ${SITE_URL}`);
      }
      return loc.slice(SITE_URL.length);
    });
}

const PROJECT_DIALOG_FRAGMENTS = projectDialogFragments();

/**
 * The one network call the page makes on load, stubbed for every test so
 * this suite asserts against the frontend alone -- copied from
 * smoke.spec.ts/sitemap-urls.spec.ts for the same reason: a real
 * `VITE_API_URL` makes the result depend on whether a Go backend happens to
 * be running, which is exactly what made a similar check pass locally and
 * fail in CI on a previous sprint.
 */
async function stubProjectsApi(page: Page) {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
}

async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

/**
 * Runs axe against the WCAG 2 A/AA tag level and fails with every violation's
 * rule id, impact and node count spelled out, so a red run tells you what
 * broke without opening the HTML report.
 */
async function expectNoViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const summary = results.violations
    .map(
      (v) =>
        `  - [${v.impact ?? 'unknown'}] ${v.id}: ${v.nodes.length} node(s) -- ${v.help} (${v.helpUrl})`,
    )
    .join('\n');
  expect(results.violations, `${context} has axe violations:\n${summary}`).toEqual([]);
}

for (const themeName of THEME_NAMES) {
  test.describe(`theme: ${themeName}`, () => {
    test.beforeEach(async ({ page }) => {
      await stubProjectsApi(page);
      // Set before first paint, not after load: Context.tsx resolves the
      // stored theme in a lazy initializer specifically to avoid a flash, so
      // toggling post-render would measure the transition instead of the
      // theme actually being audited. Same pattern as hero-controls.spec.ts.
      await page.addInitScript((name) => window.localStorage.setItem('theme', name), themeName);
    });

    test('home, default layout', async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await gotoHome(page);
      await expectNoViolations(page, `home (default layout, theme=${themeName})`);
    });

    test('home, mobile layout', async ({ page }) => {
      // Forced by viewport alone (see AppShell.tsx's resolveInitialMode) --
      // no localStorage write needed, same as smoke.spec.ts's mobile case.
      await page.setViewportSize(MOBILE);
      await gotoHome(page);
      await expectNoViolations(page, `home (mobile layout, theme=${themeName})`);
    });

    test('home, sideNav layout', async ({ page }) => {
      // sideNav only exists on a non-mobile viewport, and is resolved
      // synchronously from localStorage before first paint -- see
      // smoke.spec.ts's identical setup.
      await page.addInitScript(() => window.localStorage.setItem('layout', 'sideNav'));
      await page.setViewportSize(DESKTOP);
      await gotoHome(page);
      await expectNoViolations(page, `home (sideNav layout, theme=${themeName})`);
    });

    for (const fragment of PROJECT_DIALOG_FRAGMENTS) {
      test(`project dialog ${fragment}`, async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto(`/${fragment}`);
        await expect(
          page.getByRole('dialog'),
          `${fragment} did not open any dialog`,
        ).toBeVisible();
        await expectNoViolations(page, `project dialog ${fragment} (theme=${themeName})`);
      });
    }
  });
}
