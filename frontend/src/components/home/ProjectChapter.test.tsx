import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PROJECT_CHAPTERS } from '~/content/home';
import { ProjectChapter } from './ProjectChapter';
import { renderInRouter } from './renderInRouter';

const spec = (id: string) => {
  const found = PROJECT_CHAPTERS.find((c) => c.id === id);
  if (!found) throw new Error(`no chapter ${id}`);
  return found;
};

describe('ProjectChapter', () => {
  it('is a region named by its h2, with the overline above it', async () => {
    await renderInRouter(<ProjectChapter spec={spec('clipper')} figure={<p>slot</p>} />);
    const region = screen.getByRole('region', { name: 'From a clip to a Short with one command' });
    expect(region).toHaveAttribute('id', 'clipper');
    expect(
      within(region).getByRole('heading', {
        level: 2,
        name: 'From a clip to a Short with one command',
      }),
    ).toBeInTheDocument();
    expect(within(region).getByText('Clipper', { selector: '.ov' })).toBeInTheDocument();
  });

  it('renders the blurb, the proof line and the private notice as text', async () => {
    await renderInRouter(<ProjectChapter spec={spec('clipper')} figure={<p>slot</p>} />);
    expect(
      screen.getByText(/^An automation pipeline that turns YouTube and Twitch clips/),
    ).toBeVisible();
    expect(
      screen.getByText(
        'One command turns a YouTube or Twitch clip into a captioned, upload-ready Short. 387 tests pass.',
      ),
    ).toHaveClass('proof');
    expect(screen.getByText('The code is private.')).toBeInTheDocument();
  });

  it('links the write-up inside the app and external links to a new tab', async () => {
    await renderInRouter(
      <ProjectChapter spec={spec('game-competition-website')} figure={<p>slot</p>} />,
    );
    expect(screen.getByRole('link', { name: /^Read the write-up/ })).toHaveAttribute(
      'href',
      '/projects/game-competition-website',
    );
    const live = screen.getByRole('link', { name: 'Open the live site (opens in a new tab)' });
    expect(live).toHaveAttribute('href', 'https://diamond-dogs-bingo.onrender.com/');
    expect(live).toHaveAttribute('target', '_blank');
    expect(live).toHaveAttribute('rel', 'noopener');
  });

  it('frames the figure slot with its number, label and caption', async () => {
    await renderInRouter(<ProjectChapter spec={spec('golem-miners')} figure={<p>slot body</p>} />);
    const fig = screen.getByRole('figure');
    expect(within(fig).getByText('Fig 5')).toBeInTheDocument();
    expect(within(fig).getByText('Recording')).toBeInTheDocument();
    expect(within(fig).getByText('slot body')).toBeInTheDocument();
    expect(within(fig).getByText('Unity 6, C#, Unity Test Framework')).toBeInTheDocument();
  });

  it('shows the Golem Miners play note after the links', async () => {
    await renderInRouter(<ProjectChapter spec={spec('golem-miners')} figure={<p>slot</p>} />);
    const note = screen.getByText(/^Single-player, about 62 MB/);
    const play = screen.getByRole('link', { name: /^Play in your browser/ });
    expect(play.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks the figure side from the spec', async () => {
    const { container } = await renderInRouter(
      <ProjectChapter spec={spec('portfolio-website')} figure={<p>slot</p>} />,
    );
    expect(container.querySelector('section')).toHaveClass('chapter', 'rev', 'big');
  });
});
