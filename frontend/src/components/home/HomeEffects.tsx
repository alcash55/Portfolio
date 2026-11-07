import { useEffect } from 'react';

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';
const REVEAL_BELOW_FOLD = 0.9;
const HEADING_FOCUS_DELAY_MS = 0;

/**
 * Section reveal. The server HTML carries no hidden state. Once script runs,
 * elements below the fold get data-rv="wait" and flip to "in" the first time
 * they enter. Reduced motion, a missing observer and a failed script all leave
 * everything visible.
 */
function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (!window.matchMedia(NO_PREFERENCE).matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
          entry.target.dataset.rv = 'in';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    // `.rv` marks what reveals. The styles for the states are in styles.css.
    const targets = document.querySelectorAll<HTMLElement>('.rv');
    targets.forEach((el) => {
      if (el.getBoundingClientRect().top <= window.innerHeight * REVEAL_BELOW_FOLD) return;
      el.dataset.rv = 'wait';
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
      targets.forEach((el) => {
        delete el.dataset.rv;
      });
    };
  }, []);
}

function headingFor(id: string): HTMLElement | null {
  const target = document.getElementById(id);
  if (!target) return null;
  return target.matches('h1, h2') ? target : target.querySelector<HTMLElement>('h1, h2');
}

/** In-page links focus the chapter heading they land on. Message Alex links are handled by the shell. */
function useInPageLinks() {
  useEffect(() => {
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;

      // The chapter index handles its own rows (`.cidx` is the hook ChapterNav puts on it), and
      // Message Alex focuses the form field instead.
      if (link.closest('.cidx') || link.hasAttribute('data-msg')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname)
        return;
      const heading = url.hash ? headingFor(decodeURIComponent(url.hash.slice(1))) : null;
      if (heading) later(() => heading.focus({ preventScroll: true }), HEADING_FOCUS_DELAY_MS);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);
}

/** Client-only behavior for the home page. Renders nothing, and nothing here is needed to read the page. */
export function HomeEffects() {
  useScrollReveal();
  useInPageLinks();
  return null;
}
