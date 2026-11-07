import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Education } from './Education';
import { renderInRouter } from './renderInRouter';

describe('Education', () => {
  it('is the Education region with its heading, overline and all three lines', async () => {
    await renderInRouter(<Education />);
    const region = screen.getByRole('region', {
      name: 'Division I lacrosse, software degrees, then coaching',
    });
    expect(region).toHaveAttribute('id', 'education');
    expect(within(region).getByText('Education and coaching')).toBeInTheDocument();
    expect(
      within(region).getByText(
        'Played all five years of Division I lacrosse at Robert Morris University.',
      ),
    ).toBeInTheDocument();
    expect(within(region).getByText(/Robert Morris University, 5\/2021\./)).toBeInTheDocument();
    expect(within(region).getByText(/Lakota West, 1\/2022 to 1\/2025\./)).toBeInTheDocument();
  });

  it('leaves the resume link to About and the footer', async () => {
    await renderInRouter(<Education />);
    expect(screen.queryByRole('link', { name: /^View resume/ })).not.toBeInTheDocument();
  });

  it('shows the photo carousel in a numbered figure', async () => {
    await renderInRouter(<Education />);
    expect(screen.getByText('Fig 11')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Education and coaching photos' })).toBeVisible();
  });
});
