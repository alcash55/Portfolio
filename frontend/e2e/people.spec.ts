import AxeBuilder from '@axe-core/playwright';
import type { Page, Route } from '@playwright/test';
import { expect, test, VIEWPORTS } from './fixtures';

const CONTACT_URL = '**/api/v1/contact';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

type Posted = { name: string; email: string; message: string; website: string };

/**
 * Answers the contact POST here, so no test reaches the real API. The fixture
 * already fails the test if any request leaves the app for another origin.
 */
async function stubContact(page: Page, respond: (route: Route, body: Posted) => Promise<void>) {
  const posted: Posted[] = [];
  await page.route(CONTACT_URL, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const body = request.postDataJSON() as Posted;
    posted.push(body);
    await respond(route, body);
  });
  return posted;
}

const ok = (route: Route) => route.fulfill({ status: 200, headers: CORS, json: { status: 'ok' } });
const fail = (status: number) => (route: Route) =>
  route.fulfill({ status, headers: CORS, json: { error: 'x' } });

async function fillForm(page: Page) {
  await page.getByRole('textbox', { name: /^Name/ }).fill('Ada Lovelace');
  await page.getByRole('textbox', { name: /^Email/ }).fill('ada@example.com');
  await page.getByRole('textbox', { name: /^Message/ }).fill('Hello there.');
}

const send = (page: Page) => page.getByRole('button', { name: /^(Send message|Try again)$/ });

test.describe('server HTML without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: VIEWPORTS.phone });

  test('home carries the experience, education and contact sections', async ({ page }) => {
    await page.goto('/');
    for (const name of [
      'Trade submissions for seven markets',
      'Rebuilding the Voyix docs site',
      'Store Health for Starbucks UK',
      'Degrees in software, then coaching lacrosse',
      'Say hi.',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
    }
    await expect(page.getByRole('form', { name: 'Message Alex' })).toBeAttached();
    // Read more is a native details element, so it opens with no script.
    await expect(page.locator('details.pp-more')).toHaveCount(3);
    // The carousel buttons need script, so none ship in the server HTML.
    await expect(page.getByRole('button', { name: 'Next photo' })).toHaveCount(0);
    await expect(page.locator('.pp-slide')).toHaveCount(3);
  });

  test('/contact renders its h1 and the form', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1, name: 'Get in touch.' })).toBeAttached();
    await expect(page.getByRole('form', { name: 'Message Alex' })).toBeAttached();
  });
});

test.describe('contact form', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('a bad submit lists the problems, moves focus to them, and sends nothing', async ({
    page,
  }) => {
    const posted = await stubContact(page, ok);
    await page.goto('/contact');
    await send(page).click();

    const summary = page.getByRole('heading', { name: 'Check these fields before sending.' });
    await expect(summary).toBeFocused();
    await page.getByRole('link', { name: 'Enter your email address.' }).click();
    await expect(page.getByRole('textbox', { name: /^Email/ })).toBeFocused();
    expect(posted).toEqual([]);
  });

  test('a good submit posts once and moves focus to the sent heading', async ({ page }) => {
    const posted = await stubContact(page, ok);
    await page.goto('/contact');
    await fillForm(page);
    await send(page).click();

    await expect(page.getByRole('heading', { name: 'Message sent.' })).toBeFocused();
    await expect(page.getByText('I will reply to ada@example.com.')).toBeVisible();
    expect(posted).toEqual([
      { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there.', website: '' },
    ]);

    await page.getByRole('button', { name: 'Send another message' }).click();
    await expect(page.getByRole('textbox', { name: /^Name/ })).toBeFocused();
    await expect(page.getByRole('textbox', { name: /^Name/ })).toHaveValue('');
  });

  test('a server error keeps the typing and a retry then succeeds', async ({ page }) => {
    let calls = 0;
    await stubContact(page, (route) => (++calls === 1 ? fail(502)(route) : ok(route)));
    await page.goto('/contact');
    await fillForm(page);
    await send(page).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText("Couldn't send that. Try again in a minute.");
    await expect(alert).toContainText('Your message is still in the form.');
    await expect(page.getByRole('textbox', { name: /^Message/ })).toHaveValue('Hello there.');

    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent.' })).toBeVisible();
  });

  test('a rate limit says to wait', async ({ page }) => {
    await stubContact(page, fail(429));
    await page.goto('/contact');
    await fillForm(page);
    await send(page).click();
    await expect(page.getByRole('alert')).toContainText(
      'Too many messages. Wait a moment and try again.',
    );
  });

  test('a slow reply shows the waking hint, then still lands', async ({ page }) => {
    await stubContact(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4600));
      await ok(route);
    });
    await page.goto('/contact');
    await fillForm(page);
    await send(page).click();

    await expect(page.getByRole('button', { name: 'Sending' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByText('Waking the server. This can take up to a minute.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Message sent.' })).toBeVisible();
  });

  test('the home band posts through the same form', async ({ page }) => {
    const posted = await stubContact(page, ok);
    await page.goto('/');
    await fillForm(page);
    await send(page).click();
    await expect(page.getByRole('heading', { name: 'Message sent.' })).toBeVisible();
    expect(posted).toHaveLength(1);
  });
});

test.describe('experience and education', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('Read more opens over the figure and Escape returns focus to the summary', async ({
    page,
  }) => {
    await page.goto('/');
    const details = page.locator('details.pp-more').first();
    const summary = details.locator('summary');
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details.getByText(/Portfolio Credit Analysis/)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(details).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
  });

  test('the carousel moves with its buttons and the arrow keys', async ({ page }) => {
    await page.goto('/');
    const region = page.getByRole('region', { name: 'Education and coaching photos' });
    await region.scrollIntoViewIfNeeded();
    const status = page.locator('.pp-car-st');
    await expect(status).toHaveText('1 of 3');
    await expect(page.getByRole('button', { name: 'Previous photo' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(status).toHaveText('2 of 3');

    await region.focus();
    await page.keyboard.press('End');
    await expect(status).toHaveText('3 of 3');
    await expect(page.getByRole('button', { name: 'Next photo' })).toBeDisabled();
    await page.keyboard.press('Home');
    await expect(status).toHaveText('1 of 3');
  });

  test('with reduced motion the carousel still moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('region', { name: 'Education and coaching photos' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(page.locator('.pp-car-st')).toHaveText('2 of 3');
  });
});

test.describe('resume route', () => {
  test('answers with the file or an explanation, never an error', async ({ request }) => {
    const response = await request.get('/resume', { maxRedirects: 0 });
    if (response.status() === 302) {
      expect(response.headers().location).toMatch(/\/resume\.pdf$/);
    } else {
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain('The resume is not available right now.');
    }
  });
});

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`axe, ${viewportName}, ${theme}`, () => {
      test.use({ viewport, colorScheme: theme });

      for (const route of ['/contact', '/resume']) {
        test(`${route} has no violations`, async ({ page }) => {
          await page.goto(route);
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          expect(
            results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
          ).toEqual([]);
        });
      }

      test('the contact form with errors showing has no violations', async ({ page }) => {
        await page.goto('/contact');
        await send(page).click();
        await page.getByRole('heading', { name: 'Check these fields before sending.' }).waitFor();
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
        ).toEqual([]);
      });

      test('the home page with Read more open has no violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('details.pp-more > summary').first().click();
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
        ).toEqual([]);
      });
    });
  }
}
