import AxeBuilder from '@axe-core/playwright';
import { fail, fillForm, formReady, ok, send, stubContact } from './contactStub';
import { expect, test, VIEWPORTS } from './fixtures';

test.describe('server HTML without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: VIEWPORTS.phone });

  test('home carries the experience, education and contact sections', async ({ page }) => {
    await page.goto('/');
    for (const name of [
      'Trade submissions for seven markets',
      'Rebuilding the Voyix docs site',
      'Store Health for Starbucks UK',
      'Division I lacrosse, software degrees, then coaching',
      'Say hi.',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
    }
    await expect(page.getByRole('form', { name: 'Message Alex' })).toBeAttached();
    // No chapter hides text behind a control. Solea has no write-up, so its highlights are in the HTML.
    await expect(page.locator('details')).toHaveCount(0);
    await expect(page.locator('#experience').getByText(/Portfolio Credit Analysis/)).toBeAttached();
    // The carousel buttons need script, so none ship in the server HTML.
    await expect(page.getByRole('button', { name: 'Next photo' })).toHaveCount(0);
    await expect(page.locator('#education').getByRole('group', { name: / of 4$/ })).toHaveCount(4);
    // The certificates are in the server HTML too: a row and a slide for each course.
    await expect(page.locator('#certificates').getByRole('listitem')).toHaveCount(4);
    await expect(page.locator('#certificates').getByRole('group', { name: / of 4$/ })).toHaveCount(
      4,
    );
    await expect(page.getByRole('button', { name: 'Next certificate' })).toHaveCount(0);
  });
});

test('/contact redirects to the form on the home page', async ({ request, page }) => {
  const response = await request.get('/contact', { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toMatch(/\/#contact$/);
  await page.goto('/contact');
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.getByRole('form', { name: 'Message Alex' })).toBeVisible();
});

test.describe('contact form', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('a bad submit lists the problems, moves focus to them, and sends nothing', async ({
    page,
  }) => {
    const posted = await stubContact(page, ok);
    await page.goto('/');
    await formReady(page);
    await send(page).click();

    const summary = page.getByRole('heading', { name: 'Check these fields before sending.' });
    await expect(summary).toBeFocused();
    await page.getByRole('link', { name: 'Enter your email address.' }).click();
    await expect(page.getByRole('textbox', { name: /^Email/ })).toBeFocused();
    expect(posted).toEqual([]);
  });

  test('a good submit posts once and moves focus to the sent heading', async ({ page }) => {
    const posted = await stubContact(page, ok);
    await page.goto('/');
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
    await page.goto('/');
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
    await page.goto('/');
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
    await page.goto('/');
    await fillForm(page);
    await send(page).click();

    await expect(page.getByRole('button', { name: 'Sending' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByText('Waking the server. This can take up to a minute.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Message sent.' })).toBeVisible();
  });
});

test.describe('experience and education', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('no chapter says Read more, and only Solea lists highlights, beside its figure', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Read more')).toHaveCount(0);
    await expect(page.locator('details')).toHaveCount(0);

    const solea = page.locator('#experience');
    const list = solea.locator('.prose').getByRole('list');
    await list.scrollIntoViewIfNeeded();
    await expect(list.getByRole('listitem')).toHaveCount(6);
    await expect(list.getByText(/Portfolio Credit Analysis/)).toBeVisible();
    await expect(
      solea.getByText('Go, TypeScript, React, Tailwind CSS, Snowflake, Grafana'),
    ).toBeVisible();
    // The list stays inside the prose column, clear of the figure.
    const [prose, items, figure] = await Promise.all([
      solea.locator('.prose').boundingBox(),
      list.boundingBox(),
      solea.locator('figure').first().boundingBox(),
    ]);
    expect(items!.x, 'list starts inside the prose column').toBeGreaterThanOrEqual(prose!.x);
    expect(items!.x + items!.width, 'list ends inside the prose column').toBeLessThanOrEqual(
      prose!.x + prose!.width + 1,
    );
    expect(
      items!.x + items!.width <= figure!.x || figure!.x + figure!.width <= items!.x,
      'list does not overlap the figure',
    ).toBe(true);

    // The roles with a write-up link to it and carry no list of their own.
    for (const id of ['ncr-voyix', 'ncr-store-health']) {
      await expect(page.locator(`#${id} .prose`).getByRole('list'), id).toHaveCount(0);
      await expect(
        page.locator(`#${id}`).getByRole('link', { name: /Read the write-up/ }),
        id,
      ).toBeVisible();
    }
  });

  test('the carousel moves with its buttons and the arrow keys', async ({ page }) => {
    await page.goto('/');
    const region = page.getByRole('region', { name: 'Education and coaching photos' });
    await region.scrollIntoViewIfNeeded();
    const status = page.locator('#education').getByRole('status');
    await expect(status).toHaveText('1 of 4');
    await expect(page.getByRole('button', { name: 'Previous photo' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(status).toHaveText('2 of 4');

    await region.focus();
    await page.keyboard.press('End');
    await expect(status).toHaveText('4 of 4');
    await expect(page.getByRole('button', { name: 'Next photo' })).toBeDisabled();
    await page.keyboard.press('Home');
    await expect(status).toHaveText('1 of 4');
  });

  test('the certificate strip moves with its buttons and each row opens its image', async ({
    page,
  }) => {
    await page.goto('/');
    const region = page.getByRole('region', { name: 'Master.dev certificates' });
    await region.scrollIntoViewIfNeeded();
    const status = page.locator('#certificates').getByRole('status');
    await expect(status).toHaveText('1 of 4');
    await page.getByRole('button', { name: 'Next certificate' }).click();
    await expect(status).toHaveText('2 of 4');
    await region.focus();
    await page.keyboard.press('End');
    await expect(status).toHaveText('4 of 4');
    await expect(page.getByRole('button', { name: 'Next certificate' })).toBeDisabled();

    const href = await page
      .getByRole('link', { name: /^Vite \(certificate image/ })
      .getAttribute('href');
    const res = await page.request.get(href!);
    expect(res.ok(), `${href} must be served`).toBe(true);
    expect(res.headers()['content-type']).toContain('image/webp');
  });

  test('with reduced motion the carousel still moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page
      .getByRole('region', { name: 'Education and coaching photos' })
      .scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(page.locator('#education').getByRole('status')).toHaveText('2 of 4');
  });
});

test.describe('resume route', () => {
  // The e2e build points at an API host that cannot resolve (playwright.config.ts), so the
  // Worker's fetch fails and this checks the failure path. Unit tests cover the PDF answer.
  test('explains, with noindex, when the API cannot supply the PDF', async ({ request }) => {
    const response = await request.get('/resume', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('The resume is not available right now.');
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  });
});

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`axe, ${viewportName}, ${theme}`, () => {
      test.use({ viewport, colorScheme: theme });

      test('the contact form with errors showing has no violations', async ({ page }) => {
        await page.goto('/');
        await formReady(page);
        await send(page).click();
        await page.getByRole('heading', { name: 'Check these fields before sending.' }).waitFor();
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
        ).toEqual([]);
      });

      test('the home page has no violations', async ({ page }) => {
        await page.goto('/');
        // Chapters fade in as they arrive. axe reads a half-faded color as low contrast.
        await page.waitForFunction(() =>
          [...document.querySelectorAll<HTMLElement>('[data-rv="in"]')].every(
            (el) => getComputedStyle(el).opacity === '1',
          ),
        );
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
