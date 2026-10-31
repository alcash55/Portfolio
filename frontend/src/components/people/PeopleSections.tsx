import type { ReactNode } from 'react';
import { EXPERIENCE, type ExperienceSpec } from '~/content/people';
import { resumeInfo, type ResumeInfo } from '~/lib/resume';
import { ContactBand } from './ContactBand';
import { Education } from './Education';
import { ExperienceChapter } from './ExperienceChapter';

export interface PeopleSectionsProps {
  /** Diagram bodies for the Fig frames of chapters 8 to 10. A chapter without one shows an empty slot. */
  figures?: Partial<Record<ExperienceSpec['id'], ReactNode>>;
  resume?: ResumeInfo;
}

/** Chapters 8 to 12: three experience chapters, Education, and the contact band. */
export function PeopleSections({ figures = {}, resume = resumeInfo }: PeopleSectionsProps) {
  return (
    <>
      {EXPERIENCE.map((spec) => (
        <ExperienceChapter key={spec.id} spec={spec} figure={figures[spec.id]} />
      ))}
      <Education resume={resume} />
      <ContactBand resume={resume} />
    </>
  );
}
