import { useEffect, useRef, useState } from 'react';
import {
  CHAPTER_COUNT,
  CHAPTER_GROUPS,
  CHAPTER_INDEX_TITLE,
  chapterNumber,
  chapterTitle,
} from '~/content/home';

const POPOVER_ID = 'cidx';

/**
 * Header counter ("06 / 12 . Golem Miners") and the chapter index it opens.
 * The index is a native popover, so Esc, light dismiss and focus return come
 * from the browser. The list is in the server HTML. Only the counter and the
 * current-row mark need script.
 */
export function ChapterNav() {
  const [current, setCurrent] = useState(1);
  const popoverRef = useRef<HTMLDivElement>(null);
  const focusTimer = useRef<number | undefined>(undefined);

  // The chapter that crosses a line just above the middle of the viewport is "current".
  // Chapters are read from the page on every scroll. A header that mounts before the home
  // chapters do (a nav click from a project page) would otherwise hold an empty list and
  // never update.
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const line = window.innerHeight * 0.475;
      for (const chapter of document.querySelectorAll<HTMLElement>('[data-ch]')) {
        const n = Number(chapter.dataset.ch);
        if (!Number.isInteger(n)) continue;
        const { top, bottom } = chapter.getBoundingClientRect();
        if (top <= line && line < bottom) {
          setCurrent(n);
          return;
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    schedule();
    // A jump to a hash scrolls after the route renders, so look again once it has settled.
    const settle = window.setTimeout(read, 250);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      window.clearTimeout(settle);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, []);

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

  const title = chapterTitle(current);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
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

  return (
    <>
      <button className="ctr" id="ctr" type="button" popoverTarget={POPOVER_ID}>
        {/* No aria-label: the name comes from the visible text, so it contains it. */}
        <span className="ctr-t">
          <span className="sr">Chapter</span> <b>{chapterNumber(current)}</b> / {CHAPTER_COUNT}{' '}
          <span className="ctr-title">&middot; {title}</span>
          <span className="sr">. Open chapter index</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      <div
        id={POPOVER_ID}
        className="cidx"
        popover="auto"
        role="dialog"
        aria-labelledby="cidx-h"
        ref={popoverRef}
        onKeyDown={onKeyDown}
      >
        <h2 id="cidx-h">{CHAPTER_INDEX_TITLE}</h2>
        <nav aria-label={CHAPTER_INDEX_TITLE}>
          {CHAPTER_GROUPS.map((group) => (
            <section key={group.label}>
              <h3>{group.label}</h3>
              <ol>
                {group.items.map((item) => (
                  <li key={item.n}>
                    <a
                      href={`#${item.id}`}
                      data-n={item.n}
                      aria-current={item.n === current ? 'true' : undefined}
                      onClick={() => onPick(item.id)}
                    >
                      <span className="n">{chapterNumber(item.n)}</span>
                      <span className="t">{item.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </nav>
      </div>
    </>
  );
}
