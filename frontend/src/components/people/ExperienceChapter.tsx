import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { ExperienceSpec } from '~/content/people';
import { Chapter } from '~/components/home/Chapter';
import { Fig, FigureSlot } from '~/components/home/Fig';
import { ReadMore } from './ReadMore';
import './people.css';

export interface ExperienceChapterProps {
  spec: ExperienceSpec;
  /** The diagram for the Fig frame. Without one, the frame shows an empty slot. */
  figure?: ReactNode;
}

export function ExperienceChapter({ spec, figure }: ExperienceChapterProps) {
  return (
    <Chapter
      id={spec.id}
      n={spec.n}
      title={spec.title}
      overline={spec.overline}
      heading={spec.heading}
      reverse={spec.reverse}
      big
      className="chapter-top"
      figure={
        <Fig n={spec.fig.n} label={spec.fig.label} caption={spec.fig.caption} meta={spec.fig.meta}>
          {figure ?? <FigureSlot />}
        </Fig>
      }
    >
      <p className="proof">{spec.role}</p>
      <p>{spec.lead}</p>
      {spec.writeUp ? (
        <div className="links">
          <Link className="go" to="/experience/$slug" params={{ slug: spec.writeUp.slug }}>
            {spec.writeUp.label} <span aria-hidden="true">&rarr;</span>
          </Link>
          {spec.note ? <span className="note">{spec.note}</span> : null}
        </div>
      ) : null}
      <ReadMore points={spec.more} stack={spec.stack} />
    </Chapter>
  );
}
