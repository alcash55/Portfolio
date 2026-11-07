import { defineConfig, configDefaults } from 'vitest/config';
import viteReact from '@vitejs/plugin-react';

// Used only by scripts/generate-site-stats.mjs to count tests. Listing has to import every
// test file, and doing that under jsdom takes about five times longer than under node
// (106 s against 21 s here). No test body runs, so the DOM setup file is not needed.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: { environment: 'node', exclude: [...configDefaults.exclude, 'e2e/**'] },
});
