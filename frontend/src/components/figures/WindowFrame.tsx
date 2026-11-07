import type { ReactNode } from 'react';

const WINDOW = 'relative overflow-hidden bg-surface';
const CARD = 'rounded-[18px] border border-line shadow-card';
const BAR = [
  'flex h-10 items-center gap-[8px] px-[14px]',
  'border-b border-line bg-surface-2',
].join(' ');
const DOT = 'size-[11px] flex-none rounded-[50%]';

// The standard window controls: close, minimize, zoom. These are the system colors, not tokens.
const DOT_COLORS = ['bg-[#ff5f57]', 'bg-[#febc2e]', 'bg-[#28c840]'] as const;

/**
 * A window with three title bar dots around a recording. The dots are decoration.
 * `bare` drops the border, radius and shadow for a window inside a Fig frame, which is the card.
 */
export function WindowFrame({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className={bare ? WINDOW : `${WINDOW} ${CARD}`}>
      <div className={BAR} aria-hidden="true">
        {DOT_COLORS.map((color) => (
          <span key={color} className={`${DOT} ${color}`} />
        ))}
      </div>
      {children}
    </div>
  );
}
