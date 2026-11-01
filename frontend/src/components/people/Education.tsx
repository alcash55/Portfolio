import { Chapter } from '~/components/home/Chapter';
import { EDUCATION } from '~/content/people';
import { resumeInfo, resumeSizeLabel, type ResumeInfo } from '~/lib/resume';
import { PhotoCarousel } from './PhotoCarousel';
import { ResumeLink } from './ResumeLink';
import './people.css';

export function Education({ resume = resumeInfo }: { resume?: ResumeInfo }) {
  return (
    <Chapter
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
      <div className="links">
        <ResumeLink info={resume} location="education" className="pp-btn" />
        {resume.available ? <small className="note">{resumeSizeLabel(resume.bytes)}</small> : null}
      </div>
    </Chapter>
  );
}
