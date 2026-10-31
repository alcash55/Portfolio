import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  parseThemeChoice,
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  themeInitScript,
} from './theme';

describe('parseThemeChoice', () => {
  it.each(['light', 'dark', 'system'] as const)('keeps the valid choice %s', (choice) => {
    expect(parseThemeChoice(choice)).toBe(choice);
  });

  it.each([null, undefined, '', 'purple', 'DARK', 42, {}])(
    'falls back to system for %j',
    (value) => {
      expect(parseThemeChoice(value)).toBe('system');
    },
  );
});

describe('resolveTheme', () => {
  it('follows the system preference only when the choice is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('sets data-theme for an explicit choice and removes it for system', () => {
    const root = document.documentElement;
    applyTheme('dark', root);
    expect(root).toHaveAttribute('data-theme', 'dark');
    applyTheme('light', root);
    expect(root).toHaveAttribute('data-theme', 'light');
    applyTheme('system', root);
    expect(root).not.toHaveAttribute('data-theme');
  });
});

describe('readStoredTheme', () => {
  it('returns the stored choice, or system when nothing valid is stored', () => {
    expect(readStoredTheme()).toBe('system');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'nonsense');
    expect(readStoredTheme()).toBe('system');
  });

  it('returns system when storage throws, as it does in private mode', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStoredTheme(blocked)).toBe('system');
  });
});

describe('themeInitScript', () => {
  // The script runs before first paint, so it cannot import anything. These
  // tests execute the exact string that ships in the document head.
  function run(): void {
    new Function(themeInitScript)();
  }

  it('applies a stored dark choice to the root element', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    run();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('applies a stored light choice, so a light visitor on a dark OS stays light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    run();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('leaves data-theme off for system, so the CSS media query decides', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');
    run();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('ignores an unknown stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    run();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('does not throw when storage is blocked', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(run).not.toThrow();
    } finally {
      Storage.prototype.getItem = original;
    }
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
