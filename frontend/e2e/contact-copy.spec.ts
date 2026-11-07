import { fail, fillForm, ok, send, stubContact } from './contactStub';
import { expect, test, VIEWPORTS } from './fixtures';

const LINKEDIN = 'https://www.linkedin.com/in/alexander-cash/';
const FALLBACK = /^Or message me on LinkedIn/;

// These run in a real browser because the sources build the strings from parts
// (a template, JSX text next to a variable), so a text search of the source
// cannot confirm what a visitor reads.
test.describe('contact copy, exact', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('sent body names the address the visitor typed (MA-14)', async ({ page }) => {
    await stubContact(page, ok);
    await page.goto('/');
    await fillForm(page);
    await send(page).click();
    const heading = page.getByRole('heading', { name: 'Message sent.' });
    await expect(heading).toBeFocused();
    await expect(heading.locator('xpath=following-sibling::p[1]')).toHaveText(
      'Thanks for writing. I will reply to ada@example.com.',
    );
  });

  test('too long, client side, is a summary link and a field message (MA-21)', async ({ page }) => {
    const posted = await stubContact(page, ok);
    await page.goto('/');
    await fillForm(page);
    await page.getByRole('textbox', { name: /^Message/ }).fill('x'.repeat(1501));
    await send(page).click();
    const text = 'That message is too long. The limit is 1500 characters.';
    await expect(page.getByRole('link', { name: text })).toBeVisible();
    await expect(page.locator('p', { hasText: text })).toBeVisible();
    expect(posted).toEqual([]);
  });

  test('too long, from the API, reads the same (MA-21)', async ({ page }) => {
    await stubContact(page, fail(413));
    await page.goto('/');
    await fillForm(page);
    await send(page).click();
    await expect(page.getByRole('alert')).toContainText(
      'That message is too long. The limit is 1500 characters.',
    );
  });

  for (const [label, status] of [
    ['rejected details', 400],
    ['rate limit', 429],
    ['server error', 502],
  ] as const) {
    test(`${label} shows the LinkedIn fallback (MA-27)`, async ({ page }) => {
      await stubContact(page, fail(status));
      await page.goto('/');
      await fillForm(page);
      await send(page).click();
      const fallback = page.getByRole('alert').locator('p', { hasText: FALLBACK });
      await expect(fallback.getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute(
        'href',
        LINKEDIN,
      );
    });
  }

  test('the slow status carries the fallback too (MA-27)', async ({ page }) => {
    await stubContact(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4600));
      await ok(route);
    });
    await page.goto('/');
    await fillForm(page);
    await send(page).click();
    const status = page.getByRole('status', { name: 'Send status' });
    await expect(status.locator('p', { hasText: FALLBACK })).toBeVisible();
  });

  test('the home band keeps the form fallback line (MA-28)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('p', { hasText: FALLBACK })).toBeVisible();
  });

  test('no page shows an email address or a mailto link', async ({ page }) => {
    for (const path of ['/', '/contact', '/projects/clipper', '/resume']) {
      await page.goto(path);
      await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
      expect(await page.locator('body').innerText()).not.toMatch(/gmail\.com/);
      expect(await page.content()).not.toMatch(/alex\.e\.cash28@/);
    }
  });
});
