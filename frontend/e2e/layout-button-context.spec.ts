import { test, expect, type Page } from '@playwright/test';

/**
 * The settings drawer's own layout picker (`LayoutButton`), and whether its
 * selected state agrees with the layout the shell is actually rendering.
 *
 * `LayoutButton` used to read `localStorage.getItem('layout')` at render time
 * instead of `AppShellLayoutContext.layout`, the same source `HeroControls`
 * reads for its own layout controls (see `e2e/hero-controls.spec.ts`). Two
 * things this file checks that a component test cannot: whether the drawer's
 * background really becomes non-interactive while it is open (which decides
 * whether "switch layout from the hero while the drawer is open" is even a
 * reachable user action -- see `the drawer while it is open` below), and that
 * a page reload starts the drawer showing the layout that was actually
 * persisted.
 */

test.beforeEach(async ({ page }) => {
  // See smoke.spec.ts -- the one network call the page makes on load, stubbed
  // so this suite asserts against the frontend alone.
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
});

async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

/**
 * Opens the settings drawer via the chrome's own gear/Fab, which in every
 * layout -- `default`, `sideNav`, and `mobile` -- only becomes
 * visible/clickable once the hero's down arrow has scrolled past the top of
 * the screen (see `useShowNavBar`, `sidenav-fab.spec.ts`, `mobile-fab.spec.ts`).
 * The hero replaced its own inline settings trigger with `HeroControls`'s
 * floating buttons (see `e2e/hero-controls.spec.ts`'s "the hamburger it
 * replaced"), so this is the only route to the drawer while the viewport
 * starts on the hero.
 */
async function scrollPastHeroAndOpenDrawer(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 3000, behavior: 'instant' }));
  await page.getByRole('button', { name: /open settings drawer/i }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
}

/**
 * Clicks a hero layout control via keyboard rather than `.click()`: the
 * control drifts continuously (see `HeroControls.tsx`), so a pointer click
 * has to fight a moving target and Playwright's actionability wait times out
 * on "element is not stable". Focus pauses the drift outright, matching how
 * `hero-controls.spec.ts` itself interacts with these.
 */
async function chooseHeroLayout(page: Page, label: string) {
  await page.getByLabel(label).focus();
  await page.keyboard.press('Enter');
}

test.describe('the drawer while it is open', () => {
  test('makes the hero behind it non-interactive to assistive tech', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoHome(page);
    await scrollPastHeroAndOpenDrawer(page);

    // MUI's Modal marks the app's whole root `aria-hidden` while it is open --
    // #landing is a descendant of it, so it and everything in it (including
    // HeroControls) are taken out of the accessibility tree and the tab
    // order; a keyboard or screen-reader user cannot reach a hero control
    // from here.
    await expect(page.locator('#root')).toHaveAttribute('aria-hidden', 'true');

    // The hero itself is also scrolled out of the viewport at this point (the
    // gear that opens the drawer only appears after scrolling past it), so
    // there is no route back to a hero control with the drawer still open --
    // "switch layout from the hero while the drawer is visibly open" is not a
    // reachable sequence for a real visitor in either layout.
    const heroBox = await page.locator('#landing').boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.y + heroBox!.height).toBeLessThanOrEqual(0);
  });
});

test.describe("switching layout from the hero, then reading the drawer's own buttons", () => {
  test('the default -> sideNav switch made from the hero is what the drawer shows once reopened', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoHome(page);

    // Still on the hero: switch layout from HeroControls, the only route to
    // it while the drawer is closed and the viewport has not scrolled yet.
    await chooseHeroLayout(page, 'Side nav layout');
    await expect(page.getByLabel('Side nav layout')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('layout'))).toBe('sideNav');

    // Now reach the drawer through the sideNav layout's own Fab (the global
    // NavBar's gear only renders in the `default` layout).
    await scrollPastHeroAndOpenDrawer(page);

    await expect(page.getByRole('button', { name: 'Side Nav' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // And the drawer's own buttons still work, switching back.
    await page.getByRole('button', { name: 'Top Nav' }).click();
    await expect(page.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await page.evaluate(() => localStorage.getItem('layout'))).toBe('default');
  });

  test('persists across a reload: the drawer opens already showing the layout that was saved', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // AppShellProvider resolves the initial mode synchronously before first
    // paint, so this has to be set before the app's first script runs.
    await page.addInitScript(() => window.localStorage.setItem('layout', 'sideNav'));
    await gotoHome(page);

    await scrollPastHeroAndOpenDrawer(page);

    await expect(page.getByRole('button', { name: 'Side Nav' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

test.describe('at mobile width, where the shell forces the mobile layout', () => {
  test('the drawer has no layout section at all, so no stale localStorage value can show a wrong selection there', async ({
    page,
  }) => {
    // A value the shell will never actually apply below 650px.
    await page.addInitScript(() => window.localStorage.setItem('layout', 'sideNav'));
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);

    // MobileChrome's Fab is scroll-gated the same way the desktop gear/Fab
    // is (Portfolio#22: it used to sit over the hero unconditionally).
    await scrollPastHeroAndOpenDrawer(page);

    await expect(page.getByRole('heading', { name: 'Select a Layout' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Top Nav' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Side Nav' })).toHaveCount(0);
  });
});
