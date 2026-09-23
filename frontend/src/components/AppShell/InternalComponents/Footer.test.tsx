import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

/**
 * Senior-signal pass (TEAM-BRIEF.md item 1): the footer repeated the hero's
 * "crafting elegant, reliable systems" line, which reads as generic and
 * machine-written rather than something only Alex would write.
 */
describe('Footer copy', () => {
  it('never says "crafting" or "elegant"', () => {
    render(<Footer />);

    const text = screen.getByText(/Software Engineer/i).textContent ?? '';
    expect(text.toLowerCase()).not.toMatch(/crafting|elegant/);
  });
});
