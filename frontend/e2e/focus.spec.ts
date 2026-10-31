import { expect, test, VIEWPORTS } from './fixtures';

test.use({ viewport: VIEWPORTS.desktop });

// The header is sticky and the page reserves scroll-padding for it, so a focused
// page element lands clear of it. Header controls sit inside that reserved band.
// Without a fix at the source, focusing one makes the browser scroll the page to
// "reveal" a control that is already on screen.
test('focusing a header control does not move the scroll position', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: 'main { min-height: 3000px; }' });
  await page.evaluate(() => window.scrollTo(0, 1200));
  // The home page snaps to a chapter edge, so the start is wherever the snap landed.
  const start = await page.evaluate(() => window.scrollY);
  expect(start).toBeGreaterThan(0);

  const controls = page
    .locator('header')
    .getByRole('link')
    .or(page.locator('header').getByRole('button'));
  const count = await controls.count();
  expect(count).toBeGreaterThan(4);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    if (!(await control.isVisible())) continue;
    await control.focus();
    expect(
      await page.evaluate(() => window.scrollY),
      `scrollY after focusing header control ${i}`,
    ).toBe(start);
  }
});

test('focus in the page body still scrolls clear of the sticky header', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: 'main { min-height: 3000px; position: relative; }' });
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.id = 'target';
    link.href = '#main';
    link.textContent = 'Target';
    link.style.cssText = 'position:absolute;top:1500px;left:0';
    document.querySelector('main')!.appendChild(link);
    // Put the target just under the header, where the page reserves its scroll-padding.
    window.scrollTo(0, 1500 + 20);
  });
  await page.locator('#target').focus();
  const top = await page.locator('#target').evaluate((el) => el.getBoundingClientRect().top);
  const header = await page.locator('header').evaluate((el) => el.getBoundingClientRect().height);
  expect(top).toBeGreaterThanOrEqual(header);
});
