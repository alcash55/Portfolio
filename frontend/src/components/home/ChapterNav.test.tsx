import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChapterNav } from './ChapterNav';

const VIEWPORT = 800;

/** jsdom has no layout. Each chapter reports the box the test gives it. */
function placeChapters(boxes: Record<string, [top: number, bottom: number]>) {
  for (const [id, [top, bottom]] of Object.entries(boxes)) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`no chapter ${id}`);
    el.getBoundingClientRect = () => ({ top, bottom, height: bottom - top }) as DOMRect;
  }
}

/** Scrolling is read on the next animation frame, so wait one out. */
async function scrollTo(boxes: Record<string, [number, number]>) {
  placeChapters(boxes);
  await act(async () => {
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

beforeEach(() => {
  vi.stubGlobal('innerHeight', VIEWPORT);
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
    // The name is built from the visible text, so it always contains it (WCAG 2.5.3).
    const button = screen.getByRole('button', {
      name: 'Chapter 01 / 13 · About me. Open chapter index',
    });
    expect(button).not.toHaveAttribute('aria-label');
    expect(button).toHaveTextContent('01 / 13 · About me');
    expect(button).toHaveAttribute('popovertarget', 'cidx');
  });

  it('follows the chapter that crosses the reading line', async () => {
    render(<Page />);
    await scrollTo({ about: [-900, -100], 'golem-miners': [-100, 900] });
    expect(
      screen.getByRole('button', { name: 'Chapter 06 / 13 · Golem Miners. Open chapter index' }),
    ).toHaveTextContent('06 / 13 · Golem Miners');
  });

  it('keeps the last chapter while the line sits in a gap between two', async () => {
    render(<Page />);
    await scrollTo({ about: [-900, -100], 'golem-miners': [-100, 900] });
    await scrollTo({ about: [-2000, -1200], 'golem-miners': [-1200, 100] });
    expect(screen.getByRole('button', { name: /^Chapter 06 \/ 13/ })).toBeInTheDocument();
  });

  it('finds chapters that were added after the header mounted', async () => {
    // Arriving from a project page, the header renders before the home chapters exist.
    // The first version observed the chapters it found at mount, so it never saw these.
    const { rerender } = render(<ChapterNav />);
    rerender(<Page />);
    await scrollTo({ about: [-900, -100], 'golem-miners': [-100, 900] });
    expect(screen.getByRole('button', { name: /^Chapter 06 \/ 13/ })).toBeInTheDocument();
  });

  it('reads the position again when the hash changes', async () => {
    render(<Page />);
    placeChapters({ about: [-900, -100], 'golem-miners': [-100, 900] });
    await act(async () => {
      window.dispatchEvent(new Event('hashchange'));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(screen.getByRole('button', { name: /^Chapter 06 \/ 13/ })).toBeInTheDocument();
  });
});

describe('ChapterNav index', () => {
  it('lists all thirteen chapters in five labeled groups, with the current one marked', async () => {
    render(<Page />);
    const nav = screen.getByRole('navigation', { name: 'Chapters', hidden: true });
    const groups = within(nav).getAllByRole('heading', { level: 3, hidden: true });
    expect(groups.map((g) => g.textContent)).toEqual([
      'About',
      'Projects',
      'Experience',
      'Certificates',
      'Contact',
    ]);
    const links = within(nav).getAllByRole('link', { hidden: true });
    expect(links).toHaveLength(13);
    expect(links[0]).toHaveAttribute('href', '#about');
    expect(links[0]).toHaveAttribute('aria-current', 'true');
    expect(links[5]).toHaveAttribute('href', '#golem-miners');
    expect(links[5]).not.toHaveAttribute('aria-current');
    await scrollTo({ about: [-900, -100], 'golem-miners': [-100, 900] });
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
    expect(links[12]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(links[12]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(links[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(links[0]).toHaveFocus();
  });
});
