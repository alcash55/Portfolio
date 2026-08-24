import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ToggleColorMode from '../../../layout/Theme/Context';
import { HeroControls } from './HeroControls';
import { ThemeButton } from '../../AppShell/InternalComponents/ThemeButton';
import {
  AppShellLayoutContext,
  AppShellLayoutMode,
} from '../../AppShell/AppShellLayoutContext';

/**
 * The hero's theme/layout bar. These are the guards on the two things it is
 * for -- switching themes and layouts without opening a drawer -- and on the
 * accessibility contract Alex asked for explicitly ("tab-able and fully A11y
 * compliant"), which is where this component can regress silently: a swatch
 * whose accessible name goes back to being a colour, or an `aria-pressed` that
 * stops tracking the theme, still *looks* exactly right in a screenshot.
 */

const THEME_NAMES = ['Dark', 'Blue', 'Light', 'Red', 'Purple', 'Green'];

/**
 * Installs a `window.matchMedia` whose `matches` is decided by `predicate`.
 * jsdom's own implementation answers `false` to everything, which is fine for
 * the default case but makes the two branches this component actually has --
 * below the 650px layout breakpoint, and `prefers-reduced-motion` -- untestable.
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

/** Renders the bar with a controllable layout context, returning the spy. */
const renderWithLayout = (layout: AppShellLayoutMode = 'default') => {
  const toggleLayout = vi.fn();
  render(
    <AppShellLayoutContext.Provider
      value={{ layout, toggleLayout, openSettingDrawer: vi.fn() }}
    >
      <ToggleColorMode>
        <HeroControls />
      </ToggleColorMode>
    </AppShellLayoutContext.Provider>,
  );
  return { toggleLayout };
};

describe('HeroControls — themes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers every theme as a real button with a name that is not just a colour', () => {
    renderWithLayout();

    THEME_NAMES.forEach((label) => {
      const button = screen.getByRole('button', { name: `${label} theme` });
      expect(button).toBeInTheDocument();
      // The swatch itself must stay out of the accessibility tree: if it ever
      // becomes the name, a screen reader announces nothing useful.
      expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    // Named, not counted from the component's own list -- this fails if a
    // theme is dropped from the hero picker but left in the drawer.
    const themeGroup = screen.getByRole('group', { name: 'Theme' });
    expect(within(themeGroup).getAllByRole('button')).toHaveLength(THEME_NAMES.length);
  });

  it('marks exactly the active theme as pressed, and moves the mark on click', async () => {
    const user = userEvent.setup();
    renderWithLayout();

    const pressed = () =>
      screen
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.getAttribute('aria-label'));

    // Nothing saved yet: Context.tsx's lazy initializer resolves to 'dark'.
    expect(pressed()).toEqual(['Dark theme', 'Top nav layout']);

    await user.click(screen.getByRole('button', { name: 'Purple theme' }));

    expect(pressed()).toEqual(['Purple theme', 'Top nav layout']);
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('persists the chosen theme the same way the drawer does', async () => {
    const user = userEvent.setup();
    renderWithLayout();

    await user.click(screen.getByRole('button', { name: 'Green theme' }));

    expect(localStorage.getItem('theme')).toBe('green');
  });

  it('is reachable and operable by keyboard alone', async () => {
    const user = userEvent.setup();
    renderWithLayout();

    // Tab into the bar: the first stop must be the first theme button, in DOM
    // order, which is the order they are painted in.
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dark theme' }));

    await user.tab();
    await user.tab();
    const light = screen.getByRole('button', { name: 'Light theme' });
    expect(document.activeElement).toBe(light);

    // Space is the button activation key a keyboard user is most likely to
    // reach for on a toggle; Enter is covered by the e2e suite.
    await user.keyboard('[Space]');
    expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('offers the same set of themes as the settings drawer picker', () => {
    // Two pickers, one list (themeOptions.ts). If someone re-inlines a list in
    // either component, one of them ends up offering five of six themes and
    // nothing else in the suite would notice.
    render(
      <ToggleColorMode>
        <HeroControls />
        <ThemeButton />
      </ToggleColorMode>,
    );

    const drawerNames = screen
      .getAllByRole('button')
      .map((b) => b.textContent?.trim())
      .filter((text): text is string => !!text && THEME_NAMES.includes(text));
    const heroNames = screen
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'))
      .filter((label): label is string => !!label && label.endsWith(' theme'))
      .map((label) => label.replace(' theme', ''));

    expect(heroNames).toEqual(THEME_NAMES);
    expect(drawerNames).toEqual(THEME_NAMES);
  });

  it('still renders when the visitor prefers reduced motion', () => {
    // The decorative particle field is skipped entirely under reduced motion
    // (Landing.tsx). These are controls, not decoration -- they must survive
    // that branch.
    stubMatchMedia((query) => query.includes('prefers-reduced-motion'));
    renderWithLayout();

    expect(screen.getAllByRole('button', { name: /theme$/ })).toHaveLength(6);
  });
});

describe('HeroControls — layouts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('switches to the side nav layout through the shared context', async () => {
    const user = userEvent.setup();
    const { toggleLayout } = renderWithLayout('default');

    await user.click(screen.getByRole('button', { name: 'Side nav layout' }));

    expect(toggleLayout).toHaveBeenCalledWith('sideNav');
    expect(toggleLayout).toHaveBeenCalledTimes(1);
  });

  it('marks the active layout pressed, following the context rather than localStorage', () => {
    // `LayoutButton` in the drawer reads `localStorage` directly, which is why
    // it can show a stale選択 after the shell forces `mobile`. This one reads
    // the context, so a disagreeing localStorage must not fool it.
    localStorage.setItem('layout', 'default');
    renderWithLayout('sideNav');

    expect(screen.getByRole('button', { name: 'Side nav layout' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Top nav layout' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('hides the layout controls below the 650px breakpoint, keeping the themes', () => {
    // Spec 03: "If the user is on mobile then it does not show the other
    // layouts". AppShellProvider pins the mode to `mobile` under 650px and
    // ignores anything toggleLayout asks for, so a layout button there is a
    // control that does nothing.
    stubMatchMedia((query) => query.includes('max-width') && query.includes('649'));
    renderWithLayout('mobile');

    expect(screen.queryByRole('button', { name: 'Side nav layout' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Top nav layout' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Layout' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /theme$/ })).toHaveLength(6);
  });
});
