import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/** Reads the preference at call time, so a change in system settings applies on the next check. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * True once the element has been at least `threshold` visible. It stays false for
 * ever under reduced motion or where IntersectionObserver is missing, because the
 * only thing it unlocks is an entrance animation. The server and the first client
 * render both return false, so the HTML always carries the finished figure.
 */
export function useSeenInView<T extends Element>(threshold: number): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, seen];
}

/** Custom properties are not in CSSProperties. This is the one place that says so. */
export function cssVars(vars: Readonly<Record<`--${string}`, string | number>>): CSSProperties {
  return vars as CSSProperties;
}

/**
 * True while the element is at least `threshold` visible. Like `useSeenInView`
 * it stays false on the server, on first render, under reduced motion and
 * without IntersectionObserver. Unlike it, it goes false again on leaving, so
 * the animation it drives replays on the next visit.
 */
export function useInView<T extends Element>(threshold: number): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const last = entries.at(-1);
        if (last) setInView(last.isIntersecting);
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}
