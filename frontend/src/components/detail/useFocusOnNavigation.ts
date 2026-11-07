import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { DetailSlug } from '~/content/projects';

/**
 * Moves focus to the h1 when the visitor arrives from another page, so a screen
 * reader announces the new page. The first load is left alone: the browser
 * already starts at the top, and focus there would show a ring nobody asked for.
 */
export function useFocusOnNavigation(slug: DetailSlug) {
  const ref = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => {
    const arrivedFrom = router.state.resolvedLocation?.pathname;
    if (arrivedFrom && arrivedFrom !== router.state.location.pathname) ref.current?.focus();
  }, [slug, router]);
  return ref;
}
