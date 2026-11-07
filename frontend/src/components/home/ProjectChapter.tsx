import type { ReactNode } from 'react';
import { chapterTitle, type ProjectChapterSpec } from '~/content/home';
import { Chapter } from './Chapter';
import { ChapterLinks } from './ChapterLinks';
import { Fig } from './Fig';
import { PROOF } from './homeStyles';

/** A project chapter. `figure` is the body of the Fig frame. */
export function ProjectChapter({ spec, figure }: { spec: ProjectChapterSpec; figure: ReactNode }) {
  return (
    <Chapter
      id={spec.anchor ?? spec.id}
      n={spec.n}
      title={chapterTitle(spec.n)}
      overline={spec.overline}
      heading={spec.heading}
      reverse={spec.reverse}
      textFirstOnPhone={spec.textFirstOnPhone}
      big={spec.big}
      figure={
        <Fig n={spec.fig.n} label={spec.fig.label} caption={spec.fig.caption} meta={spec.fig.meta}>
          {figure}
        </Fig>
      }
    >
      {spec.paragraphs.map((p) => (
        <p key={p.text} className={p.kind === 'proof' ? PROOF : undefined}>
          {p.text}
        </p>
      ))}
      <ChapterLinks links={spec.links} note={spec.note} />
      {spec.afterLinks ? <p>{spec.afterLinks}</p> : null}
    </Chapter>
  );
}
