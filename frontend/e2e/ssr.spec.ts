import { expect, test, VIEWPORTS } from './fixtures';

// With JavaScript off the server HTML is all there is.
test.describe('server-rendered pages', () => {
  test.use({ javaScriptEnabled: false, viewport: VIEWPORTS.phone });

  test('home renders its h1, the nav and the Menu link to the footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Alex Cash builds the Go API and the page that reads it.',
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Menu' })).toHaveAttribute('href', '#footer-nav');
    await expect(page.locator('dialog')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Footer' })).toBeAttached();
  });

  const pages = [
    ['/projects/portfolio-website', 'Portfolio Website', 'Portfolio Website, work by Alex Cash'],
    ['/projects/clipper', 'Clipper', 'Clipper, work by Alex Cash'],
    [
      '/experience/ncr-voyix-docs',
      'NCR Voyix docs site',
      'NCR Voyix documentation site, work by Alex Cash',
    ],
    [
      '/experience/starbucks-store-health',
      'Starbucks UK Store Health',
      'Starbucks Store Health, work by Alex Cash',
    ],
  ] as const;

  for (const [path, h1, title] of pages) {
    test(`${path} has the h1 "${h1}" and one title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('title')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    });
  }

  test('an unknown path answers 404 with the page-not-found copy', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle('Page not found, Alex Cash');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("That page doesn't exist.");
    await expect(page.getByText('The address may have changed, or it was mistyped.')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link')).toHaveText([
      'Go to the home page',
      'See the projects',
    ]);
  });

  for (const path of ['/projects/no-such-project', '/experience/no-such-job']) {
    test(`${path} answers 404 with the unknown-project copy and one title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle('Page not found, Alex Cash');
      await expect(page.locator('title')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'There is no project at that address.',
      );
      await expect(page.getByRole('main').getByRole('link')).toHaveText([
        'See all projects',
        'Go to the home page',
      ]);
    });
  }

  test('an experience slug under /projects redirects to /experience', async ({ page }) => {
    await page.goto('/projects/ncr-voyix-docs');
    expect(new URL(page.url()).pathname).toBe('/experience/ncr-voyix-docs');
  });
});
