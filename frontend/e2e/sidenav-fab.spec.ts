import { test, expect, type Page } from '@playwright/test';

/**
 * The sideNav layout's settings Fab follows the same rule as the `default`
 * layout's NavBar: it stays out of the way while the viewport is still on the
 * hero, and arrives once the hero's down arrow has left the top of the screen.
 *
 * Worth a browser test rather than a jsdom one: the whole behaviour is a
 * scroll listener reading a real element's `getBoundingClientRect()`, and
 * jsdom has neither scrolling nor layout. A unit test here could only assert
 * that a mock returned what the mock was told to return.
 *
 * `visibility` is the property under test, not `opacity` or presence in the
 * DOM. The Fab stays mounted while hidden so its fade has something to
 * animate, so "is it in the DOM" would pass even when the button is invisible;
 * `visibility: hidden` is what actually takes it out of the tab order and off
 * the hit-testing surface, which is the property that matters.
 */

/** See smoke.spec.ts -- the one network call the page makes on load, stubbed so
 *  this suite asserts against the frontend alone and cannot depend on whether a
 *  Go backend happens to be listening. */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
  // sideNav is resolved synchronously from localStorage before the first paint
  // (AppShellProvider's resolveInitialMode), so it has to be set before the
  // app's first script runs, not after.
  await page.addInitScript(() => window.localStorage.setItem('layout', 'sideNav'));
  // sideNav is only reachable on a non-mobile viewport.
  await page.setViewportSize({ width: 1280, height: 800 });
});

async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

const fab = (page: Page) => page.getByRole('button', { name: 'open settings drawer' });

test('the settings Fab is hidden while the viewport is on the hero', async ({ page }) => {
  await gotoHome(page);

  // Mounted, so the exit transition has an element to animate. Located by
  // class rather than by role on purpose: `visibility: hidden` removes the
  // element from the accessibility tree, so `getByRole` legitimately cannot
  // find it at all -- which is itself the property the last test in this file
  // depends on.
  await expect(page.locator('.MuiFab-root')).toBeAttached();

  // ...but not visible, and therefore neither focusable nor clickable.
  await expect(page.locator('.MuiFab-root')).toBeHidden();
  await expect(fab(page)).toHaveCount(0);
});

test('the settings Fab appears once the hero arrow has gone', async ({ page }) => {
  await gotoHome(page);

  // Put the hero's arrow just past the top of the viewport -- the exact
  // threshold useShowNavBar keys off.
  await page.evaluate(() => {
    const arrow = document.querySelector('[data-scroll-indicator]') as HTMLElement;
    const bottom = arrow.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: bottom + 2, behavior: 'instant' });
  });

  await expect(fab(page)).toBeVisible({ timeout: 2000 });
});

test('the settings Fab is visible at the About section and still opens the drawer', async ({
  page,
}) => {
  await gotoHome(page);
  // Alex's stated case: "once we scroll down to the about me section it should
  // also come into view".
  await page.locator('#about').scrollIntoViewIfNeeded();

  await expect(fab(page)).toBeVisible();

  // Visible is not the same as working: a Fab that fades in but is still
  // covered or `pointer-events: none` would pass a visibility check and fail a
  // user. Clicking it is the assertion that matters.
  await fab(page).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('the hidden Fab is not reachable by keyboard while on the hero', async ({ page }) => {
  await gotoHome(page);

  // `visibility: hidden` removes an element from the tab order. If the Fab were
  // hidden with opacity alone, a keyboard user on the hero could still land on
  // an invisible button -- the exact class of bug this project's e2e suite
  // exists to catch (see smoke.spec.ts's note on the invisible focus ring).
  const focusedFabAfterTabbing = await page.evaluate(async () => {
    const isFab = () =>
      document.activeElement?.getAttribute('aria-label') === 'open settings drawer';
    return isFab();
  });
  expect(focusedFabAfterTabbing).toBe(false);

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const onFab = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') === 'open settings drawer',
    );
    expect(onFab, 'the hidden Fab must not be a tab stop while the hero is showing').toBe(false);
  }
});

test('the Fab hides again when scrolled back to the top', async ({ page }) => {
  await gotoHome(page);
  await page.locator('#about').scrollIntoViewIfNeeded();
  await expect(fab(page)).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

  // Not just "eventually invisible" -- the exit transition is 160ms, so give it
  // room, but it must actually end hidden rather than lingering.
  await expect(fab(page)).toBeHidden({ timeout: 2000 });
});
