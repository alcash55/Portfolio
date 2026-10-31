import { Link } from '@tanstack/react-router';
import { PageFrame } from '~/components/pages/PageFrame';
import { CONTACT_EMAIL, RESUME_PAGE } from '~/content/people';

const linkClass =
  'inline-flex min-h-11 items-center text-[0.9375rem] font-medium underline underline-offset-4';

/** Shown at /resume when the build could not fetch the PDF. */
export function ResumePage() {
  return (
    <PageFrame>
      <h1 className="font-display text-page tracking-[-0.015em] text-balance">{RESUME_PAGE.h1}</h1>
      <p className="text-ink-2 mt-4 max-w-[52ch] text-lg">{RESUME_PAGE.line}</p>
      <div className="mt-8 flex flex-wrap gap-x-6">
        <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>
          {RESUME_PAGE.emailLabel}
        </a>
        <Link to="/" className={linkClass}>
          {RESUME_PAGE.homeLink}
        </Link>
      </div>
    </PageFrame>
  );
}
