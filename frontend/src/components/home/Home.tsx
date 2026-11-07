import type { ReactNode } from 'react';
import { PROJECT_CHAPTERS } from '~/content/home';
import type { ProjectSlug } from '~/content/pages';
import { About } from './About';
import { FigureSlot } from './Fig';
import { HomeEffects } from './HomeEffects';
import { ProjectChapter } from './ProjectChapter';

export interface HomeProps {
  /** The body of each project's Fig frame. A chapter with no entry shows an empty slot. */
  figures?: Partial<Record<ProjectSlug, ReactNode>>;
  /** Chapters 8 to 13, rendered inside the page wrapper so the counter and index see them. */
  after?: ReactNode;
}

/** About and the six project chapters, then whatever `after` holds. */
export function Home({ figures = {}, after = null }: HomeProps) {
  return (
    <div className="home">
      <HomeEffects />
      <About />
      {PROJECT_CHAPTERS.map((spec) => (
        <ProjectChapter key={spec.id} spec={spec} figure={figures[spec.id] ?? <FigureSlot />} />
      ))}
      {after}
    </div>
  );
}
