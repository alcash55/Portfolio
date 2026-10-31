import { render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DETAILS } from '~/content/projects';
import { Diagram } from './Diagram';
import { setReducedMotion, stubIntersectionObserver } from './figureTestKit';

afterEach(() => {
  vi.unstubAllGlobals();
});

const clipper = DETAILS.clipper;

describe('Diagram', () => {
  it('draws the diagram as one image named for the page, with a pointer to the text version', () => {
    render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    expect(
      screen.getByRole('img', { name: 'Architecture diagram of Clipper. A text version follows.' }),
    ).toBeInTheDocument();
  });

  it('shows every node label in the drawing', () => {
    render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    const svg = screen.getByRole('img');
    for (const node of clipper.diagram.nodes) {
      expect(within(svg).getAllByText(node.label).length, node.label).toBeGreaterThan(0);
    }
  });

  it('numbers the flows in a list with the same sentences as the drawing', () => {
    render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(items[0]).toHaveTextContent('YouTube channel and Twitch channel to Fetch: top videos and top clips.');
    expect(items[7]).toHaveTextContent('Daily run script to Fetch: starts the run.');
    expect(items[7]).toHaveClass('plan');
  });

  it('ends with a text version that is the alt text from the data', () => {
    render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    const caption = screen.getByText('Text version.').closest('figcaption');
    expect(caption).toHaveTextContent(clipper.diagram.alt);
  });

  it('draws the planned edges and nodes dashed, and nothing else', () => {
    const { container } = render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    expect(container.querySelectorAll('svg .e.plan')).toHaveLength(1);
    expect(container.querySelectorAll('svg .n.plan')).toHaveLength(1);
  });

  it('draws one badge per numbered flow', () => {
    const { container } = render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    const badges = [...container.querySelectorAll('svg .b text')].map((t) => t.textContent);
    expect(badges).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('labels the exit stub The build', () => {
    const royalty = DETAILS['vscode-royalty-theme'];
    const { container } = render(<Diagram name={royalty.name} diagram={royalty.diagram} />);
    expect(container.querySelector('svg .stub')).toHaveTextContent('The build');
  });

  it('renders a heading only when given a title', () => {
    const { rerender } = render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    expect(screen.queryByRole('heading')).toBeNull();
    rerender(<Diagram name={clipper.name} diagram={clipper.diagram} title="Architecture" titleId="h-ad" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Architecture' })).toHaveAttribute('id', 'h-ad');
  });

  it('ships the final state in the server HTML: no hidden, dimmed or running state', () => {
    const html = renderToStaticMarkup(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    expect(html).toContain('Fetch');
    expect(html).not.toMatch(/class="[^"]*\b(pre|run)\b/);
    expect(html).not.toContain('opacity');
    expect(html).not.toContain('hidden');
  });

  it('plays the reveal once when the figure scrolls into view', () => {
    const io = stubIntersectionObserver();
    const { container } = render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    const figure = container.querySelector('figure');
    expect(figure).not.toBeNull();
    expect(figure).not.toHaveClass('run');
    act(() => io.show(figure as Element));
    expect(figure).toHaveClass('run');
    expect(io.watching(figure as Element)).toBe(0);
  });

  it('never starts the reveal when the reader prefers reduced motion', () => {
    const io = stubIntersectionObserver();
    setReducedMotion(true);
    const { container } = render(<Diagram name={clipper.name} diagram={clipper.diagram} />);
    const figure = container.querySelector('figure') as Element;
    expect(io.watching(figure)).toBe(0);
    expect(figure).not.toHaveClass('run');
  });
});
