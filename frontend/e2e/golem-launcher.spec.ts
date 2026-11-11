import { expect, test } from './fixtures';

const TAG = 'webgl-v1.0.6-8ae0558d8559-42903441642.1';
const PAGE = '/play/golem-miners/';

// Stands in for Unity's loader. It records the config the launcher built, so the test can
// check which URLs the launcher would have asked for.
const FAKE_LOADER = `
  window.createUnityInstance = function (canvas, config, onProgress) {
    window.__unityConfig = config;
    onProgress(1);
    return Promise.resolve({ SetFullscreen: function () {} });
  };
`;

test.describe('Golem Miners launcher', () => {
  test('loads the build that latest.json names, from tag-pinned URLs', async ({ page }) => {
    const asked: string[] = [];
    await page.route('**/play/golem-miners/latest.json', (route) =>
      route.fulfill({ json: { tag: TAG, version: '1.0.6', builtAt: '2026-11-10T21:49:05Z' } }),
    );
    await page.route(`**/play/golem-miners/Build/${TAG}/WebGL.loader.js`, (route) => {
      asked.push(route.request().url());
      return route.fulfill({ contentType: 'application/javascript', body: FAKE_LOADER });
    });

    await page.goto(PAGE);
    await expect(page.locator('#play')).toBeEnabled();
    await expect(page.locator('#stat')).toHaveText('Ready.');

    expect(asked).toHaveLength(1);
    const config = await page.evaluate(
      () =>
        (window as unknown as { __unityConfig: Record<string, string> }).__unityConfig,
    );
    expect(config).toMatchObject({
      dataUrl: `Build/${TAG}/WebGL.data.unityweb`,
      frameworkUrl: `Build/${TAG}/WebGL.framework.js.unityweb`,
      codeUrl: `Build/${TAG}/WebGL.wasm.unityweb`,
      productVersion: '1.0.6',
    });
  });

  test('refuses a tag that is not a webgl release', async ({ page }) => {
    const asked: string[] = [];
    await page.route('**/play/golem-miners/latest.json', (route) =>
      route.fulfill({ json: { tag: '../../etc/passwd', version: '1', builtAt: 'x' } }),
    );
    await page.route('**/play/golem-miners/Build/**', (route) => {
      asked.push(route.request().url());
      return route.fulfill({ status: 200, body: '' });
    });

    await page.goto(PAGE);
    await expect(page.locator('#stat')).toContainText('not available right now');
    await expect(page.locator('#play')).toBeDisabled();
    expect(asked).toEqual([]);
  });

  test('shows an error and keeps Play disabled when latest.json fails', async ({ page }) => {
    await page.route('**/play/golem-miners/latest.json', (route) =>
      route.fulfill({ status: 502, body: 'Build unavailable' }),
    );

    await page.goto(PAGE);
    await expect(page.locator('#stat')).toContainText('not available right now');
    await expect(page.locator('#play')).toBeDisabled();
  });

  test('shows an error when the loader script does not load', async ({ page }) => {
    await page.route('**/play/golem-miners/latest.json', (route) =>
      route.fulfill({ json: { tag: TAG, version: '1.0.6', builtAt: '2026-11-10T21:49:05Z' } }),
    );
    await page.route(`**/play/golem-miners/Build/${TAG}/WebGL.loader.js`, (route) =>
      route.fulfill({ status: 404, body: 'Not found' }),
    );

    await page.goto(PAGE);
    await expect(page.locator('#stat')).toContainText('did not load');
    await expect(page.locator('#play')).toBeDisabled();
  });
});

// These hit the real Worker routes. The API host in the e2e build never resolves, so every
// answer here shows how the Worker fails, and none of it depends on a backend on this machine.
test.describe('Golem Miners Worker routes', () => {
  test('latest.json answers 502 and is not cached while the API is unreachable', async ({
    request,
  }) => {
    const response = await request.get('/play/golem-miners/latest.json');
    expect(response.status()).toBe(502);
    expect(response.headers()['cache-control']).toBe('no-store');
  });

  test('build files answer 502 while the API is unreachable', async ({ request }) => {
    const response = await request.get(`/play/golem-miners/Build/${TAG}/WebGL.loader.js`);
    expect(response.status()).toBe(502);
    expect(response.headers()['cache-control']).toBe('no-store');
  });

  for (const path of [
    'Build/WebGL.loader.js',
    `Build/${TAG}/index.html`,
    `Build/${TAG}/../WebGL.loader.js`,
    'Build/main/WebGL.loader.js',
  ]) {
    test(`${path} is not proxied`, async ({ request }) => {
      const response = await request.get(`/play/golem-miners/${path}`);
      expect(response.status()).toBe(404);
    });
  }
});
