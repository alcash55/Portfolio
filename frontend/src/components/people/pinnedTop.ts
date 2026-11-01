import { useEffect, type RefObject } from 'react';

const WIDE = '(min-width: 900px)';

/**
 * Top padding that centers a pair of the given closed height in the snap height,
 * less 1.5rem of bottom padding, and keeps 1.5rem above a pair taller than the screen.
 */
export function pinnedTop({
  snap,
  pairHeight,
  rem,
}: {
  snap: number;
  pairHeight: number;
  rem: number;
}): number {
  return Math.max(1.5 * rem, (snap - pairHeight - 1.5 * rem) / 2);
}

/**
 * Centers the chapter around a Read more panel once, on its closed height.
 * Centering with CSS follows the live height, so opening the panel would lift
 * the figure by half of the growth. The chapter gets `data-pinned` and `--cpad`,
 * which home.css turns into a fixed top padding. Without script, or while the
 * columns are stacked, the CSS centering applies.
 */
export function usePinnedTop(ref: RefObject<HTMLDetailsElement | null>): void {
  useEffect(() => {
    const details = ref.current;
    const chapter = details?.closest<HTMLElement>('.chapter');
    const pair = chapter?.querySelector<HTMLElement>('.pair');
    if (!details || !chapter || !pair) return;
    const wide = window.matchMedia(WIDE);

    const apply = () => {
      if (!wide.matches) {
        chapter.removeAttribute('data-pinned');
        chapter.style.removeProperty('--cpad');
        return;
      }
      // The open height is not the height to center on, so keep the last closed value.
      if (details.open) return;
      const snap = parseFloat(getComputedStyle(chapter).minHeight);
      if (!Number.isFinite(snap)) return;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const top = pinnedTop({ snap, pairHeight: pair.getBoundingClientRect().height, rem });
      chapter.style.setProperty('--cpad', `${top.toFixed(1)}px`);
      chapter.setAttribute('data-pinned', '');
    };

    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('load', apply);
    void document.fonts?.ready.then(apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('load', apply);
      chapter.removeAttribute('data-pinned');
      chapter.style.removeProperty('--cpad');
    };
  }, [ref]);
}
