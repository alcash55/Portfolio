import { analytics, type ResumeLocation } from '~/lib/analytics';
import { RESUME_LABEL, RESUME_LINK_NAME } from '~/lib/resume';

/**
 * The visible text is `RESUME_LABEL`. The accessible name adds the file type and the new
 * tab, and begins with the visible text.
 */
export function ResumeLink({
  location,
  className,
}: {
  location: ResumeLocation;
  className?: string;
}) {
  return (
    // A full page request on purpose: /resume is a Worker route that answers with the PDF.
    <a
      className={className}
      href="/resume"
      aria-label={RESUME_LINK_NAME}
      target="_blank"
      rel="noopener"
      onClick={() => analytics.capture('resume_clicked', { location })}
    >
      {RESUME_LABEL}
    </a>
  );
}
