import { EDUCATION } from '~/content/people';
import { resumeInfo, resumeSizeLabel, type ResumeInfo } from '~/lib/resume';
import { PeopleChapter } from './PeopleChapter';
import { PhotoCarousel } from './PhotoCarousel';
import { ResumeLink } from './ResumeLink';

export function Education({ resume = resumeInfo }: { resume?: ResumeInfo }) {
  return (
    <PeopleChapter
      id={EDUCATION.id}
      n={EDUCATION.n}
      title={EDUCATION.title}
      overline={EDUCATION.overline}
      heading={EDUCATION.heading}
      figure={
        <PhotoCarousel
          fig={EDUCATION.fig}
          label={EDUCATION.carouselLabel}
          photos={EDUCATION.photos}
        />
      }
    >
      {EDUCATION.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <div className="pp-links">
        <ResumeLink info={resume} className="pp-btn" />
        {resume.available ? (
          <small className="pp-note">{resumeSizeLabel(resume.bytes)}</small>
        ) : null}
      </div>
    </PeopleChapter>
  );
}
