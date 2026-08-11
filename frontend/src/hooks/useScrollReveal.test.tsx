import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useScrollReveal, type ScrollRevealOptions } from './useScrollReveal';

/**
 * The property that actually matters here is the failure mode: a reveal
 * animation that fails closed hides the entire page. Most of these check that
 * content ends up visible in every environment where the animation cannot run.
 *
 * These render a real element rather than using `renderHook`, because the hook
 * only arms itself once its ref is attached to something -- a bare `renderHook`
 * leaves `ref.current` null, which is (correctly) treated as "cannot animate,
 * so show the content".
 */

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

const installObserver = () => {
  const instances: { callback: IOCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
  class MockIO {
    callback: IOCallback;
    disconnect = vi.fn();
    observe = vi.fn();
    constructor(callback: IOCallback) {
      this.callback = callback;
      instances.push(this);
    }
  }
  vi.stubGlobal('IntersectionObserver', MockIO);
  return instances;
};

/** Mirrors real usage: the hook's ref and sx go onto one element. */
const seen: { sx: Record<string, unknown>; revealed: boolean } = { sx: {}, revealed: false };
const Probe = (options: ScrollRevealOptions) => {
  const { ref, sx, revealed } = useScrollReveal<HTMLDivElement>(options);
  seen.sx = sx as Record<string, unknown>;
  seen.revealed = revealed;
  return <div ref={ref} data-testid="probe" />;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useScrollReveal', () => {
  it('starts revealed when there is no IntersectionObserver, rather than hiding the content', () => {
    // jsdom ships none, as does any browser old enough to lack it. Failing
    // closed here would blank the page instead of skipping an animation.
    render(<Probe />);

    expect(seen.revealed).toBe(true);
    expect(seen.sx).toEqual({});
  });

  it('starts hidden and offset when it can animate', () => {
    installObserver();
    render(<Probe />);

    expect(seen.revealed).toBe(false);
    expect(seen.sx).toMatchObject({ opacity: 0 });
  });

  it('reveals when the element intersects', () => {
    const instances = installObserver();
    render(<Probe />);

    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(seen.revealed).toBe(true);
    expect(seen.sx).toMatchObject({ opacity: 1, transform: 'none' });
  });

  it('fades back out when the element leaves again, so the effect is reversible', () => {
    const instances = installObserver();
    render(<Probe />);

    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });
    expect(seen.revealed).toBe(true);

    // Scrolling back up: it must not latch on the first reveal.
    act(() => {
      instances[0].callback([{ isIntersecting: false } as IntersectionObserverEntry]);
    });

    expect(seen.revealed).toBe(false);
    expect(seen.sx).toMatchObject({ opacity: 0 });
    expect(instances[0].disconnect).not.toHaveBeenCalled();
  });

  it('drops the stagger delay on the way out', () => {
    // A reverse cascade on exit reads as the page unloading rather than
    // animating, so delays are for the entrance only.
    const instances = installObserver();
    render(<Probe stagger={80} />);

    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });
    expect(
      (seen.sx as Record<string, { transitionDelay?: string }>)['& > *:nth-of-type(2)'],
    ).toBeDefined();

    act(() => {
      instances[0].callback([{ isIntersecting: false } as IntersectionObserverEntry]);
    });

    const sx = seen.sx as Record<string, { transitionDelay?: string }>;
    expect(sx['& > *:nth-of-type(2)']).toBeUndefined();
    expect(sx['& > *'].transitionDelay).toBe('0ms');
  });

  it('stays hidden while the element has not yet been reached', () => {
    const instances = installObserver();
    render(<Probe />);

    act(() => {
      instances[0].callback([{ isIntersecting: false } as IntersectionObserverEntry]);
    });

    expect(seen.revealed).toBe(false);
  });

  it('applies no animation at all under prefers-reduced-motion', () => {
    installObserver();
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      })),
    );

    render(<Probe />);

    expect(seen.revealed).toBe(true);
    expect(seen.sx).toEqual({});
  });

  it('staggers direct children by the given interval instead of moving the container', () => {
    const instances = installObserver();
    render(<Probe stagger={80} />);
    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });
    const sx = seen.sx as Record<string, { transitionDelay?: string }>;

    expect(sx['& > *:nth-of-type(1)'].transitionDelay).toBe('0ms');
    expect(sx['& > *:nth-of-type(2)'].transitionDelay).toBe('80ms');
    expect(sx['& > *:nth-of-type(3)'].transitionDelay).toBe('160ms');
    // The container itself must not move -- it owns the grid layout.
    expect(sx.opacity).toBeUndefined();
    expect(sx.transform).toBeUndefined();
  });

  it('caps the stagger so a long list does not trail further and further behind', () => {
    const instances = installObserver();
    render(<Probe stagger={100} staggerCap={3} />);
    act(() => {
      instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });
    const sx = seen.sx as Record<string, { transitionDelay?: string }>;

    expect(sx['& > *:nth-of-type(3)'].transitionDelay).toBe('200ms');
    expect(sx['& > *:nth-of-type(n + 4)'].transitionDelay).toBe('200ms');
  });
});
