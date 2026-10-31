// A controllable stand-in for the browser's color-scheme preference. jsdom ships
// no matchMedia, and tests need to flip the preference and see listeners fire.
type Listener = (event: { matches: boolean }) => void;

const DARK_QUERY = '(prefers-color-scheme: dark)';
let prefersDark = false;
const listeners = new Set<Listener>();

export function setSystemPrefersDark(value: boolean): void {
  prefersDark = value;
  listeners.forEach((listener) => listener({ matches: value }));
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const matches = () => query === DARK_QUERY && prefersDark;
    return {
      get matches() {
        return matches();
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (query === DARK_QUERY && typeof listener === 'function') {
          listeners.add(listener as unknown as Listener);
        }
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener as unknown as Listener);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  };
}

export function resetSystem(): void {
  prefersDark = false;
  listeners.clear();
}
