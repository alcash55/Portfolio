import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import About from './About';

/**
 * Issue #80: the Track Record card restated two bullets Experience already
 * carries, and the bio's closing clause had been reused across cover letters
 * and LinkedIn drafts until Alex was done seeing it. Both are regressions
 * that are easy to reintroduce by copy-pasting an old panel back in, so this
 * file pins their absence rather than trusting the diff.
 */
describe('About (issue #80: drop Track Record, move Outside of Work up)', () => {
  it('renders no Track Record card', () => {
    render(<About />);

    expect(screen.queryByText('Track Record')).not.toBeInTheDocument();
  });

  it('never renders the retired "wrong number cost real money" clause', () => {
    render(<About />);

    expect(document.body.textContent).not.toMatch(/wrong number cost real money/i);
  });

  it('renders "Outside of Work" as the grid item right after "What Drives Me", not a separate full-width card at the bottom', () => {
    render(<About />);

    // Both cards live in the same Grid container as siblings of the Identity
    // and Bio panels, four items total. Track Record used to be a fifth item
    // sitting between them; asserting immediate adjacency plus the item
    // count fails again if a card gets reinserted in that gap.
    const drivesMeItem = screen.getByText('What Drives Me').closest('.MuiGrid-root');
    const outsideOfWorkItem = screen.getByText('Outside of Work').closest('.MuiGrid-root');
    const container = drivesMeItem?.parentElement;

    expect(container).not.toBeNull();
    expect(container?.children).toHaveLength(4);
    expect(drivesMeItem?.nextElementSibling).toBe(outsideOfWorkItem);
  });

  it("covers all four things the hero's photo grid shows: the dogs by name, RMU, coaching, and travel", () => {
    render(<About />);

    const text = document.body.textContent ?? '';
    expect(text).toMatch(/Troy/);
    expect(text).toMatch(/Leon/);
    expect(text).toMatch(/RMU/);
    expect(text).toMatch(/coach/i);
    expect(text).toMatch(/Joshua Tree/);
  });
});
