import { useEffect, useState } from 'react';

/**
 * The chapter number the reader is on. A chapter is "current" while it crosses a
 * line just above the middle of the viewport.
 *
 * Chapters are read from the page on every scroll. A header that mounts before the
 * home chapters do (a nav click from a project page) would otherwise hold an empty
 * list and never update.
 */
export function useCurrentChapter(): number {
  const [current, setCurrent] = useState(1);

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

  return current;
}
