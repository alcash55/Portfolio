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

  it('closes on Escape and returns focus to the summary', async () => {
    const { details, user } = setup();
    await user.click(screen.getByText('Read more'));
    await user.keyboard('{Escape}');
    expect(details.open).toBe(false);
    expect(screen.getByText('Read more').closest('summary')).toHaveFocus();
  });

  it('ignores Escape while closed', async () => {
    const { details, user } = setup();
    await user.tab();
    await user.keyboard('{Escape}');
    expect(details.open).toBe(false);
  });

  it('closes from the Close Read more button and returns focus to the summary', async () => {
    const { details, user } = setup();
    await user.click(screen.getByText('Read more'));
    await user.click(screen.getByRole('button', { name: 'Close Read more' }));
    expect(details.open).toBe(false);
    expect(screen.getByText('Read more').closest('summary')).toHaveFocus();
  });
});
