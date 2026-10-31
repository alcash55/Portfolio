import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { ExperienceSpec } from '~/content/people';
import { PeopleChapter, PeopleFig, PeopleFigureSlot } from './PeopleChapter';
import { ReadMore } from './ReadMore';

export interface ExperienceChapterProps {
  spec: ExperienceSpec;
  /** The diagram for the Fig frame. Without one, the frame shows an empty slot. */
  figure?: ReactNode;
}

export function ExperienceChapter({ spec, figure }: ExperienceChapterProps) {
  return (
    <PeopleChapter
      id={spec.id}
      n={spec.n}
      title={spec.title}
      overline={spec.overline}
      heading={spec.heading}
      reverse={spec.reverse}
      big
      figure={
        <PeopleFig
          n={spec.fig.n}
          label={spec.fig.label}
          caption={spec.fig.caption}
          meta={spec.fig.meta}
        >
          {figure ?? <PeopleFigureSlot />}
        </PeopleFig>
      }
    >
      <p className="pp-proof">{spec.role}</p>
      <p>{spec.lead}</p>
      {spec.writeUp ? (
        <div className="pp-links">
          <Link className="pp-go" to="/experience/$slug" params={{ slug: spec.writeUp.slug }}>
            {spec.writeUp.label} <span aria-hidden="true">&rarr;</span>
          </Link>
          {spec.note ? <span className="pp-note">{spec.note}</span> : null}
        </div>
      ) : null}
      <ReadMore points={spec.more} stack={spec.stack} />
    </PeopleChapter>
  );
}
