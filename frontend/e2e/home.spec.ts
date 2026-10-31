import { expect, test, VIEWPORTS } from './fixtures';
import { CHAPTER_COUNT, PROJECT_CHAPTERS } from '../src/content/home';

test.describe('home, server HTML', () => {
  test.use({ javaScriptEnabled: false, viewport: VIEWPORTS.phone });

  test('carries every chapter heading and its text with script off', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    for (const spec of PROJECT_CHAPTERS) {
      await expect(page.getByRole('heading', { level: 2, name: spec.heading })).toBeAttached();
      for (const paragraph of spec.paragraphs) {
        await expect(page.getByText(paragraph.text, { exact: true })).toBeAttached();
      }
    }
    await expect(page.getByRole('heading', { level: 2, name: 'Projects.' })).toBeAttached();
  });

  test('ships no hidden reveal state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-rv]')).toHaveCount(0);
  });

  test('lists every chapter in the index', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#cidx a[data-n]')).toHaveCount(CHAPTER_COUNT);
  });
});

test.describe('home, chapter index', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('opens on the current chapter, moves with arrows, and a pick closes it and focuses the heading', async ({
    page,
  }) => {
    await page.goto('/');
    const counter = page.locator('#ctr');
    await expect(counter).toHaveAccessibleName(/^Chapter 01 \/ 12 · About me\s*\./);
    await counter.click();
    const index = page.locator('#cidx');
    await expect(index).toBeVisible();
    await expect(index.getByRole('link', { name: /About me/ })).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(index.getByRole('link', { name: /Portfolio Website/ })).toBeFocused();
    await page.keyboard.press('End');
    await expect(index.locator('a[data-n]').last()).toBeFocused();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(index.getByRole('link', { name: /Golem Miners/ })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(index).toBeHidden();
    await expect(page).toHaveURL(/#golem-miners$/);
    await expect(page.getByRole('heading', { level: 2, name: /Dig deep/ })).toBeFocused();
  });

  test('Escape closes the index and returns focus to the counter', async ({ page }) => {
    await page.goto('/');
    await page.locator('#ctr').click();
    await expect(page.locator('#cidx')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#cidx')).toBeHidden();
    await expect(page.locator('#ctr')).toBeFocused();
  });

  test('the counter follows the chapter in view', async ({ page }) => {
    await page.goto('/');
    await page.locator('#clipper').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById('clipper')?.scrollIntoView());
    await expect(page.locator('#ctr')).toHaveAccessibleName(/^Chapter 05 \/ 12 · Clipper\s*\./);
    await expect(page.locator('#ctr b')).toHaveText('05');
  });
});

test.describe('home, reveal', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('hides only below-the-fold chapters, then shows each once in view', async ({ page }) => {
    await page.goto('/');
    const prose = page.locator('#clipper .prose');
    await expect(prose).toHaveAttribute('data-rv', 'wait');
    await expect(page.locator('#about .prose')).not.toHaveAttribute('data-rv', 'wait');
    await page.evaluate(() => document.getElementById('clipper')?.scrollIntoView());
    await expect(prose).toHaveAttribute('data-rv', 'in');
    await expect(prose).toHaveCSS('opacity', '1');
    // Reveal runs once: leaving and coming back does not hide it again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(prose).toHaveAttribute('data-rv', 'in');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows every chapter at once with no reveal state', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-rv]')).toHaveCount(0);
      await expect(page.locator('#clipper .prose')).toHaveCSS('opacity', '1');
    });
  });
});

test.describe('home, scroll snap', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('snaps on the home page only', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'y mandatory');
    await page.goto('/projects/clipper');
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none');
  });
});

test.describe('home, narrow screens', () => {
  for (const width of [320, 390]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
