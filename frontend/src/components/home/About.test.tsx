import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { About } from './About';
import { ProjectsIntro } from './ProjectsIntro';

describe('About', () => {
  it('is the page h1 and names its region', () => {
    render(<About resume={{ available: true, bytes: 23_000 }} />);
    const h1 = screen.getByRole('heading', {
      level: 1,
      name: 'Alex Cash builds the Go API and the page that reads it.',
    });
    expect(screen.getByRole('region', { name: h1.textContent ?? '' })).toHaveAttribute(
      'id',
      'about',
    );
  });

  it('carries the bio and the availability line as text', () => {
    render(<About resume={{ available: true, bytes: 23_000 }} />);
    expect(screen.getByText(/^I'm a software engineer in Memphis, TN\./)).toBeInTheDocument();
    expect(screen.getByText("Let's work together.")).toBeInTheDocument();
  });

  it('sends Message Alex to the contact section', () => {
    render(<About resume={{ available: true, bytes: 23_000 }} />);
    expect(
      screen.getByRole('link', { name: 'Message Alex (goes to the contact form)' }),
    ).toHaveAttribute('href', '#contact');
  });

  it('names the resume size and the new tab only when a PDF exists', () => {
    const { unmount } = render(<About resume={{ available: true, bytes: 23_000 }} />);
    const withSize = screen.getByRole('link', {
      name: 'View resume (PDF, 23 KB, opens in a new tab)',
    });
    expect(withSize).toHaveAttribute('href', '/resume');
    expect(withSize).toHaveAttribute('target', '_blank');
    unmount();
    render(<About resume={{ available: false }} />);
    const without = screen.getByRole('link', { name: 'View resume' });
    expect(without).toHaveAttribute('href', '/resume');
    expect(without).not.toHaveAttribute('target');
  });

  it('opens LinkedIn and GitHub in a new tab', () => {
    render(<About resume={{ available: false }} />);
    for (const [name, href] of [
      ['LinkedIn (opens in a new tab)', 'https://www.linkedin.com/in/alexander-cash/'],
      ['GitHub (opens in a new tab)', 'https://github.com/alcash55'],
    ] as const) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('frames the portrait as Fig 0 with its alt text and caption', () => {
    render(<About resume={{ available: false }} />);
    const fig = screen.getByRole('figure');
    expect(within(fig).getByText('Fig 0')).toBeInTheDocument();
    expect(within(fig).getByText('Portrait')).toBeInTheDocument();
    const img = within(fig).getByRole('img', { name: 'Alex at Joshua Tree.' });
    expect(img).toHaveAttribute('width', '565');
    expect(img).toHaveAttribute('height', '424');
    expect(img).not.toHaveAttribute('loading', 'lazy');
    expect(within(fig).getByText('Joshua Tree')).toBeInTheDocument();
  });
});

describe('ProjectsIntro', () => {
  it('is a region with the Projects h2 and the one-line intro', () => {
    render(<ProjectsIntro />);
    const region = screen.getByRole('region', { name: 'Projects.' });
    expect(region).toHaveAttribute('id', 'projects');
    expect(
      within(region).getByRole('heading', { level: 2, name: 'Projects.' }),
    ).toBeInTheDocument();
    expect(
      within(region).getByText('Each project links to its source, or says the code is private.'),
    ).toBeInTheDocument();
  });
});
