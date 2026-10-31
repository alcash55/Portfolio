import type { Page } from '@playwright/test';

/**
 * Lists the scripts the page downloads that contain the PostHog SDK. The SDK is a
 * hashed chunk with no recognizable name, so this looks for a marker string that
 * only the SDK holds.
 */
export function watchForSdk(page: Page): string[] {
  const hits: string[] = [];
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    try {
      if ((await response.text()).includes('__PosthogExtensions__')) hits.push(response.url());
    } catch {
      // A script that was cancelled mid-flight has no body to read.
    }
  });
  return hits;
}
