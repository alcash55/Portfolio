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

describe('PhotoCarousel', () => {
  it('is a focusable carousel region with one captioned slide per photo', () => {
    const { region } = setup();
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(region).toHaveAttribute('tabindex', '0');
    const slides = within(region).getAllByRole('group');
    expect(slides).toHaveLength(3);
    expect(slides[0]).toHaveAccessibleName('1 of 3');
    expect(slides[0]).toHaveAttribute('aria-roledescription', 'slide');
    expect(within(region).getByRole('img', { name: EDUCATION.photos[0].alt })).toHaveAttribute(
      'width',
      '515',
    );
    expect(within(region).getByText(EDUCATION.photos[2].caption)).toBeInTheDocument();
  });

  it('starts at 1 of 3 with Previous disabled', () => {
    const { status, prev, next } = setup();
    expect(status()).toHaveTextContent('1 of 3');
    expect(status()).toHaveAttribute('aria-live', 'polite');
    expect(prev()).toBeDisabled();
    expect(next()).toBeEnabled();
  });

  it('moves one photo with Next and updates the count', async () => {
    const { user, status, prev, next } = setup();
    await user.click(next());
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: WIDTH }));
    expect(status()).toHaveTextContent('2 of 3');
    expect(prev()).toBeEnabled();
  });

  it('disables Next on the last photo', async () => {
    const { user, status, next } = setup();
    await user.click(next());
    await user.click(next());
    expect(status()).toHaveTextContent('3 of 3');
    expect(next()).toBeDisabled();
  });

  it('follows the arrow, Home and End keys while the region has focus', async () => {
    const { user, region, status } = setup();
    region.focus();
    await user.keyboard('{ArrowRight}');
    expect(status()).toHaveTextContent('2 of 3');
    await user.keyboard('{End}');
    expect(status()).toHaveTextContent('3 of 3');
    await user.keyboard('{ArrowLeft}');
    expect(status()).toHaveTextContent('2 of 3');
    await user.keyboard('{Home}');
    expect(status()).toHaveTextContent('1 of 3');
  });

  it('keeps the count in step when the visitor swipes the strip', async () => {
    vi.useFakeTimers();
    try {
      const { region, status } = setup();
      const track = region.querySelector('ul') as HTMLElement;
      track.scrollLeft = WIDTH * 2;
      act(() => {
        track.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(100);
      });
      expect(status()).toHaveTextContent('3 of 3');
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
