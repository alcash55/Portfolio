import { expect, test, VIEWPORTS } from './fixtures';

const DARK_PAPER = 'rgb(20, 20, 18)';
const LIGHT_PAPER = 'rgb(250, 250, 249)';

const paper = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.use({ viewport: VIEWPORTS.desktop });

test('a saved dark choice is applied before the app code runs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  // Block every script from the app. Only the inline script in <head> can set the theme.
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await paper(page)).toBe(DARK_PAPER);
});

test('System follows the OS color scheme with JavaScript off', async ({ browser }) => {
  for (const [colorScheme, expected] of [
    ['dark', DARK_PAPER],
    ['light', LIGHT_PAPER],
  ] as const) {
    const context = await browser.newContext({ colorScheme, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    expect(await paper(page), colorScheme).toBe(expected);
    await context.close();
  }
});

test('choosing a theme applies it, survives a reload and shows as pressed', async ({ page }) => {
  await page.goto('/');
  const group = page.getByRole('group', { name: 'Theme' });
  await group.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await paper(page)).toBe(DARK_PAPER);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(group.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');

  await group.getByRole('button', { name: 'System' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect(group.getByRole('button', { name: 'System' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the compact toggle switches theme on a phone', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('the page hydrates with a saved choice and no hydration error', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');
  await expect(
    page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
