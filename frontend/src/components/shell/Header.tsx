import { Link } from '@tanstack/react-router';
import { HomeHeader } from '~/components/home/HomeHeader';
import { MenuControl } from './MenuControl';
import { SectionLinks } from './SectionLinks';
import { ThemeControl } from './ThemeControl';
import type { NavId } from './nav';

const HEADER = 'sticky top-0 z-20 h-(--hdr) border-b border-line-soft bg-paper';

// On the home route the counter sits between the wordmark and the controls, so the row gets less
// space between items and the wordmark never shrinks.
const ROW_SHAPE = 'mx-auto flex h-full max-w-shell items-center justify-between px-(--gutter)';
const ROW = `${ROW_SHAPE} gap-[16px]`;
const ROW_HOME = `${ROW_SHAPE} gap-[12px]`;

// The wordmark is rem-sized so it grows with the root size. It drops a step on the narrowest
// phones, where the comps would wrap it onto two lines.
const MARK = [
  'flex min-h-11 items-center gap-[10px]',
  'font-display text-[1.5rem] leading-none font-normal tracking-[-0.01em] [word-spacing:0.06em]',
  'max-[360px]:text-[1.25rem]',
].join(' ');
const MARK_HOME = `${MARK} flex-none`;
const MARK_TEXT = 'pt-[2px]';
// Below 480px the counter needs this room. The link keeps its aria-label, so it still has a name.
const MARK_TEXT_HOME = `${MARK_TEXT} max-[480px]:hidden`;

const RIGHT = 'flex items-center gap-[8px] min-[1024px]:gap-[20px]';
// The section links and the theme group show from 1024px. Below that the Menu pill takes over.
const NAV = 'hidden gap-[4px] min-[1024px]:flex';

function Logo() {
  return (
    <svg
      className="flex-none"
      width="30"
      height="30"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
    >
      <path d="M35.6 10.2 A18 18 0 1 0 35.6 37.8" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M17.4 32.6 L24 15 L30.6 32.6"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.2 27.8 H27.8" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export function Header({ current, isHome = false }: { current: NavId | null; isHome?: boolean }) {
  return (
    <header className={HEADER}>
      <div className={isHome ? ROW_HOME : ROW}>
        <Link
          to="/"
          className={isHome ? MARK_HOME : MARK}
          aria-label="Alex Cash, home"
          activeOptions={{ exact: true }}
        >
          <Logo />
          <span className={isHome ? MARK_TEXT_HOME : MARK_TEXT}>Alex Cash</span>
        </Link>
        {isHome ? <HomeHeader /> : null}
        <div className={RIGHT}>
          <nav className={NAV} aria-label="Primary">
            <SectionLinks current={current} variant="header" />
          </nav>
          <ThemeControl />
          <MenuControl current={current} />
        </div>
      </div>
    </header>
  );
}
