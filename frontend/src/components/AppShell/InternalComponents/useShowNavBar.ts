import { useState, useEffect } from 'react';

/**
 * The hero's scroll-indicator arrow tags itself with this so the nav bar can
 * key off the actual element rather than a guessed scroll offset. Landing owns
 * the attribute; see Landing.tsx's scroll indicator.
 */
export const SCROLL_INDICATOR_ATTR = 'data-scroll-indicator';

/**
 * Whether the global `NavBar` should be showing.
 *
 * The rule is "as soon as the hero's down arrow has gone past the top of the
 * screen" -- the arrow is the affordance saying there is more page, so the
 * moment it leaves is the moment a nav is needed. That used to be approximated
 * as `scrollY > innerHeight - 14`, which measures the *window*, not the arrow,
 * so its error moved with the window height: measured against where the arrow
 * actually goes, it fired 30px early on a 900px-tall window and 169px early on
 * a 650px one. Reading the arrow's own position removes the guess and holds at
 * every height.
 *
 * Deliberately a scroll listener rather than an `IntersectionObserver`. IO
 * looks like the natural fit and was tried first, but it answers "is this
 * visible", and the hero clips its own overflow -- so IO's notion of the arrow
 * being gone arrives at a rect position that shifts with viewport height
 * (measured: the arrow's rect was still 27px inside the viewport at 800px tall,
 * and still *below* the viewport top at 700px, which left the bar stuck hidden
 * forever). `bottom <= 0` is the unambiguous version of the same question.
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
    const indicator = document.querySelector(`[${SCROLL_INDICATOR_ATTR}]`);

    // One rAF-coalesced read per frame at most: `getBoundingClientRect` forces
    // layout, and scroll events can outpace frames.
    let frame = 0;
    const handleScroll = indicator
      ? () => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            setIsVisible(indicator.getBoundingClientRect().bottom <= 0);
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
