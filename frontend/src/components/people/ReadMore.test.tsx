import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ReadMore } from './ReadMore';

function setup() {
  render(
    <section>
      <figure>Figure</figure>
      <ReadMore points={['First point.', 'Second point.']} stack="Go, React" />
    </section>,
  );
  const details = document.querySelector('details') as HTMLDetailsElement;
  return { details, user: userEvent.setup() };
}

describe('ReadMore', () => {
  it('starts closed with a Read more control and the bullets and stack in the HTML', () => {
    const { details } = setup();
    expect(details.open).toBe(false);
    expect(screen.getByText('Read more')).toBeInTheDocument();
    expect(details).toHaveTextContent('First point.');
    expect(details).toHaveTextContent('Second point.');
    expect(details).toHaveTextContent('Go, React');
  });

  it('opens on the summary and lists the points', async () => {
    const { details, user } = setup();
    await user.click(screen.getByText('Read more'));
    expect(details.open).toBe(true);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('is a plain disclosure: no close button, and the summary toggles it', async () => {
    const { details, user } = setup();
    expect(screen.queryByRole('button', { name: 'Close Read more' })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    await user.click(screen.getByText('Read more'));
    expect(details.open).toBe(true);
    await user.click(screen.getByText('Read more'));
    expect(details.open).toBe(false);
  });

  it('keeps the points in the flow under the summary, in the same column', () => {
    const { details } = setup();
    const summary = details.querySelector('summary');
    const list = details.querySelector('ul');
    expect(summary?.nextElementSibling?.contains(list)).toBe(true);
    expect(details.querySelector('[style]')).toBeNull();
  });
});
