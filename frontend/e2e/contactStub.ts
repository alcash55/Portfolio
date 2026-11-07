import { expect, type Page, type Route } from '@playwright/test';

const CONTACT_URL = '**/api/v1/contact';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export type Posted = { name: string; email: string; message: string; website: string };

/**
 * Answers the contact POST here, so no test reaches the real API. The fixture
 * already fails the test if any request leaves the app for another origin.
 */
export async function stubContact(
  page: Page,
  respond: (route: Route, body: Posted) => Promise<void>,
) {
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

export const ok = (route: Route) =>
  route.fulfill({ status: 200, headers: CORS, json: { status: 'ok' } });
export const fail = (status: number) => (route: Route) =>
  route.fulfill({ status, headers: CORS, json: { error: 'x' } });

export const send = (page: Page) =>
  page.getByRole('button', { name: /^(Send message|Try again)$/ });

/**
 * The server HTML ships Send disabled and the fields read-only. Send turns on once
 * React owns the form, so waiting for it is the observable hydration signal.
 */
export async function formReady(page: Page) {
  await expect(send(page)).toBeEnabled();
}

export async function fillForm(page: Page) {
  await formReady(page);
  await page.getByRole('textbox', { name: /^Name/ }).fill('Ada Lovelace');
  await page.getByRole('textbox', { name: /^Email/ }).fill('ada@example.com');
  await page.getByRole('textbox', { name: /^Message/ }).fill('Hello there.');
}
