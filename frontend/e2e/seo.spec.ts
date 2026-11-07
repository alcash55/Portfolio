import { expect, test } from './fixtures';

const PROJECTS = [
  'clipper',
  'golem-miners',
  'ac-composite-actions',
  'portfolio-website',
  'game-competition-website',
  'vscode-royalty-theme',
];
const EXPERIENCE = ['ncr-voyix-docs', 'starbucks-store-health'];

test.describe('/sitemap.xml', () => {
  test('answers 200 as XML and lists every page with an absolute URL', async ({
    request,
    baseURL,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');
    const body = await response.text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toHaveLength(PROJECTS.length + EXPERIENCE.length + 1);
    expect(locs).toContain(`${baseURL}/`);
    for (const slug of PROJECTS) expect(locs).toContain(`${baseURL}/projects/${slug}`);
    for (const slug of EXPERIENCE) expect(locs).toContain(`${baseURL}/experience/${slug}`);
  });

  test('lists only URLs that answer 200', async ({ request, baseURL }) => {
    const body = await (await request.get('/sitemap.xml')).text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? '');
    for (const loc of locs) {
      const response = await request.get(loc, { maxRedirects: 0 });
      expect(response.status(), `${loc} (base ${baseURL})`).toBe(200);
    }
  });
});

test.describe('/work/<slug>', () => {
  for (const slug of PROJECTS) {
    test(`/work/${slug} is a 301 to /projects/${slug}`, async ({ request }) => {
      const response = await request.get(`/work/${slug}`, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe(`/projects/${slug}`);
    });
  }

  for (const slug of EXPERIENCE) {
    test(`/work/${slug} is a 301 to /experience/${slug}`, async ({ request }) => {
      const response = await request.get(`/work/${slug}`, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe(`/experience/${slug}`);
    });
  }

  test('an unknown slug is a 404 with the unknown-project copy', async ({ page }) => {
    const response = await page.goto('/work/no-such-thing');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'There is no project at that address.',
    );
  });

  test('following a /work link in the browser lands on the project page', async ({ page }) => {
    await page.goto('/work/clipper');
    await expect(page).toHaveURL(/\/projects\/clipper$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clipper');
  });
});

test.describe('share metadata in the server HTML', () => {
  test('a project page carries its own og tags and a social image that exists', async ({
    request,
  }) => {
    const html = await (await request.get('/projects/clipper')).text();
    expect(html).toMatch(/<meta[^>]+property="og:title"[^>]+content="Clipper, work by Alex Cash"/);
    expect(html).toMatch(/<meta[^>]+name="twitter:card"/);
    // The default build sets no VITE_SITE_ORIGIN, so nothing absolute is invented.
    expect(html).not.toMatch(/property="og:url"|rel="canonical"/);

    const image = await request.get('/og-image.png');
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
  });

  test('the home page carries Person data as JSON-LD', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const match = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/);
    expect(JSON.parse(match?.[1] ?? '{}')).toMatchObject({ '@type': 'Person', name: 'Alex Cash' });
  });
});

test.describe('/projects/<experience slug>', () => {
  for (const slug of EXPERIENCE) {
    test(`/projects/${slug} stays a 301 to /experience/${slug}`, async ({ request }) => {
      const response = await request.get(`/projects/${slug}`, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe(`/experience/${slug}`);
    });
  }
});
