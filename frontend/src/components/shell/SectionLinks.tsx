import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import { NAV_ITEMS, type NavId } from './nav';

interface SectionLinksProps {
  current: NavId | null;
  onNavigate?: () => void;
  /** Wrap each link in an <li>, for callers that render a <ul>. */
  asListItems?: boolean;
}

/** The four section links. Used by the header nav, the menu dialog and the footer. */
export function SectionLinks({ current, onNavigate, asListItems = false }: SectionLinksProps) {
  return NAV_ITEMS.map(({ id, label }) => {
    const link = (
      <Link
        to="/"
        hash={id}
        // The router marks a link active by path alone, so every section link would read as the current page on "/". Matching the hash too keeps that for the one the URL points at.
        activeOptions={{ exact: true, includeHash: true }}
        aria-current={current === id ? 'true' : undefined}
        onClick={onNavigate}
      >
        {label}
      </Link>
    );
    return asListItems ? <li key={id}>{link}</li> : <Fragment key={id}>{link}</Fragment>;
  });
}
