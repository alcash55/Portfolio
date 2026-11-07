import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '~/lib/analytics';
import { ResumeLink } from './ResumeLink';

vi.mock('~/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/analytics')>()),
  analytics: { enabled: true, queued: 0, start: vi.fn(), capture: vi.fn(), pageview: vi.fn() },
}));

describe('ResumeLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records which resume link was clicked', async () => {
    render(<ResumeLink location="footer" />);
    const link = screen.getByRole('link', { name: /^View resume/ });
    // The link opens a new tab. Keep jsdom from trying to navigate.
    link.addEventListener('click', (event) => event.preventDefault());

    await userEvent.click(link);

    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('resume_clicked', { location: 'footer' });
  });

  it('records nothing until the link is clicked', () => {
    render(<ResumeLink location="about" />);
    expect(analytics.capture).not.toHaveBeenCalled();
  });
});
