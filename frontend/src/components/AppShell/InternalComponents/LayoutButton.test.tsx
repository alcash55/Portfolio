import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShellLayoutContext, AppShellLayoutMode } from '../AppShellLayoutContext';
import { LayoutButton } from './LayoutButton';

/**
 * The settings drawer's layout picker.
 *
 * `HeroControls` has its own set of these two buttons and gets its selection
 * straight from `AppShellLayoutContext` (see its own test file); this one used
 * to get it from `localStorage.getItem('layout')` instead, read fresh on every
 * render. That is a second, disagreeing source of truth for the same piece of
 * state, so these tests render `LayoutButton` against a controllable context
 * value the same way `HeroControls.test.tsx` does, specifically to prove the
 * selection follows the context even when a stored value says otherwise.
 */

/** Renders the button with a controllable layout context, returning the spy. */
const renderLayoutButton = (layout: AppShellLayoutMode = 'default') => {
  const toggleLayout = vi.fn();
  render(
    <AppShellLayoutContext.Provider value={{ layout, toggleLayout, openSettingDrawer: vi.fn() }}>
      <LayoutButton />
    </AppShellLayoutContext.Provider>,
  );
  return { toggleLayout };
};

describe('LayoutButton', () => {
  beforeEach(() => localStorage.clear());

  it('marks Top Nav pressed for the default layout', () => {
    renderLayoutButton('default');

    expect(screen.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Side Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marks Side Nav pressed for the sideNav layout', () => {
    renderLayoutButton('sideNav');

    expect(screen.getByRole('button', { name: 'Side Nav' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('follows the context for the active layout, not a disagreeing localStorage', () => {
    // A stray write -- another tab, devtools, or (before this fix) this very
    // component's own click handler leaving a value the shell never actually
    // applied. Whatever the reason, `layout` from context is the shell's real,
    // current mode; localStorage is only ever a persistence mechanism now.
    localStorage.setItem('layout', 'sideNav');
    renderLayoutButton('default');

    expect(screen.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Side Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows neither button pressed while the shell has forced the mobile layout, even if a stale localStorage names one', () => {
    // `SettingsDrawer` hides this component entirely below 650px (`showLayout`),
    // so this state is not reachable through the shipped UI today. It is worth
    // covering directly anyway: `AppShellProvider.applyMode` forces `mode` to
    // 'mobile' below 650px but can still be asked to persist a non-mobile
    // `newLayout` to localStorage, so 'sideNav' on disk while the shell is
    // actually in 'mobile' is a real, reachable disagreement -- just not one a
    // visitor can see today because of that hiding. If `showLayout`'s gate is
    // ever loosened, this is what stops a stale 'sideNav' from reading as
    // selected under a layout neither button actually names.
    localStorage.setItem('layout', 'sideNav');
    renderLayoutButton('mobile');

    expect(screen.getByRole('button', { name: 'Top Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Side Nav' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('calls toggleLayout with the requested mode on click, once', async () => {
    const user = userEvent.setup();
    const { toggleLayout } = renderLayoutButton('default');

    await user.click(screen.getByRole('button', { name: 'Side Nav' }));

    expect(toggleLayout).toHaveBeenCalledWith('sideNav');
    expect(toggleLayout).toHaveBeenCalledTimes(1);
  });
});
