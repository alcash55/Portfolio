import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ToggleColorMode from '../../../layout/Theme/Context';
import { HeroControls } from './HeroControls';
import { ThemeButton } from '../../AppShell/InternalComponents/ThemeButton';
import { AppShellLayoutContext, AppShellLayoutMode } from '../../AppShell/AppShellLayoutContext';

/**
 * The hero's floating theme/layout controls.
 *
 * These guard the parts that can regress without looking any different in a
 * screenshot: an accessible name that quietly goes back to being a colour, an
 * `aria-pressed` that stops tracking the active theme, a control that starts
 * moving while it is being aimed at, or a layout button appearing on a phone
 * where the shell would ignore it. Geometry -- where the controls sit and what
 * they sit on top of -- is jsdom-proof and lives in `e2e/hero-controls.spec.ts`.
 */

const THEME_LABELS = ['Dark', 'Blue', 'Light', 'Red', 'Purple', 'Green'];

/** Every control, in the order the DOM holds them, which is the tab order. */
const EXPECTED_FOCUS_ORDER = [
  'Dark theme',
  'Blue theme',
  'Light theme',
  'Red theme',
  'Purple theme',
  'Green theme',
  'Top nav layout',
  'Side nav layout',
];

/**
 * Installs a `window.matchMedia` whose `matches` is decided by `predicate`.
 * jsdom answers `false` to every query, which is fine for the default case but
 * leaves the branches this component actually has -- below the 650px layout
 * breakpoint, `prefers-reduced-motion`, and the 1024px hero width that decides
 * which placement regime is live -- untestable.
 */
const stubMatchMedia = (predicate: (query: string) => boolean) => {
  vi.stubGlobal(
    'matchMedia',
    (query: string): MediaQueryList =>
      ({
        matches: predicate(query),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
};

/** Renders the controls with a controllable layout context, returning the spy. */
const renderControls = (layout: AppShellLayoutMode = 'default') => {
  const toggleLayout = vi.fn();
  render(
    <AppShellLayoutContext.Provider value={{ layout, toggleLayout, openSettingDrawer: vi.fn() }}>
      <ToggleColorMode>
        <HeroControls />
      </ToggleColorMode>
    </AppShellLayoutContext.Provider>,
  );
  return { toggleLayout };
};

const pressedNames = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.getAttribute('aria-label'));

describe('HeroControls — every control is a real, named, toggleable button', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('names all eight controls, and names none of them by colour or icon alone', () => {
    renderControls();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(EXPECTED_FOCUS_ORDER.length);

    buttons.forEach((button) => {
      const name = button.getAttribute('aria-label');
      // A swatch/icon has to be out of the accessibility tree, and the name
      // has to be words: "Dark theme", not a hex colour and not "button".
      expect(name).toBeTruthy();
      expect(name).toMatch(/^[A-Z][a-z]+( nav)? (theme|layout)$/);
      expect(button).toHaveAttribute('aria-pressed');
      const decoration = button.querySelector('[aria-hidden="true"], svg');
      expect(decoration, `${name} renders nothing inside it`).not.toBeNull();
    });
  });

  it('holds the controls in DOM order, so tabbing follows a fixed order however they drift', () => {
    // The positions are absolute and the controls animate; DOM order is the
    // only thing that decides focus order, and it must not depend on either.
    renderControls();

    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(EXPECTED_FOCUS_ORDER);
  });

  it('is operable by keyboard alone, in that order, with both activation keys', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dark theme' }));

    await user.tab();
    await user.tab();
    const light = screen.getByRole('button', { name: 'Light theme' });
    expect(document.activeElement).toBe(light);

    await user.keyboard('[Space]');
    expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('theme')).toBe('light');

    await user.tab();
    const red = screen.getByRole('button', { name: 'Red theme' });
    expect(document.activeElement).toBe(red);
    await user.keyboard('[Enter]');
    expect(red).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('theme')).toBe('red');
  });
});

/**
 * Reads a control's resting placement back out of the CSS the component
 * shipped. jsdom does no layout, so nothing here can say where a control ends
 * up on a page -- but the `left`/`top` percentages are the inputs to that, and
 * they are what a careless edit to the placement tables changes. Where those
 * percentages actually land, and what they land on, is `e2e/hero-controls.spec.ts`.
 */
const placementOf = (button: HTMLElement) => {
  const style = getComputedStyle(button);
  return { left: parseFloat(style.left), top: parseFloat(style.top) };
};

const placements = () =>
  screen.getAllByRole('button').map((button) => ({
    name: button.getAttribute('aria-label') ?? '?',
    ...placementOf(button),
  }));

describe('HeroControls — four a side, once the hero is wide enough to have sides', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('puts four controls in each band, and the right four in each', () => {
    // The gutter regime is chosen by hero width, and its first-paint value
    // comes from this media query -- jsdom has no ResizeObserver, so this is
    // the only branch it can take.
    stubMatchMedia((query) => query.includes('min-width') && query.includes('1024'));
    renderControls();

    const all = placements();
    expect(all).toHaveLength(EXPECTED_FOCUS_ORDER.length);
    expect(
      all
        .filter((c) => c.left < 50)
        .map((c) => c.name)
        .sort(),
    ).toEqual(['Blue theme', 'Dark theme', 'Light theme', 'Red theme']);
    expect(
      all
        .filter((c) => c.left >= 50)
        .map((c) => c.name)
        .sort(),
    ).toEqual(['Green theme', 'Purple theme', 'Side nav layout', 'Top nav layout']);
  });

  it('orders each band top-to-bottom in the order it is tabbed', () => {
    // DOM order is the tab order and it is column-major: the whole left band,
    // then the whole right band. If a placement edit ever moves a control past
    // one of its band-mates without moving it in the DOM, focus would jump back
    // up the page part-way down a band.
    stubMatchMedia((query) => query.includes('min-width') && query.includes('1024'));
    renderControls();

    const all = placements();
    expect(all.map((c) => c.name)).toEqual(EXPECTED_FOCUS_ORDER);

    for (const band of [all.filter((c) => c.left < 50), all.filter((c) => c.left >= 50)]) {
      expect(band).toHaveLength(4);
      band.forEach((control, index) => {
        if (index === 0) return;
        expect(
          control.top,
          `${control.name} tabs after ${band[index - 1].name} but sits above it`,
        ).toBeGreaterThan(band[index - 1].top);
      });
    }
  });

  it('leaves the narrow regime a scatter with no sides at all', () => {
    // Below a 1024px hero there is no band down either edge to balance -- the
    // subtitle runs to within ~35px of both -- so the controls sit across the
    // lower half instead. Forcing a left/right split here would put them back
    // on the text, which is the mistake this guards.
    renderControls(); // jsdom answers `false` to every query: the field regime.

    const all = placements();
    expect(
      all.every((c) => c.top > 50),
      'a control left the lower half',
    ).toBe(true);
    expect(
      all.some((c) => c.left > 33 && c.left < 67),
      'the narrow regime has been pushed out to two edges',
    ).toBe(true);
  });

  it('keeps the vertical spacing uneven, so the set cannot read as a ladder', () => {
    // An evenly-ruled ladder is one of the two designs already rejected here.
    stubMatchMedia((query) => query.includes('min-width') && query.includes('1024'));
    renderControls();

    const tops = placements()
      .map((c) => c.top)
      .sort((a, b) => a - b);
    const gaps = tops.slice(1).map((top, index) => top - tops[index]);
    for (let i = 0; i < gaps.length; i++)
      for (let j = i + 1; j < gaps.length; j++)
        expect(
          Math.abs(gaps[i] - gaps[j]),
          `gaps ${gaps[i]}% and ${gaps[j]}% share a rhythm`,
        ).toBeGreaterThan(1);
  });
});

describe('HeroControls — themes', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('marks exactly the active theme pressed, and moves the mark on click', async () => {
    const user = userEvent.setup();
    renderControls();

    // Nothing saved yet: Context.tsx's lazy initializer resolves to 'dark'.
    expect(pressedNames()).toEqual(['Dark theme', 'Top nav layout']);

    await user.click(screen.getByRole('button', { name: 'Purple theme' }));

    expect(pressedNames()).toEqual(['Purple theme', 'Top nav layout']);
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('persists the chosen theme the way the drawer does, so a reload keeps it', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole('button', { name: 'Green theme' }));

    expect(localStorage.getItem('theme')).toBe('green');
  });

  it('offers the same six themes as the settings drawer picker', () => {
    // Two pickers, one list (themeOptions.ts). Re-inline a list in either
    // component and one of them silently offers five of six themes; nothing
    // else in the suite would notice.
    render(
      <ToggleColorMode>
        <HeroControls />
        <ThemeButton />
      </ToggleColorMode>,
    );

    const heroNames = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter((name): name is string => !!name?.endsWith(' theme'))
      .map((name) => name.replace(' theme', ''));
    const drawerNames = screen
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter((text): text is string => !!text && THEME_LABELS.includes(text));

    expect(heroNames).toEqual(THEME_LABELS);
    expect(drawerNames).toEqual(THEME_LABELS);
  });

  it('shows the selection with more than colour — a check mark, not just a ring', () => {
    renderControls();

    const dark = screen.getByRole('button', { name: 'Dark theme' });
    const blue = screen.getByRole('button', { name: 'Blue theme' });

    // MUI's Check renders an <svg> with the CheckIcon test id; the selected
    // control has one and the unselected ones do not (WCAG 1.4.1 -- the state
    // cannot be carried by colour alone).
    expect(dark.querySelector('svg')).not.toBeNull();
    expect(blue.querySelector('svg')).toBeNull();
  });
});

describe('HeroControls — layouts', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('switches layout through the shared context, once, with the right mode', async () => {
    const user = userEvent.setup();
    const { toggleLayout } = renderControls('default');

    await user.click(screen.getByRole('button', { name: 'Side nav layout' }));

    expect(toggleLayout).toHaveBeenCalledWith('sideNav');
    expect(toggleLayout).toHaveBeenCalledTimes(1);
  });

  it('follows the context for the active layout, not a disagreeing localStorage', () => {
    // The drawer's `LayoutButton` reads `localStorage` directly, which is how
    // it can show a stale selection after the shell has forced `mobile`. This
    // one reads the context, and a disagreeing stored value must not fool it.
    localStorage.setItem('layout', 'default');
    renderControls('sideNav');

    expect(screen.getByRole('button', { name: 'Side nav layout' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Top nav layout' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('renders no layout control below 650px, where the shell would ignore it', () => {
    // Spec 03: "If the user is on mobile then it does not show the other
    // layouts". `AppShellProvider` pins the mode to `mobile` under 650px and
    // ignores whatever `toggleLayout` is handed, so a layout button there is a
    // button that lies. Same breakpoint as SettingsDrawer's `showLayout`.
    stubMatchMedia((query) => query.includes('max-width') && query.includes('649'));
    renderControls('mobile');

    expect(screen.queryByRole('button', { name: 'Side nav layout' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Top nav layout' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /theme$/ })).toHaveLength(6);
  });
});

describe('HeroControls — motion', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('drifts on its own keyframes, fast enough to read as motion rather than as steps', () => {
    renderControls();

    // jsdom does not expand the `animation` shorthand into its longhands, so
    // this reads the shorthand it was actually given.
    const animation = getComputedStyle(
      screen.getByRole('button', { name: 'Dark theme' }),
    ).animation;
    expect(animation).toMatch(/heroControlDrift[ABC]/);
    // Not the particle field's `float`: same character, different job, and the
    // two must not start sharing values.
    expect(animation).not.toContain('float');

    const [, seconds, easing, delay] =
      /heroControlDrift[ABC] (\d+(?:\.\d+)?)s (\S+) (-?\d+(?:\.\d+)?)s/.exec(animation) ?? [];
    // The lap used to be 20-28s for 6px of travel -- about 0.3px a second,
    // which is slow enough that the rendered position holds still for seconds
    // and then jumps, and that stepping is what reads as choppy. A lap of
    // 65-82px in this window is 4-6px a second.
    expect(Number(seconds)).toBeGreaterThanOrEqual(12);
    expect(Number(seconds)).toBeLessThanOrEqual(20);
    // Constant speed: the curve does the easing, so nothing decelerates into a
    // corner and reverses.
    expect(easing).toBe('linear');
    // Negative, so the control is already mid-lap on the first frame instead of
    // sitting still for the first few seconds after load.
    expect(Number(delay)).toBeLessThan(0);
    // Hinted to the compositor, so a frame is a layer transform and not a
    // repaint of the disc, its border and its shadow.
    expect(getComputedStyle(screen.getByRole('button', { name: 'Dark theme' })).willChange).toBe(
      'transform',
    );
  });

  it('gives the eight controls different paths and periods, so they never march in step', () => {
    renderControls();

    const shorthands = screen
      .getAllByRole('button')
      .map((button) => getComputedStyle(button).animation);
    const paths = new Set(shorthands.map((value) => /heroControlDrift([ABC])/.exec(value)?.[1]));
    const periods = new Set(shorthands.map((value) => /Drift[ABC] (\S+)/.exec(value)?.[1]));

    // Eight controls on one path at one speed is one shape sliding around the
    // hero, which is what the decorative field deliberately is not.
    expect(paths.size).toBeGreaterThanOrEqual(3);
    expect(periods.size).toBe(shorthands.length);
  });

  it('stops moving entirely for a visitor who prefers reduced motion, but still renders', () => {
    // Landing skips the decorative particles wholesale under this query. These
    // are functionality, so only the motion goes.
    stubMatchMedia((query) => query.includes('prefers-reduced-motion'));
    renderControls();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(EXPECTED_FOCUS_ORDER.length);
    buttons.forEach((button) => {
      expect(getComputedStyle(button).animation).toBe('none');
      // And no compositor layer hinted for a transform that never changes.
      expect(getComputedStyle(button).willChange).toBe('auto');
    });
  });
});
