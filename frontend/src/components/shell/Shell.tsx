import { useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';
import { sectionForPath } from './nav';

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <Header current={sectionForPath(pathname)} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
