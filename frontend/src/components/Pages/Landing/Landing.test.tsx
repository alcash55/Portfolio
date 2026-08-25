import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Landing from './Landing';
import { lightTheme } from '../../../layout/Theme/lightTheme';
import { darkTheme } from '../../../layout/Theme/darkTheme';

/**
 * Regression coverage for Sprint 12's H1/H2: Alex's headline bug was "the
 * light theme does not change the colors on the home section," caused by 15
 * hardcoded `rgba(255,255,255,…)`/`#fff` references plus a `background.hero`
 * token pinned dark in every theme. These lock in that the hero's background
 * and text now both follow the active theme instead of a fixed dark value.
 */
describe('Landing hero follows the active theme (Sprint 12 H1)', () => {
  it('renders without a ThemeProvider (falls back to MUI defaults)', () => {
    render(<Landing />);
    expect(screen.getByText('Alex Cash')).toBeInTheDocument();
  });

  it('resolves a light hero background under the light theme', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Landing />
      </ThemeProvider>,
    );
    const hero = document.getElementById('landing');
    expect(hero).not.toBeNull();
    // lightTheme's background.default (#f4f5f7) -- was hardcoded to a fixed
    // dark value (#202020) for every theme before this sprint.
    expect(getComputedStyle(hero as HTMLElement).backgroundColor).toBe('rgb(244, 245, 247)');
  });

  it('resolves a dark hero background under the dark theme', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <Landing />
      </ThemeProvider>,
    );
    const hero = document.getElementById('landing');
    expect(getComputedStyle(hero as HTMLElement).backgroundColor).toBe('rgb(32, 32, 32)');
  });

  it('never renders the hero caption in literal opaque white (guards the bug: white text on a light hero)', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Landing />
      </ThemeProvider>,
    );
    const caption = screen.getByText('Software Engineer');
    expect(getComputedStyle(caption).color).not.toBe('rgb(255, 255, 255)');
  });
});

/**
 * Where the hero's down arrow scrolls to.
 *
 * Alex's report was two symptoms at different window sizes -- the nav bar
 * landing on top of the "About Me" heading, or the arrow still half on screen
 * with no nav bar at all -- and they are one missing contract: the click has to
 * land past the point that reveals the bar *and* clear of the bar it reveals.
 *
 * jsdom lays nothing out, so the pixel truth lives in e2e/hero-scroll.spec.ts,
 * which measures a real browser at eight viewports. What these pin is the
 * arithmetic underneath it, which is the part that can silently regress: that
 * the target subtracts the sticky bar's real height rather than a constant,
 * that it never falls short of the bar's own reveal point, and that reduced
 * motion does not animate.
 */
describe('Landing scroll indicator (Sprint 16)', () => {
  /** The section the arrow targets, stood up by hand -- Landing renders only the hero. */
  const mountAboutSection = (headingTop: number) => {
    const section = document.createElement('div');
    section.id = 'about';
    const heading = document.createElement('h2');
    // The target is computed from `offsetTop`/`offsetParent` rather than from a
    // rect, precisely so an unrevealed section's `translateY(24px)` cannot
    // shift it. jsdom reports 0 for both, so the position is stated here.
    Object.defineProperty(heading, 'offsetTop', { value: headingTop, configurable: true });
    section.appendChild(heading);
    document.body.appendChild(section);
    return section;
  };

  /** Stand-in for the rendered `NavBar`; 64px is a MUI Toolbar above `sm`. */
  const mountBar = (height: number) => {
    const bar = document.createElement('header');
    bar.getBoundingClientRect = vi.fn(() => ({ height }) as DOMRect);
    document.body.appendChild(bar);
  };

  const renderHero = () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <Landing />
      </ThemeProvider>,
    );
    return screen.getByRole('button', { name: 'Scroll to About section' });
  };

  const spyOnScrollTo = () => vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.getElementById('about')?.remove();
    document.querySelector('header')?.remove();
  });

  it('leaves the heading a full bar-height plus clearance below the top of the window', () => {
    mountAboutSection(900);
    mountBar(64);
    const scrollTo = spyOnScrollTo();

    fireEvent.click(renderHero());

    // 900 - 64 (the bar) - 16 (clearance). Landing the heading at y=0 -- which
    // is what `scrollIntoView()` does -- puts it entirely behind the bar;
    // landing it at 64 leaves it touching. This is the number that makes the
    // heading readable at the moment the visitor arrives.
    expect(scrollTo).toHaveBeenCalledWith({ top: 820, behavior: 'smooth' });
  });

  it('reserves nothing for a bar in the layouts that have none', () => {
    // `sideNav` and `mobile` render no top bar. Reserving 64px there would
    // scroll the heading needlessly far down the window -- the same class of
    // error as global.css's `scroll-padding: 64px`, which applies in all three
    // layouts because a stylesheet cannot see which one is mounted.
    mountAboutSection(900);
    const scrollTo = spyOnScrollTo();

    fireEvent.click(renderHero());

    expect(scrollTo).toHaveBeenCalledWith({ top: 884, behavior: 'smooth' });
  });

  it('never stops short of the position that reveals the nav bar', () => {
    mountAboutSection(900);
    mountBar(64);
    const arrow = renderHero();
    // Push the indicator far enough down the document that aiming at the
    // heading alone would leave it on screen -- i.e. the visitor lands with the
    // hero's inline nav gone and the global bar not yet up, which is the "not
    // scrolled enough" half of the bug. The floor has to win.
    arrow.getBoundingClientRect = vi.fn(() => ({ bottom: 2000 }) as DOMRect);
    const scrollTo = spyOnScrollTo();

    fireEvent.click(arrow);

    // 2000 - 64: the first position at which `useShowNavBar` returns true.
    expect(scrollTo).toHaveBeenCalledWith({ top: 1936, behavior: 'smooth' });
  });

  it('does not animate the scroll under prefers-reduced-motion', () => {
    // `behavior: 'auto'` would not be enough: it means "use the scrolling
    // box's `scroll-behavior`", and global.css sets that to `smooth` on
    // html/body -- so `'auto'` animates for exactly the visitors who asked it
    // not to. Only `'instant'` actually means instant.
    // Stubbed rather than spied on: this jsdom does not define `matchMedia` at
    // all, which is also why every other test in this file sees
    // `prefers-reduced-motion: false` without doing anything.
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    mountAboutSection(900);
    const scrollTo = spyOnScrollTo();

    fireEvent.click(renderHero());

    expect(scrollTo).toHaveBeenCalledWith({ top: 884, behavior: 'instant' });
  });

  it('keeps the indicator out of the content column but keeps its space reserved', () => {
    // The arrow is absolutely positioned against the hero now, so the hero's
    // own clipping cannot eat it. Taking it out of the column's flow without
    // holding its space open handed those 66px back to the centred content,
    // which dropped 33px -- far enough at 900x800 in the sideNav layout to put
    // the social links under one of the hero's floating controls, which are
    // placed as percentages of the hero and so do not move with the content.
    mountAboutSection(900);
    const arrow = renderHero();
    const column = screen.getByRole('heading', { level: 1 }).closest('#landing > div');

    expect(column, 'the hero content column is gone').not.toBeNull();
    expect(column?.contains(arrow), 'the indicator is back in the column flow').toBe(false);
    expect(column).toHaveStyle({ paddingBottom: '66px' });
  });

  it('keeps the attribute the nav bar measures on the button itself', () => {
    // Load-bearing, not a test hook: `useShowNavBar` and the arrow's own target
    // both key off this element. It stays on the button rather than on the
    // bouncing glyph inside it -- a 6px oscillation across the threshold would
    // flicker the bar.
    mountAboutSection(900);

    expect(renderHero()).toHaveAttribute('data-scroll-indicator');
  });
});
