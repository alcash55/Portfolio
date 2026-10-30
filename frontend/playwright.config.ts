import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// The suite runs against the production build served through the Workers runtime,
// the same bundle that deploys. A dev server would pass things the build breaks.
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run build && bunx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
