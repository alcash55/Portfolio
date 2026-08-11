import { test, expect, type Page } from '@playwright/test';

/**
 * The smoke suite. Deliberately narrow -- every check here maps to a bug that
 * actually shipped on this project and that lint, `tsc --noEmit`, Vitest, and
 * `vite build` all passed on: a runtime circular import, PWA icons 404ing in
 * production, an invisible focus ring, a duplicate `<h1>`, a nav link at
 * `x: -46`, a bypassable rate limiter (backend, out of scope here), hero
 * images at 40px, a 285ms flash of the wrong theme, and sections clipping
 * their own content. Runs against `vite preview` (see playwright.config.ts),
 * i.e. the same production build that ships.
 *
 * Every section that follows the `<Stack component="section"><Card
 * overflow:visible>` pattern -- the one whose Card losing `overflow: visible`
 * silently clipped About's "Outside of Work" -- gets checked for clipping.
 * Landing (the hero) and the error page don't follow that pattern and are out
 * of scope here.
 */
const CLIPPABLE_SECTION_IDS = ['about', 'experience', 'skills', 'projects', 'contact'];

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

/**
 * The one network call the page makes on load. It is stubbed for every test so
 * the suite asserts against the frontend alone: with a real `VITE_API_URL` the
 * result would depend on whether a Go backend happened to be running, and
 * `useProjects`' fallback would (correctly) log a console.error on connection
 * refused -- which is exactly what made `zero console errors on load` pass on a
 * developer machine with the backend up and fail in CI, where nothing listens
 * on :8080. An empty `projects` list means no live metadata merges over the
 * static list, so Projects still renders its real cards.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
});

/** Navigates home and waits for the hero's `<h1>` so later assertions don't race the first paint. */
async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

test.describe('page load', () => {
  test('renders exactly one <h1> in the default layout', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('renders exactly one <h1> in the mobile layout', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoHome(page);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('renders exactly one <h1> in the sideNav layout', async ({ page }) => {
    // sideNav is only reachable on a non-mobile viewport, and the mode is
    // resolved synchronously from localStorage before first paint (see
    // AppShellProvider's resolveInitialMode) -- it has to be set before the
    // app's first script runs, not after.
    await page.addInitScript(() => window.localStorage.setItem('layout', 'sideNav'));
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('zero console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize(DESKTOP);
    await gotoHome(page);
    // Give any async render errors (e.g. a circular import surfacing only at
    // runtime) a beat to happen before asserting.
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });
});

test('no horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await gotoHome(page);

  const overflowPx = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflowPx).toBe(0);
});

test('no section card clips its own content', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await gotoHome(page);

  for (const id of CLIPPABLE_SECTION_IDS) {
    const overflowPx = await page.evaluate((sectionId) => {
      const card = document.querySelector(`section#${sectionId} > .MuiCard-root`);
      if (!card) return null;
      return card.scrollHeight - card.clientHeight;
    }, id);

    expect(overflowPx, `section #${id} should render, found no .MuiCard-root child`).not.toBeNull();
    expect(overflowPx, `section #${id} clips ${overflowPx}px of its own content`).toBeLessThanOrEqual(
      1,
    );
  }
});

test('contact form submits against a stubbed backend and shows the success state', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  // Stubbed, not a live backend call -- the smoke suite verifies the
  // frontend's submit/success wiring, not the Go API (that's covered by the
  // backend's own tests).
  await page.route('**/api/v1/contact', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  await gotoHome(page);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.locator('#name').fill('Smoke Test');
  await page.locator('#email').fill('smoke-test@example.com');
  await page.locator('#message').fill('Verifying the contact form from the Playwright suite.');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Message sent successfully!')).toBeVisible();
});
