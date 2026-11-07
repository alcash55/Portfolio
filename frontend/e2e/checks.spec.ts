import type { Page } from '@playwright/test';
import { expect, test, VIEWPORTS } from './fixtures';

const CORS = { 'access-control-allow-origin': '*' };

const ELEVEN = [
  'accessibility/axe-check',
  'ats-check',
  'diff',
  'format-message',
  'markdown-checks/spellcheck',
  'notifications',
  'notifications/discord-messages',
  'notifications/pr-comment',
  'security/betterleaks',
  'security/betterleaks/comment',
  'zz-new-action',
].map((name) => ({ name, description: `${name} does a thing.` }));

/** Answers GET /api/v1/ci-actions here. The fixture already stubs every other API call. */
async function stubCiActions(page: Page, status: number, json: unknown) {
  let asked = 0;
  await page.route('**/api/v1/ci-actions', async (route) => {
    asked += 1;
    await route.fulfill({ status, headers: CORS, json });
  });
  return () => asked;
}

const panel = (page: Page) => page.locator('#ac-composite-actions');

test.describe('checks figure and the CI actions API', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('takes the list from the API when it arrives with the figure below the screen', async ({
    page,
  }) => {
    const asked = await stubCiActions(page, 200, {
      actions: ELEVEN,
      treeSha: 'abc',
      stale: false,
    });
    await page.goto('/');
    await expect(
      panel(page).getByRole('list', { name: 'The eleven actions in the repo, each passing' }),
    ).toBeVisible();
    await expect(panel(page).getByText('11 of 11 passed')).toBeAttached();
    await expect(panel(page).getByText('zz-new-action does a thing')).toBeAttached();
    expect(asked()).toBe(1);
  });

  test('keeps the fallback list when the API answers 502', async ({ page }) => {
    const asked = await stubCiActions(page, 502, { error: 'could not load ci actions' });
    await page.goto('/');
    await expect.poll(asked).toBe(1);
    await expect(panel(page).getByText('10 of 10 passed')).toBeAttached();
    await expect(
      panel(page).getByRole('list', { name: 'The ten actions in the repo, each passing' }),
    ).toBeAttached();
  });

  test('keeps the fallback list when the figure is on screen as the answer arrives', async ({
    page,
  }) => {
    const asked = await stubCiActions(page, 200, { actions: ELEVEN, treeSha: 'a', stale: false });
    await page.goto('/#ac-composite-actions');
    await expect.poll(asked).toBe(1);
    // Give the answer time to land, then check nothing moved under the reader.
    await page.waitForTimeout(300);
    await expect(panel(page).getByText('10 of 10 passed')).toBeVisible();
  });
});
