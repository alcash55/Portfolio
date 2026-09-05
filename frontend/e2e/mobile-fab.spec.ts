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

  // The overlap this pins happens well before Send comes to rest --
  // `scrollIntoViewIfNeeded` lands past it -- so the sweep below is built off
  // the section's own geometry instead of Send's resting position. Starting
  // a full viewport above #contact's top and running to its bottom covers
  // every scroll position the section is ever partially on screen at, which
  // is the whole range the fixed FAB can pass across it.
  const contact = page.locator('#contact');
  const { top: contactTop, height: contactHeight } = await contact.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  const viewportHeight = 700;
  const start = Math.max(0, contactTop - viewportHeight);
  const end = contactTop + contactHeight;

  let sawOverlap = false;

  for (let y = start; y <= end; y += 8) {
    await page.evaluate((target) => window.scrollTo({ top: target, behavior: 'instant' }), y);
    // `useMobileFabVisibility`'s scroll listener reads the layout inside a
    // single `requestAnimationFrame`, so wait out two frames rather than a
    // fixed duration: one for the hook's own coalesced read, one more for
    // React to commit and paint the result. A fixed delay only measures how
    // long this machine happened to take; the CI runner's real webfonts and
    // different scheduling are exactly the conditions a guessed number
    // stops covering.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );

    const read = await page.evaluate(() => {
      const fabEl = document.querySelector('.MuiFab-root');
      const sendEl = Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Send',
      );
      if (!fabEl || !sendEl) return null;
      const a = fabEl.getBoundingClientRect();
      const b = sendEl.getBoundingClientRect();
      const intersects = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      // `pointer-events`, not `visibility`: the FAB's fade-out is a genuine
      // CSS transition (see MobileChrome's `sx`), so `visibility` can still
      // read "visible" for one frame into a correct hide. `pointer-events`
      // flips the instant React re-renders, and it is what actually decides
      // whether a tap here lands on the FAB instead of Send -- the property
      // this test exists to guard.
      const clickable = getComputedStyle(fabEl).pointerEvents !== 'none';
      return { intersects, clickable };
    });

    if (read?.intersects) sawOverlap = true;

    // Unconditional: this runs at every step, overlap or not, so a
    // regression that stops the sweep from reaching the overlap zone again
    // cannot silently turn this back into a test that always passes. A
    // step with no overlap reduces to `false !== true`, which is a no-op
    // assertion rather than a skipped one.
    expect(
      Boolean(read?.intersects && read.clickable),
      `at scrollY ${y}, the FAB overlapped Send and was still clickable`,
    ).toBe(false);
  }

  // The sweep has to have found the overlap zone at least once, or this is
  // back to being unable to fail -- it proves the range above actually
  // reaches the geometry the test exists to check, not just a wider stretch
  // of empty scroll.
  expect(
    sawOverlap,
    'the sweep never found a scroll position where the FAB and Send overlap',
  ).toBe(true);
});

test('the FAB is reachable again once scrolled past the Contact section', async ({ page }) => {
  await gotoHome(page);

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.locator('footer').scrollIntoViewIfNeeded();

  await expect(fab(page)).toBeVisible();
});
