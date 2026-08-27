import { useCallback } from 'react';
import type { PostHog } from 'posthog-js';

/**
 * The site's whole event vocabulary, in one place.
 *
 * Kept as a frozen map rather than inline string literals at each call site
 * for the reason every analytics implementation eventually learns the hard
 * way: a typo in an event name does not fail, it silently creates a second
 * event that looks almost like the first, and you only notice weeks later when
 * the numbers do not add up. Referring to `ANALYTICS_EVENTS.RESUME_CLICKED`
 * makes a typo a compile error instead.
 *
 * Deliberately small. These four are the ones worth having: a pageview says
 * anyone arrived at all, and the other three are the only actions on this site
 * that mean something happened -- someone took the resume, opened a project,
 * or wrote a message. Everything else is scrolling.
 */
export const ANALYTICS_EVENTS = {
  /** The resume PDF was opened. `location` says which of the two links. */
  RESUME_CLICKED: 'resume_clicked',
  /** A project card was opened. `project` is the `StaticProject.name`. */
  PROJECT_OPENED: 'project_opened',
  /** The contact form was submitted *and the API accepted it*. */
  CONTACT_SUBMITTED: 'contact_submitted',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<string, string | number | boolean>;

/**
 * Read at module scope because Vite inlines `import.meta.env` at build time --
 * it cannot change while the app is running, so re-reading it per render would
 * be pretending it might.
 */
const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;

/**
 * Whether analytics is configured at all.
 *
 * Absent token means absent analytics, everywhere: a fresh clone with no
 * `.env`, a CI run, and the unit suite all take this path and never load the
 * SDK at all. The e2e suite builds with an empty token on purpose (see
 * `playwright.config.ts`), so its bundle never pays for PostHog either.
 */
export const analyticsEnabled = Boolean(token);

/**
 * The in-flight (then settled) SDK load, or `null` before anything asked for
 * it. Module-level so the import and `init()` happen exactly once no matter
 * how many components call `useAnalytics`.
 */
let client: Promise<PostHog> | null = null;

/**
 * Loads and initialises PostHog, at most once. Returns `null` when analytics
 * is switched off, so callers can skip without a branch on the token.
 *
 * **Why a dynamic `import()` rather than a top-level one:** `posthog-js` is
 * ~273 kB raw / ~90 kB gzipped, measured by building the bundle both ways --
 * about 28% of the entire JS payload. A static import in `main.tsx` puts all
 * of that on the critical path, parsed and executed before React renders the
 * first pixel, which is a strange price to pay for something whose only job is
 * to describe what happened *after* the page appeared. Importing it here
 * splits it into its own chunk that loads when the app is otherwise idle.
 *
 * **Why not `@posthog/react`'s `<PostHogProvider>`:** it imports `posthog-js`
 * statically, so any component tree containing it drags the SDK back into the
 * main chunk and undoes the split. Swapping the provider in after an async
 * load is not a way out either -- changing the component type at that position
 * unmounts and remounts the entire app underneath it.
 */
export function loadAnalytics(): Promise<PostHog> | null {
  if (!token) return null;

  client ??= import('posthog-js').then(({ posthog }) => {
    posthog.init(token, {
      // The US and EU clouds are different hostnames and a self-hosted
      // instance is a third, so this comes from the env rather than a default.
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      // Pins the behaviour set PostHog shipped on that date. Without it the
      // SDK's defaults can shift under a minor version bump, which is a
      // strange thing to let happen to your own measurements. It is also what
      // turns on automatic pageview capture, so nothing here fires one by hand
      // -- including the first one, which `init()` sends on load.
      defaults: '2026-05-30',
    });
    return posthog;
  });

  return client;
}

/**
 * `capture(event, properties)`, safe to call from anywhere.
 *
 * Returns a stable function so it can sit in a `useCallback`/`useEffect`
 * dependency list without re-running it every render.
 *
 * Awaiting `loadAnalytics()` rather than reading an already-loaded client
 * means an event fired before the SDK finishes loading still lands: the
 * capture queues behind the same promise instead of being dropped. In
 * practice the idle prefetch in `main.tsx` has usually won that race long
 * before anyone can click anything, but "usually" is not a thing to rely on
 * when the failure mode is a silently missing event.
 */
export const useAnalytics = () =>
  useCallback((event: AnalyticsEvent, properties?: AnalyticsProperties) => {
    void loadAnalytics()?.then((posthog) => posthog.capture(event, properties));
  }, []);
