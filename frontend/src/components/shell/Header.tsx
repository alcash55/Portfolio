import { Link } from '@tanstack/react-router';
import { HomeHeader } from '~/components/home/HomeHeader';
import { MenuControl } from './MenuControl';
import { SectionLinks } from './SectionLinks';
import { ThemeControl } from './ThemeControl';
import type { NavId } from './nav';

function Logo() {
  return (
    <svg
      className="logo"
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
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="mark" aria-label="Alex Cash, home" activeOptions={{ exact: true }}>
          <Logo />
          <span>Alex Cash</span>
        </Link>
        {isHome ? <HomeHeader /> : null}
        <div className="hdr-r">
          <nav aria-label="Primary">
            <SectionLinks current={current} />
          </nav>
          <ThemeControl />
          <MenuControl current={current} />
        </div>
      </div>
    </header>
  );
}
