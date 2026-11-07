import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Breadcrumb } from '~/components/detail/Breadcrumb';
import { CLEAR_OF_CHROME, PAGE_FRAME, PILL } from '~/components/detail/pageStyles';
import { NOT_FOUND } from '~/content/pages';

// Unlike the write-up page, two short buttons fit on one row at every width, and wrap by
// themselves when they do not.
const BUTTON_ROW = 'flex flex-wrap items-stretch gap-[12px] min-[768px]:items-center';

/** NF-01 to NF-04: an address that matches no route. */
export function NotFoundRoute() {
  return (
    <NotFoundFrame h1={NOT_FOUND.route.h1}>
      <p className="text-lg text-ink-2">{NOT_FOUND.route.line}</p>
      <div className={BUTTON_ROW}>
        <Link to="/" className={PILL.primary}>
          {NOT_FOUND.route.homeLink}
        </Link>
        <Link to="/" hash="projects" className={PILL.secondary}>
          {NOT_FOUND.route.projectsLink}
        </Link>
      </div>
    </NotFoundFrame>
  );
}

/** NF-05 to NF-07: a slug under /projects or /experience that has no page. */
export function NotFoundSlug() {
  return (
    <NotFoundFrame
      h1={NOT_FOUND.slug.h1}
      crumb={<Breadcrumb hash="projects" backLabel="All projects" />}
    >
      <div className={BUTTON_ROW}>
        <Link to="/" hash="projects" className={PILL.primary}>
          {NOT_FOUND.slug.allLink}
        </Link>
        <Link to="/" className={PILL.secondary}>
          {NOT_FOUND.slug.homeLink}
        </Link>
      </div>
    </NotFoundFrame>
  );
}

function NotFoundFrame({
  h1,
  crumb,
  children,
}: {
  h1: string;
  crumb?: ReactNode;
  children: ReactNode;
}) {
  // With no crumb above it, the block needs the room the crumb band would have given.
  const topPadding = crumb ? 'pt-[48px]' : 'pt-[64px]';
  return (
    <>
      {/* React 19 hoists this into <head>. There is no route head to set it on a 404. */}
      <title>{NOT_FOUND.title}</title>
      <meta name="description" content={NOT_FOUND.description} />
      {crumb}
      <div className={`${PAGE_FRAME} ${CLEAR_OF_CHROME}`}>
        <div className={`grid justify-items-start gap-[16px] pb-[24px] ${topPadding}`}>
          <h1 tabIndex={-1} className="font-display text-display">
            {h1}
          </h1>
          {children}
        </div>
      </div>
    </>
  );
}
