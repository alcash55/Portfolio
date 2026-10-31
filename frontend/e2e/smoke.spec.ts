import { expect, test } from './fixtures';

test('the home page loads from the production build', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Alex Cash, software engineer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Alex Cash builds the Go API and the page that reads it.',
  );
  expect(errors).toEqual([]);
});
