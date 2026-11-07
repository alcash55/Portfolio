import { Link } from '@tanstack/react-router';
import type { ChapterLinkSpec } from '~/content/home';
import { analytics } from '~/lib/analytics';
import { DESKTOP_ONLY, GO_ARROW, GO_LINK, LINK_ROW, NOTE, TEXT_LINK } from './homeStyles';

function assertNever(value: never): never {
  throw new Error(`Unhandled chapter link: ${JSON.stringify(value)}`);
}

function LinkItem({ link }: { link: ChapterLinkSpec }) {
  switch (link.kind) {
    case 'write-up':
      return (
        <Link
          className={GO_LINK}
          to="/projects/$slug"
          params={{ slug: link.slug }}
          onClick={() => analytics.capture('project_opened', { project: link.slug })}
        >
          {link.label}{' '}
          <span aria-hidden="true" className={GO_ARROW}>
            &rarr;
          </span>
        </Link>
      );
    case 'external':
      return (
        <a
          className={link.desktopOnly ? `${TEXT_LINK} ${DESKTOP_ONLY}` : TEXT_LINK}
          href={link.href}
          target="_blank"
          rel="noopener"
        >
          {link.label} <span className="sr">(opens in a new tab)</span>
        </a>
      );
    default:
      return assertNever(link);
  }
}

/** The write-up link, outside links and the optional private-code note. */
export function ChapterLinks({
  links,
  note,
}: {
  links: readonly ChapterLinkSpec[];
  note?: string;
}) {
  return (
    <div className={LINK_ROW}>
      {links.map((link) => (
        <LinkItem key={link.label} link={link} />
      ))}
      {note ? <span className={NOTE}>{note}</span> : null}
    </div>
  );
}
