import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '~/lib/analytics';
import { ChapterLinks } from './ChapterLinks';
import { renderInRouter } from './renderInRouter';

vi.mock('~/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/analytics')>()),
  analytics: { enabled: true, queued: 0, start: vi.fn(), capture: vi.fn(), pageview: vi.fn() },
}));

describe('ChapterLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records the project when its write-up link is clicked', async () => {
    await renderInRouter(
      <ChapterLinks links={[{ kind: 'write-up', slug: 'clipper', label: 'Read the write-up' }]} />,
    );

    await userEvent.click(screen.getByRole('link', { name: /^Read the write-up/ }));

    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('project_opened', { project: 'clipper' });
  });

  it('records nothing for an outside link', async () => {
    await renderInRouter(
      <ChapterLinks
        links={[{ kind: 'external', href: 'https://example.test/', label: 'Open the live site' }]}
      />,
    );
    const link = screen.getByRole('link', { name: /^Open the live site/ });
    link.addEventListener('click', (event) => event.preventDefault());

    await userEvent.click(link);

    expect(analytics.capture).not.toHaveBeenCalled();
  });
});
