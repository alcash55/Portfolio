import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import { NAV_ITEMS, type NavId } from './nav';

export type SectionLinkVariant = 'header' | 'menu' | 'footer';

// The current page is underlined, so color is not the only cue. Matching on the attribute and not
// its value keeps the router's own aria-current="page" working too.
const CURRENT =
  'aria-[current]:underline aria-[current]:decoration-2 aria-[current]:underline-offset-[6px]';

const LINK: Record<SectionLinkVariant, string> = {
  header: [
    'flex min-h-11 items-center rounded-full px-[12px] text-[0.9375rem] font-medium',
    'transition-[background-color] duration-(--duration-color) ease-(--ease-color) hover:bg-fill',
    CURRENT,
  ].join(' '),
  menu: [
    'flex min-h-12 items-center rounded-[12px] px-[12px]',
    'font-display text-[1.75rem] leading-none hover:bg-fill',
    CURRENT,
  ].join(' '),
  footer: [
    'inline-flex min-h-12 items-center font-display text-[1.75rem] leading-none',
    'hover:underline hover:underline-offset-[6px]',
  ].join(' '),
};

interface SectionLinksProps {
  current: NavId | null;
  /** Where the links sit: each place has its own size and hover. */
  variant: SectionLinkVariant;
  onNavigate?: () => void;
  /** Wrap each link in an <li>, for callers that render a <ul>. */
  asListItems?: boolean;
}

/** The four section links. Used by the header nav, the menu dialog and the footer. */
export function SectionLinks({
  current,
  variant,
  onNavigate,
  asListItems = false,
}: SectionLinksProps) {
  return NAV_ITEMS.map(({ id, label }) => {
    const link = (
      <Link
        to="/"
        hash={id}
        className={LINK[variant]}
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
