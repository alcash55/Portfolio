import { fail, fillForm, ok, send, stubContact } from './contactStub';
import { expect, test, VIEWPORTS } from './fixtures';

const ADDRESS = 'alex.e.cash28@gmail.com';

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
    test(`${label} shows the email fallback with a mailto link (MA-27)`, async ({ page }) => {
      await stubContact(page, fail(status));
      await page.goto('/');
      await fillForm(page);
      await send(page).click();
      const fallback = page.getByRole('alert').locator('p', { hasText: /^Or email / });
      await expect(fallback).toHaveText(`Or email ${ADDRESS}`);
      await expect(fallback.getByRole('link', { name: ADDRESS })).toHaveAttribute(
        'href',
        `mailto:${ADDRESS}`,
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
    await expect(status.locator('p').nth(1)).toHaveText(`Or email ${ADDRESS}`);
  });

  test('the home band keeps the form fallback line (MA-28)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('p', { hasText: `Or email ${ADDRESS}` })).toBeVisible();
  });
});

test.describe('copy email address button', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('says Copied, then goes back', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Copy email address' });
    await button.click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ADDRESS);
    await expect(page.getByRole('button', { name: 'Copy email address' })).toBeVisible();
  });

  test('says what to do when the clipboard refuses', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Copy email address' }).click();
    await expect(
      page.getByRole('button', { name: "Couldn't copy. Select the address instead." }),
    ).toBeVisible();
  });
});
