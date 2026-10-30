import { Link } from '@tanstack/react-router';
import { NOT_FOUND } from '~/content/pages';
import { PageFrame } from './PageFrame';

const linkClass =
  'inline-flex min-h-11 items-center text-[0.9375rem] font-medium underline underline-offset-4';

/** NF-01 to NF-04: an address that matches no route. */
export function NotFoundRoute() {
  return (
    <NotFoundFrame h1={NOT_FOUND.route.h1}>
      <p className="text-ink-2 mt-6 text-lg">{NOT_FOUND.route.line}</p>
      <div className="mt-8 flex flex-wrap gap-x-6">
        <Link to="/" className={linkClass}>
          {NOT_FOUND.route.homeLink}
        </Link>
        <Link to="/" hash="projects" className={linkClass}>
          {NOT_FOUND.route.projectsLink}
        </Link>
      </div>
    </NotFoundFrame>
  );
}

/** NF-05 to NF-07: a slug under /projects or /experience that has no page. */
export function NotFoundSlug() {
  return (
    <NotFoundFrame h1={NOT_FOUND.slug.h1}>
      <div className="mt-8 flex flex-wrap gap-x-6">
        <Link to="/" hash="projects" className={linkClass}>
          {NOT_FOUND.slug.allLink}
        </Link>
        <Link to="/" className={linkClass}>
          {NOT_FOUND.slug.homeLink}
        </Link>
      </div>
    </NotFoundFrame>
  );
}

function NotFoundFrame({ h1, children }: { h1: string; children: React.ReactNode }) {
  return (
    <PageFrame>
      {/* React 19 hoists this into <head>. There is no route head to set it on a 404. */}
      <title>{NOT_FOUND.title}</title>
      <meta name="description" content={NOT_FOUND.description} />
      <h1 className="font-display text-display tracking-[-0.02em] text-balance">{h1}</h1>
      {children}
    </PageFrame>
  );
}
