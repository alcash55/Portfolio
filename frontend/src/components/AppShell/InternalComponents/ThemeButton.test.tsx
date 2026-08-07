import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import ToggleColorMode from '../../../layout/Theme/Context';
import { ThemeButton } from './ThemeButton';

const THEME_LABELS = ['Dark', 'Blue', 'Light', 'Red', 'Purple', 'Green'];

describe('ThemeButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all six themes, each with an accessible name and aria-pressed reflecting selection', () => {
    render(
      <ToggleColorMode>
        <ThemeButton />
      </ToggleColorMode>,
    );

    const buttons = THEME_LABELS.map((label) => screen.getByRole('button', { name: label }));
    expect(buttons).toHaveLength(6);

    // Nothing is saved yet, so the lazy initializer's default ('dark') is
    // selected -- the same synchronous-first-paint resolution this
    // component's Context.tsx documents.
    const dark = screen.getByRole('button', { name: 'Dark' });
    expect(dark).toHaveAttribute('aria-pressed', 'true');

    buttons
      .filter((button) => button !== dark)
      .forEach((button) => expect(button).toHaveAttribute('aria-pressed', 'false'));
  });

  it('switches the pressed swatch and persists the choice on click', async () => {
    const user = userEvent.setup();
    render(
      <ToggleColorMode>
        <ThemeButton />
      </ToggleColorMode>,
    );

    await user.click(screen.getByRole('button', { name: 'Green' }));

    expect(screen.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('theme')).toBe('green');
  });

  it('resolves a legacy-red stored value to the restored red theme, not a fallback', () => {
    // A visitor who saved 'red' before Sprint 4.5 removed it, or after
    // Sprint 12 restored it, should land on today's red theme either way --
    // the name still resolves, it just carries a different palette now.
    localStorage.setItem('theme', 'red');

    render(
      <ToggleColorMode>
        <ThemeButton />
      </ToggleColorMode>,
    );

    expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to dark for a stored value that is not a known theme name', () => {
    localStorage.setItem('theme', 'sunset');

    render(
      <ToggleColorMode>
        <ThemeButton />
      </ToggleColorMode>,
    );

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });
});
