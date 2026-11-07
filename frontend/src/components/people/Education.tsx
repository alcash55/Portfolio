import { Chapter } from '~/components/home/Chapter';
import { EDUCATION } from '~/content/people';
import { PhotoCarousel } from './PhotoCarousel';

export function Education() {
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
    </Chapter>
  );
}
