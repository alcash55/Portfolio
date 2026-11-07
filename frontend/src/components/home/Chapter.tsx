import type { ReactNode } from 'react';
import {
  CHAPTER,
  CHAPTER_HEADING,
  OVERLINE,
  PAIR,
  PAIR_COLUMNS,
  PROSE,
  type PairColumns,
} from './homeStyles';

export interface ChapterProps {
  id: string;
  /** Position in the chapters index, 1 to 13. */
  n: number;
  /** Short name shown in the header counter and the index. */
  title: string;
  overline: string;
  heading: string;
  /** Figure first on a desktop, prose second. */
  reverse?: boolean;
  /** With `reverse`, the figure leads from 900px only. On a phone the prose comes first. */
  textFirstOnPhone?: boolean;
  /** Recordings and diagrams: the figure takes the wider column. */
  big?: boolean;
  /** Extra class names for the section, for example a chapter's own layout hook. */
  className?: string;
  /** The prose after the heading: paragraphs, links, notes. */
  children: ReactNode;
  /** A complete <Fig>. */
  figure: ReactNode;
}

function columnsFor(reverse: boolean, big: boolean): PairColumns {
  if (!big) return 'even';
  return reverse ? 'mediaReversed' : 'media';
}

// The figure comes after the prose in the markup, so it leads on a phone by ordering it first.
// A reversed chapter also leads with it on a desktop. It targets the <figure> that Fig renders,
// which is another component's output.
const FIGURE_FIRST = {
  phone: 'max-[900px]:[&>figure]:order-first',
  always: '[&>figure]:order-first',
  desktop: 'min-[900px]:[&>figure]:order-first',
} as const;

/**
 * One chapter of the home page: prose on one side, a figure on the other.
 * The text is in the server HTML. The `rv` class only adds a scroll reveal
 * that never hides content (see styles.css).
 *
 * `chapter`, `pair` and `prose` are hooks as well as styles: the snap rules in styles.css and
 * the chapter tests select them.
 */
export function Chapter({
  id,
  n,
  title,
  overline,
  heading,
  reverse = false,
  textFirstOnPhone = false,
  big = false,
  className: extra,
  children,
  figure,
}: ChapterProps) {
  const headingId = `c${n}-h`;
  const pairClass = [
    PAIR,
    PAIR_COLUMNS[columnsFor(reverse, big)],
    reverse ? (textFirstOnPhone ? FIGURE_FIRST.desktop : FIGURE_FIRST.always) : FIGURE_FIRST.phone,
  ].join(' ');
  return (
    <section
      className={extra ? `${CHAPTER} ${extra}` : CHAPTER}
      id={id}
      data-ch={n}
      data-title={title}
      aria-labelledby={headingId}
    >
      <div className={pairClass}>
        <div className={`${PROSE} rv`}>
          <p className={OVERLINE}>{overline}</p>
          <h2 id={headingId} tabIndex={-1} className={CHAPTER_HEADING}>
            {heading}
          </h2>
          {children}
        </div>
        {figure}
      </div>
    </section>
  );
}
