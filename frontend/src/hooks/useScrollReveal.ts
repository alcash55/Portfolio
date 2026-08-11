import { useEffect, useMemo, useRef, useState } from 'react';
// From the barrel, like every other MUI import in this codebase. The deep path
// (`@mui/material/useMediaQuery`) is a separate entry for Vite's dependency
// pre-bundling, and adding it mid-session made the dev server re-optimize and
// serve a module graph with two copies of React in it -- `useMediaQuery` then
// read `useContext` off a null React internals object and took the page down.
import { useMediaQuery } from '@mui/material';

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
 * How far into the viewport an element has to travel before it starts, as a
 * percentage of the window height. A wheel notch is ~100px, so on a typical
 * ~900px window this is a scroll and a half of lead-in rather than firing the
 * instant the element's top edge appears.
 */
const REVEAL_INSET_PERCENT = 25;

/**
 * Reveals an element as it scrolls into view -- a short upward drift plus a
 * fade -- and fades it back out when it leaves.
 *
 * Three properties worth keeping, the first and last of which are bugs this
 * project has already shipped once in another form:
 *
 * 1. **It never leaves content permanently invisible.** If the element can't be
 *    animated -- `prefers-reduced-motion`, or no `IntersectionObserver` (jsdom,
 *    older browsers) -- it starts revealed and no opacity is ever applied. An
 *    animation that fails closed would hide the whole page.
 * 2. **It is reversible.** Scrolling back up fades the element out again, so
 *    the effect reads the same in both directions rather than being a one-way
 *    door. The fade-out drops any stagger delay -- a reverse cascade on the way
 *    out looks like the page is unloading, not like it is animating.
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
        const entry = entries[entries.length - 1];
        // Reversible: it fades back out on the way up, so this tracks the
        // observer rather than latching on the first reveal.
        if (entry) setRevealed(entry.isIntersecting);
      },
      {
        // threshold 0 + a bottom inset, rather than a ratio. A ratio looks
        // tidier but cannot be satisfied by an element taller than
        // `viewport / ratio`, so a long section would never reveal at all. The
        // inset only asks the element's top edge to clear a line partway up
        // the viewport, which any section or footer can do at any height.
        //
        // 25% rather than a pixel count so the wait scales with the window:
        // the element has to come about a scroll and a half past the bottom
        // edge before it starts, instead of firing the moment it peeks in.
        threshold: 0,
        rootMargin: `0px 0px -${REVEAL_INSET_PERCENT}% 0px`,
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
            // No delay on the way out. A delayed fade-out leaves the element
            // sitting there after it should already be going.
            transitionDelay: '0ms',
            willChange: 'opacity, transform',
          };
    }

    // Stagger mode: the container itself stays untouched and its children carry
    // the effect, so the container's own layout role (grid, flex) is unchanged.
    // Delays apply on the way in only -- see above.
    const childDelays: Record<string, { transitionDelay: string }> = {};
    if (revealed) {
      for (let i = 0; i < staggerCap; i++) {
        childDelays[`& > *:nth-of-type(${i + 1})`] = {
          transitionDelay: `${delay + i * stagger}ms`,
        };
      }
      // Everything past the cap lands with the last staggered child.
      childDelays[`& > *:nth-of-type(n + ${staggerCap + 1})`] = {
        transitionDelay: `${delay + (staggerCap - 1) * stagger}ms`,
      };
    }

    return {
      '& > *': revealed
        ? { opacity: 1, transform: 'none', transition }
        : {
            opacity: 0,
            transform: hiddenTransform,
            transition,
            transitionDelay: '0ms',
            willChange: 'opacity, transform',
          },
      ...childDelays,
    };
  }, [canAnimate, revealed, delay, distance, stagger, staggerCap]);

  return { ref, sx, revealed };
};
