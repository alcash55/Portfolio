import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { renderShell } from '~/test/renderShell';
import { MenuControl } from './MenuControl';

const NAV = [
  ['Projects', '/#projects'],
  ['Experience', '/#experience'],
  ['About', '/#about'],
  ['Contact', '/#contact'],
] as const;

describe('Shell landmarks', () => {
  it('puts the skip link first, pointing at the main landmark', async () => {
    await renderShell();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main');
    const firstLink = screen.getAllByRole('link')[0];
    expect(firstLink).toBe(skip);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('has a banner, a main and a contentinfo landmark', async () => {
    await renderShell();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the page inside main', async () => {
    await renderShell();
    expect(
      within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Page body' }),
    ).toBeInTheDocument();
  });
});

describe('Header', () => {
  it('names the wordmark link "Alex Cash, home"', async () => {
    await renderShell();
    const home = within(screen.getByRole('banner')).getByRole('link', { name: 'Alex Cash, home' });
    expect(home).toHaveAttribute('href', '/');
  });

  it('lists Projects, Experience, About and Contact in a nav named Primary', async () => {
    await renderShell();
    const nav = within(screen.getByRole('banner')).getByRole('navigation', { name: 'Primary' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(NAV.map(([label]) => label));
    expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV.map(([, href]) => href));
  });

  it('marks nothing current on the home route', async () => {
    await renderShell('/');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav.querySelector('[aria-current]')).toBeNull();
  });

  it('marks Projects current on a project page', async () => {
    await renderShell('/projects/clipper');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(nav).getByRole('link', { name: 'Experience' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks Experience current on an experience page', async () => {
    await renderShell('/experience/ncr-voyix-docs');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Experience' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('has the theme group in the header', async () => {
    await renderShell();
    expect(
      within(screen.getByRole('banner')).getByRole('group', { name: 'Theme' }),
    ).toBeInTheDocument();
  });
});

describe('Footer', () => {
  it('has the four links in a nav named Footer, with the id the no-JS Menu link targets', async () => {
    await renderShell();
    const nav = within(screen.getByRole('contentinfo')).getByRole('navigation', { name: 'Footer' });
    expect(nav).toHaveAttribute('id', 'footer-nav');
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(NAV.map(([label]) => label));
  });

  it('shows the address, the copyright and the colophon', async () => {
    await renderShell();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('alex.e.cash28@gmail.com')).toBeInTheDocument();
    expect(within(footer).getByText('© 2026 Alex Cash')).toBeInTheDocument();
    expect(
      within(footer).getByText('Built with TanStack Start and Tailwind. Hosted on Cloudflare.'),
    ).toBeInTheDocument();
  });

  it('opens outside links in a new tab and says so to screen readers', async () => {
    await renderShell();
    const footer = screen.getByRole('contentinfo');
    for (const name of ['LinkedIn (opens in a new tab)', 'GitHub (opens in a new tab)']) {
      const link = within(footer).getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('links Back to top to main', async () => {
    await renderShell();
    expect(screen.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#main');
  });
});

describe('Menu without JavaScript', () => {
  it('renders as a link to the footer nav, with no dialog in the markup', () => {
    const html = renderToString(<MenuControl />);
    expect(html).toMatch(/<a[^>]*href="#footer-nav"[^>]*>Menu<\/a>/);
    expect(html).not.toContain('<dialog');
  });
});

describe('Menu dialog', () => {
  it('becomes a button once the page is interactive', async () => {
    await renderShell();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('opens a dialog named Site menu holding the four links, and focuses Close menu', async () => {
    const user = userEvent.setup();
    await renderShell();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    expect(
      within(dialog)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(NAV.map(([label]) => label));
    expect(within(dialog).getByRole('button', { name: 'Close menu' })).toHaveFocus();
  });

  it('closes on Close menu and returns focus to the Menu button', async () => {
    const user = userEvent.setup();
    await renderShell();
    const trigger = screen.getByRole('button', { name: 'Menu' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when a link inside it is chosen', async () => {
    const user = userEvent.setup();
    await renderShell();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Site menu' })).getByRole('link', {
        name: 'About',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the scrim is clicked', async () => {
    const user = userEvent.setup();
    await renderShell();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    // The native dialog reports a click on its own backdrop as a click on the dialog element.
    await user.click(screen.getByRole('dialog', { name: 'Site menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks the current section link in the dialog too', async () => {
    const user = userEvent.setup();
    await renderShell('/projects/clipper');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    expect(within(dialog).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
