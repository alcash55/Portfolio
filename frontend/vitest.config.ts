import { defineConfig, configDefaults } from 'vitest/config';
import viteReact from '@vitejs/plugin-react';

// Kept apart from vite.config.ts on purpose: the Cloudflare and Start plugins
// build a Worker, and component tests only need React and jsdom.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ holds Playwright specs, which Vitest cannot collect.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
