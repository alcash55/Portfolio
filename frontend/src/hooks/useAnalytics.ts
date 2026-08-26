import { useCallback } from 'react';
import { usePostHog } from '@posthog/react';

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

/**
 * Whether analytics is configured at all.
 *
 * Absent token means absent analytics, everywhere: a fresh clone with no
 * `.env`, a CI run, and the unit suite all take this path and never touch
 * PostHog. That is deliberate rather than incidental -- `usePostHog()` outside
 * a provider returns a *default, uninitialised* PostHog instance rather than
 * `undefined`, so calling `.capture()` on it would not crash but would log a
 * "you must init PostHog first" warning on every event. Checking the token
 * up front means the call never happens.
 *
 * Read at module scope because Vite inlines `import.meta.env` at build time --
 * it cannot change while the app is running, so re-reading it per render would
 * be pretending it might.
 */
export const analyticsEnabled = Boolean(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN);

/**
 * `capture(event, properties)`, safe to call from anywhere.
 *
 * Returns a stable function so it can sit in a `useCallback`/`useEffect`
 * dependency list without re-running it every render.
 */
export const useAnalytics = () => {
  const posthog = usePostHog();

  return useCallback(
    (event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) => {
      if (!analyticsEnabled) return;
      posthog.capture(event, properties);
    },
    [posthog],
  );
};
