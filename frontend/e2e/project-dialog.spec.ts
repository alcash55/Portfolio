import { test, expect, type Page } from '@playwright/test';

/**
 * Browser coverage for the project detail dialog.
 *
 * Everything here is a thing jsdom cannot answer. jsdom has no layout, so it
 * cannot tell you that a full-screen dialog actually fills a phone viewport or
 * that a 320px window does not scroll sideways; it has no focus ring, no real
 * tab order through a portal, and no CSS animation. It also cannot see the one
 * failure mode that matters most for a section like this: something throwing
 * in the console while the visitor is clicking around.
 *
 * Runs against `vite preview`, i.e. the production build that ships.
 */

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const NARROW = { width: 320, height: 700 };

/**
 * Every project, and the link(s) its dialog has to offer. Written out here
 * rather than imported from `staticProjects.ts` on purpose: a test that
 * derives its expectations from the code under test passes when both are
 * wrong together. If a link is dropped from the app, this list is what
 * notices.
 */
const PROJECTS = [
  {
    name: 'Game Competition Website',
    slug: 'game-competition-website',
    links: ['https://github.com/alcash55/Little-Town', 'https://littletown.gay/'],
  },
  {
    name: 'AC Composite Actions',
    slug: 'ac-composite-actions',
    links: ['https://github.com/alcash55/ac-composite-actions'],
  },
  {
    name: 'VS Code Royalty Theme',
    slug: 'vs-code-royalty-theme',
    links: [
      'https://github.com/alcash55/Royalty-VS-Code-Theme',
      'https://marketplace.visualstudio.com/items?itemName=Alcash55.royaltytheme',
    ],
  },
  {
    name: 'Portfolio Website',
    slug: 'portfolio-website',
    links: ['https://github.com/alcash55/Portfolio'],
  },
  {
    name: 'The Cliper-er',
    slug: 'the-cliper-er',
    links: ['https://www.youtube.com/@TheCliper-er'],
  },
];

/**
 * The one network call the page makes on load, stubbed exactly as the smoke
 * suite stubs it. With a real `VITE_API_URL` this suite would depend on
 * whether a Go backend happened to be running: it would pass on a developer
 * machine and fail in CI, where nothing listens on :8080 and `useProjects`
 * correctly logs its fallback `console.error`.
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

/** Navigates home and waits for the hero's `<h1>` so nothing races first paint. */
async function gotoHome(page: Page, hash = '') {
  await page.goto(`/${hash}`);
  await expect(page.locator('h1')).toHaveText('Alex Cash');
}

const cardFor = (page: Page, slug: string) => page.locator(`[data-project-slug="${slug}"]`);
const dialog = (page: Page) => page.getByRole('dialog');

async function openDialog(page: Page, slug: string) {
  await cardFor(page, slug).scrollIntoViewIfNeeded();
  await cardFor(page, slug).click();
  await expect(dialog(page)).toBeVisible();
}

test.describe('opening and closing', () => {
  test('every card opens a dialog that names the project and links out of it', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    for (const project of PROJECTS) {
      await openDialog(page, project.slug);

      // Labelled by its own title, so a screen reader announces the project
      // rather than "dialog".
      const labelledBy = await dialog(page).getAttribute('aria-labelledby');
      expect(labelledBy, `${project.name}: dialog has no accessible name`).toBeTruthy();
      await expect(page.locator(`#${labelledBy}`)).toHaveText(new RegExp(project.name));

      const hrefs = await dialog(page).getByRole('link').evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')),
      );
      expect(hrefs, `${project.name}: wrong outbound links`).toEqual(project.links);

      await page.keyboard.press('Escape');
      await expect(dialog(page)).toBeHidden();
    }
  });

  test('Escape, the backdrop and the close button all dismiss it', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    await openDialog(page, 'portfolio-website');
    await page.keyboard.press('Escape');
    await expect(dialog(page), 'Escape did not close the dialog').toBeHidden();

    await openDialog(page, 'portfolio-website');
    // Deliberately the far corner of the backdrop: clicking "next to the
    // panel" is what a visitor actually does, and a backdrop that does not
    // cover the viewport would swallow this click.
    await page.mouse.click(6, 6);
    await expect(dialog(page), 'a backdrop click did not close the dialog').toBeHidden();

    await openDialog(page, 'portfolio-website');
    await dialog(page).getByRole('button', { name: /close/i }).click();
    await expect(dialog(page), 'the close button did not close the dialog').toBeHidden();
  });

  test('focus goes into the dialog and comes back to the card it was opened from', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    const card = cardFor(page, 'the-cliper-er');
    await card.scrollIntoViewIfNeeded();
    // Keyboard only from here: focus the card itself and press Enter, the way
    // somebody who never touches the mouse would.
    await card.focus();
    await expect(card).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();

    const focusIsInsideDialog = () =>
      page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"]');
        return Boolean(panel && document.activeElement && panel.contains(document.activeElement));
      });
    expect(await focusIsInsideDialog(), 'focus never entered the dialog').toBe(true);

    // Tab all the way around the trap: focus must never escape to the page
    // behind, which is the failure that makes a modal unusable with a
    // keyboard.
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      expect(await focusIsInsideDialog(), `focus escaped the dialog after ${i + 1} tabs`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(card, 'focus was not handed back to the card').toBeFocused();
  });
});

test.describe('the shareable link', () => {
  test('#projects/<slug> opens that dialog on a cold load', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page, '#projects/portfolio-website');

    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText('Portfolio Website');
  });

  test('#projects on its own still scrolls to the section and opens nothing', async ({ page }) => {
    // The section anchor predates the dialog and the header's link icon uses
    // it. A scheme that swallowed it would break that button.
    await page.setViewportSize(DESKTOP);
    await gotoHome(page, '#projects');

    await expect(dialog(page)).toBeHidden();

    // And it still works as an anchor when it is followed at runtime, which is
    // what the header's own link icon does. (A cold load on `#projects` has
    // never scrolled anywhere on this site -- React mounts the section after
    // the browser has already looked for the fragment -- so that is deliberately
    // not what is asserted here.)
    await page.getByRole('link', { name: /navigate to projects/i }).click();
    const sectionTop = await page
      .locator('#projects')
      .evaluate((section) => section.getBoundingClientRect().top);
    expect(
      Math.abs(sectionTop),
      'following #projects no longer scrolls the section into view',
    ).toBeLessThan(120);
    await expect(dialog(page), 'the section anchor must not open a dialog').toBeHidden();
  });

  test('closing puts the URL back to #projects without stacking history entries', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    await openDialog(page, 'ac-composite-actions');
    expect(page.url()).toContain('#projects/ac-composite-actions');

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    expect(page.url(), 'closing should leave the section anchor in the URL').toContain('#projects');
    expect(page.url()).not.toContain('ac-composite-actions');

    // One entry was pushed on open and replaced on close, so a single back
    // press leaves the page rather than walking a stack of closed dialogs.
    await page.goBack();
    await expect(dialog(page)).toBeHidden();
  });

  test('the back button closes an open dialog', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoHome(page);

    await openDialog(page, 'game-competition-website');
    await page.goBack();

    await expect(dialog(page), 'back left the dialog open').toBeHidden();
  });
});

test.describe('layout', () => {
  test('goes full screen below the sm breakpoint', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoHome(page);
    await openDialog(page, 'portfolio-website');

    const panel = await dialog(page).boundingBox();
    expect(panel, 'the dialog has no box').not.toBeNull();
    // Full screen means exactly that: no margin, no rounded card floating in
    // the middle of a 390px phone.
    expect(panel!.width).toBe(MOBILE.width);
    expect(panel!.height).toBe(MOBILE.height);
  });

  test('stays a centred panel above the sm breakpoint', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);
    await openDialog(page, 'portfolio-website');

    const panel = await dialog(page).boundingBox();
    expect(panel!.width, 'the desktop dialog should not fill the window').toBeLessThan(
      DESKTOP.width,
    );
    expect(panel!.x, 'the desktop dialog should be inset from the edges').toBeGreaterThan(0);
  });

  test('no horizontal overflow at 320px, with the dialog open or closed', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await gotoHome(page);

    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow(), 'the page overflowed before anything was opened').toBe(0);

    for (const project of PROJECTS) {
      await openDialog(page, project.slug);
      expect(await overflow(), `${project.name}'s dialog overflows 320px`).toBe(0);
      // The links are the widest thing in there, and a button pushed off the
      // edge is a link that does not exist.
      const panel = await dialog(page).boundingBox();
      expect(panel!.width, `${project.name}'s dialog is wider than the window`).toBeLessThanOrEqual(
        NARROW.width,
      );
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toBeHidden();
    }
  });
});

test.describe('motion', () => {
  test('animates open on a desktop viewport', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);
    await openDialog(page, 'portfolio-website');

    // The paper carries a named keyframe animation. Read after the fact rather
    // than sampled mid-flight: the assertion is "this surface is animated",
    // not "it was at 0.98 scale 100ms in", which would be a flake.
    const animation = await dialog(page).evaluate((panel) => getComputedStyle(panel).animationName);
    expect(animation, 'the desktop dialog opens with no animation at all').not.toBe('none');
  });

  test('does not animate under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);
    await openDialog(page, 'portfolio-website');

    const animation = await dialog(page).evaluate((panel) => getComputedStyle(panel).animationName);
    expect(animation, 'reduced motion still got the open animation').toBe('none');
  });
});

test('no console errors while opening and closing every dialog', async ({ page }) => {
  // The same guard the smoke suite applies to page load, extended over the
  // interaction: a clip that fails to decode, a null read in the dialog, or an
  // unhandled promise rejection from `play()` would all land here.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize(DESKTOP);
  await gotoHome(page);

  for (const project of PROJECTS) {
    await openDialog(page, project.slug);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  }
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
});

test('the cards say there is more behind them', async ({ page }) => {
  // The spec's own risk: depth nobody opens. The outbound link moved one click
  // further away, so if a card does not advertise the dialog the trade was a
  // straight loss. The affordance is visible text, not a hover-only overlay,
  // because hover does not exist on a phone.
  await page.setViewportSize(MOBILE);
  await gotoHome(page);
  await page.locator('#projects').scrollIntoViewIfNeeded();

  for (const project of PROJECTS) {
    const card = cardFor(page, project.slug);
    await expect(card, `${project.name} does not say it opens a dialog`).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    await expect(
      card.getByText('Details', { exact: true }),
      `${project.name} has no visible "more inside" affordance`,
    ).toBeVisible();
  }
});
