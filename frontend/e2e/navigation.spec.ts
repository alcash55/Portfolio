import { expect, test, VIEWPORTS } from './fixtures';

test.describe('client-side navigation', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('the home About buttons look the same after a trip to a detail page', async ({ page }) => {
    const layout = () =>
      page
        .locator('#about')
        .getByRole('link', { name: /^Message Alex/ })
        .evaluate((button) => {
          const row = getComputedStyle(button.parentElement as Element);
          const style = getComputedStyle(button);
          return { direction: row.flexDirection, gap: row.gap, padding: style.padding };
        });
    await page.goto('/');
    const fresh = await layout();
    await page.locator('a[href="/projects/portfolio-website"]').first().click();
    await expect(page).toHaveURL(/\/projects\/portfolio-website$/);
    await page.getByRole('link', { name: /All projects/ }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    expect(await layout(), 'About buttons after returning from a detail page').toEqual(fresh);
  });

  test('the breadcrumb returns to the chapter the write-up opened from', async ({ page }) => {
    await page.goto('/#ac-composite-actions');
    await page.locator('#ac-composite-actions a[href="/projects/ac-composite-actions"]').click();
    await expect(page).toHaveURL(/\/projects\/ac-composite-actions$/);
    await page.getByRole('link', { name: /All projects/ }).click();
    await expect(page).toHaveURL(/\/#ac-composite-actions$/);
    await expect
      .poll(async () =>
        page.locator('#ac-composite-actions').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
        }),
      )
      .toBe(true);
  });

  test('returning to the home page by link moves focus to its heading', async ({ page }) => {
    await page.goto('/projects/clipper');
    await page.getByRole('link', { name: /Alex Cash, home/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#c1-h')).toBeFocused();
  });

  test('arriving on a hash link moves focus to that section, not the page h1', async ({ page }) => {
    await page.goto('/projects/clipper');
    await page.getByRole('link', { name: /All projects/ }).click();
    await expect(page).toHaveURL(/\/#clipper$/);
    await expect(page.locator('#clipper h2')).toBeFocused();
  });
});
