import AxeBuilder from '@axe-core/playwright';
import { expect, test, VIEWPORTS } from './fixtures';

// A first pass over the stub pages. Later phases add each section's states to it.
const routes = [
  '/',
  '/projects/clipper',
  '/projects/golem-miners',
  '/projects/ac-composite-actions',
  '/projects/portfolio-website',
  '/experience/ncr-voyix-docs',
  '/experience/starbucks-store-health',
  '/no-such-page',
];

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${viewportName}, ${theme}`, () => {
      test.use({ viewport, colorScheme: theme });

      for (const route of routes) {
        test(`${route} has no axe violations`, async ({ page }) => {
          await page.goto(route);
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          expect(
            results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
          ).toEqual([]);
        });
      }
    });
  }
}
