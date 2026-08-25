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
    expect(
      overflowPx,
      `section #${id} clips ${overflowPx}px of its own content`,
    ).toBeLessThanOrEqual(1);
  }
});

test('every section is fully visible after being scrolled to', async ({ page }) => {
  // The scroll-reveal animation starts sections at opacity 0. Its catastrophic
  // failure mode is failing closed -- content that never reveals is content
  // nobody can read, and no other check here would notice, since a hidden
  // element still has a bounding box, still contains its text, and still
  // reports the same scrollHeight.
  await page.setViewportSize(DESKTOP);
  await gotoHome(page);

  const opacityOf = (id: string) =>
    page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      return el ? parseFloat(getComputedStyle(el).opacity) : null;
    }, id);

  for (const id of CLIPPABLE_SECTION_IDS) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect
      .poll(() => opacityOf(id), {
        message: `section #${id} never finished revealing`,
        timeout: 4000,
      })
      .toBe(1);
  }

  // The reveal only fires once a section's top edge is 25% of the way up the
  // window, which is unreachable for anything close enough to the end of the
  // document that the page runs out of scroll first. Nothing can rescue such a
  // section -- it would simply never appear -- so the last one gets checked at
  // the actual bottom of the page rather than at whatever position
  // `scrollIntoViewIfNeeded` happens to pick.
  const last = CLIPPABLE_SECTION_IDS[CLIPPABLE_SECTION_IDS.length - 1];
  await page.evaluate(() => window.scrollTo({ top: 1e7, behavior: 'instant' }));
  await expect
    .poll(() => opacityOf(last), {
      message: `section #${last} is still hidden at the very bottom of the page`,
      timeout: 4000,
    })
    .toBe(1);
});

test('the nav bar appears as the hero arrow leaves, not before or long after', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await gotoHome(page);

  const navVisibility = () =>
    page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? getComputedStyle(header.parentElement as Element).visibility : null;
    });

  // While the arrow is on screen the hero has its own nav, so the global bar
  // must stay out of the way.
  expect(await navVisibility()).toBe('hidden');

  // Still hidden 200px short of that, with the arrow plainly in view and the
  // hero still owning the screen. Added in Sprint 16: the threshold moved from
  // "the arrow has cleared the window" to "the arrow has reached the sticky
  // bar's own footprint", which is 64px earlier, and the check below cannot
  // tell 64px early from 200px early from half a viewport early. This pins the
  // "not before" half against anything creeping further up the hero.
  await page.evaluate(() => {
    const arrow = document.querySelector('[data-scroll-indicator]') as HTMLElement;
    const bottom = arrow.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: bottom - 200, behavior: 'instant' });
  });
  // Long enough for the scroll listener's frame plus the bar's 220ms fade: if
  // it were going to appear, it would have by now.
  await page.waitForTimeout(500);
  expect(await navVisibility()).toBe('hidden');

  // Put the arrow just past the top of the viewport.
  await page.evaluate(() => {
    const arrow = document.querySelector('[data-scroll-indicator]') as HTMLElement;
    const bottom = arrow.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: bottom + 2, behavior: 'instant' });
  });

  await expect
    .poll(navVisibility, {
      message: 'nav bar did not appear once the arrow had gone',
      timeout: 2000,
    })
    .toBe('visible');
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
