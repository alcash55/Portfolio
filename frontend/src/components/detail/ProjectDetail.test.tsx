import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DETAILS } from '~/content/projects';
import { renderDetail } from './detailTestKit';

describe('ProjectDetail header', () => {
  it('shows the h1, summary, stack line and a back link to the projects list', async () => {
    await renderDetail('clipper');
    const clipper = DETAILS.clipper;
    expect(
      await screen.findByRole('heading', { level: 1, name: clipper.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(clipper.summary)).toBeInTheDocument();
    expect(screen.getByText(clipper.stack).closest('p')).toHaveTextContent(
      `Stack: ${clipper.stack}`,
    );
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'All projects' })).toHaveAttribute(
      'href',
      '/#projects',
    );
    expect(within(crumb).getByText(clipper.name)).toHaveAttribute('aria-current', 'page');
  });

  it('points an experience page back to the experience list', async () => {
    await renderDetail('ncr-voyix-docs');
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'All experience' })).toHaveAttribute(
      'href',
      '/#experience',
    );
  });

  it('shows the status line with the role in bold when the page has one', async () => {
    await renderDetail('golem-miners');
    const status = DETAILS['golem-miners'].status;
    if (!status) throw new Error('golem-miners should carry a status line');
    const role = await screen.findByText(status.role);
    expect(role.tagName).toBe('B');
    expect(role.closest('p')).toHaveTextContent(status.text);
  });

  it('opens every external link in a new tab, announces it, and styles only the first as primary', async () => {
    await renderDetail('clipper');
    const links = DETAILS.clipper.links;
    expect(links.length).toBeGreaterThan(0);
    for (const [i, expected] of links.entries()) {
      const a = await screen.findByRole('link', { name: `${expected.label} (opens in a new tab)` });
      expect(a).toHaveAttribute('href', expected.href);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(a.classList.contains('btn-primary')).toBe(i === 0);
      expect(a.classList.contains('btn-2')).toBe(i !== 0);
    }
  });

  it('says the code is private on an NCR page and shows no buttons', async () => {
    await renderDetail('ncr-voyix-docs');
    expect(await screen.findByText('The code belongs to NCR.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /opens in a new tab/ })).toBeNull();
  });

  it('shows the play note beside the Golem Miners play link, which stays on this site', async () => {
    await renderDetail('golem-miners');
    const note = DETAILS['golem-miners'].playNote;
    if (!note) throw new Error('golem-miners should carry a play note');
    expect(await screen.findByText(note)).toBeInTheDocument();
    const play = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/play/golem-miners/');
    expect(play).toBeDefined();
  });
});

describe('ProjectDetail body', () => {
  it('draws the architecture diagram under an Architecture heading', async () => {
    await renderDetail('clipper');
    const section = (
      await screen.findByRole('heading', { level: 2, name: 'Architecture' })
    ).closest('section');
    if (!section) throw new Error('Architecture heading is not inside a section');
    expect(
      within(section).getByRole('img', { name: /Architecture diagram of Clipper/ }),
    ).toBeInTheDocument();
    expect(section).toHaveAccessibleName('Architecture');
  });

  it('shows a recording in a Media region on a reveal page', async () => {
    await renderDetail('clipper');
    const media = await screen.findByRole('region', { name: 'Media' });
    expect(within(media).getByRole('group', { name: 'Clipper recording' })).toBeInTheDocument();
  });

  it('shows a clip gallery in the Media region on Golem Miners', async () => {
    await renderDetail('golem-miners');
    const media = await screen.findByRole('region', { name: 'Media' });
    expect(
      within(media).getByRole('group', { name: 'Golem Miners gameplay clips' }),
    ).toBeInTheDocument();
  });

  it('leaves out the Media region and the checks figure on AC Composite Actions', async () => {
    await renderDetail('ac-composite-actions');
    await screen.findByRole('heading', { level: 1, name: 'AC Composite Actions' });
    expect(screen.queryByRole('region', { name: 'Media' })).toBeNull();
    expect(screen.queryByText('9 of 9 passed')).toBeNull();
    expect(screen.queryByRole('list', { name: /nine actions/i })).toBeNull();
  });

  it('writes "What I built" paragraphs with code spans', async () => {
    const { container } = await renderDetail('ac-composite-actions');
    const heading = await screen.findByRole('heading', { level: 2, name: 'What I built' });
    const section = heading.closest('section');
    if (!section) throw new Error('What I built heading is not inside a section');
    expect(section.querySelectorAll('p')).toHaveLength(
      DETAILS['ac-composite-actions'].built.length,
    );
    const codes = [...container.querySelectorAll('.built code')].map((el) => el.textContent);
    expect(codes).toContain('security/betterleaks');
  });

  it('lists every measured fact', async () => {
    await renderDetail('clipper');
    const heading = await screen.findByRole('heading', { level: 2, name: 'What I measured' });
    const list = within(heading.closest('section')!).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(DETAILS.clipper.facts.length);
  });
});

describe('ProjectDetail next link', () => {
  it('links to the next project in the list', async () => {
    await renderDetail('portfolio-website');
    const next = await screen.findByRole('link', { name: 'Next: Game Competition Website' });
    expect(next).toHaveAttribute('href', '/projects/game-competition-website');
  });

  it('links the last project back to the projects list', async () => {
    await renderDetail('vscode-royalty-theme');
    const region = await screen.findByRole('region', { name: 'Next project' });
    expect(within(region).getByRole('link', { name: 'All projects' })).toHaveAttribute(
      'href',
      '/#projects',
    );
  });

  it('links the first experience page to the second', async () => {
    await renderDetail('ncr-voyix-docs');
    expect(
      await screen.findByRole('link', { name: 'Next: Starbucks UK Store Health' }),
    ).toHaveAttribute('href', '/experience/starbucks-store-health');
  });
});

describe('ProjectDetail message band', () => {
  it('ends with the band heading and a way to reach Alex', async () => {
    await renderDetail('clipper');
    const band = (
      await screen.findByRole('heading', { level: 2, name: 'Want to talk about this work?' })
    ).closest('section');
    if (!band) throw new Error('band heading is not inside a section');
    expect(band).toHaveAttribute('id', 'contact');
    expect(within(band).getByRole('link', { name: 'Message Alex' })).toHaveAttribute(
      'href',
      '/#contact',
    );
    expect(within(band).getByRole('link', { name: 'alex.e.cash28@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:alex.e.cash28@gmail.com',
    );
  });

  it('shows the supplied form in place of the fallback links', async () => {
    await renderDetail('clipper', { form: <form aria-label="Message Alex" /> });
    const band = (
      await screen.findByRole('heading', { name: 'Want to talk about this work?' })
    ).closest('section')!;
    expect(within(band).getByRole('form', { name: 'Message Alex' })).toBeInTheDocument();
    expect(within(band).queryByRole('link', { name: 'Message Alex' })).toBeNull();
  });
});

describe('ProjectDetail focus', () => {
  it('leaves focus alone on the first load', async () => {
    await renderDetail('clipper');
    await screen.findByRole('heading', { level: 1, name: 'Clipper' });
    expect(document.body).toHaveFocus();
  });

  it('moves focus to the h1 after a client navigation to another page', async () => {
    const { router } = await renderDetail('clipper');
    await screen.findByRole('heading', { level: 1, name: 'Clipper' });
    await act(async () => {
      await router.navigate({ to: '/projects/$slug', params: { slug: 'golem-miners' } });
    });
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Golem Miners' });
    expect(h1).toHaveFocus();
  });
});
