import { useEffect } from 'react';

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';
// Smooth scrolling has no end event. Focus the field once the scroll has mostly settled.
const SMOOTH_FOCUS_DELAY_MS = 500;
const NAME_FIELD = 'form[aria-label="Message Alex"] input[name="name"]';

// Set when a Message Alex click will navigate to another page, and read once the
// new page has rendered. Module state is safe here: only click handlers write it,
// and those never run during server rendering.
let focusFormOnArrival = false;

/** The page's own form section: the home and detail pages use #contact, /contact uses #message. */
function formSection(): HTMLElement | null {
  return document.getElementById('contact') ?? document.getElementById('message');
}

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

/**
 * Every link marked `data-msg` takes the visitor to the form and puts focus in
 * Name. On a page that has the form, the link scrolls to it. Elsewhere the link
 * navigates, and the shell calls `focusNameOnArrival` once the new page is up.
 */
export function useMessageLinks() {
  useEffect(() => {
    const timers = new Set<number>();

    const onClick = (event: MouseEvent) => {
      // Any click that is not a Message Alex navigation drops a stale intent.
      focusFormOnArrival = false;
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest('a[data-msg]')) return;

      const section = formSection();
      if (!section) {
        focusFormOnArrival = true;
        return;
      }
      event.preventDefault();
      const reduce = !window.matchMedia(NO_PREFERENCE).matches;
      section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      const id = window.setTimeout(
        () => {
          timers.delete(id);
          document.querySelector<HTMLElement>(NAME_FIELD)?.focus({ preventScroll: true });
        },
        reduce ? 0 : SMOOTH_FOCUS_DELAY_MS,
      );
      timers.add(id);
    };

    // Capture, so this runs before the router's own link handler.
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);
}

/**
 * Called after a route change. Returns true when a Message Alex link caused it
 * and the Name field now has focus, so the shell leaves the heading alone.
 */
export function focusNameOnArrival(): boolean {
  if (!focusFormOnArrival) return false;
  focusFormOnArrival = false;
  const name = document.querySelector<HTMLElement>(NAME_FIELD);
  name?.focus({ preventScroll: true });
  return name !== null;
}
