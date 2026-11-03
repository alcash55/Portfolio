import { useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';
import { focusNameOnArrival, useMessageLinks } from './messageAlex';
import { sectionForPath } from './nav';

/** A hash link names where the visitor meant to land. Its heading takes focus, not the page h1. */
function hashTarget(hash: string): HTMLElement | null {
  const target = hash ? document.getElementById(hash) : null;
  if (!target) return null;
  const heading = target.matches('h1, h2') ? target : target.querySelector<HTMLElement>('h1, h2');
  const focusable = heading ?? target;
  // `focus()` does nothing on an element that has no tabindex, so skip to the page default.
  return focusable.hasAttribute('tabindex') ? focusable : null;
}

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // The path of the page that has finished loading. `location` changes when a navigation
  // starts, while the old page is still on screen, so focus would land on the wrong heading.
  const resolvedPath = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  useMessageLinks();
  const focusedPath = useRef(resolvedPath);
  useEffect(() => {
    // A client-side navigation keeps focus on the old link, so a screen reader hears
    // nothing. The first load is left alone: the browser already starts at the top.
    // Compare paths rather than flag the first run. Strict Mode runs this effect twice
    // in dev, and a one-shot flag let the second run focus the h1 and draw its ring.
    if (focusedPath.current === resolvedPath) return;
    focusedPath.current = resolvedPath;
    // A Message Alex link that crossed routes puts focus in the form instead.
    if (focusNameOnArrival()) return;
    const main = document.getElementById('main');
    const target =
      hashTarget(router.state.location.hash) ?? main?.querySelector<HTMLElement>('h1') ?? main;
    // preventScroll so a link to /#projects still scrolls to its section.
    target?.focus({ preventScroll: true });
  }, [resolvedPath, router]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <Header current={sectionForPath(pathname)} isHome={pathname === '/'} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
