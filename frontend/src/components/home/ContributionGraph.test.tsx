import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContributionWeek } from '~/lib/contributions';
import { ContributionGraph } from './ContributionGraph';

const pending = () => new Promise<null>(() => {});

const weeks: ContributionWeek[] = [
  { start: '2026-11-08', days: [0, 2, 5, 12, 30, 0, 0] },
  { start: '2026-11-15', days: [7, 1, 33] },
];

describe('ContributionGraph', () => {
  it('holds a blank grid of the final size while the API answers', () => {
    render(<ContributionGraph load={pending} />);

    const grid = screen.getByTestId('contribution-grid');
    expect(grid.children).toHaveLength(26 * 7);
    expect(grid.querySelectorAll('[data-level="0"]')).toHaveLength(26 * 7);
    expect(screen.getByText('Loading GitHub activity')).toBeInTheDocument();
  });

  it('keeps square cells when the API sends fewer weeks than the grid holds', async () => {
    render(<ContributionGraph load={() => Promise.resolve(weeks)} />);

    await screen.findByText('90 contributions on GitHub since November');
    // Two columns would stretch each square to half the grid's width.
    expect(screen.getByTestId('contribution-grid')).toHaveStyle({
      gridTemplateColumns: 'repeat(26, minmax(0, 1fr))',
    });
  });

  it('shades each day and says how many contributions it shows', async () => {
    render(<ContributionGraph load={() => Promise.resolve(weeks)} />);

    expect(
      await screen.findByText('90 contributions on GitHub since November'),
    ).toBeInTheDocument();
    const levels = [...screen.getByTestId('contribution-grid').children].map((cell) =>
      cell.getAttribute('data-level'),
    );
    // The second week ends on Tuesday, so its last four squares are blank.
    expect(levels).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '0',
      '0',
      '2',
      '1',
      '4',
      null,
      null,
      null,
      null,
    ]);
  });

  it('keeps the grid, dimmed, and says so when the API has no answer', async () => {
    render(<ContributionGraph load={() => Promise.resolve(null)} />);

    expect(await screen.findByText('GitHub activity did not load.')).toBeInTheDocument();
    const grid = screen.getByTestId('contribution-grid');
    expect(grid.children).toHaveLength(26 * 7);
    expect(grid).toHaveAttribute('data-state', 'failed');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('asks the API again when Try again is pressed', async () => {
    const load = vi
      .fn<() => Promise<ContributionWeek[] | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(weeks);
    render(<ContributionGraph load={load} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByText('90 contributions on GitHub since November'),
    ).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows the loading state again while a retry waits', async () => {
    const load = vi
      .fn<() => Promise<ContributionWeek[] | null>>()
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(pending());
    render(<ContributionGraph load={load} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Loading GitHub activity')).toBeInTheDocument();
    expect(screen.getByTestId('contribution-grid')).toHaveAttribute('data-state', 'loading');
  });

  describe('when the API is slow', () => {
    afterEach(() => vi.useRealTimers());

    it('says the API is waking up after a few seconds, without moving the grid', () => {
      vi.useFakeTimers();
      render(<ContributionGraph load={pending} />);
      expect(screen.getByText('Loading GitHub activity')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4_000);
      });

      expect(screen.getByText('Still loading, the API is waking up')).toBeInTheDocument();
      expect(screen.getByTestId('contribution-grid').children).toHaveLength(26 * 7);
    });
  });

  it('hides the squares from screen readers, which get the sentence instead', () => {
    render(<ContributionGraph load={pending} />);
    expect(screen.getByTestId('contribution-grid')).toHaveAttribute('aria-hidden', 'true');
  });
});
