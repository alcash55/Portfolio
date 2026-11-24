import { CONTRIBUTIONS, expect, test, VIEWPORTS } from './fixtures';

// The graph ends 13px below the default 720px viewport, and the page's scroll snap pulls a
// small scroll back to the top, so the retry button needs a viewport that already shows it.
test.use({ viewport: VIEWPORTS.desktop });

const GRID = '[data-testid="contribution-grid"]';

test('the graph fills in once the API answers', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/contributions on GitHub since \w+/)).toBeVisible();
  await expect(page.locator(GRID)).toHaveAttribute('data-state', 'ready');
});

// The first release dropped the graph when the API answered 502, so a missing token on the server
// looked like a page that never had one.
test('the graph stays, dimmed, when the API fails, and fills in on a retry', async ({ page }) => {
  await page.route('**/api/v1/contributions', (route) =>
    route.fulfill({ status: 502, json: { error: 'could not load contributions' } }),
  );
  await page.goto('/');

  await expect(page.getByText('GitHub activity did not load.')).toBeVisible();
  await expect(page.locator(GRID)).toBeVisible();
  await expect(page.locator(GRID)).toHaveAttribute('data-state', 'failed');

  await page.unroute('**/api/v1/contributions');
  await page.route('**/api/v1/contributions', (route) =>
    route.fulfill({ status: 200, json: CONTRIBUTIONS }),
  );
  await page.getByRole('button', { name: 'Try again' }).click();

  await expect(page.getByText(/contributions on GitHub since \w+/)).toBeVisible();
});
