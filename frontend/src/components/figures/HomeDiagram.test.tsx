import { render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HOME_DIAGRAMS } from '~/content/projects';
import { setReducedMotion, stubIntersectionObserver } from './figureTestKit';
import { HomeDiagram } from './HomeDiagram';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomeDiagram', () => {
  it('draws one image named for what it shows, described by the text version', () => {
    render(<HomeDiagram diagram={HOME_DIAGRAMS.solea} />);
    const img = screen.getByRole('img', {
      name: 'Architecture of the seven-market submission platform',
    });
    expect(img).toHaveAccessibleDescription(/Traders use the v3 Excel-based submission tool/);
  });

  it('labels the three nodes the spec review asked for, word for word', () => {
    render(<HomeDiagram diagram={HOME_DIAGRAMS.solea} />);
    expect(screen.getByText('Seven ISO submission APIs')).toBeInTheDocument();
    expect(screen.getByText('CAISO, ERCOT, MISO, NEISO,')).toBeInTheDocument();
  });

  it.each([
    ['ncr-voyix', 'Markdown stays with the team'],
    ['ncr-store-health', 'Country-level view'],
  ] as const)('%s draws "%s" inside the image', (key, label) => {
    render(<HomeDiagram diagram={HOME_DIAGRAMS[key]} />);
    expect(within(screen.getByRole('img')).getByText(label)).toBeInTheDocument();
  });

  it('keeps the text version in the DOM, in a visually hidden list, and prints no caption under the drawing', () => {
    const { container } = render(<HomeDiagram diagram={HOME_DIAGRAMS['ncr-voyix']} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(HOME_DIAGRAMS['ncr-voyix'].steps.length);
    expect(items[0]).toHaveTextContent(
      'Product teams keep their Markdown in their own GitHub repositories.',
    );
    expect(items[0]?.closest('.hd-sr')).not.toBeNull();
    expect(container.querySelector('figcaption')).toBeNull();
    expect(container.querySelector('.alt-t')).toBeNull();
    expect(container.querySelector('.flows')).toBeNull();
  });

  it('draws every edge, in order, with its stagger index', () => {
    const { container } = render(<HomeDiagram diagram={HOME_DIAGRAMS.solea} />);
    const edges = [...container.querySelectorAll('svg .e')];
    expect(edges).toHaveLength(8);
    expect(edges.map((e) => (e as HTMLElement).style.getPropertyValue('--i'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });

  it('draws the Store and Country chips inside the dashboard node', () => {
    const { container } = render(<HomeDiagram diagram={HOME_DIAGRAMS['ncr-store-health']} />);
    const chips = [...container.querySelectorAll('svg .n.in text')].map((t) => t.textContent);
    expect(chips).toEqual(['Store', 'Country']);
  });

  it('ships the final state in the server HTML: no running, hidden or dimmed state', () => {
    const html = renderToStaticMarkup(<HomeDiagram diagram={HOME_DIAGRAMS.solea} />);
    expect(html).toContain('Seven ISO submission APIs');
    expect(html).not.toMatch(/class="[^"]*\brun\b/);
    expect(html).not.toContain('opacity');
  });

  it('plays the edge reveal once when the figure scrolls into view', () => {
    const io = stubIntersectionObserver();
    const { container } = render(<HomeDiagram diagram={HOME_DIAGRAMS.solea} />);
    const root = container.firstElementChild as Element;
    expect(root).not.toHaveClass('run');
    act(() => io.show(root));
    expect(root).toHaveClass('run');
    expect(io.watching(root)).toBe(0);
  });

  it('never starts the reveal when the reader prefers reduced motion', () => {
    const io = stubIntersectionObserver();
    setReducedMotion(true);
    const { container } = render(<HomeDiagram diagram={HOME_DIAGRAMS.solea} />);
    const root = container.firstElementChild as Element;
    expect(io.watching(root)).toBe(0);
    expect(root).not.toHaveClass('run');
  });

  it('gives each of the three diagrams its own ids, so two on one page do not collide', () => {
    const { container } = render(
      <>
        <HomeDiagram diagram={HOME_DIAGRAMS.solea} />
        <HomeDiagram diagram={HOME_DIAGRAMS['ncr-voyix']} />
        <HomeDiagram diagram={HOME_DIAGRAMS['ncr-store-health']} />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });
});
