import { expect, test } from './fixtures';

// 320px is the narrowest width the page promises to work at.
test.use({ viewport: { width: 320, height: 640 } });

for (const path of ['/', '/projects/clipper', '/no-such-page']) {
  test(`${path} fits 320px with the wordmark on one line`, async ({ page }) => {
    await page.goto(path);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);

    const wordmark = page.getByRole('link', { name: 'Alex Cash, home' }).locator('span').last();
    const lines = await wordmark.evaluate((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      return Math.round(el.getBoundingClientRect().height / lineHeight);
    });
    // The home route puts the chapter counter in the header and hides the wordmark text
    // below 480px to make room. The mark keeps its "Alex Cash, home" name.
    expect(lines, 'wordmark line count').toBe(path === '/' ? 0 : 1);
  });
}
