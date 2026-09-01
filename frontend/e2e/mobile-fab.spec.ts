import { test, expect, type Page } from '@playwright/test';

/**
 * The mobile layout's settings FAB, and the two things it must never sit on
 * top of.
 *
 * Portfolio#22: it used to render unconditionally at a fixed viewport
 * position, so it sat over the hero on first paint -- the one section that
 * already carries its own controls (`HeroControls`), making the FAB
 * redundant chrome over the first thing a visitor sees.
 *
 * Portfolio#42: the same fixed position, on a page that scrolls freely,
 * eventually lands on top of something that matters. At 320px width the
 * Contact form's Send button passed directly under the FAB's corner
 * mid-scroll, so a tap on the button's right ~15% either did nothing or
 * opened the settings drawer instead of sending the message.
 *
 * Both are the FAB never asking what is under it before deciding to show.
 * `useMobileFabVisibility` is the fix for both: hidden over the hero (same
 * rule as the sideNav layout's own Fab, see sidenav-fab.spec.ts) and hidden
 * whenever its own footprint overlaps a `data-fab-avoid` element.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
});

async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

const fab = (page: Page) => page.getByRole('button', { name: 'open settings drawer' });

test('the FAB is hidden while the viewport is on the hero', async ({ page }) => {
  await gotoHome(page);

  // Mounted so the exit transition has something to animate, but
  // `visibility: hidden` takes it out of the accessibility tree -- see the
  // matching note in sidenav-fab.spec.ts for why the class selector is used
  // for the "still there but hidden" check and `getByRole` for "gone".
  await expect(page.locator('.MuiFab-root')).toBeAttached();
  await expect(page.locator('.MuiFab-root')).toBeHidden();
  await expect(fab(page)).toHaveCount(0);
});

test('the FAB appears once the hero arrow has gone and still opens the drawer', async ({
  page,
}) => {
  await gotoHome(page);

  await page.evaluate(() => {
    const arrow = document.querySelector('[data-scroll-indicator]') as HTMLElement;
    const bottom = arrow.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: bottom + 2, behavior: 'instant' });
  });

  await expect(fab(page)).toBeVisible({ timeout: 2000 });
  await fab(page).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('at 320px, the FAB never overlaps the Contact form Send button while scrolling through it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await gotoHome(page);

  const send = page.getByRole('button', { name: 'Send' });
  await send.scrollIntoViewIfNeeded();

  // Walk the Contact section a few pixels at a time -- the failure this
  // pins was a specific mid-scroll position, not the resting one
  // `scrollIntoViewIfNeeded` lands on, so a single snapshot at rest would
  // have missed it. Read both rects at each step: whenever the two boxes
  // would intersect, the FAB must not be the one that is visible there.
  for (let step = -80; step <= 80; step += 8) {
    await page.mouse.wheel(0, step >= 0 ? 4 : -4);
    await page.waitForTimeout(20); // let the rAF-coalesced listener settle

    const overlap = await page.evaluate(() => {
      const fabEl = document.querySelector('.MuiFab-root');
      const sendEl = Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Send',
      );
      if (!fabEl || !sendEl) return null;
      const a = fabEl.getBoundingClientRect();
      const b = sendEl.getBoundingClientRect();
      const intersects = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const fabVisible = getComputedStyle(fabEl).visibility !== 'hidden';
      return { intersects, fabVisible };
    });

    if (overlap?.intersects) {
      expect(overlap.fabVisible, 'the FAB overlapped Send while still visible/hit-testable').toBe(
        false,
      );
    }
  }
});

test('the FAB is reachable again once scrolled past the Contact section', async ({ page }) => {
  await gotoHome(page);

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.locator('footer').scrollIntoViewIfNeeded();

  await expect(fab(page)).toBeVisible();
});
