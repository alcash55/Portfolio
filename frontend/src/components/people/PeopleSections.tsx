import type { ReactNode } from 'react';
import { EXPERIENCE, type ExperienceSpec } from '~/content/people';
import { ContactBand } from './ContactBand';
import { Certificates } from './Certificates';
import { Education } from './Education';
import { ExperienceChapter } from './ExperienceChapter';

export interface PeopleSectionsProps {
  /** Diagram bodies for the Fig frames of chapters 8 to 10. A chapter without one shows an empty slot. */
  figures?: Partial<Record<ExperienceSpec['id'], ReactNode>>;
}

/** Chapters 8 to 13: three experience chapters, Education, Certificates, and the contact band. */
export function PeopleSections({ figures = {} }: PeopleSectionsProps) {
  return (
    <>
      {EXPERIENCE.map((spec) => (
        <ExperienceChapter key={spec.id} spec={spec} figure={figures[spec.id]} />
      ))}
      <Education />
      <Certificates />
      <ContactBand />
    </>
  );
}
