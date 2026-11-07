// Test stand-ins for browser features jsdom lacks. Each test installs what it needs.
import { vi } from 'vitest';

type Callback = (entries: IntersectionObserverEntry[]) => void;

interface Watcher {
  readonly callback: Callback;
  readonly targets: Set<Element>;
  readonly threshold: number;
  disconnected: boolean;
}

export interface ObserverKit {
  /** Reports an element as in or out of view to every observer watching it. */
  show(target: Element, isIntersecting?: boolean): void;
  /** How many live observers are watching the element. */
  watching(target: Element): number;
  /** The thresholds the live observers watching the element asked for. */
  thresholds(target: Element): number[];
}

export function stubIntersectionObserver(): ObserverKit {
  const watchers: Watcher[] = [];
  class FakeObserver {
    private readonly watcher: Watcher;
    constructor(callback: Callback, options?: IntersectionObserverInit) {
      const threshold = Array.isArray(options?.threshold)
        ? (options.threshold[0] ?? 0)
        : (options?.threshold ?? 0);
      this.watcher = { callback, targets: new Set(), threshold, disconnected: false };
      watchers.push(this.watcher);
    }
    observe(target: Element) {
      this.watcher.targets.add(target);
    }
    unobserve(target: Element) {
      this.watcher.targets.delete(target);
    }
    disconnect() {
      this.watcher.disconnected = true;
      this.watcher.targets.clear();
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return {
    show(target, isIntersecting = true) {
      for (const w of watchers) {
        if (w.targets.has(target)) {
          w.callback([{ target, isIntersecting } as IntersectionObserverEntry]);
        }
      }
    },
    watching: (target) => watchers.filter((w) => w.targets.has(target)).length,
    thresholds: (target) => watchers.filter((w) => w.targets.has(target)).map((w) => w.threshold),
  };
}

/** Makes `(prefers-reduced-motion: reduce)` match, and leaves every other query to the existing stub. */
export function setReducedMotion(reduce: boolean): void {
  const previous = window.matchMedia;
  window.matchMedia = (query: string): MediaQueryList => {
    if (query !== '(prefers-reduced-motion: reduce)') return previous(query);
    return {
      matches: reduce,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  };
}

export interface MediaKit {
  /** Plays, pauses and loads, in the order the component asked. */
  readonly calls: string[];
  /** Fires the media event a browser would, on the element. */
  fail(video: HTMLVideoElement): void;
  end(video: HTMLVideoElement): void;
}

/**
 * jsdom has a `paused` flag but no playback: play, pause and load throw "not
 * implemented". This keeps a paused flag per element and fires the play and
 * pause events a browser fires, so the component sees what it would in Chrome.
 */
export function stubMedia(): MediaKit {
  const calls: string[] = [];
  const paused = new WeakMap<HTMLMediaElement, boolean>();
  const proto = HTMLMediaElement.prototype;
  Object.defineProperty(proto, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return paused.get(this) ?? true;
    },
  });
  proto.play = vi.fn(function play(this: HTMLMediaElement) {
    calls.push('play');
    if (paused.get(this) !== false) {
      paused.set(this, false);
      this.dispatchEvent(new Event('play'));
    }
    return Promise.resolve();
  });
  proto.pause = vi.fn(function pause(this: HTMLMediaElement) {
    calls.push('pause');
    if (paused.get(this) === false) {
      paused.set(this, true);
      this.dispatchEvent(new Event('pause'));
    }
  });
  proto.load = vi.fn(function load(this: HTMLMediaElement) {
    calls.push('load');
    paused.set(this, true);
  });
  return {
    calls,
    fail(video) {
      // A failed <source> fires `error` on the source and does not bubble.
      const source = video.querySelector('source');
      (source ?? video).dispatchEvent(new Event('error'));
    },
    end(video) {
      paused.set(video, true);
      video.dispatchEvent(new Event('ended'));
    },
  };
}
