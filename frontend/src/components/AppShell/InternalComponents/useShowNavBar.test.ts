import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShowNavBar, SCROLL_INDICATOR_ATTR } from './useShowNavBar';

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
