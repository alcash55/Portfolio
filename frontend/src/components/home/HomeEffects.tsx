import { useEffect } from 'react';

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';
const REVEAL_BELOW_FOLD = 0.9;
const HEADING_FOCUS_DELAY_MS = 0;
const FORM_FOCUS_DELAY_MS = 500;

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

/** Message Alex goes to the form and focuses its first field. Other in-page links focus the chapter heading. */
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

      if (link.hasAttribute('data-msg')) {
        const contact = document.getElementById('contact');
        if (!contact) return;
        event.preventDefault();
        const reduce = !window.matchMedia(NO_PREFERENCE).matches;
        contact.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        later(
          () =>
            contact
              .querySelector<HTMLElement>('input:not([type="hidden"]), textarea')
              ?.focus({ preventScroll: true }),
          reduce ? 0 : FORM_FOCUS_DELAY_MS,
        );
        return;
      }

      // The chapter index handles its own rows.
      if (link.closest('.cidx')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname)
        return;
      const heading = url.hash ? headingFor(decodeURIComponent(url.hash.slice(1))) : null;
      if (heading) later(() => heading.focus({ preventScroll: true }), HEADING_FOCUS_DELAY_MS);
    };

    // Capture, so Message Alex is handled before anything else sees the click.
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
