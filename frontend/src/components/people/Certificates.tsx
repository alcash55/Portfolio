import { Chapter } from '~/components/home/Chapter';
import { NOTE, TEXT_LINK } from '~/components/home/homeStyles';
import {
  CERTIFICATES,
  CERTIFICATES_CHAPTER as CHAPTER,
  formatCompleted,
  formatDuration,
  type Certificate,
} from '~/content/people';
import { PhotoCarousel } from './PhotoCarousel';

const totalMinutes = CERTIFICATES.reduce((sum, cert) => sum + cert.minutes, 0);

/** "22 hr 15 min" reads as a duration but not as a headline number, so the lead says it in words. */
function totalLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hours` : `${hours} hours and ${rest} minutes`;
}

const slides = CERTIFICATES.map((cert) => ({
  src: cert.src,
  width: cert.width,
  height: cert.height,
  alt: `Master.dev certificate of completion for ${cert.title}, completed ${formatCompleted(cert.completed)}.`,
  caption: `${cert.title}, completed ${formatCompleted(cert.completed)}.`,
}));

/** Chapter 12: the Master.dev certificates, as text rows and a strip of the originals. */
export function Certificates() {
  return (
    <Chapter
      id={CHAPTER.id}
      n={CHAPTER.n}
      title={CHAPTER.title}
      overline={CHAPTER.overline}
      heading={CHAPTER.heading}
      figure={
        <PhotoCarousel
          fig={CHAPTER.fig}
          label={CHAPTER.carouselLabel}
          photos={slides}
          noun="certificate"
          fit="natural"
        />
      }
    >
      <p>
        Certificates of completion from Master.dev, newest first. Together the courses run{' '}
        {totalLabel(totalMinutes)}.
      </p>
      <ul className="mt-[8px] grid">
        {CERTIFICATES.map((cert) => (
          <CertificateRow key={cert.slug} cert={cert} />
        ))}
      </ul>
    </Chapter>
  );
}

function CertificateRow({ cert }: { cert: Certificate }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-[14px]">
      <a className={TEXT_LINK} href={cert.src} target="_blank" rel="noopener noreferrer">
        {cert.title}
        <span className="sr"> (certificate image, opens in a new tab)</span>
      </a>
      <small className={NOTE}>
        {cert.teacher}, {formatDuration(cert.minutes)},{' '}
        <time dateTime={cert.completed}>{formatCompleted(cert.completed)}</time>
      </small>
    </li>
  );
}
