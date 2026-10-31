import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChapterNav } from './ChapterNav';

type Entry = { target: Element; isIntersecting: boolean };
let observed: Element[] = [];
let fire: (entries: Entry[]) => void = () => {};

beforeEach(() => {
  observed = [];
  class FakeObserver {
    constructor(cb: (entries: Entry[]) => void) {
      fire = cb;
    }
    observe(el: Element) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  // jsdom has no popover API. The browser suite covers the real top-layer behavior.
  HTMLElement.prototype.hidePopover = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Page() {
  return (
    <>
      <ChapterNav />
      <section data-ch="1" data-title="About me" id="about">
        <h1 tabIndex={-1}>About</h1>
      </section>
      <section data-ch="6" data-title="Golem Miners" id="golem-miners">
        <h2 tabIndex={-1}>Golem</h2>
      </section>
    </>
  );
}

describe('ChapterNav counter', () => {
  it('starts on chapter 1 with an accessible name that says where you are', () => {
    render(<Page />);
    const button = screen.getByRole('button', {
      name: 'Chapter 1 of 12, About me. Open chapter index',
    });
    expect(button).toHaveTextContent('01 / 12 · About me');
    expect(button).toHaveAttribute('popovertarget', 'cidx');
  });

  it('follows the chapter that crosses the reading line', () => {
    render(<Page />);
    act(() => fire([{ target: document.getElementById('golem-miners')!, isIntersecting: true }]));
    expect(
      screen.getByRole('button', { name: 'Chapter 6 of 12, Golem Miners. Open chapter index' }),
    ).toHaveTextContent('06 / 12 · Golem Miners');
  });

  it('ignores a chapter that is leaving', () => {
    render(<Page />);
    act(() => fire([{ target: document.getElementById('golem-miners')!, isIntersecting: false }]));
    expect(screen.getByRole('button', { name: /^Chapter 1 of 12/ })).toBeInTheDocument();
  });
});

describe('ChapterNav index', () => {
  it('lists all twelve chapters in four labelled groups, with the current one marked', () => {
    render(<Page />);
    const nav = screen.getByRole('navigation', { name: 'Chapters', hidden: true });
    const groups = within(nav).getAllByRole('heading', { level: 3, hidden: true });
    expect(groups.map((g) => g.textContent)).toEqual([
      'About',
      'Projects',
      'Experience',
      'Contact',
    ]);
    const links = within(nav).getAllByRole('link', { hidden: true });
    expect(links).toHaveLength(12);
    expect(links[0]).toHaveAttribute('href', '#about');
    expect(links[0]).toHaveAttribute('aria-current', 'true');
    expect(links[5]).toHaveAttribute('href', '#golem-miners');
    expect(links[5]).not.toHaveAttribute('aria-current');
    act(() => fire([{ target: document.getElementById('golem-miners')!, isIntersecting: true }]));
    expect(links[5]).toHaveAttribute('aria-current', 'true');
    expect(links[0]).not.toHaveAttribute('aria-current');
  });

  it('is a popover dialog named Chapters', () => {
    render(<Page />);
    const dialog = document.getElementById('cidx');
    expect(dialog).toHaveAttribute('popover');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(
      screen.getByRole('heading', { name: 'Chapters', level: 2, hidden: true }),
    ).toBeInTheDocument();
  });

  it('closes after a pick and moves focus to that chapter heading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Page />);
    const link = screen.getByRole('link', { name: /Golem Miners/, hidden: true });
    await user.click(link);
    expect(HTMLElement.prototype.hidePopover).toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('heading', { name: 'Golem' })).toHaveFocus();
    vi.useRealTimers();
  });

  it('moves between rows with the arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    render(<Page />);
    // A closed popover is display:none and cannot take focus, so show it the way :popover-open would.
    document.getElementById('cidx')!.style.display = 'block';
    const links = screen.getAllByRole('link', { hidden: true });
    links[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(links[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(links[11]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(links[11]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(links[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(links[0]).toHaveFocus();
  });
});
