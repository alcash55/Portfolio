import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { About } from './About';

function figure(n: number): HTMLElement {
  const el = screen.getByText(`Fig ${n}`).closest('figure');
  if (!el) throw new Error(`No figure numbered ${n}`);
  return el;
}

describe('About', () => {
  it('is the page h1 and names its region', () => {
    render(<About />);
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
    render(<About />);
    expect(screen.getByText(/^I'm a software engineer in Memphis, TN\./)).toBeInTheDocument();
    expect(screen.getByText("Let's work together.")).toBeInTheDocument();
  });

  it('sends Message Alex to the contact section', () => {
    render(<About />);
    expect(
      screen.getByRole('link', { name: 'Message Alex (goes to the contact form)' }),
    ).toHaveAttribute('href', '#contact');
  });

  it('opens the resume in a new tab and says so in its name', () => {
    render(<About />);
    const link = screen.getByRole('link', { name: 'View resume (PDF, opens in a new tab)' });
    expect(link).toHaveTextContent('View resume');
    expect(link).toHaveAttribute('href', '/resume');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
  });

  it('opens LinkedIn and GitHub in a new tab', () => {
    render(<About />);
    for (const [name, href] of [
      ['LinkedIn (opens in a new tab)', 'https://www.linkedin.com/in/alexander-cash/'],
      ['GitHub (opens in a new tab)', 'https://github.com/alcash55'],
    ] as const) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('shows Joshua Tree and then Koda and Troy in one Fig 0 carousel', () => {
    render(<About />);
    const fig = figure(0);
    expect(within(fig).getByText('Photos')).toBeInTheDocument();
    expect(screen.queryByText('Fig 1')).not.toBeInTheDocument();
    const region = within(fig).getByRole('region', { name: 'About me photos' });
    const portrait = within(region).getByRole('img', { name: 'Alex at Joshua Tree.' });
    expect(portrait).toHaveAttribute('width', '565');
    expect(portrait).toHaveAttribute('height', '424');
    expect(portrait).not.toHaveAttribute('loading', 'lazy');
    expect(within(region).getByText('Joshua Tree')).toBeInTheDocument();
    const dogs = within(region).getByRole('img', { name: /^Koda, a black and white doodle/ });
    expect(dogs).toHaveAttribute('src', '/media/koda_and_troy.webp');
    expect(dogs).toHaveAttribute('loading', 'lazy');
    expect(within(region).getByText('Koda (left) and Troy (right).')).toBeInTheDocument();
  });
});
