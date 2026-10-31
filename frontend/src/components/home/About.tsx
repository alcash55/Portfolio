import { ResumeLink } from '~/components/people/ResumeLink';
import { ABOUT } from '~/content/home';
import { resumeInfo, type ResumeInfo } from '~/lib/resume';
import { Fig } from './Fig';

/** The first screen. `resume` comes from the build-time resume fetch, so no size is hard-coded here. */
export function About({ resume = resumeInfo }: { resume?: ResumeInfo }) {
  const { fig } = ABOUT;
  return (
    <section
      className="chapter about"
      id={ABOUT.id}
      data-ch={1}
      data-title={ABOUT.overline}
      aria-labelledby="c1-h"
    >
      <div className="pair">
        <div className="prose">
          <p className="ov">{ABOUT.overline}</p>
          <h1 id="c1-h" tabIndex={-1}>
            {ABOUT.heading}
          </h1>
          <p>{ABOUT.paragraph}</p>
          <p className="avail">{ABOUT.availability}</p>
          <div className="acts">
            <a
              className="btn btn-primary"
              href="#contact"
              data-msg
              aria-label={ABOUT.message.ariaLabel}
            >
              {ABOUT.message.label}
            </a>
            <ResumeLink info={resume} className="btn btn-2" />
          </div>
          <div className="soc">
            {ABOUT.social.map((s) => (
              <a key={s.label} className="tl" href={s.href} target="_blank" rel="noopener">
                {s.label} <span className="sr">(opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
        <Fig n={fig.n} label={fig.label} caption={fig.caption} reveal={false}>
          {/* The portrait is the largest thing on the first screen, so it loads eagerly. */}
          <img
            className="nat"
            src={fig.src}
            width={fig.width}
            height={fig.height}
            alt={fig.alt}
            fetchPriority="high"
          />
        </Fig>
      </div>
    </section>
  );
}
