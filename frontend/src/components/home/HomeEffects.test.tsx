import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeEffects } from './HomeEffects';
import { ReadingLine } from './ReadingLine';

type Entry = { target: Element; isIntersecting: boolean };
let fire: (entries: Entry[]) => void = () => {};
const disconnect = vi.fn();
const observe = vi.fn();
const unobserve = vi.fn();

function setMotion(allowed: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query === '(prefers-reduced-motion: no-preference)' ? allowed : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  disconnect.mockClear();
  observe.mockClear();
  unobserve.mockClear();
  class FakeObserver {
    constructor(cb: (entries: Entry[]) => void) {
      fire = cb;
    }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  setMotion(true);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scroll reveal', () => {
  function Page() {
    return (
      <>
        <HomeEffects />
        <div className="rv" data-testid="visible" />
        <div className="rv" data-testid="below" />
      </>
    );
  }

  it('puts no hidden state in the server HTML', () => {
    expect(renderToString(<Page />)).not.toContain('data-rv');
  });

  it('marks below-the-fold elements as waiting, then shows each once when it enters', () => {
    const before = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        return { top: this.getAttribute('data-testid') === 'below' ? 2000 : 100 } as DOMRect;
      });
    render(<Page />);
    const visible = screen.getByTestId('visible');
    const below = screen.getByTestId('below');
    expect(visible).not.toHaveAttribute('data-rv');
    expect(below).toHaveAttribute('data-rv', 'wait');
    act(() => fire([{ target: below, isIntersecting: true }]));
    expect(below).toHaveAttribute('data-rv', 'in');
    expect(unobserve).toHaveBeenCalledWith(below);
    before.mockRestore();
  });

  it('does nothing when the visitor prefers reduced motion', () => {
    setMotion(false);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 2000 } as DOMRect);
    render(<Page />);
    expect(screen.getByTestId('below')).not.toHaveAttribute('data-rv');
    expect(observe).not.toHaveBeenCalled();
  });

  it('stops observing on unmount', () => {
    const { unmount } = render(<Page />);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe('Message Alex', () => {
  it('scrolls to the contact form and focuses its first field', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <>
        <HomeEffects />
        <a href="#contact" data-msg>
          Message Alex
        </a>
        <section id="contact">
          <input aria-label="Name" />
        </section>
      </>,
    );
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    vi.useRealTimers();
  });

  it('jumps without smooth scrolling under reduced motion', async () => {
    setMotion(false);
    const user = userEvent.setup();
    render(
      <>
        <HomeEffects />
        <a href="#contact" data-msg>
          Message Alex
        </a>
        <section id="contact" />
      </>,
    );
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
  });

  it('leaves the link alone while there is no contact section on the page', async () => {
    const user = userEvent.setup();
    render(
      <>
        <HomeEffects />
        <a href="#contact" data-msg>
          Message Alex
        </a>
      </>,
    );
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('in-page links', () => {
  it('move focus to the chapter heading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <>
        <HomeEffects />
        <a href="#projects">Projects</a>
        <section id="projects">
          <h2 tabIndex={-1}>Projects.</h2>
        </section>
      </>,
    );
    await user.click(screen.getByRole('link', { name: 'Projects' }));
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByRole('heading', { name: 'Projects.' })).toHaveFocus();
    vi.useRealTimers();
  });
});

describe('ReadingLine', () => {
  it('is decorative', () => {
    const { container } = render(<ReadingLine />);
    expect(container.querySelector('.prog')).toHaveAttribute('aria-hidden', 'true');
  });

  it('fills with scroll position where scroll timelines are missing', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const { container } = render(<ReadingLine />);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(container.querySelector<HTMLElement>('.prog i')?.style.transform).toBe('scaleX(0.5)');
  });

  it('leaves the transform to CSS where scroll timelines exist', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const { container } = render(<ReadingLine />);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(container.querySelector<HTMLElement>('.prog i')?.style.transform).toBe('');
  });
});
