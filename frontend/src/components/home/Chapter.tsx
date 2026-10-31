import type { ReactNode } from 'react';

export interface ChapterProps {
  id: string;
  /** Position in the chapters index, 1 to 12. */
  n: number;
  /** Short name shown in the header counter and the index. */
  title: string;
  overline: string;
  heading: string;
  reverse?: boolean;
  big?: boolean;
  /** The prose after the heading: paragraphs, links, notes. */
  children: ReactNode;
  /** A complete <Fig>. */
  figure: ReactNode;
}

/**
 * One chapter of the home page: prose on one side, a figure on the other.
 * The text is in the server HTML. The `rv` class only adds a scroll reveal
 * that never hides content (see home.css).
 */
export function Chapter({
  id,
  n,
  title,
  overline,
  heading,
  reverse = false,
  big = false,
  children,
  figure,
}: ChapterProps) {
  const headingId = `c${n}-h`;
  const className = ['chapter', reverse && 'rev', big && 'big'].filter(Boolean).join(' ');
  return (
    <section
      className={className}
      id={id}
      data-ch={n}
      data-title={title}
      aria-labelledby={headingId}
    >
      <div className="pair">
        <div className="prose rv">
          <p className="ov">{overline}</p>
          <h2 id={headingId} tabIndex={-1}>
            {heading}
          </h2>
          {children}
        </div>
        {figure}
      </div>
    </section>
  );
}
