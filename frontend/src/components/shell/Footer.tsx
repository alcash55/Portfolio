import { Link } from '@tanstack/react-router';
import { SectionLinks } from './SectionLinks';

const EMAIL = 'alex.e.cash28@gmail.com';

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children} <span className="sr">(opens in a new tab)</span>
    </a>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <nav className="big" id="footer-nav" aria-label="Footer">
        <ul>
          <SectionLinks current={null} asListItems />
        </ul>
      </nav>
      <p>I'm a software engineer in Memphis, TN.</p>
      <div className="small">
        <Link to="/" hash="contact" aria-label="Message Alex (goes to the contact form)">
          Message Alex
        </Link>
        <ExternalLink href="https://www.linkedin.com/in/alexander-cash/">LinkedIn</ExternalLink>
        <ExternalLink href="https://github.com/alcash55">GitHub</ExternalLink>
        <a
          href="/resume"
          target="_blank"
          rel="noopener"
          aria-label="View resume (opens in a new tab)"
        >
          View resume
        </a>
      </div>
      <p className="addr2">{EMAIL}</p>
      <div className="base">
        <p>Built with TanStack Start and Tailwind. Hosted on Cloudflare.</p>
        <p>&copy; 2026 Alex Cash</p>
        <a className="tl" href="#main">
          Back to top
        </a>
      </div>
    </footer>
  );
}
