import React from 'react';
import ReactDOM from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';
import App from './App.tsx';
import './assets/styles/global.css';
import { analyticsEnabled } from './hooks/useAnalytics';

/**
 * Read once here as well as in `useAnalytics`, because `analyticsEnabled` is a
 * boolean and TypeScript cannot narrow `apiKey` from it -- the provider's prop
 * is `string`, not `string | undefined`. Branching on the token itself both
 * narrows the type and states the actual condition.
 */
const posthogToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;

/**
 * PostHog options.
 *
 * `defaults` pins the behaviour set PostHog shipped on that date -- without it
 * the SDK's defaults can shift under a minor version bump, which is a strange
 * thing to let happen to your own measurements. It is also what turns on
 * automatic pageview capture, so nothing here has to fire one by hand.
 *
 * `api_host` comes from the env rather than being hardcoded because the US and
 * EU clouds are different hostnames, and a self-hosted instance is a third.
 */
const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2026-05-30',
} as const;

/**
 * The provider is mounted **only when a project token exists**.
 *
 * Wrapping unconditionally would initialise PostHog with `undefined` as the
 * key in every environment that has no `.env` -- a fresh clone, CI -- which
 * means a doomed network request on load and console noise to go with it. The
 * e2e suite asserts zero console errors on load, so that noise is not
 * theoretical.
 *
 * `useAnalytics` guards the same condition on the capture side, so a component
 * calling `capture()` in a tree without this provider is a no-op rather than a
 * crash. Both halves check, because either one alone leaves a gap.
 */
const root = (
  <React.StrictMode>
    {analyticsEnabled && posthogToken ? (
      <PostHogProvider apiKey={posthogToken} options={posthogOptions}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(root);
