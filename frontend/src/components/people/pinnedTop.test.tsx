import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pinnedTop } from './pinnedTop';
import { ReadMore } from './ReadMore';

describe('pinnedTop', () => {
  it('centers the pair on the snap height less the bottom padding', () => {
    expect(pinnedTop({ snap: 832, pairHeight: 654.5, rem: 16 })).toBeCloseTo(76.75, 2);
  });

  it('keeps 1.5rem above a pair taller than the screen', () => {
    expect(pinnedTop({ snap: 832, pairHeight: 820, rem: 16 })).toBe(24);
  });
});

function mountChapter(wide: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: wide, media: query }) as MediaQueryList,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const height = this.classList.contains('pair') ? 654.5 : 0;
    return { height } as DOMRect;
  });
  const view = render(
    <section className="chapter" style={{ minHeight: '832px' }}>
      <div className="pair">
        <ReadMore points={['One.']} stack="Go" />
      </div>
    </section>,
  );
  return { chapter: view.container.querySelector('section') as HTMLElement };
}

describe('Read more chapter centering', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fixes the top padding from the closed height so opening Read more cannot move the pair', () => {
    const { chapter } = mountChapter(true);
    expect(chapter).toHaveAttribute('data-pinned');
    expect(chapter.style.getPropertyValue('--cpad')).toBe('76.8px');
  });

  it('leaves the CSS centering alone below the two-column breakpoint', () => {
    const { chapter } = mountChapter(false);
    expect(chapter).not.toHaveAttribute('data-pinned');
  });

  it('keeps the value it measured while the panel is open', async () => {
    const { chapter } = mountChapter(true);
    await userEvent.setup().click(chapter.querySelector('summary') as HTMLElement);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 900,
    } as DOMRect);
    window.dispatchEvent(new Event('resize'));
    expect(chapter.style.getPropertyValue('--cpad')).toBe('76.8px');
  });
});
