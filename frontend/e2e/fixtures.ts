import { test as base, expect, type Page } from '@playwright/test';

/**
 * Nothing in this suite may reach a real API. Any request to the Go API or
 * another origin is answered here, so a running local backend cannot make a
 * test pass that would fail in CI.
 */
async function stubNetwork(page: Page, requests: string[]) {
  await page.route(
    (url) => url.hostname !== '127.0.0.1',
    (route) => {
      requests.push(route.request().url());
      return route.fulfill({ status: 503, body: 'blocked by test' });
    },
  );
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, json: {} }));
}

export const test = base.extend<{ strayRequests: string[] }>({
  strayRequests: [
    async ({ page }, use) => {
      const requests: string[] = [];
      await stubNetwork(page, requests);
      await use(requests);
      expect(requests, 'requests that left the app').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1366, height: 800 },
} as const;
