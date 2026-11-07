import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DETAILS, type GallerySlide } from '~/content/projects';
import { stubIntersectionObserver, stubMedia } from '../figures/figureTestKit';
import { renderDetail } from './detailTestKit';
import { PILL } from './pageStyles';
import { MediaSection } from './ProjectDetail';

describe('ProjectDetail header', () => {
  it('shows the h1, summary, stack line and a back link to its own chapter', async () => {
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
      '/#clipper',
    );
    expect(within(crumb).getByText(clipper.name)).toHaveAttribute('aria-current', 'page');
  });

  it('points an experience page back to the role that links it', async () => {
    await renderDetail('ncr-voyix-docs');
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'All experience' })).toHaveAttribute(
      'href',
      '/#ncr-voyix',
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
      // Only the first link is the primary action.
      const [wanted, other] =
        i === 0 ? [PILL.primary, PILL.secondary] : [PILL.secondary, PILL.primary];
      expect(a).toHaveClass(wanted);
      expect(a).not.toHaveClass(other);
    }
  });

  it('says once that the code belongs to NCR and shows no buttons', async () => {
    await renderDetail('ncr-voyix-docs');
    expect(await screen.findByText(/the site and its code belong to NCR/)).toBeInTheDocument();
    expect(screen.queryByText('The code belongs to NCR.')).toBeNull();
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

  it('does not repeat the home chapter recording or its single clip', async () => {
    for (const [slug, name] of [
      ['clipper', 'Clipper'],
      ['golem-miners', 'Golem Miners'],
    ] as const) {
      const { unmount } = await renderDetail(slug);
      await screen.findByRole('heading', { level: 1, name });
      expect(screen.queryByRole('region', { name: 'Media' })).toBeNull();
      expect(document.querySelector('video')).toBeNull();
      unmount();
    }
  });

  it('shows a gallery once a page has several clips to choose from', () => {
    stubIntersectionObserver();
    stubMedia();
    const slide = (n: number): GallerySlide => ({
      src: `/media/clip-${n}.mp4`,
      poster: `/media/clip-${n}-poster.webp`,
      caption: `Clip ${n}`,
      description: `What clip ${n} shows.`,
      label: `Recording of clip ${n}`,
    });
    render(<MediaSection name="Demo" media={{ kind: 'gallery', slides: [slide(1), slide(2)] }} />);
    expect(screen.getByRole('region', { name: 'Media' })).toBeInTheDocument();
  });

  it('leaves out the Media region and the checks figure on AC Composite Actions', async () => {
    await renderDetail('ac-composite-actions');
    await screen.findByRole('heading', { level: 1, name: 'AC Composite Actions' });
    expect(screen.queryByRole('region', { name: 'Media' })).toBeNull();
    expect(screen.queryByText(/\d+ of \d+ passed/)).toBeNull();
    expect(screen.queryByRole('list', { name: /actions in the repo/i })).toBeNull();
  });

  it('writes "What I built" paragraphs with code spans', async () => {
    await renderDetail('ac-composite-actions');
    const heading = await screen.findByRole('heading', { level: 2, name: 'What I built' });
    const section = heading.closest('section');
    if (!section) throw new Error('What I built heading is not inside a section');
    expect(section.querySelectorAll('p')).toHaveLength(
      DETAILS['ac-composite-actions'].built.length,
    );
    const codes = [...section.querySelectorAll('code')].map((el) => el.textContent);
    expect(codes).toContain('security/betterleaks');
  });

  it('shows each stat as a large figure followed by its label', async () => {
    await renderDetail('clipper');
    const heading = await screen.findByRole('heading', { level: 2, name: 'What I measured' });
    const items = within(within(heading.closest('section')!).getByRole('list')).getAllByRole(
      'listitem',
    );
    expect(items.map((li) => li.firstElementChild?.textContent)).toEqual(['3.0', '387', '8 of 8']);
    expect(items[1]).toHaveTextContent(/387.*tests pass\./);
    expect(items[2]).toHaveTextContent(/real clips/);
  });

  it('renders code spans inside a stat label', async () => {
    await renderDetail('vscode-royalty-theme');
    const heading = await screen.findByRole('heading', { level: 2, name: 'What I measured' });
    const codes = [...heading.closest('section')!.querySelectorAll('code')];
    expect(codes.map((el) => el.textContent)).toEqual(['npm run check']);
  });

  it('leaves the measured section out of a page with no stats', async () => {
    for (const slug of ['ncr-voyix-docs', 'starbucks-store-health'] as const) {
      const { unmount } = await renderDetail(slug);
      await screen.findByRole('heading', { level: 1 });
      expect(screen.queryByRole('heading', { name: 'What I measured' }), slug).toBeNull();
      expect(document.querySelector('#h-wm'), slug).toBeNull();
      unmount();
    }
  });

  it('shows the Voyix bullets that moved off the home page in What I built', async () => {
    await renderDetail('ncr-voyix-docs');
    const heading = await screen.findByRole('heading', { level: 2, name: 'What I built' });
    expect(heading.closest('section')).toHaveTextContent('Commerce Design Docs');
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
