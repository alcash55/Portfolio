import type { ReactNode } from 'react';
import { chapterTitle, type ProjectChapterSpec } from '~/content/home';
import { Chapter } from './Chapter';
import { ChapterLinks } from './ChapterLinks';
import { Fig } from './Fig';

/** A project chapter. `figure` is the body of the Fig frame. */
export function ProjectChapter({ spec, figure }: { spec: ProjectChapterSpec; figure: ReactNode }) {
  return (
    <Chapter
      id={spec.id}
      n={spec.n}
      title={chapterTitle(spec.n)}
      overline={spec.overline}
      heading={spec.heading}
      reverse={spec.reverse}
      big={spec.big}
      figure={
        <Fig n={spec.fig.n} label={spec.fig.label} caption={spec.fig.caption} meta={spec.fig.meta}>
          {figure}
        </Fig>
      }
    >
      {spec.paragraphs.map((p) => (
        <p key={p.text} className={p.kind === 'proof' ? 'proof' : undefined}>
          {p.text}
        </p>
      ))}
      <ChapterLinks links={spec.links} note={spec.note} />
      {spec.afterLinks ? <p className="stack">{spec.afterLinks}</p> : null}
    </Chapter>
  );
}
