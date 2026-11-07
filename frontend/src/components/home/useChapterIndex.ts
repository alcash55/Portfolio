import { useEffect, useRef, type KeyboardEvent } from 'react';

/**
 * Behavior for the chapter index popover: focus on the current row when it opens,
 * arrow-key movement between rows, and focus on the chosen chapter's heading.
 * The browser already handles Esc, light dismiss and focus return.
 */
export function useChapterIndex() {
  const popoverRef = useRef<HTMLDivElement>(null);
  const focusTimer = useRef<number | undefined>(undefined);

  // Opening puts focus on the current row, so arrow keys start where you are.
  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState !== 'open') return;
      const target =
        popover.querySelector<HTMLElement>('[aria-current]') ?? popover.querySelector('a');
      target?.focus({ preventScroll: true });
    };
    popover.addEventListener('toggle', onToggle);
    return () => popover.removeEventListener('toggle', onToggle);
  }, []);

  useEffect(() => () => window.clearTimeout(focusTimer.current), []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a'));
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    const last = links.length - 1;
    const next =
      event.key === 'ArrowDown'
        ? Math.min(last, at + 1)
        : event.key === 'ArrowUp'
          ? Math.max(0, at - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    links[next]?.focus({ preventScroll: true });
  }

  // The hash jump moves the page. Focus follows to the heading once the popover has
  // handed focus back, which Firefox does after a short delay.
  function onPick(id: string) {
    popoverRef.current?.hidePopover();
    const target = document.getElementById(id);
    const heading = target?.matches('h1, h2')
      ? target
      : target?.querySelector<HTMLElement>('h1, h2');
    window.clearTimeout(focusTimer.current);
    if (heading)
      focusTimer.current = window.setTimeout(() => heading.focus({ preventScroll: true }), 120);
  }

  return { popoverRef, onKeyDown, onPick };
}
