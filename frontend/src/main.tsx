import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './assets/styles/global.css';
import { analyticsEnabled, loadAnalytics } from './hooks/useAnalytics';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/**
 * Start PostHog once the browser has nothing better to do.
 *
 * The SDK is ~90 kB gzipped and deliberately not in the main chunk (see
 * `loadAnalytics`), so something has to ask for it or the automatic pageview
 * would never fire -- the three explicit events are all user-initiated, and a
 * visitor who reads the page and leaves would go uncounted entirely.
 *
 * After `render` and inside an idle callback, so fetching, parsing and
 * `init()` all land after first paint rather than competing with it. The
 * `setTimeout` fallback is for Safari, which only shipped
 * `requestIdleCallback` in 16.4; 1s is past a typical first paint without
 * being so late that a short visit goes missing.
 *
 * The rejection is swallowed on purpose. Analytics failing to load is not a
 * condition the site should react to, and an unhandled rejection here would
 * trip the e2e suite's `zero console errors on load` check over something no
 * visitor is affected by.
 */
if (analyticsEnabled) {
  const start = () => void loadAnalytics()?.catch(() => {});

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 1000);
  }
}
