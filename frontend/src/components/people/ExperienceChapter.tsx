import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { ExperienceSpec, ExperienceWriteUp } from '~/content/people';
import { analytics } from '~/lib/analytics';
import { Chapter } from '~/components/home/Chapter';
import { Fig, FigureSlot } from '~/components/home/Fig';
import { GO_ARROW, GO_LINK, LINK_ROW, NOTE, PROOF } from '~/components/home/homeStyles';

// A role with no write-up has nowhere else to show its highlights, so they sit in the chapter as
// plain text. The base reset strips list markers, so list-disc puts them back and the indent
// leaves room for them. The bullets set a size down, like the stack line, so six of them still
// fit a 1366x800 chapter. mb-0 on the stack line undoes the 14px the column gives every
// paragraph, so the chapter ends on the line itself.
const HIGHLIGHTS =
  'mb-[14px] grid max-w-[52ch] list-disc gap-[8px] pl-[1.15rem] text-[0.9375rem] leading-[1.4] marker:text-ink-3';
const STACK_LINE = 'mb-0 text-[0.9375rem] text-ink-2';

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
      figure={
        <Fig n={spec.fig.n} label={spec.fig.label} caption={spec.fig.caption} meta={spec.fig.meta}>
          {figure ?? <FigureSlot />}
        </Fig>
      }
    >
      <p className={PROOF}>{spec.role}</p>
      <p>{spec.lead}</p>
      {spec.writeUp ? (
        <WriteUpLink writeUp={spec.writeUp} note={spec.note} />
      ) : (
        <>
          <ul className={HIGHLIGHTS}>
            {spec.more.map((point) => (
              <li className="text-ink-2" key={point}>
                {point}
              </li>
            ))}
          </ul>
          <p className={STACK_LINE}>{spec.stack}</p>
        </>
      )}
    </Chapter>
  );
}

function WriteUpLink({ writeUp, note }: { writeUp: ExperienceWriteUp; note?: string }) {
  return (
    <div className={LINK_ROW}>
      <Link
        className={GO_LINK}
        to="/experience/$slug"
        params={{ slug: writeUp.slug }}
        onClick={() => analytics.capture('project_opened', { project: writeUp.slug })}
      >
        {writeUp.label}{' '}
        <span aria-hidden="true" className={GO_ARROW}>
          &rarr;
        </span>
      </Link>
      {note ? <span className={NOTE}>{note}</span> : null}
    </div>
  );
}
