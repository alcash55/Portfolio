import { render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTION_COUNT_WORD, CHECK_ROWS } from '~/content/checks';
import { ChecksFigure } from './ChecksFigure';
import { setReducedMotion, stubIntersectionObserver } from './figureTestKit';

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('says how many passed in the header, from the same count as the rows', () => {
    render(<ChecksFigure />);
    expect(screen.getByText('Checks')).toBeInTheDocument();
    expect(
      screen.getByText(`${CHECK_ROWS.length} of ${CHECK_ROWS.length} passed`),
    ).toBeInTheDocument();
  });

  it('lets a long action name break after each slash', () => {
    const { container } = render(<ChecksFigure />);
    const names = [...container.querySelectorAll('code')].filter((c) => c.closest('.ck-row'));
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
    expect(html).not.toMatch(/class="[^"]*\brun\b/);
  });

  it('plays while in view and resets when it leaves', () => {
    const io = stubIntersectionObserver();
    const { container } = render(<ChecksFigure />);
    const figure = container.firstElementChild as Element;
    expect(io.thresholds(figure)).toEqual([0.4]);
    act(() => io.show(figure, true));
    expect(figure).toHaveClass('run');
    act(() => io.show(figure, false));
    expect(figure).not.toHaveClass('run');
  });

  it('stays still when the reader prefers reduced motion', () => {
    const io = stubIntersectionObserver();
    setReducedMotion(true);
    const { container } = render(<ChecksFigure />);
    const figure = container.firstElementChild as Element;
    expect(io.watching(figure)).toBe(0);
    expect(figure).not.toHaveClass('run');
  });
});
