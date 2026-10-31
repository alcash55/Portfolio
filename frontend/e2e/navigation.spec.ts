import { expect, test, VIEWPORTS } from './fixtures';

test.describe('client-side navigation', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('the home About buttons look the same after a trip to a detail page', async ({ page }) => {
    const layout = () =>
      page.locator('#about .acts').evaluate((el) => {
        const style = getComputedStyle(el);
        const btn = getComputedStyle(el.querySelector('.btn') as Element);
        return { direction: style.flexDirection, gap: style.gap, padding: btn.padding };
      });
    await page.goto('/');
    const fresh = await layout();
    await page.locator('a[href="/projects/portfolio-website"]').first().click();
    await expect(page).toHaveURL(/\/projects\/portfolio-website$/);
    await page.getByRole('link', { name: /All projects/ }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    expect(await layout(), 'About buttons after returning from a detail page').toEqual(fresh);
  });

  test('returning to the home page by link moves focus to its heading', async ({ page }) => {
    await page.goto('/projects/clipper');
    await page.getByRole('link', { name: /All projects/ }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    await expect(page.locator('#c1-h')).toBeFocused();
  });
});
