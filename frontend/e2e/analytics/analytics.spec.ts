import { gunzipSync } from 'node:zlib';
import type { Page, Request } from '@playwright/test';
import { expect, test } from '../fixtures';
import { watchForSdk } from '../sdkSpy';

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

/** The SDK posts JSON, gzipped or form-encoded depending on version and path. */
function decode(request: Request): CapturedEvent[] {
  const raw = request.postDataBuffer();
  if (!raw) return [];
  let text = (raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw).toString('utf8');
  if (text.startsWith('data=')) {
    text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  }
  const parsed: unknown = JSON.parse(text);
  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'batch' in parsed && Array.isArray(parsed.batch)
      ? parsed.batch
      : [parsed];
  return list.filter(
    (item): item is CapturedEvent =>
      typeof item === 'object' && item !== null && 'event' in item && 'properties' in item,
  );
}

/** Answers every PostHog host, records what the page sends, and sends nothing onward. */
async function interceptPostHog(page: Page) {
  // The SDK drops every event from a browser that looks automated: navigator.webdriver,
  // a HeadlessChrome brand or user agent. Real visitors are unaffected, so the test
  // browser presents as an ordinary one.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined });
  });
  const events: CapturedEvent[] = [];
  const hosts: string[] = [];
  await page.route('**/*.posthog.com/**', async (route) => {
    const request = route.request();
    hosts.push(new URL(request.url()).host);
    if (request.method() === 'POST') events.push(...decode(request));
    await route.fulfill({ status: 200, json: { status: 1 } });
  });
  return { events, hosts };
}

const named = (events: CapturedEvent[], name: string) => events.filter((e) => e.event === name);
/**
 * The SDK marks a localhost visitor as an internal user with a bare $set event.
 * It only happens on localhost, and it carries no page data. Everything else is ours.
 */
const ours = (events: CapturedEvent[]) =>
  events.filter(
    (e) =>
      !(
        e.event === '$set' &&
        Object.keys(e.properties.$set ?? {}).join() === '$internal_or_test_user'
      ),
  );
const pageviewUrls = (events: CapturedEvent[]) =>
  named(events, '$pageview').map((e) => e.properties.$current_url);

test.describe('analytics with a token', () => {
  test('records a pageview for the first load', async ({ page, baseURL }) => {
    const { events } = await interceptPostHog(page);
    const sdkScripts = watchForSdk(page);

    await page.goto('/');

    await expect.poll(() => pageviewUrls(events), { timeout: 15_000 }).toEqual([`${baseURL}/`]);
    const [pageview] = named(events, '$pageview');
    expect(pageview?.properties.token).toBe('phc_testtoken');
    // The SDK arrived as its own script after the page, not inside the main bundle.
    expect(sdkScripts).toHaveLength(1);
  });

  test('stores nothing on the visitor device', async ({ page, context }) => {
    const { events } = await interceptPostHog(page);

    await page.goto('/');
    await expect.poll(() => events.length, { timeout: 15_000 }).toBeGreaterThan(0);

    expect(await context.cookies()).toEqual([]);
    const stored = await page.evaluate(() => ({
      local: Object.keys(localStorage).filter((key) => key.startsWith('ph_')),
      session: Object.keys(sessionStorage).filter((key) => key.startsWith('ph_')),
    }));
    expect(stored).toEqual({ local: [], session: [] });
  });

  test('sends only the named events and pageviews', async ({ page }) => {
    const { events } = await interceptPostHog(page);
    await page.goto('/');
    await page
      .getByRole('link', { name: /^Read the write-up/ })
      .first()
      .click();
    await expect.poll(() => named(events, '$pageview').length, { timeout: 15_000 }).toBe(2);

    expect(ours(events).map((e) => e.event)).toEqual(['$pageview', 'project_opened', '$pageview']);
  });

  test('records a pageview and a project open for a client-side navigation', async ({
    page,
    baseURL,
  }) => {
    const { events } = await interceptPostHog(page);
    await page.goto('/');
    await expect.poll(() => pageviewUrls(events), { timeout: 15_000 }).toEqual([`${baseURL}/`]);

    const link = page.getByRole('link', { name: /^Read the write-up/ }).first();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/projects\//);
    await link.click();
    await page.waitForURL(`**${href}`);

    await expect
      .poll(() => pageviewUrls(events), { timeout: 15_000 })
      .toEqual([`${baseURL}/`, `${baseURL}${href}`]);
    const slug = (href ?? '').split('/').pop();
    await expect
      .poll(() => named(events, 'project_opened').map((e) => e.properties.project))
      .toEqual([slug]);
    // One load: the navigation stayed inside the app, so the SDK kept its identity.
    const ids = new Set(events.map((e) => e.properties.distinct_id));
    expect(ids.size).toBe(1);
  });

  test('records the experience page when its write-up link is clicked', async ({
    page,
    baseURL,
  }) => {
    const { events } = await interceptPostHog(page);
    await page.goto('/');
    await expect.poll(() => pageviewUrls(events), { timeout: 15_000 }).toEqual([`${baseURL}/`]);

    await page.locator('a[href="/experience/ncr-voyix-docs"]').first().click();
    await page.waitForURL('**/experience/ncr-voyix-docs');

    await expect
      .poll(() => pageviewUrls(events), { timeout: 15_000 })
      .toEqual([`${baseURL}/`, `${baseURL}/experience/ncr-voyix-docs`]);
    await expect
      .poll(() => named(events, 'project_opened').map((e) => e.properties.project))
      .toEqual(['ncr-voyix-docs']);
  });

  test('counts an old /projects link to an experience page once, at the page it lands on', async ({
    page,
    baseURL,
  }) => {
    const { events } = await interceptPostHog(page);

    await page.goto('/projects/ncr-voyix-docs');

    await expect
      .poll(() => pageviewUrls(events), { timeout: 15_000 })
      .toEqual([`${baseURL}/experience/ncr-voyix-docs`]);
  });

  test('records which resume link was clicked', async ({ page }) => {
    const { events } = await interceptPostHog(page);
    await page.goto('/');
    const link = page.getByRole('link', { name: /^View resume/ }).first();
    // The link leaves the page for the PDF or the explanation page. Stay put.
    await link.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));

    await link.click();

    await expect
      .poll(() => named(events, 'resume_clicked').map((e) => e.properties.location), {
        timeout: 15_000,
      })
      .toEqual(['about']);
  });

  test('sends nothing when Do Not Track is on', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'doNotTrack', { value: '1' });
    });
    const { events, hosts } = await interceptPostHog(page);
    const sdkScripts = watchForSdk(page);

    await page.goto('/');
    // Longer than the 4 second idle timeout, so the SDK would have loaded by now.
    await page.waitForTimeout(6000);

    expect(events).toEqual([]);
    expect(hosts).toEqual([]);
    expect(sdkScripts).toEqual([]);
  });

  test('sends nothing when Global Privacy Control is on', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
    });
    const { events, hosts } = await interceptPostHog(page);
    const sdkScripts = watchForSdk(page);

    await page.goto('/');
    await page.waitForTimeout(6000);

    expect(events).toEqual([]);
    expect(hosts).toEqual([]);
    expect(sdkScripts).toEqual([]);
  });

  test('hints the ingest connection in the head', async ({ page }) => {
    await interceptPostHog(page);
    await page.goto('/');
    await expect(
      page.locator('head link[rel="preconnect"][href="https://us.i.posthog.com"]'),
    ).toHaveCount(1);
  });

  test('server HTML carries no PostHog script', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).not.toMatch(/<script[^>]+posthog/i);
  });
});
