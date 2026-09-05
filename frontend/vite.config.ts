// The `vitest/config` import below carries the `test` block's types, so the
// triple-slash reference this file used to need is redundant (and is an
// eslint error under @typescript-eslint/triple-slash-reference).
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { assertNoCredentialShapedViteEnv } from './scripts/assert-no-vite-secrets.mjs';

export default defineConfig(({ mode, command }) => {
  const envDir = './src';

  // Fails the build if a VITE_-prefixed env var looks like a credential
  // (see scripts/assert-no-vite-secrets.mjs). Scoped to `command === 'build'`
  // (not `serve`) so local dev iteration on an env var isn't blocked before
  // it's ever going to reach a bundle.
  if (command === 'build') {
    assertNoCredentialShapedViteEnv(loadEnv(mode, envDir, ''));
  }

  return {
    envDir,
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
