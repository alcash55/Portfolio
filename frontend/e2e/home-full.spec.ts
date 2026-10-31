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

  test('chapters 8 to 10 draw their diagram, labelled as in the comp, with no printed text version', async ({
    page,
  }) => {
    await page.goto('/');
    const drawings = [
      ['Architecture of the seven-market submission platform', 'Seven ISO submission APIs'],
      ['Pipeline from team repositories to the Voyix docs site', 'Markdown stays with the team'],
      ['Store Health workflow from user interviews to the React dashboard', 'Country-level view'],
    ] as const;
    for (const [name, label] of drawings) {
      const drawing = page.getByRole('img', { name });
      await drawing.scrollIntoViewIfNeeded();
      await expect(drawing, name).toBeVisible();
      await expect(drawing.getByText(label), label).toBeVisible();
    }
    await expect(page.getByText('Text version.')).toHaveCount(0);
  });
});

test.describe('home diagrams on a phone', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('the tall diagrams show at 390px, wide enough to read', async ({ page }) => {
    await page.goto('/');
    for (const id of ['experience', 'ncr-voyix', 'ncr-store-health']) {
      const svg = page.locator(`#${id} svg[role="img"]`);
      await svg.scrollIntoViewIfNeeded();
      await expect(svg, id).toBeVisible();
      const box = await svg.boundingBox();
      expect(box?.width, `${id} width`).toBeGreaterThanOrEqual(270);
    }
  });
});
