import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HOME } from '~/content/pages';
import { Home } from './Home';
import { renderInRouter } from './renderInRouter';

describe('Home', () => {
  it('has exactly one h1, and it is the home headline', async () => {
    await renderInRouter(<Home />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(HOME.h1);
  });

  it('runs About, then the six project chapters in order', async () => {
    await renderInRouter(<Home />);
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      'A portfolio with a Go API behind it',
      'Everything an OSRS bingo event needs, in one web app',
      'CI that 11 of my repos share',
      'From a clip to a Short with one command',
      'Dig deep, get rich, wake the golems',
      'A color theme that passes contrast checks',
    ]);
  });

  it('numbers About Fig 0, each project Fig 2 to 7 after its chapter, and leaves each project body as a slot', async () => {
    const { container } = await renderInRouter(<Home />);
    const figs = screen.getAllByRole('figure');
    expect(figs).toHaveLength(7);
    expect(figs.map((f) => within(f).getByText(/^Fig \d$/).textContent)).toEqual([
      'Fig 0',
      'Fig 2',
      'Fig 3',
      'Fig 4',
      'Fig 5',
      'Fig 6',
      'Fig 7',
    ]);
    expect(container.querySelectorAll('[data-slot="figure"]')).toHaveLength(6);
  });

  it('has no section between About and the first project, and #projects is that first project', async () => {
    const { container } = await renderInRouter(<Home />);
    const sections = [...container.querySelectorAll('.home > section')];
    expect(sections.map((s) => s.getAttribute('data-ch'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
    expect(container.querySelector('#projects')).toBe(sections[1]);
  });

  it('puts every chapter anchor the index links to on the page, up to chapter 7', async () => {
    const { container } = await renderInRouter(<Home />);
    for (const id of [
      'about',
      'projects',
      'game-competition-website',
      'ac-composite-actions',
      'clipper',
      'golem-miners',
      'vscode-royalty-theme',
    ]) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
  });
});
