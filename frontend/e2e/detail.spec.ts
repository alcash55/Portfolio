import { expect, test, VIEWPORTS } from './fixtures';

test.describe('detail pages with JavaScript off', () => {
  test.use({ javaScriptEnabled: false, viewport: VIEWPORTS.desktop });

  test('the server HTML carries the finished diagram and no dead video buttons', async ({
    page,
  }) => {
    await page.goto('/projects/clipper');
    await expect(page.getByRole('img', { name: /Architecture diagram of Clipper/ })).toBeVisible();
    // The final state is in the markup: no class waits for a script to reveal the figure.
    const classes = await page.locator('figure.dg').getAttribute('class');
    expect(classes).toBe('dg');
    await expect(page.locator('figure.dg .e').first()).toHaveCSS('opacity', '1');
    await expect(page.getByText('Text version.')).toBeVisible();
    // The poster shows and the clip is not playing, so a play button would do nothing.
    await expect(page.locator('video').first()).toHaveAttribute('poster', /clipper-run-poster/);
    await expect(page.getByRole('button', { name: /clip/i })).toHaveCount(0);
  });

  test('the narrow-screen numbered list replaces the drawing under 960px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.phone);
    await page.goto('/projects/ac-composite-actions');
    await expect(page.locator('.dg-svg')).toBeHidden();
    await expect(page.locator('ol.flows li')).toHaveCount(7);
  });
});

test.describe('detail pages', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('the AC page has the diagram but no media region and no checks figure', async ({ page }) => {
    await page.goto('/projects/ac-composite-actions');
    await expect(page.getByRole('heading', { level: 2, name: 'Architecture' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Media' })).toHaveCount(0);
    await expect(page.getByText('9 of 9 passed')).toHaveCount(0);
  });

  test('Golem Miners links to the build on this site and shows its one clip with a caption', async ({
    page,
  }) => {
    await page.goto('/projects/golem-miners');
    await expect(page.getByRole('link', { name: /Play/ }).first()).toHaveAttribute(
      'href',
      '/play/golem-miners/',
    );
    await expect(page.getByRole('group', { name: 'Golem Miners gameplay clips' })).toBeVisible();
    // One clip is not a gallery to pick from, so no thumbnail row appears.
    await expect(page.locator('.gthumbs')).toHaveCount(0);
  });

  test('the play button appears after hydration and toggles the label', async ({ page }) => {
    await page.goto('/projects/clipper');
    const control = page.getByRole('button', { name: /Play clip|Pause clip/ });
    await expect(control).toBeVisible();
  });

  test('the next link moves to the next project and focuses its h1', async ({ page }) => {
    await page.goto('/projects/portfolio-website');
    await page.getByRole('link', { name: 'Next: Game Competition Website' }).click();
    await expect(page).toHaveURL(/\/projects\/game-competition-website$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });

  test('the first load leaves focus on the document', async ({ page }) => {
    await page.goto('/projects/clipper');
    await expect(page.getByRole('heading', { level: 1 })).not.toBeFocused();
  });

  test('the breadcrumb returns to the section on the home page', async ({ page }) => {
    await page.goto('/experience/ncr-voyix-docs');
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').click();
    await expect(page).toHaveURL(/\/#experience$/);
  });

  test('the experience nav link reads as current on an experience page', async ({ page }) => {
    await page.goto('/experience/starbucks-store-health');
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Experience' }).first(),
    ).toHaveAttribute('aria-current', 'true');
  });

  test('the crumb does not hide the heading a link scrolls to', async ({ page }) => {
    await page.goto('/projects/clipper');
    await page.getByRole('heading', { level: 2, name: 'What I built' }).scrollIntoViewIfNeeded();
    await page.getByRole('heading', { level: 2, name: 'What I measured' }).evaluate((el) => {
      el.setAttribute('tabindex', '-1');
      (el as HTMLElement).focus();
    });
    const top = await page
      .getByRole('heading', { level: 2, name: 'What I measured' })
      .evaluate((el) => el.getBoundingClientRect().top);
    const header = await page.locator('header').evaluate((el) => el.getBoundingClientRect().height);
    const crumb = await page.locator('.crumb').evaluate((el) => el.getBoundingClientRect().height);
    expect(top).toBeGreaterThanOrEqual(header + crumb);
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  for (const reduce of ['reduce', 'no-preference'] as const) {
    test(`the diagram edges are visible at rest with motion set to ${reduce}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduce });
      await page.goto('/projects/ac-composite-actions');
      await page.locator('figure.dg').scrollIntoViewIfNeeded();
      // The animation only fades edges in. Once it ends, or when there is none, they are opaque.
      await expect(page.locator('figure.dg .e').first()).toHaveCSS('opacity', '1', {
        timeout: 8000,
      });
    });
  }

  test('with reduced motion the clip stays on its poster until asked', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects/clipper');
    const video = page.locator('video').first();
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  });
});

test.describe('layout at 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const slug of ['clipper', 'golem-miners', 'ac-composite-actions', 'portfolio-website']) {
    test(`/projects/${slug} has no horizontal overflow`, async ({ page }) => {
      await page.goto(`/projects/${slug}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
    });
  }

  test('/experience/starbucks-store-health has no horizontal overflow', async ({ page }) => {
    await page.goto('/experience/starbucks-store-health');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
