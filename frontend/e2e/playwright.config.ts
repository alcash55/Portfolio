import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
// `vite preview` serves the production build with the same `base: '/Portfolio/'`
// prefix the deployed site uses, and it 302s '/' -> '/Portfolio/' -- baseURL
// points straight at the real path so every `page.goto('/')` lands where the
// site actually lives instead of bouncing through a redirect.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/Portfolio/`;

/**
 * The smoke suite: a handful of checks against a real Chromium, covering bug
 * classes lint/typecheck/tests/build have never caught here (see README's
 * testing section). Deliberately narrow -- see e2e/smoke.spec.ts for what's
 * in scope and why.
 */
export default defineConfig({
  testDir: e2eDir,
  fullyParallel: true,
  // Flakiness is the failure mode that matters for this suite (see the
  // sprint brief) -- retries would hide it instead of surfacing it.
  retries: 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  // Only Chromium: this is a smoke test for real-browser rendering bugs
  // (layout, paint, runtime errors), not cross-browser compatibility. Also
  // keeps `playwright install` to one browser download in CI.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Runs against the production build, not the dev server -- dev-only
    // warnings and HMR make the dev server noisy and slow for this. Rebuilds
    // on every run so the suite always exercises current code; `bun run
    // build` is ~15-20s even on this mount.
    // `SKIP_SITE_STATS=1` keeps the committed counts instead of regenerating
    // them. Regeneration shells out to `vitest list` and `playwright test
    // --list`, which is ~90s on this mount -- on top of the build that pushed
    // the whole webServer step past its timeout, so the suite could not start
    // at all. The suite has no use for freshly-counted stats: the generated
    // file is committed, and the committed values are what ships. `bun run
    // build` still regenerates them everywhere else, which is what keeps the
    // numbers from rotting.
    command:
      'SKIP_SITE_STATS=1 bun run build && bunx vite preview --port 4173 --strictPort',
    cwd: path.resolve(e2eDir, '..'),
    url: BASE_URL,
    // Generous because `bun run build` on this /mnt/c mount is slow, and a
    // suite that times out before it starts reports as a wall of unrelated
    // failures.
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
