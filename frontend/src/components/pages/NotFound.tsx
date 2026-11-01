import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { BackIcon } from '~/components/detail/icons';
import { NOT_FOUND } from '~/content/pages';
// The crumb, .pg frame and .btn pill styles live in the detail stylesheet. Importing it keeps
// them available when this page is the first one loaded, such as an unknown top-level address.
import '~/components/detail/detail.css';
import './pages.css';

/** NF-01 to NF-04: an address that matches no route. */
export function NotFoundRoute() {
  return (
    <NotFoundFrame h1={NOT_FOUND.route.h1}>
      <p className="text-lg">{NOT_FOUND.route.line}</p>
      <div className="acts">
        <Link to="/" className="btn btn-primary">
          {NOT_FOUND.route.homeLink}
        </Link>
        <Link to="/" hash="projects" className="btn btn-2">
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
      crumb={
        <nav className="crumb" aria-label="Breadcrumb">
          <div className="crumb-in">
            <Link to="/" hash="projects">
              <BackIcon />
              <span>All projects</span>
            </Link>
          </div>
        </nav>
      }
    >
      <div className="acts">
        <Link to="/" hash="projects" className="btn btn-primary">
          {NOT_FOUND.slug.allLink}
        </Link>
        <Link to="/" className="btn btn-2">
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
  return (
    <>
      {/* React 19 hoists this into <head>. There is no route head to set it on a 404. */}
      <title>{NOT_FOUND.title}</title>
      <meta name="description" content={NOT_FOUND.description} />
      {crumb}
      <div className="pg">
        <div className={crumb ? 'nf' : 'nf nf-solo'}>
          <h1>{h1}</h1>
          {children}
        </div>
      </div>
    </>
  );
}
