import { expect, test, VIEWPORTS } from './fixtures';
import { CHAPTER_COUNT } from '../src/content/home';

test.describe('home, assembled', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('renders all twelve chapters in order, each reachable from the index', async ({ page }) => {
    await page.goto('/');
    const numbers = await page
      .locator('section[data-ch]')
      .evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-ch'))));
    expect(numbers, 'chapter numbers in document order').toEqual(
      Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1),
    );
    const ids = await page
      .locator('#cidx a[data-n]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')?.replace('#', '') ?? ''));
    for (const id of ids) await expect(page.locator(`#${id}`), `#${id} exists`).toHaveCount(1);
  });

  test('every project and experience figure has a real body', async ({ page }) => {
    await page.goto('/');
    const empty = await page
      .locator('[data-slot="figure"], .pp-slot')
      .evaluateAll((els) => els.map((el) => el.closest('section')?.id));
    expect(empty, 'chapters still showing an empty figure slot').toEqual([]);
  });
});
