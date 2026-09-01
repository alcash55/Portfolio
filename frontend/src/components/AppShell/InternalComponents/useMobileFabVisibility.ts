import { useEffect, useState } from 'react';
import { useShowNavBar } from './useShowNavBar';

/**
 * Elements tagged with this attribute are off limits for the mobile settings
 * FAB: while one of them sits where the FAB's fixed footprint is, the FAB
 * hides until the overlap clears.
 *
 * The FAB is `position: fixed`, so on a page that scrolls freely, any in-flow
 * element tall enough eventually sweeps through every viewport position,
 * including the FAB's own corner (Portfolio#42: the Contact form's Send
 * button, measured at 320px width mid-scroll). Repositioning the FAB only
 * moves where that collision lands; it does not remove it. Hiding while a
 * marked element is under it is the one fix that holds at every scroll
 * position, not only the one that got measured.
 */
export const FAB_AVOID_ATTR = 'data-fab-avoid';

/** The FAB's own fixed geometry -- see the matching values on the `Fab` in MobileChrome. */
const FAB_SIZE = 48;
const FAB_BOTTOM_OFFSET = 65;
const FAB_RIGHT_OFFSET = 30;

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * The FAB's own rect in viewport coordinates, derived from its fixed offsets
 * rather than measured off the element. Deriving from the window's size
 * avoids a render-order dependency on the FAB already having painted, and
 * the two are the same numbers by construction -- this is the one place that
 * sets them, alongside the `Fab`'s own `sx`.
 */
const fabRect = (): Rect => {
  const right = window.innerWidth - FAB_RIGHT_OFFSET;
  const bottom = window.innerHeight - FAB_BOTTOM_OFFSET;
  return { left: right - FAB_SIZE, right, top: bottom - FAB_SIZE, bottom };
};

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const overlapsAnAvoidedElement = (): boolean => {
  const fab = fabRect();
  return Array.from(document.querySelectorAll<HTMLElement>(`[${FAB_AVOID_ATTR}]`)).some((el) =>
    overlaps(el.getBoundingClientRect(), fab),
  );
};

/**
 * Whether the mobile settings FAB should be showing right now.
 *
 * False on two separate grounds, both about the FAB covering something it
 * should not rather than merely being chrome in the way:
 *
 * - The hero is still in view (Portfolio#22) -- the same rule the desktop
 *   `NavBar` and the sideNav layout's own Fab already use, via
 *   `useShowNavBar`.
 * - The FAB's fixed footprint currently overlaps a `data-fab-avoid` element
 *   (Portfolio#42) -- today, only the Contact form's Send button carries
 *   that attribute.
 */
export const useMobileFabVisibility = (): boolean => {
  const pastHero = useShowNavBar();
  const [avoiding, setAvoiding] = useState(false);

  useEffect(() => {
    // One rAF-coalesced read per frame at most, same reasoning as
    // `useShowNavBar`: `getBoundingClientRect` forces layout, and scroll
    // events can fire faster than the page repaints.
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setAvoiding(overlapsAnAvoidedElement());
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return pastHero && !avoiding;
};
