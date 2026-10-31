import { expect, test } from './fixtures';
import { watchForSdk } from './sdkSpy';

// The default build has no PostHog token. The fixtures already fail any request that
// leaves 127.0.0.1, so these assert the finer points of the disabled path.
test.describe('analytics without a token', () => {
  test('opens no connection to an ingest host and loads no SDK', async ({ page }) => {
    const sdkScripts = watchForSdk(page);
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await page.goto('/');
    // Longer than the 4 second idle timeout, so the SDK would have loaded by now.
    await page.waitForTimeout(6000);

    expect(urls.filter((url) => /posthog/i.test(url))).toEqual([]);
    expect(sdkScripts).toEqual([]);
    await expect(page.locator('head link[rel="preconnect"]')).toHaveCount(0);
  });
});
