import { Link } from '@tanstack/react-router';
import { ResumeLink } from '~/components/people/ResumeLink';
import { SectionLinks } from './SectionLinks';

type FooterLayout = 'page' | 'home';

// The home footer is tighter than the one on inner pages: a 28px rhythm and one row of links at
// phone width. Its external links are medium weight with tap targets pinned to 44px, where the
// others use 2.75rem and grow with the root size on very wide screens.
const FOOTER_SHAPE = 'mx-auto grid max-w-[78rem] px-(--gutter) pt-[72px] pb-[40px]';
const FOOTER: Record<FooterLayout, string> = {
  page: `${FOOTER_SHAPE} gap-[32px]`,
  home: `${FOOTER_SHAPE} gap-[28px]`,
};
const SECTIONS = 'flex flex-wrap gap-x-[28px]';
const TEXT = 'text-[0.9375rem] text-ink-2';
const BASE = [
  'flex flex-wrap items-center justify-between gap-x-[24px] gap-y-[8px]',
  'border-t border-line pt-[20px]',
].join(' ');
const BACK_TO_TOP = 'inline-flex items-center font-medium';
// Only the home footer underlines it: the line came from the home chapter links' rule, and the
// inner pages never had it. Add the same three classes to `page` to make them match.
const BACK_TO_TOP_HOME = 'underline decoration-[1.5px] underline-offset-[4px]';

// Home lays the links out as a flex row. Inner pages let them flow inline with a right margin each.
const SMALL_ROW_HOME = 'flex flex-wrap gap-x-[20px]';
const SMALL_LINK = 'inline-flex items-center text-[0.9375rem]';
const LINK: Record<FooterLayout, { plain: string; external: string; backToTop: string }> = {
  page: {
    plain: `${SMALL_LINK} min-h-11 mr-[20px]`,
    external: `${SMALL_LINK} min-h-11 mr-[20px]`,
    backToTop: `${BACK_TO_TOP} min-h-11`,
  },
  home: {
    plain: `${SMALL_LINK} min-h-11`,
    external: `${SMALL_LINK} min-h-[44px] font-medium`,
    backToTop: `${BACK_TO_TOP} ${BACK_TO_TOP_HOME} min-h-[44px]`,
  },
};

function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: string;
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener">
      {children} <span className="sr">(opens in a new tab)</span>
    </a>
  );
}

export function Footer({ isHome = false }: { isHome?: boolean }) {
  const layout: FooterLayout = isHome ? 'home' : 'page';
  const link = LINK[layout];
  return (
    <footer className={FOOTER[layout]}>
      <nav id="footer-nav" aria-label="Footer">
        <ul className={SECTIONS}>
          <SectionLinks current={null} variant="footer" asListItems />
        </ul>
      </nav>
      <div className={isHome ? SMALL_ROW_HOME : undefined}>
        <Link
          to="/"
          hash="contact"
          data-msg
          className={link.plain}
          aria-label="Message Alex (goes to the contact form)"
        >
          Message Alex
        </Link>
        <ExternalLink className={link.external} href="https://www.linkedin.com/in/alexander-cash/">
          LinkedIn
        </ExternalLink>
        <ExternalLink className={link.external} href="https://github.com/alcash55">
          GitHub
        </ExternalLink>
        <ResumeLink location="footer" className={link.plain} />
      </div>
      <div className={BASE}>
        <p className={TEXT}>Built with TanStack Start and Tailwind. Hosted on Cloudflare.</p>
        <p className={TEXT}>&copy; 2026 Alex Cash</p>
        <a className={link.backToTop} href="#main">
          Back to top
        </a>
      </div>
    </footer>
  );
}
