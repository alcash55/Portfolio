import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Education } from './Education';
import { renderInRouter } from './renderInRouter';

describe('Education', () => {
  it('is the Education region with its heading, overline and both lines', async () => {
    await renderInRouter(<Education />);
    const region = screen.getByRole('region', {
      name: 'Degrees in software, then coaching lacrosse',
    });
    expect(region).toHaveAttribute('id', 'education');
    expect(within(region).getByText('Education and coaching')).toBeInTheDocument();
    expect(within(region).getByText(/Robert Morris University, 5\/2021\./)).toBeInTheDocument();
    expect(within(region).getByText(/Lakota West, 1\/2022 to 1\/2025\./)).toBeInTheDocument();
  });

  it('names the resume link so the visible text comes first, with the size when known', async () => {
    await renderInRouter(<Education resume={{ available: true, bytes: 23326 }} />);
    const link = screen.getByRole('link', {
      name: 'View resume (PDF, 23 KB, opens in a new tab)',
    });
    expect(link).toHaveTextContent('View resume');
    expect(link).toHaveAttribute('href', '/resume');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText('PDF, 23 KB')).toBeInTheDocument();
  });

  it('keeps the link when the resume is unavailable, without a size claim', async () => {
    await renderInRouter(<Education resume={{ available: false }} />);
    const link = screen.getByRole('link', { name: 'View resume' });
    expect(link).toHaveAttribute('href', '/resume');
    expect(link).not.toHaveAttribute('target');
    expect(screen.queryByText(/KB/)).not.toBeInTheDocument();
  });

  it('shows the photo carousel in a numbered figure', async () => {
    await renderInRouter(<Education />);
    expect(screen.getByText('Fig 10')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Education and coaching photos' })).toBeVisible();
  });
});
