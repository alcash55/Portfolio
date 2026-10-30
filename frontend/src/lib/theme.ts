export const THEME_STORAGE_KEY = 'theme';

export const THEME_CHOICES = ['light', 'dark', 'system'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = 'light' | 'dark';

/** Parses a stored value. Anything that is not a known choice means "system". */
export function parseThemeChoice(value: unknown): ThemeChoice {
  return THEME_CHOICES.find((choice) => choice === value) ?? 'system';
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}

/**
 * "system" removes the attribute rather than writing the resolved value. The CSS
 * has a prefers-color-scheme block for the no-attribute case, so a system visitor
 * gets the right colors with JavaScript off and follows OS changes live.
 */
export function applyTheme(choice: ThemeChoice, root: HTMLElement): void {
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function readStoredTheme(storage?: Pick<Storage, 'getItem'>): ThemeChoice {
  try {
    return parseThemeChoice((storage ?? window.localStorage).getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage throws in some private modes and when cookies are blocked.
    return 'system';
  }
}

/** Returns false when storage is blocked. The choice still applies for this page view. */
export function saveTheme(choice: ThemeChoice): boolean {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs inline in <head>, before first paint, so a returning dark visitor never
 * sees a light flash. It stays plain ES5 and imports nothing because it ships as
 * a string. Only explicit choices write the attribute, matching applyTheme.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;
