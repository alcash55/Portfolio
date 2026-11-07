import { Link } from '@tanstack/react-router';
import { BackIcon } from './icons';
import { PAGE_FRAME } from './pageStyles';

const BAR = 'sticky top-(--hdr) z-19 h-(--crumb) border-b border-line bg-paper';
const ROW = `${PAGE_FRAME} flex h-full min-w-0 items-center gap-[10px]`;

// The crumb sits inside the band it would otherwise scroll clear of, so its own link takes no
// scroll margin. Otherwise focusing it scrolls the page.
const BACK_LINK =
  'group inline-flex min-h-11 flex-none scroll-mt-0 items-center gap-[8px] font-medium';
const BACK_LABEL = 'group-hover:underline group-hover:underline-offset-[4px]';

interface BreadcrumbProps {
  /** The home page anchor the link returns to. */
  hash: string;
  /** What the link reads, such as "All projects". */
  backLabel: string;
  /** The page the visitor is on. A 404 has none, so only the link shows. */
  current?: string;
}

/** The sticky bar under the header with a link back to the list the page belongs to. */
export function Breadcrumb({ hash, backLabel, current }: BreadcrumbProps) {
  return (
    <nav className={BAR} aria-label="Breadcrumb">
      <div className={ROW}>
        <Link className={BACK_LINK} to="/" hash={hash}>
          <BackIcon />
          <span className={BACK_LABEL}>{backLabel}</span>
        </Link>
        {current ? (
          <>
            <span className="flex-none text-ink-3" aria-hidden="true">
              /
            </span>
            <span className="min-w-0 truncate text-ink-2" aria-current="page">
              {current}
            </span>
          </>
        ) : null}
      </div>
    </nav>
  );
}
