import { resumeLinkName, type ResumeInfo } from '~/lib/resume';

/**
 * The visible text stays "View resume". The accessible name adds the file type,
 * size and the new tab, and begins with the visible text. With no PDF the link
 * opens the explanation page in the same tab, so it makes no new-tab claim.
 */
export function ResumeLink({ info, className }: { info: ResumeInfo; className?: string }) {
  const opensTab = info.available;
  return (
    // A full page request on purpose: /resume answers with a redirect to the PDF.
    <a
      className={className}
      href="/resume"
      aria-label={resumeLinkName(info)}
      {...(opensTab ? { target: '_blank', rel: 'noopener' } : {})}
    >
      View resume
    </a>
  );
}
