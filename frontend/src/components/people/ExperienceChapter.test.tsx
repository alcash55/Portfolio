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

  it('shows the Solea highlights and stack as plain visible text, since it has no write-up', async () => {
    await renderInRouter(<ExperienceChapter spec={solea} figure={<div>Diagram</div>} />);
    expect(screen.queryByRole('link', { name: /write-up/ })).not.toBeInTheDocument();
    if (solea.writeUp) throw new Error('Solea should have no write-up');
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(solea.more.length);
    for (const point of solea.more) expect(screen.getByText(point)).toBeVisible();
    expect(screen.getByText(solea.stack)).toBeVisible();
  });

  it('has no Read more control or details element on any chapter', async () => {
    for (const spec of EXPERIENCE) {
      const { unmount } = await renderInRouter(
        <ExperienceChapter spec={spec} figure={<div>Diagram</div>} />,
      );
      expect(screen.queryByText('Read more'), spec.id).not.toBeInTheDocument();
      expect(document.querySelector('details'), spec.id).toBeNull();
      unmount();
    }
  });

  it('leaves the write-up bullets off a chapter that links to its write-up', async () => {
    await renderInRouter(<ExperienceChapter spec={voyix} figure={<div>Diagram</div>} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/Commerce Design Docs/)).not.toBeInTheDocument();
  });
});
