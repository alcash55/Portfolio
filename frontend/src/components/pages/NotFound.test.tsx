import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '~/components/people/renderInRouter';
import { NotFoundRoute, NotFoundSlug } from './NotFound';

describe('NotFoundSlug', () => {
  it('offers a breadcrumb back to the project list', async () => {
    await renderInRouter(<NotFoundSlug />);
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const back = within(crumb).getByRole('link', { name: 'All projects' });
    expect(back).toHaveAttribute('href', '/#projects');
  });

  it('shows both actions as pill buttons, primary first', async () => {
    await renderInRouter(<NotFoundSlug />);
    const primary = screen.getByRole('link', { name: 'See all projects' });
    const secondary = screen.getByRole('link', { name: 'Go to the home page' });
    // The shared button styles key off these class names.
    expect(primary).toHaveClass('btn', 'btn-primary');
    expect(secondary).toHaveClass('btn', 'btn-2');
  });
});

describe('NotFoundRoute', () => {
  it('has no breadcrumb, because an unknown address has no section to return to', async () => {
    await renderInRouter(<NotFoundRoute />);
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("That page doesn't exist.");
  });

  it('shows both actions as pill buttons, primary first', async () => {
    await renderInRouter(<NotFoundRoute />);
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveClass(
      'btn',
      'btn-primary',
    );
    expect(screen.getByRole('link', { name: 'See the projects' })).toHaveClass('btn', 'btn-2');
  });
});
