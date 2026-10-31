import type { ReactNode } from 'react';

export interface FigProps {
  n: number;
  label: string;
  caption: string;
  meta?: string;
  /** About's portrait is not revealed on scroll, every project figure is. */
  reveal?: boolean;
  children: ReactNode;
}

/** The numbered frame every figure sits in: header, body slot, caption. */
export function Fig({ n, label, caption, meta, reveal = true, children }: FigProps) {
  return (
    <figure className={reveal ? 'fig rv' : 'fig'}>
      <div className="fig-h">
        <span>Fig {n}</span>
        <span>{label}</span>
      </div>
      <div className="fig-b">{children}</div>
      <figcaption className="fig-f">
        <span>{caption}</span>
        <span>{meta}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Stand-in for a figure body until the real one is wired in. It keeps the 2:1
 * frame height so the chapter layout is already right.
 */
export function FigureSlot() {
  return <div className="fig-slot" data-slot="figure" aria-hidden="true" />;
}
