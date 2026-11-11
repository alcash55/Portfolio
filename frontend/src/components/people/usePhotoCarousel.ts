import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useHydrated } from '~/components/shell/useHydrated';

/** The strip settles after a swipe. The count updates once the scroll stops. */
const SETTLE_MS = 60;

/**
 * The carousel's behavior: which slide is current, how buttons and keys move
 * the strip, and how a swipe updates the count. The component draws the result.
 */
export function usePhotoCarousel(count: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  // Buttons need script to work, so the server HTML and the first client render
  // leave them out and hydration adds them.
  const interactive = useHydrated();
  const last = count - 1;

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  function syncFromScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setCurrent(Math.max(0, Math.min(last, index)));
  }

  function onScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(syncFromScroll, SETTLE_MS);
  }

  function goTo(target: number) {
    const track = trackRef.current;
    // Past either end wraps to the other, so Next on the last photo returns to the first.
    const index = ((target % count) + count) % count;
    if (!track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A jump of more than one photo snaps. Smooth scrolling across several
    // slides would flash each of them past. That includes the wrap from last to first.
    const behavior = reduced || Math.abs(index - current) > 1 ? 'auto' : 'smooth';
    track.scrollTo({ left: index * track.clientWidth, behavior });
    setCurrent(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowRight':
        goTo(current + 1);
        break;
      case 'ArrowLeft':
        goTo(current - 1);
        break;
      case 'Home':
        goTo(0);
        break;
      case 'End':
        goTo(last);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return { trackRef, current, interactive, goTo, onScroll, onKeyDown };
}
