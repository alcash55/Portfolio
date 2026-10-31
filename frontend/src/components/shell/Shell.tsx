import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';
import { sectionForPath } from './nav';

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // The path of the page that has finished loading. `location` changes when a navigation
  // starts, while the old page is still on screen, so focus would land on the wrong heading.
  const resolvedPath = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  const firstRender = useRef(true);
  useEffect(() => {
    // A client-side navigation keeps focus on the old link, so a screen reader hears
    // nothing. The first load is left alone: the browser already starts at the top.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const main = document.getElementById('main');
    const target = main?.querySelector<HTMLElement>('h1') ?? main;
    // preventScroll so a link to /#projects still scrolls to its section.
    target?.focus({ preventScroll: true });
  }, [resolvedPath]);

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
