import { ResumeLink } from '~/components/people/ResumeLink';
import { ABOUT } from '~/content/home';
import { Fig } from './Fig';
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

// The portrait is the largest thing on the first screen. On a phone it keeps a 4:3 crop. From
// 900px it fills its frame, which is as tall as the text beside it.
const PORTRAIT = [
  'aspect-4/3 object-cover object-[50%_60%]',
  'min-[900px]:absolute min-[900px]:inset-0 min-[900px]:aspect-auto min-[900px]:size-full',
].join(' ');

const PHOTOS = [
  'grid gap-[20px] min-[900px]:flex min-[900px]:flex-col min-[900px]:self-stretch',
  'min-[900px]:[&>figure]:flex-1',
].join(' ');
const DOGS = 'w-full max-w-[22rem] min-[900px]:max-w-[13rem]';

/** The first screen. */
export function About() {
  const { fig, dogs } = ABOUT;
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
        {/* One column for both photos. From 900px the portrait takes the height the text sets and
            the dogs sit small beneath it, so About stays one screen. */}
        <div className={PHOTOS}>
          <Fig n={fig.n} label={fig.label} caption={fig.caption} variant="portrait">
            {/* The portrait is the largest thing on the first screen, so it loads eagerly. */}
            <img
              className={PORTRAIT}
              src={fig.src}
              width={fig.width}
              height={fig.height}
              alt={fig.alt}
              fetchPriority="high"
            />
          </Fig>
          <div className={DOGS}>
            <Fig n={dogs.n} label={dogs.label} caption={dogs.caption}>
              <img
                className="aspect-4/3"
                src={dogs.src}
                width={dogs.width}
                height={dogs.height}
                alt={dogs.alt}
                loading="lazy"
              />
            </Fig>
          </div>
        </div>
      </div>
    </section>
  );
}
