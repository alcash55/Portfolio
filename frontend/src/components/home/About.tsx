import { PhotoCarousel } from '~/components/people/PhotoCarousel';
import { ResumeLink } from '~/components/people/ResumeLink';
import { ABOUT } from '~/content/home';
import {
  ABOUT_HEADING,
  BUTTON,
  CHAPTER,
  OVERLINE,
  PAIR,
  PAIR_COLUMNS,
  PROOF,
  PROSE,
  TEXT_LINK,
} from './homeStyles';

// About fills the first screen on its own, at every width.
const ABOUT_CHAPTER = `${CHAPTER} min-h-[calc(100svh-var(--hdr))]`;
const ACTIONS = 'mt-[18px] mb-[6px] flex flex-wrap justify-start gap-x-[12px] gap-y-[10px]';
const SOCIAL = 'flex flex-wrap gap-x-[20px]';

/** The first screen. */
export function About() {
  return (
    <section
      className={ABOUT_CHAPTER}
      id={ABOUT.id}
      data-ch={1}
      data-title={ABOUT.overline}
      aria-labelledby="c1-h"
    >
      <div className={`${PAIR} ${PAIR_COLUMNS.portrait}`}>
        <div className={PROSE}>
          <p className={OVERLINE}>{ABOUT.overline}</p>
          <h1 id="c1-h" tabIndex={-1} className={ABOUT_HEADING}>
            {ABOUT.heading}
          </h1>
          <p>{ABOUT.paragraph}</p>
          <p className={PROOF}>{ABOUT.availability}</p>
          <div className={ACTIONS}>
            <a
              className={BUTTON.primary}
              href="#contact"
              data-msg
              aria-label={ABOUT.message.ariaLabel}
            >
              {ABOUT.message.label}
            </a>
            <ResumeLink location="about" className={BUTTON.secondary} />
          </div>
          <div className={SOCIAL}>
            {ABOUT.social.map((s) => (
              <a
                key={s.label}
                className={`${TEXT_LINK} text-ink`}
                href={s.href}
                target="_blank"
                rel="noopener"
              >
                {s.label} <span className="sr">(opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
        {/* The portrait is the largest thing on the first screen, so its photo loads eagerly. */}
        <PhotoCarousel
          fig={ABOUT.fig}
          label={ABOUT.carouselLabel}
          photos={ABOUT.photos}
          variant="portrait"
          eagerFirst
        />
      </div>
    </section>
  );
}
