/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    envDir: './src',
    build: {
      outDir: './dist',
    },
    assetsInclude: ['**/*.pdf'],
    base: '/Portfolio/',
    plugins: [react()],
    server: {
      port: 3005,
      host: 'localhost',
      open: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.ts'],
      // Vitest's default include is `**/*.{test,spec}.?(c|m)[jt]s?(x)`, which
      // also matches the Playwright specs under e2e/. Collecting those throws
      // "Playwright Test did not expect test.describe() to be called here",
      // since the two runners' `test` exports are different APIs. The e2e
      // suite has its own runner and config -- `bun run test:e2e`.
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  };
});
