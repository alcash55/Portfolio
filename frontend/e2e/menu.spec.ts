import { expect, test, VIEWPORTS } from './fixtures';

test.use({ viewport: VIEWPORTS.phone });

test('the Menu button opens a modal dialog that traps focus and closes on Esc', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Menu' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Site menu' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close menu' })).toBeFocused();

  // Tab through more stops than the dialog has. Chromium may hand focus to its own
  // toolbar after the last one, so the body is allowed. The page behind is not.
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return 'outside the document';
      return active.closest('dialog') ? 'dialog' : 'page behind the dialog';
    });
    expect(where, `after Tab ${i + 1}`).not.toBe('page behind the dialog');
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the page behind the open dialog is inert and does not scroll', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const reachable = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main')!;
    main.focus();
    return document.activeElement === main;
  });
  expect(reachable, 'main can take focus while the dialog is open').toBe(false);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );
});

test('opening the menu does not shift the layout', async ({ page }) => {
  await page.goto('/');
  const box = () => page.getByRole('link', { name: 'Alex Cash, home' }).boundingBox();
  const before = await box();
  await page.getByRole('button', { name: 'Menu' }).click();
  expect(await box()).toEqual(before);
});

test('choosing a link closes the dialog and goes there', async ({ page }) => {
  await page.goto('/projects/clipper');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('dialog', { name: 'Site menu' })
    .getByRole('link', { name: 'Experience' })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/#experience$/);
});

test('a click on the scrim closes the dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.mouse.click(20, 700);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the header nav replaces the Menu button at 1024px and up', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
});
