import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CERTIFICATES, formatCompleted, formatDuration } from '~/content/people';
import { Certificates } from './Certificates';
import { renderInRouter } from './renderInRouter';

describe('Certificates content', () => {
  it('lists the courses newest first', () => {
    const dates = CERTIFICATES.map((cert) => cert.completed);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('formats dates and durations as the certificates print them', () => {
    expect(formatCompleted('2026-11-03')).toBe('Nov 3, 2026');
    expect(formatCompleted('2026-10-19')).toBe('Oct 19, 2026');
    expect(formatDuration(7 * 60 + 57)).toBe('7 hr 57 min');
    expect(formatDuration(60 + 56)).toBe('1 hr 56 min');
  });
});

describe('Certificates', () => {
  it('is the Certificates region with the chapter number and id the index expects', async () => {
    await renderInRouter(<Certificates />);
    const region = screen.getByRole('region', {
      name: 'Four Master.dev courses finished since October',
    });
    expect(region).toHaveAttribute('id', 'certificates');
    expect(region).toHaveAttribute('data-ch', '12');
  });

  it('states the total hours, summed from the rows', async () => {
    await renderInRouter(<Certificates />);
    // 7:57 + 8:12 + 1:56 + 4:10 = 22:15
    expect(screen.getByText(/run 22 hours and 15 minutes\./)).toBeInTheDocument();
  });

  it('gives each course a text row with the teacher, length and date', async () => {
    await renderInRouter(<Certificates />);
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows).toHaveLength(CERTIFICATES.length);
    expect(rows[0]).toHaveTextContent('Basics of Go');
    expect(rows[0]).toHaveTextContent('Maximiliano Firtman, 7 hr 57 min, Nov 3, 2026');
    expect(rows[3]).toHaveTextContent('Vite');
    expect(rows[3]).toHaveTextContent('Steve Kinney, 4 hr 10 min, Oct 3, 2026');
  });

  it('links each title to the certificate image and says it opens in a new tab', async () => {
    await renderInRouter(<Certificates />);
    const link = screen.getByRole('link', {
      // jsdom trims the span's leading space; a real browser keeps it. Accept both.
      name: /^Claude Code\s?\(certificate image, opens in a new tab\)$/,
    });
    expect(link).toHaveAttribute('href', '/images/certificates/claude-code.webp');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows every certificate in a numbered carousel with certificate-specific buttons', async () => {
    await renderInRouter(<Certificates />);
    expect(screen.getByText('Fig 12')).toBeInTheDocument();
    const carousel = screen.getByRole('region', { name: 'Master.dev certificates' });
    expect(within(carousel).getAllByRole('img')).toHaveLength(CERTIFICATES.length);
    expect(
      within(carousel).getByRole('img', {
        name: 'Master.dev certificate of completion for Vite, completed Oct 3, 2026.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next certificate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous certificate' })).toBeInTheDocument();
  });
});
