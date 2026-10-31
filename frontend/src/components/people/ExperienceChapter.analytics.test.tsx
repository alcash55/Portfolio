import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPERIENCE } from '~/content/people';
import { analytics } from '~/lib/analytics';
import { ExperienceChapter } from './ExperienceChapter';
import { renderInRouter } from './renderInRouter';

vi.mock('~/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/analytics')>()),
  analytics: { enabled: true, queued: 0, start: vi.fn(), capture: vi.fn(), pageview: vi.fn() },
}));

const voyix = EXPERIENCE.find((spec) => spec.writeUp?.slug === 'ncr-voyix-docs');
if (!voyix) throw new Error('experience content missing');

describe('ExperienceChapter analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records the experience page when its write-up link is clicked', async () => {
    await renderInRouter(<ExperienceChapter spec={voyix} figure={<div>Diagram</div>} />);

    await userEvent.click(screen.getByRole('link', { name: /Read the write-up/ }));

    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('project_opened', { project: 'ncr-voyix-docs' });
  });
});
