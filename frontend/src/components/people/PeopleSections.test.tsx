import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PeopleSections } from './PeopleSections';
import { renderInRouter } from './renderInRouter';

describe('PeopleSections', () => {
  it('renders chapters 8 to 12 in order, each with a heading', async () => {
    await renderInRouter(
      <QueryClientProvider client={new QueryClient()}>
        <PeopleSections resume={{ available: false }} />
      </QueryClientProvider>,
    );
    const regions = screen.getAllByRole('region').filter((el) => el.hasAttribute('data-ch'));
    expect(regions.map((el) => el.getAttribute('data-ch'))).toEqual(['8', '9', '10', '11', '12']);
    expect(regions.map((el) => el.id)).toEqual([
      'experience',
      'ncr-voyix',
      'ncr-store-health',
      'education',
      'contact',
    ]);
  });

  it('puts a supplied diagram into its chapter and an empty slot into the rest', async () => {
    await renderInRouter(
      <QueryClientProvider client={new QueryClient()}>
        <PeopleSections
          resume={{ available: false }}
          figures={{ 'ncr-voyix': <p>Voyix diagram</p> }}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Voyix diagram')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="figure"]')).toHaveLength(2);
  });

  it('builds every chapter from the home chapter and figure shell', async () => {
    await renderInRouter(
      <QueryClientProvider client={new QueryClient()}>
        <PeopleSections resume={{ available: false }} />
      </QueryClientProvider>,
    );
    const chapters = [...document.querySelectorAll<HTMLElement>('section[data-ch]')];
    expect(chapters.map((el) => el.className.split(' ').includes('chapter'))).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    // Chapters 8 to 11 each hold one framed figure. The contact band holds the form.
    expect(chapters.map((el) => el.querySelectorAll('.pair > .prose').length)).toEqual([
      1, 1, 1, 1, 1,
    ]);
    expect(chapters.map((el) => el.querySelectorAll('figure.fig').length)).toEqual([1, 1, 1, 1, 0]);
    const duplicates = document.querySelectorAll(
      '.pp-chapter, .pp-pair, .pp-prose, .pp-ov, .pp-fig, .pp-fig-h, .pp-fig-b, .pp-fig-f, .pp-slot, .pp-links, .pp-go, .pp-note, .pp-proof',
    );
    expect([...duplicates].map((el) => el.className)).toEqual([]);
  });
});
