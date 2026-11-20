import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

  it('leaves the page when the API has no answer', async () => {
    const { container } = render(<ContributionGraph load={() => Promise.resolve(null)} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('hides the squares from screen readers, which get the sentence instead', () => {
    render(<ContributionGraph load={pending} />);
    expect(screen.getByTestId('contribution-grid')).toHaveAttribute('aria-hidden', 'true');
  });
});
