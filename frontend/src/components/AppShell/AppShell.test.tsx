import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useState } from 'react';
import AppShellProvider from './AppShell';

/**
 * A minimal, spec-accurate `window.matchMedia` mock.
 *
 * MUI's `useMediaQuery` reads `matchMedia(query).matches` via `useSyncExternalStore` and
 * subscribes with the (deprecated but still used by MUI 5) `addListener`/`removeListener`
 * pair, so the mock must return the *same* object on repeated calls for a given query and
 * mutate its `matches` property in place — a fresh object per call would never notify.
 *
 * `setWidth` recomputes every registered query's `matches` against the new width and, for
 * any that flipped, mutates `matches` and fires the query's listeners, exactly like a real
 * browser does on resize.
 */
function createMatchMediaMock(initialWidth: number) {
  let width = initialWidth;
  const registry = new Map<string, { list: MediaQueryList; listeners: Set<() => void> }>();

  const parseMaxWidthPx = (query: string): number | null => {
    const match = query.match(/max-width:\s*([\d.]+)px/);
    return match ? parseFloat(match[1]) : null;
  };
  const evaluate = (query: string): boolean => {
    const maxWidth = parseMaxWidthPx(query);
    return maxWidth !== null ? width <= maxWidth : false;
  };

  const matchMedia = (query: string): MediaQueryList => {
    const existing = registry.get(query);
    if (existing) {
      return existing.list;
    }
    const listeners = new Set<() => void>();
    const list = {
      media: query,
      matches: evaluate(query),
      onchange: null,
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
    registry.set(query, { list, listeners });
    return list;
  };

  const setWidth = (nextWidth: number) => {
    width = nextWidth;
    registry.forEach(({ list, listeners }) => {
      const next = evaluate(list.media);
      if (next !== list.matches) {
        Object.assign(list, { matches: next });
        listeners.forEach((cb) => cb());
      }
    });
  };

  return { matchMedia, setWidth };
}

/** Renders a controlled input plus a mount counter, to prove both value and identity survive. */
const StateProbe = () => {
  const [text, setText] = useState('');
  const [mountCount, setMountCount] = useState(0);
  useEffect(() => {
    setMountCount((count) => count + 1);
  }, []);

  return (
    <div>
      <input
        aria-label="probe message"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <span data-testid="probe-mount-count">{mountCount}</span>
    </div>
  );
};

describe('AppShellProvider (breakpoint crossings must not reset app state)', () => {
  let setWidth: (width: number) => void;

  beforeEach(() => {
    localStorage.clear();
    const mock = createMatchMediaMock(1280);
    setWidth = mock.setWidth;
    vi.stubGlobal('matchMedia', mock.matchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps typed child state and the child mounted while crossing the 650px breakpoint in both directions', async () => {
    const user = userEvent.setup();
    render(
      <AppShellProvider>
        <StateProbe />
      </AppShellProvider>,
    );

    await user.type(screen.getByLabelText('probe message'), 'hello world');
    expect(screen.getByLabelText('probe message')).toHaveValue('hello world');
    expect(
      screen.getByTestId('probe-mount-count'),
      'the probe should have mounted exactly once before any resize',
    ).toHaveTextContent('1');

    // Cross below the 650px breakpoint, as a real window resize or phone rotation would.
    act(() => {
      setWidth(400);
    });

    expect(
      screen.getByLabelText('probe message'),
      'resizing into the mobile layout swapped the shell chrome; typed text must survive underneath it',
    ).toHaveValue('hello world');
    expect(
      screen.getByTestId('probe-mount-count'),
      'if AppShellProvider still swapped React component types across the breakpoint, the probe would unmount and remount here, bumping this count to 2',
    ).toHaveTextContent('1');

    // And back up above the breakpoint again.
    act(() => {
      setWidth(1280);
    });

    expect(
      screen.getByLabelText('probe message'),
      'resizing back out of the mobile layout must not lose the typed text either',
    ).toHaveValue('hello world');
    expect(screen.getByTestId('probe-mount-count')).toHaveTextContent('1');
  });

  it('switches to the sideNav layout without remounting or clearing child state', async () => {
    const user = userEvent.setup();
    render(
      <AppShellProvider>
        <StateProbe />
      </AppShellProvider>,
    );

    await user.type(screen.getByLabelText('probe message'), 'still typing');

    // The default layout's top-nav gear icon only becomes accessible after the user
    // scrolls (see NavBar's `useShowNavBar`), matching real desktop usage.
    Object.defineProperty(window, 'scrollY', { value: 2000, configurable: true });
    act(() => {
      fireEvent.scroll(window);
    });

    await user.click(screen.getByRole('button', { name: /open settings drawer/i }));
    await user.click(screen.getByRole('button', { name: /side nav/i }));

    expect(
      screen.getByLabelText('probe message'),
      'manually switching to the sideNav layout must not clear in-progress child state',
    ).toHaveValue('still typing');
    expect(
      screen.getByTestId('probe-mount-count'),
      'switching to sideNav should reuse the same child instance, not remount it',
    ).toHaveTextContent('1');
  });
});
