import type { ReactNode } from 'react';
import './figures.css';

/** A window with three title bar dots around a recording. The dots are decoration. */
export function WindowFrame({ children }: { children: ReactNode }) {
  return (
    <div className="frame">
      <div className="bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {children}
    </div>
  );
}
