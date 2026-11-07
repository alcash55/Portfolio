import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '~/components/people/renderInRouter';
import { Footer } from './Footer';

describe('Footer resume link', () => {
  it('names the PDF and the new tab, like the other resume links', async () => {
    await renderInRouter(<Footer />);
    const link = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'View resume (PDF, opens in a new tab)',
    });
    expect(link).toHaveTextContent('View resume');
    expect(link).toHaveAttribute('href', '/resume');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
