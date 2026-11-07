import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);

// The suite runs against the production build served through the Workers runtime,
// the same bundle that deploys. A dev server would pass things the build breaks.
export default defineConfig({
  testDir: './e2e',
  // These need a build with a PostHog token. playwright.analytics.config.ts runs them.
  testIgnore: '**/analytics/**',
  outputDir: './e2e/test-results',
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: './e2e/playwright-report' }]]
    : 'list',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // api.invalid can never resolve, so no test can reach a real or local API. The Worker's
    // own fetches fail, and fixtures.ts answers every API call the browser makes.
    command: `VITE_API_URL=http://api.invalid bun run build && bunx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
