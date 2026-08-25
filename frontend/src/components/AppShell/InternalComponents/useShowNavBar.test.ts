import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useShowNavBar,
  SCROLL_INDICATOR_ATTR,
  stickyTopOffset,
  navBarRevealScrollY,
} from './useShowNavBar';

/**
 * These pin the two bugs the browser measurements found, both of which are
 * invisible to a test that only asks "does the bar eventually appear".
 */

/** Stand-in for the hero's scroll indicator, with a position we control. */
const mountIndicator = (bottom: number) => {
  const el = document.createElement('div');
  el.setAttribute(SCROLL_INDICATOR_ATTR, 'true');
  el.getBoundingClientRect = vi.fn(() => ({ bottom }) as DOMRect);
  document.body.appendChild(el);
  return el;
};

/**
 * Stand-in for the rendered `NavBar`. jsdom lays nothing out, so the height has
 * to be stated -- 64px is a MUI `Toolbar` above the `sm` breakpoint, which is
 * the only place the `default` layout (and therefore this bar) exists.
 *
 * The tests above deliberately mount no bar: with none in the DOM the offset is
 * 0 and the threshold is the plain `bottom <= 0` they were written against, so
 * they still assert exactly what they always did.
 */
const mountBar = (height: number) => {
  const bar = document.createElement('header');
  bar.getBoundingClientRect = vi.fn(() => ({ height }) as DOMRect);
  document.body.appendChild(bar);
  return bar;
};

/**
 * Flushes the frame the hook schedules. Its `getBoundingClientRect` read is
 * coalesced into a `requestAnimationFrame` -- one layout read per frame rather
 * than one per scroll event -- so both the initial read and every scroll need a
 * frame to pass before the result is observable.
 */
const flushFrame = async () => {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
};

const scroll = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useShowNavBar', () => {
  it('stays hidden while the arrow is still on screen', async () => {
    mountIndicator(400); // 400px below the viewport top, i.e. plainly visible
    const { result } = renderHook(() => useShowNavBar());
    await flushFrame();

    expect(result.current).toBe(false);
  });

  it('shows the moment the arrow has gone past the top of the viewport', async () => {
    const el = mountIndicator(400);
    const { result } = renderHook(() => useShowNavBar());
    await flushFrame();
    expect(result.current).toBe(false);

    // The arrow's bottom edge crosses y=0: it is now entirely above the fold.
    el.getBoundingClientRect = vi.fn(() => ({ bottom: -1 }) as DOMRect);
    await scroll();

    expect(result.current).toBe(true);
  });

  it('stays hidden when the arrow is below the fold, however far down it sits', async () => {
    // The regression this replaced: keying off "is the arrow invisible" instead
    // of "has the arrow gone *upward*". On a window shorter than the hero the
    // arrow starts below the fold -- equally invisible -- which put the bar over
    // the hero before a single pixel of scrolling. Measured on a 700px window.
    mountIndicator(1200);
    const { result } = renderHook(() => useShowNavBar());
    await flushFrame();
    await scroll();

    expect(result.current).toBe(false);
  });

  it('hides again when the visitor scrolls back up to the hero', async () => {
    const el = mountIndicator(-1);
    const { result } = renderHook(() => useShowNavBar());
    await flushFrame();
    expect(result.current).toBe(true);

    el.getBoundingClientRect = vi.fn(() => ({ bottom: 200 }) as DOMRect);
    await scroll();

    expect(result.current).toBe(false);
  });

  it('falls back to the scroll-offset rule when there is no indicator to watch', async () => {
    // The error page, and any test rendering the shell without Landing, have no
    // arrow to key off. The bar must still appear rather than being stuck off.
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });

    const { result } = renderHook(() => useShowNavBar());
    expect(result.current).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 2000, configurable: true });
    await scroll();

    expect(result.current).toBe(true);
  });

  it('shows once the arrow reaches the bar it is about to reveal, not only once it clears the window', async () => {
    // The reason the threshold is the bar's footprint rather than y=0. About's
    // heading sits 32px below the hero's bottom edge while the bar is 64px
    // tall, so with a y=0 threshold there is no scroll position that both puts
    // the arrow above the window and leaves the heading clear of the bar --
    // the arrow click had to fail one or the other, which was the bug. An
    // arrow inside the opaque bar's own footprint is already out of sight.
    mountBar(64);
    mountIndicator(40);
    const { result } = renderHook(() => useShowNavBar());
    await flushFrame();

    expect(result.current).toBe(true);
  });

  it('stays hidden with the arrow at that same position when no bar is rendered', async () => {
    // Same 40px, opposite answer: `sideNav` and `mobile` render no top bar, so
    // nothing is covering the arrow and it is still plainly on screen. Pins
    // that the offset comes from the bar actually in the DOM rather than a
    // constant that would have leaked into the layouts without one.
    mountIndicator(40);
    const { result } = renderHook(() => useShowNavBar());
    await flushFrame();

    expect(result.current).toBe(false);
  });

  it('removes its listeners on unmount', () => {
    mountIndicator(400);
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useShowNavBar());
    unmount();

    const removed = remove.mock.calls.map(([event]) => event);
    expect(removed).toContain('scroll');
    expect(removed).toContain('resize');
    remove.mockRestore();
  });
});

describe('stickyTopOffset', () => {
  it('is 0 in a layout with no top bar', () => {
    // `sideNav` and `mobile` render none -- a side rail and a *bottom* nav.
    expect(stickyTopOffset()).toBe(0);
  });

  it('is the bar\'s own measured height, not a written-down one', () => {
    // Measured rather than hardcoded because a MUI Toolbar is 56px or 64px by
    // breakpoint, and this project has already shipped one bug from a chrome
    // height written into the source (`scrollY > innerHeight - 14`). 56 here
    // precisely because it is *not* the value the desktop bar happens to have.
    mountBar(56);
    expect(stickyTopOffset()).toBe(56);
  });
});

describe('navBarRevealScrollY', () => {
  /**
   * This is the number Landing's arrow aims past. It only means anything if it
   * agrees with the hook's own threshold -- the whole bug was the two sides
   * deciding separately whether a scroll position counted as "the bar is up".
   */
  const setScrollY = (value: number) =>
    Object.defineProperty(window, 'scrollY', { value, configurable: true });

  afterEach(() => setScrollY(0));

  it('is null when there is no indicator to measure', () => {
    // The error page, and any shell rendered without Landing.
    expect(navBarRevealScrollY()).toBeNull();
  });

  it('reports the scroll position at which the hook flips, bar included', () => {
    setScrollY(500);
    mountBar(64);
    // 300px below the window top, so 800px down the document.
    mountIndicator(300);

    // 800 - 64: at that scroll position the indicator's bottom sits exactly on
    // the bar's bottom edge, which is where the hook starts returning true.
    expect(navBarRevealScrollY()).toBe(736);
  });

  it('rounds up, so the value it returns actually satisfies the threshold', () => {
    setScrollY(0);
    mountIndicator(100.4);
    // The hook's comparison is `<=`, so at a fractional edge the first integer
    // scroll position that satisfies it is the ceiling, not the floor --
    // 100 would leave the indicator 0.4px short and the bar hidden.
    expect(navBarRevealScrollY()).toBe(101);
  });
});
