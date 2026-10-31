import type { ReactNode } from 'react';

/** The content column every page sits in. Matches the footer's 78rem measure. */
export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-(--gutter) pt-12 pb-20 md:pt-16">
      {children}
    </div>
  );
}
