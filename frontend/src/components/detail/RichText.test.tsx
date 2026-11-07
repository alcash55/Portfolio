import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './RichText';

describe('RichText', () => {
  it('turns backtick spans into code elements and leaves the rest as text', () => {
    const { container } = render(<RichText text="Run `bun test` before `git push`, then relax." />);
    const codes = [...container.querySelectorAll('code')].map((el) => el.textContent);
    expect(codes).toEqual(['bun test', 'git push']);
    expect(container.textContent).toBe('Run bun test before git push, then relax.');
  });

  it('renders plain text with no code element', () => {
    const { container } = render(<RichText text="No code here." />);
    expect(container.querySelector('code')).toBeNull();
    expect(container.textContent).toBe('No code here.');
  });

  it('leaves an unmatched backtick as a literal character', () => {
    const { container } = render(<RichText text="One stray ` mark." />);
    expect(container.querySelector('code')).toBeNull();
    expect(container.textContent).toBe('One stray ` mark.');
  });
});
