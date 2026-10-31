import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EXPERIENCE } from '~/content/people';
import { renderInRouter } from './renderInRouter';
import { ExperienceChapter } from './ExperienceChapter';

const [solea, voyix, health] = EXPERIENCE;
if (!solea || !voyix || !health) throw new Error('experience content missing');

describe('ExperienceChapter', () => {
  it('names the section with its heading and shows the overline, role and lead', async () => {
    await renderInRouter(<ExperienceChapter spec={voyix} figure={<div>Diagram</div>} />);
    const region = screen.getByRole('region', { name: 'Rebuilding the Voyix docs site' });
    expect(region).toHaveAttribute('id', 'ncr-voyix');
    expect(within(region).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Rebuilding the Voyix docs site',
    );
    expect(within(region).getByText('NCR Voyix · 4/2023 to 6/2024')).toBeInTheDocument();
    expect(within(region).getByText('Software Engineer II')).toBeInTheDocument();
    expect(within(region).getByText(/navigation for 2,300\+ pages/)).toBeInTheDocument();
  });

  it('links the write-up to the experience page and says the code belongs to NCR', async () => {
    await renderInRouter(<ExperienceChapter spec={health} figure={<div>Diagram</div>} />);
    const link = screen.getByRole('link', { name: /Read the write-up/ });
    expect(link).toHaveAttribute('href', '/experience/starbucks-store-health');
    expect(screen.getByText('The code belongs to NCR.')).toBeInTheDocument();
  });

  it('has no write-up link for Solea, where the panel carries the detail', async () => {
    await renderInRouter(<ExperienceChapter spec={solea} figure={<div>Diagram</div>} />);
    expect(screen.queryByRole('link', { name: /write-up/ })).not.toBeInTheDocument();
    expect(screen.getByText('Read more')).toBeInTheDocument();
  });

  it('renders the Read more panel closed but present for readers without JavaScript', async () => {
    await renderInRouter(<ExperienceChapter spec={voyix} figure={<div>Diagram</div>} />);
    const details = document.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    for (const line of voyix.more) expect(details).toHaveTextContent(line.slice(0, 40));
    expect(details).toHaveTextContent(voyix.stack);
  });
});
