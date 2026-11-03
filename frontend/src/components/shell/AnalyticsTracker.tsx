import { useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { analytics } from '~/lib/analytics';

/**
 * Starts analytics after hydration and records one pageview per route change.
 *
 * The router drives this, not the SDK's history capture: a route change here
 * is the page that finished loading, so a redirect (such as an old
 * /projects/ncr-voyix-docs link) counts once, at the page the visitor lands on.
 * A hash-only change is a scroll on the same page and is not counted.
 */
export function AnalyticsTracker() {
  const router = useRouter();
  const path = useRouterState({ select: (state) => state.resolvedLocation?.pathname });

  useEffect(() => {
    analytics.start();
  }, []);

  useEffect(() => {
    if (path === undefined) return;
    // Pathname only: a campaign link can carry an address in its query, and no page reads one.
    const { pathname } = router.state.location;
    analytics.pageview(`${window.location.origin}${pathname}`);
  }, [path, router]);

  return null;
}
