import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Experience from './Experience';

/**
 * Senior-signal pass (TEAM-BRIEF.md items 1-3): the timeline ran oldest
 * first, so a recruiter's first read was a 2020 internship instead of the
 * Solea role; the Solea bullet overclaimed sole ownership of a platform he
 * built and contributed to alongside others; and the education entry led
 * with two GPAs and framed athletics as a time commitment instead of the
 * coaching that actually differentiates him.
 */
describe('Experience order and claims', () => {
  const titles = () =>
    screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

  it('leads with Solea, not the 2020 internship', () => {
    render(<Experience />);

    const all = titles();
    expect(all[0]).toMatch(/Solea Energy/);
    expect(all[all.length - 1]).toMatch(/Intern/);
  });

  it('credits the ISO platform as built and contributed, not architected from the ground up', () => {
    render(<Experience />);

    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Architected and built.*from the ground up/i);
    expect(text).toMatch(/Built and contributed/i);
  });

  it('drops both GPAs from the education entry', () => {
    render(<Experience />);

    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/GPA/i);
    expect(text).not.toMatch(/3\.78|3\.24/);
  });

  it('gives the athletics line to coaching instead of hours logged', () => {
    render(<Experience />);

    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/40\+ hours/i);
    expect(text).toMatch(/coach/i);
  });
});
