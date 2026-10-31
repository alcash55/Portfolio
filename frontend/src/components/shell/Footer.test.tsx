import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '~/components/people/renderInRouter';
import { Footer } from './Footer';

async function footerLinks(resume: Parameters<typeof Footer>[0]['resume']) {
  await renderInRouter(<Footer resume={resume} />);
  return within(screen.getByRole('contentinfo'));
}

describe('Footer resume link', () => {
  it('names the PDF, its size and the new tab, like the other resume links', async () => {
    const footer = await footerLinks({ available: true, bytes: 23_326 });
    const link = footer.getByRole('link', {
      name: 'View resume (PDF, 23 KB, opens in a new tab)',
    });
    expect(link).toHaveTextContent('View resume');
    expect(link).toHaveAttribute('href', '/resume');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('claims no new tab and no size when the build found no PDF', async () => {
    const footer = await footerLinks({ available: false });
    const link = footer.getByRole('link', { name: 'View resume' });
    expect(link).toHaveAttribute('href', '/resume');
    expect(link).not.toHaveAttribute('target');
  });
});
