import type { ReactNode } from 'react';

// `fig` and `rv` are hooks, not styles: styles.css staggers the reveal on `.fig`, and HomeEffects
// finds what to reveal through `.rv`.
const FRAME = [
  'fig grid grid-rows-[auto_1fr_auto] overflow-hidden',
  'rounded-card border border-line bg-surface shadow-card',
].join(' ');
const BAR = [
  'flex justify-between gap-[12px] px-[18px] py-[14px]',
  'text-[0.75rem] leading-[1.3] font-medium text-ink-3',
].join(' ');
const HEADER = `${BAR} tracking-[0.06em] uppercase`;
const CAPTION = `${BAR} text-[0.8125rem]`;

// min-w-0: a grid item never narrows below its content, so a wide image in a scroller would
// stretch the whole frame past the page on a phone.
//
// The frame crops every image and video inside it to 2:1. Those elements belong to other
// components (figures, the photo carousel), so this is a descendant rule. :where() holds its
// specificity at one element, which lets a class on the media (aspect-auto, aspect-4/3) win.
const BODY = [
  'relative min-h-0 min-w-0',
  '[:where(&)_:is(img,video)]:aspect-2/1 [:where(&)_:is(img,video)]:h-auto',
  '[:where(&)_:is(img,video)]:w-full [:where(&)_:is(img,video)]:object-cover',
].join(' ');

export type FigVariant = 'project' | 'portrait';

// A project figure centers beside its prose. About's portrait stretches to the height of the
// text and is not revealed on scroll.
const PLACE: Record<FigVariant, string> = {
  project: 'rv min-[900px]:self-center',
  portrait: [
    'w-full min-[900px]:self-stretch',
    'min-[900px]:min-h-[calc((100svh-var(--hdr))*0.4)]',
  ].join(' '),
};
const BODY_PLACE: Record<FigVariant, string> = {
  project: '',
  portrait: 'min-[900px]:min-h-[16rem]',
};

export interface FigProps {
  n: number;
  label: string;
  caption: ReactNode;
  meta?: ReactNode;
  /** `portrait` is About's photo. Every project figure uses the default. */
  variant?: FigVariant;
  children: ReactNode;
}

/** The numbered frame every figure sits in: header, body slot, caption. */
export function Fig({ n, label, caption, meta, variant = 'project', children }: FigProps) {
  return (
    <figure className={`${FRAME} ${PLACE[variant]}`}>
      <div className={HEADER}>
        <span>Fig {n}</span>
        <span>{label}</span>
      </div>
      <div className={`${BODY} ${BODY_PLACE[variant]}`}>{children}</div>
      <figcaption className={CAPTION}>
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
  return <div className="aspect-2/1 bg-band" data-slot="figure" aria-hidden="true" />;
}
