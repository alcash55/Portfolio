import { test, expect, type Page } from '@playwright/test';

/**
 * Where the hero's down arrow lands you.
 *
 * The bug this suite pins was viewport-dependent and had two faces, which is
 * why it survived: on some window sizes the click scrolled too far and the
 * sticky nav bar came down on top of the "About Me" heading, and on others it
 * stopped short, leaving the arrow still on screen with no nav bar anywhere --
 * the hero's own inline nav has already scrolled away by then, so that state
 * has no navigation at all.
 *
 * They are one missing contract, not two bugs. The resting position after the
 * click has to be simultaneously:
 *
 *   1. past the point where `useShowNavBar` reveals the bar, and
 *   2. far enough that the bar it just revealed does not cover the heading.
 *
 * Satisfying either one alone is what produced the other symptom. So every
 * check below asserts both at once, at eight window sizes, in all three
 * layouts, with motion on and off. Measurements, not screenshots: this bug is
 * entirely about pixels, and a screenshot of it looks like a design choice.
 *
 * Measured on the broken build -- `arrow` is the arrow's bottom edge relative
 * to the viewport top after the click, `overlap` is how much of the heading the
 * bar covered:
 *
 *   1920x1080  motion   bar shown, heading overlapped by 8px
 *   1920x1080  reduced  arrow still at +24px, no bar
 *   1280x800   motion   arrow still at +37px, no bar
 *   1366x768   motion   bar shown, heading overlapped by 8px
 *   1440x650   motion   bar shown, heading overlapped by 8px
 *    820x1180  motion   bar shown, heading overlapped by 8px
 *   1024x768   motion   arrow still at +24px, no bar
 *    390x844   mobile   arrow still at +10px
 */

/** Same stub as the smoke suite -- see its comment. Keeps the suite frontend-only. */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
});

type LayoutMode = 'default' | 'sideNav' | 'mobile';

interface Viewport {
  name: string;
  width: number;
  height: number;
  /** The layout `AppShellProvider` resolves at this size with no stored preference. */
  layout: LayoutMode;
}

/**
 * A deliberate spread of window *heights*, because height is the axis the bug
 * moved along. 768 is the 1366x768 laptop class this project keeps measuring
 * against; 650 is the mobile breakpoint's own value used as a height, which is
 * where the hero's content most badly outgrows its 100vh box.
 */
const VIEWPORTS: Viewport[] = [
  { name: 'tall desktop 1920x1080', width: 1920, height: 1080, layout: 'default' },
  { name: 'desktop 1280x800', width: 1280, height: 800, layout: 'default' },
  { name: 'short laptop 1366x768', width: 1366, height: 768, layout: 'default' },
  { name: 'very short laptop 1440x650', width: 1440, height: 650, layout: 'default' },
  { name: 'tablet portrait 820x1180', width: 820, height: 1180, layout: 'default' },
  { name: 'tablet landscape 1024x768', width: 1024, height: 768, layout: 'default' },
  { name: 'phone 390x844', width: 390, height: 844, layout: 'mobile' },
  { name: 'small phone 320x700', width: 320, height: 700, layout: 'mobile' },
];

interface Geometry {
  scrollY: number;
  viewportHeight: number;
  /** The "About Me" heading, viewport-relative. */
  heading: { top: number; bottom: number };
  /** The hero's scroll-indicator button, viewport-relative. */
  arrow: { top: number; bottom: number };
  /** Bottom edge of the hero section's own (clipping) box, viewport-relative. */
  heroBottom: number;
  /** Bottom edge of the sticky top bar, or null in a layout that has none. */
  navBottom: number | null;
  /** `visibility` of the sticky bar's wrapper -- what actually hides it. */
  navVisibility: string | null;
  /** Top edge of the mobile bottom nav, or null when it isn't rendered. */
  bottomNavTop: number | null;
  layout: LayoutMode;
}

/** One round trip for every number a check below needs, so nothing races a re-layout. */
const readGeometry = (page: Page): Promise<Geometry> =>
  page.evaluate(() => {
    const round = (n: number) => Math.round(n * 100) / 100;
    const about = document.getElementById('about') as HTMLElement;
    const heading = Array.from(about.querySelectorAll('h2')).find(
      (h) => h.textContent?.trim() === 'About Me',
    ) as HTMLElement;
    const arrow = document.querySelector('[data-scroll-indicator]') as HTMLElement;
    const hero = document.getElementById('landing') as HTMLElement;
    const bar = document.querySelector('header');
    const barWrapper = bar?.parentElement ?? null;
    const bottomNav = document.querySelector('.MuiBottomNavigation-root');

    const headingRect = heading.getBoundingClientRect();
    const arrowRect = arrow.getBoundingClientRect();

    return {
      scrollY: round(window.scrollY),
      viewportHeight: window.innerHeight,
      heading: { top: round(headingRect.top), bottom: round(headingRect.bottom) },
      arrow: { top: round(arrowRect.top), bottom: round(arrowRect.bottom) },
      heroBottom: round(hero.getBoundingClientRect().bottom),
      navBottom: bar ? round(bar.getBoundingClientRect().bottom) : null,
      navVisibility: barWrapper ? getComputedStyle(barWrapper).visibility : null,
      bottomNavTop: bottomNav ? round(bottomNav.getBoundingClientRect().top) : null,
      layout: (bottomNav ? 'mobile' : bar ? 'default' : 'sideNav') as LayoutMode,
    };
  });

/**
 * Waits for the scroll to stop moving rather than for a fixed timeout.
 *
 * A smooth scroll has no completion event and its duration is the browser's
 * choice, so asserting on a timer is how a suite like this becomes flaky. Every
 * check below is on the *resting* position, which is the only thing a visitor
 * ends up looking at and the only thing that is the same under `behavior:
 * 'smooth'` and `'auto'`.
 */
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let previous = Number.NaN;
        let stableFrames = 0;
        const tick = () => {
          if (window.scrollY === previous) stableFrames += 1;
          else stableFrames = 0;
          previous = window.scrollY;
          if (stableFrames >= 15) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  // The bar's own 220ms fade only starts once `useShowNavBar` flips, which can
  // be a frame after the scroll settles.
  await page.waitForTimeout(300);
}

/** Loads the page and waits for the hero, matching the smoke suite's helper. */
async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
  // Sections start held 24px low by `useScrollReveal`; give the first paint and
  // the initial IntersectionObserver callback a beat before measuring anything.
  await page.waitForTimeout(400);
}

/** Clicks the arrow the way a visitor can: only if it is actually on screen first. */
async function clickTheArrow(page: Page) {
  const arrow = page.locator('[data-scroll-indicator]');
  await expect(arrow).toBeVisible();
  await arrow.click();
  await settle(page);
}

/**
 * The contract, asserted as one unit.
 *
 * `expectedLayout` decides what "correct" means, because two of the three
 * layouts have no top bar at all:
 *
 * - **default** -- the sticky `NavBar` is the whole point. It must be showing
 *   (the hero's inline nav has scrolled away, so otherwise there is no nav at
 *   all), and the heading must clear its bottom edge.
 * - **sideNav** -- no top bar; the side rail is always there. Nothing can cover
 *   the heading, so the requirement is just that the heading is fully on screen
 *   and the hero is behind you.
 * - **mobile** -- no top bar either; `MobileChrome` is a *bottom* nav, so the
 *   heading must clear the top of the viewport and stay above that bar.
 */
async function expectLandedOnAbout(page: Page, expectedLayout: LayoutMode) {
  const g = await readGeometry(page);
  expect(g.layout, `expected the ${expectedLayout} layout`).toBe(expectedLayout);

  // Whatever is pinned across the top of the content at this moment: the bar's
  // bottom edge in `default`, the top of the viewport everywhere else.
  const contentTop = expectedLayout === 'default' ? (g.navBottom as number) : 0;

  if (expectedLayout === 'default') {
    expect(
      g.navVisibility,
      `the nav bar is still hidden after the arrow click (arrow bottom at ${g.arrow.bottom}px)`,
    ).toBe('visible');
  }

  expect(
    g.heading.top,
    `"About Me" starts ${contentTop - g.heading.top}px above the top of the readable area ` +
      `(heading top ${g.heading.top}, readable area starts at ${contentTop})`,
  ).toBeGreaterThanOrEqual(contentTop);

  const floor = g.bottomNavTop ?? g.viewportHeight;
  expect(
    g.heading.bottom,
    `"About Me" runs ${g.heading.bottom - floor}px past the bottom of the readable area`,
  ).toBeLessThanOrEqual(floor);

  // The other half of the contract: the arrow must not still be sitting there
  // looking clickable. Behind the sticky bar counts as gone -- the bar is
  // opaque -- so the arrow's bottom edge has to be above the readable area's
  // top, which is exactly the line `useShowNavBar` keys off.
  expect(
    g.arrow.bottom,
    `the hero arrow is still ${g.arrow.bottom - contentTop}px into the readable area after the click`,
  ).toBeLessThanOrEqual(contentTop);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('the arrow is on screen to be clicked in the first place', async ({ page }) => {
      await gotoHome(page);
      const g = await readGeometry(page);

      expect(g.arrow.top, 'the arrow starts above the top of the window').toBeGreaterThanOrEqual(0);
      expect(
        g.arrow.bottom,
        `the arrow is ${g.arrow.bottom - g.viewportHeight}px below the bottom of the window`,
      ).toBeLessThanOrEqual(g.viewportHeight);
      // The hero is `height: 100vh; overflow: hidden`. An arrow below that edge
      // is clipped away -- present in the DOM, invisible to the visitor, and
      // still the element `useShowNavBar` measures.
      expect(
        g.arrow.bottom,
        `the hero clips ${g.arrow.bottom - g.heroBottom}px off the bottom of its own arrow`,
      ).toBeLessThanOrEqual(g.heroBottom);
    });

    test('clicking the arrow lands on About with the nav in place', async ({ page }) => {
      await gotoHome(page);
      await clickTheArrow(page);
      await expectLandedOnAbout(page, vp.layout);
    });

    test.describe('prefers-reduced-motion', () => {
      test.use({ contextOptions: { reducedMotion: 'reduce' } });

      test('clicking the arrow lands on About with the nav in place', async ({ page }) => {
        await gotoHome(page);
        await clickTheArrow(page);
        await expectLandedOnAbout(page, vp.layout);
      });
    });
  });
}

/**
 * The sideNav layout has no top bar, so "the bar must appear" is meaningless
 * there -- but the landing position still has to be right and is reached by the
 * same code path. Only run at sizes where sideNav is reachable at all
 * (`AppShellProvider` forces `mobile` below 650px wide whatever is stored).
 */
for (const vp of VIEWPORTS.filter((v) => v.layout === 'default')) {
  test.describe(`${vp.name} - sideNav layout`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('clicking the arrow lands on About', async ({ page }) => {
      // Resolved synchronously before first paint, so it has to be set before
      // the app's first script runs -- same reason as the smoke suite's.
      await page.addInitScript(() => window.localStorage.setItem('layout', 'sideNav'));
      await gotoHome(page);
      await clickTheArrow(page);
      await expectLandedOnAbout(page, 'sideNav');
    });
  });
}

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('the arrow can be fired from the keyboard and lands in the same place', async ({ page }) => {
    await gotoHome(page);
    // Focused directly rather than tabbed to: the point here is that the
    // handler sits on a real button and that a keyboard activation lands where
    // a click lands, not the tab order of the hero.
    const arrow = page.locator('[data-scroll-indicator]');
    await arrow.focus();
    await expect(arrow).toBeFocused();
    await page.keyboard.press('Enter');
    await settle(page);
    await expectLandedOnAbout(page, 'default');
  });
});
