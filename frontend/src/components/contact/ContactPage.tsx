import type { MouseEvent } from 'react';
import { PageFrame } from '~/components/pages/PageFrame';
import { ResumeLink } from '~/components/people/ResumeLink';
import { CONTACT_PAGE, GITHUB_URL, LINKEDIN_URL } from '~/content/people';
import { resumeInfo, type ResumeInfo } from '~/lib/resume';
import { ContactForm } from './ContactForm';
import '~/components/people/people.css';

const linkClass = 'pp-tl';

// With script, Message Alex lands in the Name field. Without it, the link is a
// plain jump to the form's heading.
function focusName(event: MouseEvent<HTMLAnchorElement>) {
  const name = document.querySelector<HTMLElement>(
    'form[aria-label="Message Alex"] input[name="name"]',
  );
  if (!name) return;
  event.preventDefault();
  name.focus();
}

export function ContactPage({ resume = resumeInfo }: { resume?: ResumeInfo }) {
  return (
    <PageFrame>
      <h1 className="font-display text-page tracking-[-0.015em] text-balance">{CONTACT_PAGE.h1}</h1>
      <p className="text-ink-2 mt-4 max-w-[52ch] text-lg">{CONTACT_PAGE.intro}</p>
      <p className="mt-6">
        <a className="pp-btn" href="#message" aria-label={CONTACT_PAGE.ctaName} onClick={focusName}>
          {CONTACT_PAGE.cta}
        </a>
      </p>
      <p className="mt-4">
        <a className={linkClass} href={`mailto:${CONTACT_PAGE.email}`}>
          {CONTACT_PAGE.email}
        </a>
      </p>
      <nav aria-label="Elsewhere" className="pp-tlinks">
        <a className={linkClass} href={LINKEDIN_URL} target="_blank" rel="noopener">
          LinkedIn <span className="sr">(opens in a new tab)</span>
        </a>
        <a className={linkClass} href={GITHUB_URL} target="_blank" rel="noopener">
          GitHub <span className="sr">(opens in a new tab)</span>
        </a>
        <ResumeLink info={resume} className={linkClass} />
      </nav>

      <h2
        id="message"
        tabIndex={-1}
        className="font-display mt-14 text-[2rem] tracking-[-0.015em] text-balance"
      >
        {CONTACT_PAGE.formHeading}
      </h2>
      <p className="text-ink-2 mt-3 mb-6 max-w-[52ch]">{CONTACT_PAGE.formIntro}</p>
      <div className="max-w-xl">
        <ContactForm />
      </div>
    </PageFrame>
  );
}
