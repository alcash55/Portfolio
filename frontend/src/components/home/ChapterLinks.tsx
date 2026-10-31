import { Link } from '@tanstack/react-router';
import type { ChapterLinkSpec } from '~/content/home';

function assertNever(value: never): never {
  throw new Error(`Unhandled chapter link: ${JSON.stringify(value)}`);
}

function LinkItem({ link }: { link: ChapterLinkSpec }) {
  switch (link.kind) {
    case 'write-up':
      return (
        <Link className="go" to="/projects/$slug" params={{ slug: link.slug }}>
          {link.label} <span aria-hidden="true">&rarr;</span>
        </Link>
      );
    case 'external':
      return (
        <a className="tl" href={link.href} target="_blank" rel="noopener">
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
    <div className="links">
      {links.map((link) => (
        <LinkItem key={link.label} link={link} />
      ))}
      {note ? <span className="note">{note}</span> : null}
    </div>
  );
}
