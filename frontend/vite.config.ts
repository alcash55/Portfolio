import { defineConfig, loadEnv } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { assertNoCredentialShapedViteEnv } from './scripts/assert-no-vite-secrets.mjs';
import { isWorkersPreviewBuild } from './scripts/preview-analytics.mjs';

export default defineConfig(({ mode, command }) => {
  // Vite inlines every VITE_ value into the public bundle. Fail the build if one
  // looks like a credential (see scripts/assert-no-vite-secrets.mjs). Build only,
  // so dev iteration on an env var is never blocked.
  if (command === 'build') {
    assertNoCredentialShapedViteEnv(loadEnv(mode, process.cwd(), ''));
  }

  const isPreview = command === 'build' && isWorkersPreviewBuild(process.env);
  if (isPreview) {
    console.info(
      `Workers Builds Preview of ${process.env.WORKERS_CI_BRANCH ?? 'an unknown branch'}: PostHog token removed, analytics off.`,
    );
  }

  return {
    // A blank token is how readAnalyticsConfig turns analytics off, in the
    // browser and in the worker.
    define: isPreview ? { 'import.meta.env.VITE_POSTHOG_PROJECT_TOKEN': '""' } : {},
    server: { port: 3005, host: 'localhost' },
    resolve: { tsconfigPaths: true },
    plugins: [
      // The Cloudflare plugin must run the SSR environment, and the React plugin
      // must come after Start's plugin.
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tanstackStart(),
      viteReact(),
      tailwindcss(),
    ],
  };
});
