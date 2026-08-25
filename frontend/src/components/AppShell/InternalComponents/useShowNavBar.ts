import { useState, useEffect } from 'react';

/**
 * The hero's scroll-indicator arrow tags itself with this so the nav bar can
 * key off the actual element rather than a guessed scroll offset. Landing owns
 * the attribute; see Landing.tsx's scroll indicator.
 */
export const SCROLL_INDICATOR_ATTR = 'data-scroll-indicator';

/** The hero's scroll-indicator button, if this page has one. */
const scrollIndicator = () => document.querySelector<HTMLElement>(`[${SCROLL_INDICATOR_ATTR}]`);

/**
 * How much of the top of the window the sticky chrome owns right now: the nav
 * bar's own height in the `default` layout, and 0 in `sideNav` and `mobile`,
 * which render no top bar at all (a side rail and a *bottom* nav respectively).
 *
 * Measured off the bar rather than written down as a number. The height is a
 * MUI `Toolbar`'s, which is 56px or 64px depending on breakpoint and would
 * change again with a density setting -- and this project has already shipped
 * one bug from a hardcoded chrome height (`scrollY > innerHeight - 14`). It is
 * the `<header>` that has to be measured, not the sticky wrapper around it:
 * the wrapper holds a `position: fixed` AppBar, so the wrapper's own box is 0
 * tall.
 */
export const stickyTopOffset = (): number => {
  const bar = document.querySelector('header');
  return bar ? bar.getBoundingClientRect().height : 0;
};

/**
 * The lowest `window.scrollY` at which `useShowNavBar` returns true, or null
 * when there is no indicator to measure.
 *
 * Exported so the hero's arrow can aim past it: "the click must land somewhere
 * the bar is showing" is only enforceable if both sides read the threshold from
 * the same place. Previously Landing scrolled wherever `scrollIntoView` chose
 * and this hook decided separately whether that counted -- and at six of the
 * eight window sizes measured, it did not.
 */
export const navBarRevealScrollY = (): number | null => {
  const indicator = scrollIndicator();
  if (!indicator) return null;
  const documentBottom = indicator.getBoundingClientRect().bottom + window.scrollY;
  // `Math.ceil` because the comparison below is `<=`: at a fractional bottom
  // edge, the first *integer* scroll position that satisfies it is the ceiling.
  return Math.ceil(documentBottom - stickyTopOffset());
};

/**
 * Whether the global `NavBar` should be showing.
 *
 * The rule is "as soon as the hero's down arrow is no longer visible to the
 * visitor" -- the arrow is the affordance saying there is more page, so the
 * moment it goes is the moment a nav is needed. That used to be approximated
 * as `scrollY > innerHeight - 14`, which measures the *window*, not the arrow,
 * so its error moved with the window height: measured against where the arrow
 * actually goes, it fired 30px early on a 900px-tall window and 169px early on
 * a 650px one. Reading the arrow's own position removes the guess and holds at
 * every height.
 *
 * "No longer visible" is `bottom <= stickyTopOffset()`, not `bottom <= 0`. The
 * bar is opaque and pinned to the top of the window, so an arrow that has
 * reached the bar's own footprint is behind it and gone as far as the visitor
 * is concerned. That is not a cosmetic difference -- `bottom <= 0` made the
 * contract unsatisfiable. About's "About Me" heading sits only 32px below the
 * hero's bottom edge while the bar is 64px tall, so no scroll position exists
 * that both puts the arrow fully above the window *and* leaves the heading
 * clear of the bar; a click had to fail one or the other, which is exactly the
 * pair of symptoms this replaced. Note the offset is the bar's measured height,
 * not anything derived from the window's -- the failure mode of the old rule
 * was an error that scaled with viewport height, and this cannot have one.
 *
 * Deliberately a scroll listener rather than an `IntersectionObserver`. IO
 * looks like the natural fit and was tried first, but it answers "is this
 * visible", and the hero clips its own overflow -- so IO's notion of the arrow
 * being gone arrives at a rect position that shifts with viewport height
 * (measured: the arrow's rect was still 27px inside the viewport at 800px tall,
 * and still *below* the viewport top at 700px, which left the bar stuck hidden
 * forever). Comparing the arrow's own bottom edge to a stated line is the
 * unambiguous version of the same question.
 *
 * Falls back to the old offset rule when there is no indicator in the DOM (the
 * error page, and any test that renders the shell without Landing), so the bar
 * still appears there.
 *
 * @returns {boolean} true if the nav bar is visible, false otherwise
 */
export const useShowNavBar = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const indicator = scrollIndicator();

    // One rAF-coalesced read per frame at most: `getBoundingClientRect` forces
    // layout, and scroll events can outpace frames.
    let frame = 0;
    const handleScroll = indicator
      ? () => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            setIsVisible(indicator.getBoundingClientRect().bottom <= stickyTopOffset());
          });
        }
      : () => {
          setIsVisible(window.scrollY > window.innerHeight - 14);
        };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Set initial visibility based on current scroll position
    handleScroll();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return isVisible;
};
