import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Skills from './Skills';

/**
 * Senior-signal pass (TEAM-BRIEF.md item 5): the tech wall was 30-plus flat
 * logos with no signal about depth versus familiarity. React, TypeScript and
 * Go are the three tools the page's own bio names as "where I spend most of
 * my time" (aboutData.tsx), so they render as filled chips; everything else
 * (Figma, Cursor, GitHub and the rest) renders outlined, so the wall shows
 * depth instead of pure keyword coverage.
 */
describe('Skills depth grouping', () => {
  it('renders the named core stack as filled chips and the rest as outlined', () => {
    render(<Skills />);

    const chipRoot = (label: string) => screen.getByText(label).closest('.MuiChip-root');
    // Go's chip is a wordmark (see skillsData.ts): the SVG already spells the
    // name, so the visible text is dropped in favour of an accessible label
    // on the icon itself rather than found by `getByText`.
    const wordmarkChipRoot = (label: string) =>
      screen.getByRole('img', { name: label }).closest('.MuiChip-root');

    for (const label of ['React', 'TypeScript']) {
      expect(chipRoot(label), `${label} chip not found`).toHaveClass('MuiChip-filled');
    }
    expect(wordmarkChipRoot('Go'), 'Go chip not found').toHaveClass('MuiChip-filled');

    for (const label of ['Figma', 'Cursor', 'GitHub']) {
      expect(chipRoot(label), `${label} chip not found`).toHaveClass('MuiChip-outlined');
    }
  });
});
