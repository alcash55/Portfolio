import { useEffect, useMemo, useRef, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';

export interface ScrollRevealOptions {
  /** ms to wait after the element enters before it starts moving. Use to offset
   * a section against its own heading, not to sequence whole sections -- the
   * viewport already sequences those. */
  delay?: number;
  /** px the element travels upward as it fades in. Deliberately small: this is
   * meant to read as "settling into place", not as an entrance. */
  distance?: number;
  /** When set, the element's *direct children* animate instead of the element
   * itself, each one `stagger` ms behind the last. For card grids, where one
   * block fading in reads flat but a quick cascade reads deliberate. */
  stagger?: number;
  /** How many children to generate stagger delays for. Anything beyond this
   * shares the last delay rather than trailing further and further behind. */
  staggerCap?: number;
}

/** Matches the hero's existing easing character: quick to leave, gentle to land. */
const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const DURATION_MS = 600;

/**
 * Reveals an element as it scrolls into view: a short upward drift plus a fade,
 * once, and never again.
 *
 * Three things this deliberately does *not* do, each of which is a bug this
 * project has already shipped once in another form:
 *
 * 1. **It never leaves content permanently invisible.** If the element can't be
 *    animated -- `prefers-reduced-motion`, or no `IntersectionObserver` (jsdom,
 *    older browsers) -- it starts revealed and no opacity is ever applied. An
 *    animation that fails closed would hide the whole page.
 * 2. **It doesn't re-animate on scroll-back.** The observer disconnects on the
 *    first reveal. Content that re-fades every time you scroll past is the
 *    "super extra" version of this effect.
 * 3. **It only ever touches `opacity` and `transform`,** so it cannot move
 *    layout and cannot contribute to CLS -- which is what dragged this site's
 *    performance score from 96 to 75 once already (see Sprint 8). The revealed
 *    state resets `transform` to `none` rather than `translateY(0)` so the
 *    finished element stops being a containing block.
 *
 * @returns a `ref` for the element and an `sx` fragment to spread into its own.
 */
export const useScrollReveal = <T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) => {
  const { delay = 0, distance = 24, stagger, staggerCap = 8 } = options;
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const ref = useRef<T | null>(null);

  const canAnimate =
    !prefersReducedMotion && typeof window !== 'undefined' && 'IntersectionObserver' in window;

  const [revealed, setRevealed] = useState(!canAnimate);

  useEffect(() => {
    if (!canAnimate) {
      setRevealed(true);
      return;
    }
    const element = ref.current;
    if (!element) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      {
        // threshold 0 + a fixed bottom inset, rather than a ratio. A ratio
        // looks tidier but cannot be satisfied by an element taller than
        // `viewport / ratio`, so a long section would never reveal at all. The
        // inset only requires the element's top edge to clear a line 64px
        // above the viewport bottom, which any section or footer can do.
        threshold: 0,
        rootMargin: '0px 0px -64px 0px',
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [canAnimate]);

  // Deliberately left to inference rather than annotated `SxProps<Theme>`.
  // `SxProps` is itself allowed to be an array, so a value typed that way
  // cannot be used as an *element* of MUI's array-form `sx` -- which is exactly
  // how callers with their own styles need to combine it.
  const sx = useMemo(() => {
    if (!canAnimate) return {};

    const transition = `opacity ${DURATION_MS}ms ${EASING}, transform ${DURATION_MS}ms ${EASING}`;
    // Phones get a shorter travel: the same 24px reads as a lurch on a small
    // viewport where the element occupies most of the screen.
    const hiddenTransform = {
      xs: `translateY(${Math.round(distance * 0.6)}px)`,
      sm: `translateY(${distance}px)`,
    };

    if (stagger === undefined) {
      return revealed
        ? { opacity: 1, transform: 'none', transition, transitionDelay: `${delay}ms` }
        : {
            opacity: 0,
            transform: hiddenTransform,
            transition,
            transitionDelay: `${delay}ms`,
            willChange: 'opacity, transform',
          };
    }

    // Stagger mode: the container itself stays untouched and its children carry
    // the effect, so the container's own layout role (grid, flex) is unchanged.
    const childDelays: Record<string, { transitionDelay: string }> = {};
    for (let i = 0; i < staggerCap; i++) {
      childDelays[`& > *:nth-of-type(${i + 1})`] = { transitionDelay: `${delay + i * stagger}ms` };
    }
    // Everything past the cap lands with the last staggered child.
    childDelays[`& > *:nth-of-type(n + ${staggerCap + 1})`] = {
      transitionDelay: `${delay + (staggerCap - 1) * stagger}ms`,
    };

    return {
      '& > *': revealed
        ? { opacity: 1, transform: 'none', transition }
        : { opacity: 0, transform: hiddenTransform, transition, willChange: 'opacity, transform' },
      ...childDelays,
    };
  }, [canAnimate, revealed, delay, distance, stagger, staggerCap]);

  return { ref, sx, revealed };
};
