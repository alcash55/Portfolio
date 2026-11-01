import type { ReactNode } from 'react';
import './figures.css';

/**
 * A window with three title bar dots around a recording. The dots are decoration.
 * `bare` drops the border, radius and shadow for a window inside a Fig frame, which is the card.
 */
export function WindowFrame({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className={bare ? 'frame clipf' : 'frame'}>
      <div className="bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {children}
    </div>
  );
}
