import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTION_COUNT_WORD, CHECK_ROWS } from '~/content/checks';
import { ChecksFigure } from './ChecksFigure';
import { setReducedMotion, stubIntersectionObserver } from './figureTestKit';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const FROM_API = [
  { name: 'diff', description: '' },
  { name: 'new-thing', description: 'Does the new thing.' },
];

/** Places every element `top` px from the top of a 768px-tall screen. */
function placeFigureAt(top: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: top, width: 600, height: 500 }),
  );
}

describe('ChecksFigure', () => {
  it('lists every action in the repo, each passing', () => {
    render(<ChecksFigure />);
    const list = screen.getByRole('list', {
      name: `The ${ACTION_COUNT_WORD} actions in the repo, each passing`,
    });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(CHECK_ROWS.length);
    expect(within(list).getAllByText('Passed')).toHaveLength(CHECK_ROWS.length);
    expect(rows.map((r) => r.querySelector('code')?.textContent)).toEqual(
      CHECK_ROWS.map((row) => row.name),
    );
  });

  it('hides every row past the fourth on a phone until Show more is pressed', async () => {
    render(<ChecksFigure />);
    const rows = screen.getAllByRole('listitem');
    const hidden = (el: HTMLElement) => el.className.includes('max-[900px]:hidden');
    expect(rows.map(hidden)).toEqual(rows.map((_, i) => i >= 4));
    const more = screen.getByRole('button', { name: `Show ${rows.length - 4} more` });
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(more);

    expect(screen.getAllByRole('listitem').some(hidden)).toBe(false);
    expect(screen.queryByRole('button', { name: /^Show \d+ more$/ })).not.toBeInTheDocument();
  });

  it('says how many passed in the header, from the same count as the rows', () => {
    render(<ChecksFigure />);
    expect(screen.getByText('Checks')).toBeInTheDocument();
    expect(
      screen.getByText(`${CHECK_ROWS.length} of ${CHECK_ROWS.length} passed`),
    ).toBeInTheDocument();
  });

  it('lets a long action name break after each slash', () => {
    const { container } = render(<ChecksFigure />);
    const names = [...container.querySelectorAll('code')].filter((c) => c.closest('li'));
    const nested = names.find((c) => c.textContent === 'notifications/discord-messages');
    expect(nested?.innerHTML).toBe('notifications/<wbr>discord-messages');
    expect(names.find((c) => c.textContent === 'diff')?.innerHTML).toBe('diff');
  });

  it('explains how the actions are called', () => {
    render(<ChecksFigure />);
    expect(screen.getByText(/Each one is called as/)).toHaveTextContent(
      'Each one is called as alcash55/ac-composite-actions/<action>, at @main or a pinned commit.',
    );
  });

  it('describes what each action does under its name', () => {
    render(<ChecksFigure />);
    expect(screen.getByText('Scores a resume PDF for ATS compatibility')).toBeInTheDocument();
    expect(screen.getByText('Sends a message to a Discord channel')).toBeInTheDocument();
  });

  it('ships every row passed in the server HTML, with no running state', () => {
    const html = renderToStaticMarkup(<ChecksFigure />);
    expect(html.match(/Passed/g)).toHaveLength(CHECK_ROWS.length);
    // Match the attribute only: class names such as in-data-run:animate-* contain the same text.
    expect(html).not.toMatch(/ data-run[ =>]/);
  });

  it('plays while in view and resets when it leaves', () => {
    const io = stubIntersectionObserver();
    const { container } = render(<ChecksFigure />);
    const figure = container.firstElementChild as Element;
    expect(io.thresholds(figure)).toEqual([0.4]);
    act(() => io.show(figure, true));
    expect(figure).toHaveAttribute('data-run');
    act(() => io.show(figure, false));
    expect(figure).not.toHaveAttribute('data-run');
  });

  it('stays still when the reader prefers reduced motion', () => {
    const io = stubIntersectionObserver();
    setReducedMotion(true);
    const { container } = render(<ChecksFigure />);
    const figure = container.firstElementChild as Element;
    expect(io.watching(figure)).toBe(0);
    expect(figure).not.toHaveAttribute('data-run');
  });

  describe('with the list from the API', () => {
    it('swaps in the live list when it arrives while the figure is below the screen', async () => {
      placeFigureAt(2000);
      render(<ChecksFigure loadActions={() => Promise.resolve(FROM_API)} />);
      const list = await screen.findByRole('list', {
        name: 'The two actions in the repo, each passing',
      });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByText('2 of 2 passed')).toBeInTheDocument();
      expect(screen.getByText('Does the new thing')).toBeInTheDocument();
    });

    it('keeps the list it has when the answer arrives with the figure on screen', async () => {
      placeFigureAt(100);
      const load = vi.fn(() => Promise.resolve(FROM_API));
      render(<ChecksFigure loadActions={load} />);
      await waitFor(() => expect(load).toHaveBeenCalled());
      await act(() => Promise.resolve());
      expect(
        screen.getByText(`${CHECK_ROWS.length} of ${CHECK_ROWS.length} passed`),
      ).toBeInTheDocument();
    });

    it('keeps the fallback list when the API gives nothing', async () => {
      placeFigureAt(2000);
      const load = vi.fn(() => Promise.resolve(null));
      render(<ChecksFigure loadActions={load} />);
      await waitFor(() => expect(load).toHaveBeenCalled());
      await act(() => Promise.resolve());
      expect(screen.getAllByText('Passed')).toHaveLength(CHECK_ROWS.length);
    });

    it('never asks the API during a server render', () => {
      const load = vi.fn(() => Promise.resolve(FROM_API));
      renderToStaticMarkup(<ChecksFigure loadActions={load} />);
      expect(load).not.toHaveBeenCalled();
    });
  });
});
