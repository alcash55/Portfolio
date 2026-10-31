import type { ReactNode } from 'react';
import './people.css';

export interface PeopleChapterProps {
  id: string;
  /** Position in the chapters index, 1 to 12. */
  n: number;
  /** Short name for the header counter and the index. */
  title: string;
  overline: string;
  heading: string;
  reverse?: boolean;
  big?: boolean;
  /** The prose after the heading. */
  children: ReactNode;
  /** A complete <PeopleFig>. */
  figure: ReactNode;
}

/**
 * One chapter: prose on one side, a figure on the other. Same props as the
 * home chapter shell, so swapping it in is an import change.
 */
export function PeopleChapter({
  id,
  n,
  title,
  overline,
  heading,
  reverse = false,
  big = false,
  children,
  figure,
}: PeopleChapterProps) {
  const headingId = `c${n}-h`;
  const className = ['pp-chapter', reverse && 'pp-rev', big && 'pp-big'].filter(Boolean).join(' ');
  return (
    <section
      className={className}
      id={id}
      data-ch={n}
      data-title={title}
      aria-labelledby={headingId}
    >
      <div className="pp-pair">
        <div className="pp-prose">
          <p className="pp-ov">{overline}</p>
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

export interface PeopleFigProps {
  n: number;
  label: string;
  caption: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}

/** The numbered frame around a figure: header, body, caption. */
export function PeopleFig({ n, label, caption, meta, children }: PeopleFigProps) {
  return (
    <figure className="pp-fig">
      <div className="pp-fig-h">
        <span>Fig {n}</span>
        <span>{label}</span>
      </div>
      <div className="pp-fig-b">{children}</div>
      <figcaption className="pp-fig-f">
        <span>{caption}</span>
        <span>{meta}</span>
      </figcaption>
    </figure>
  );
}

/** Stand-in for a diagram until the real one is wired in. Keeps the 2:1 frame height. */
export function PeopleFigureSlot() {
  return <div className="pp-slot" data-slot="figure" aria-hidden="true" />;
}
