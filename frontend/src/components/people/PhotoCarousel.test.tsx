import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EDUCATION } from '~/content/people';
import { PhotoCarousel } from './PhotoCarousel';

const WIDTH = 400;
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollTo = vi.fn(function (this: HTMLElement, arg: ScrollToOptions) {
    this.scrollLeft = arg.left ?? 0;
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: WIDTH });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scrollTo });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
});

function setup() {
  render(
    <PhotoCarousel fig={EDUCATION.fig} label={EDUCATION.carouselLabel} photos={EDUCATION.photos} />,
  );
  return {
    user: userEvent.setup(),
    region: screen.getByRole('region', { name: 'Education and coaching photos' }),
    status: () => screen.getByRole('status'),
    prev: () => screen.getByRole('button', { name: 'Previous photo' }),
    next: () => screen.getByRole('button', { name: 'Next photo' }),
  };
}

const TOTAL = EDUCATION.photos.length;

describe('PhotoCarousel', () => {
  it('is a focusable carousel region with one captioned slide per photo', () => {
    const { region } = setup();
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(region).toHaveAttribute('tabindex', '0');
    // Slides carry role group, so a list wrapper would hold no list items.
    expect(within(region).queryByRole('list')).not.toBeInTheDocument();
    const slides = within(region).getAllByRole('group');
    expect(slides).toHaveLength(TOTAL);
    expect(slides[0]).toHaveAccessibleName(`1 of ${TOTAL}`);
    expect(slides[0]).toHaveAttribute('aria-roledescription', 'slide');
    expect(within(region).getByRole('img', { name: EDUCATION.photos[0].alt })).toHaveAttribute(
      'width',
      String(EDUCATION.photos[0].width),
    );
    expect(within(region).getByText(EDUCATION.photos[2].caption)).toBeInTheDocument();
  });

  it('starts at the first photo with both buttons live', () => {
    const { status, prev, next } = setup();
    expect(status()).toHaveTextContent(`1 of ${TOTAL}`);
    expect(status()).toHaveAttribute('aria-live', 'polite');
    expect(prev()).not.toHaveAttribute('aria-disabled');
    expect(next()).not.toHaveAttribute('aria-disabled');
  });

  it('moves one photo with Next and updates the count', async () => {
    const { user, status, prev, next } = setup();
    await user.click(next());
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: WIDTH }));
    expect(status()).toHaveTextContent(`2 of ${TOTAL}`);
    expect(prev()).toBeEnabled();
  });

  it('loops from the last photo back to the first with Next', async () => {
    const { user, status, next } = setup();
    for (let i = 1; i < TOTAL; i++) await user.click(next());
    expect(status()).toHaveTextContent(`${TOTAL} of ${TOTAL}`);
    await user.click(next());
    expect(status()).toHaveTextContent(`1 of ${TOTAL}`);
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0 }));
  });

  it('loops from the first photo to the last with Previous', async () => {
    const { user, status, prev } = setup();
    await user.click(prev());
    expect(status()).toHaveTextContent(`${TOTAL} of ${TOTAL}`);
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: WIDTH * (TOTAL - 1) }),
    );
  });

  it('loops with the arrow keys too', async () => {
    const { user, region, status } = setup();
    region.focus();
    await user.keyboard('{ArrowLeft}');
    expect(status()).toHaveTextContent(`${TOTAL} of ${TOTAL}`);
    await user.keyboard('{ArrowRight}');
    expect(status()).toHaveTextContent(`1 of ${TOTAL}`);
  });

  it('follows the arrow, Home and End keys while the region has focus', async () => {
    const { user, region, status } = setup();
    region.focus();
    await user.keyboard('{ArrowRight}');
    expect(status()).toHaveTextContent(`2 of ${TOTAL}`);
    await user.keyboard('{End}');
    expect(status()).toHaveTextContent(`${TOTAL} of ${TOTAL}`);
    await user.keyboard('{ArrowLeft}');
    expect(status()).toHaveTextContent(`${TOTAL - 1} of ${TOTAL}`);
    await user.keyboard('{Home}');
    expect(status()).toHaveTextContent(`1 of ${TOTAL}`);
  });

  it('keeps the count in step when the visitor swipes the strip', async () => {
    vi.useFakeTimers();
    try {
      const { region, status } = setup();
      // The focusable region is the scroller, so a keyboard user can scroll it too.
      const track = region;
      track.scrollLeft = WIDTH * (TOTAL - 1);
      act(() => {
        track.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(100);
      });
      expect(status()).toHaveTextContent(`${TOTAL} of ${TOTAL}`);
    } finally {
      vi.useRealTimers();
    }
  });

  it('scrolls without animation when the visitor prefers reduced motion', async () => {
    window.matchMedia = (query: string) =>
      ({ matches: query === '(prefers-reduced-motion: reduce)', media: query }) as MediaQueryList;
    const { user, next } = setup();
    await user.click(next());
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});
