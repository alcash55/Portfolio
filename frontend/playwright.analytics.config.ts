import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_ANALYTICS_PORT ?? 4174);

// A second build, with a dummy PostHog token, for the analytics specs only. The
// default suite builds with no token so its bundle never loads the SDK. The token
// below is a made-up value. These specs answer every ingest request with page.route,
// so nothing reaches a real PostHog project.
export default defineConfig({
  testDir: './e2e/analytics',
  outputDir: './e2e/test-results-analytics',
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: './e2e/playwright-report-analytics' }]]
    : 'list',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // See playwright.config.ts for why the API host is api.invalid.
    command: `VITE_API_URL=http://api.invalid bun run build && bunx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    // Its own port, so a server left over from the default suite is never reused here.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_POSTHOG_PROJECT_TOKEN: 'phc_testtoken',
      VITE_POSTHOG_HOST: 'https://us.i.posthog.com',
    },
  },
});
