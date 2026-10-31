import type { Page } from '@playwright/test';
import { expect, test, VIEWPORTS } from './fixtures';

const MESSAGE = 'Message Alex (goes to the contact form)';

const nameField = (page: Page) => page.getByRole('textbox', { name: /^Name/ });
const inViewport = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight;
  });

// Every Message Alex link lands on the form's Name field. The route-change focus
// in the shell moves focus to a heading, so a link that crosses routes must not
// end on the heading.
test.describe('Message Alex focuses the Name field', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('hero link, by mouse', async ({ page }) => {
    await page.goto('/');
    await page.locator('#about').getByRole('link', { name: MESSAGE }).click();
    await expect(nameField(page)).toBeFocused();
    await expect.poll(() => inViewport(page, '#contact form')).toBe(true);
  });

  test('hero link, by keyboard', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#about').getByRole('link', { name: MESSAGE });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(nameField(page)).toBeFocused();
  });

  test('footer link on the home page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: MESSAGE }).click();
    await expect(nameField(page)).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => inViewport(page, '#contact form')).toBe(true);
  });

  for (const path of ['/projects/clipper', '/experience/ncr-voyix-docs']) {
    test(`footer link on ${path} goes to that page's own form`, async ({ page }) => {
      await page.goto(path);
      const footerLink = page.getByRole('contentinfo').getByRole('link', { name: MESSAGE });
      await footerLink.focus();
      await page.keyboard.press('Enter');
      await expect(nameField(page)).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect.poll(() => inViewport(page, '#contact form')).toBe(true);
    });
  }

  test("footer link on /contact goes to that page's form", async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('contentinfo').getByRole('link', { name: MESSAGE }).click();
    await expect(nameField(page)).toBeFocused();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('footer link on a page with no form crosses to the home form and is not pulled to the heading', async ({
    page,
  }) => {
    await page.goto('/projects/not-a-project');
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await page.getByRole('contentinfo').getByRole('link', { name: MESSAGE }).click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(nameField(page)).toBeFocused();
    // The shell moves focus to the page heading after a route change. Wait past it.
    await page.waitForTimeout(600);
    await expect(nameField(page)).toBeFocused();
  });
});

test.describe('Message Alex with reduced motion', () => {
  test.use({ viewport: VIEWPORTS.phone, reducedMotion: 'reduce' });

  test('hero link jumps and focuses Name', async ({ page }) => {
    await page.goto('/');
    await page.locator('#about').getByRole('link', { name: MESSAGE }).click();
    await expect(nameField(page)).toBeFocused();
  });
});
