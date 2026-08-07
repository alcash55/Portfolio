import { createContext, useContext } from 'react';
import { darkTheme } from './darkTheme';

/** The set of themes reachable from the UI. Keep in sync with `themes` in Context.tsx. */
export type ThemeName = 'dark' | 'blue' | 'light' | 'red' | 'purple' | 'green';

const THEME_NAMES: readonly ThemeName[] = ['dark', 'blue', 'light', 'red', 'purple', 'green'];

/**
 * Narrows an arbitrary `localStorage` value to a known `ThemeName`.
 *
 * Sprint 12 restored 'red' with a different palette than the one removed
 * after Sprint 4.5. A visitor with `theme: 'red'` saved from before the
 * removal now resolves straight to the new palette -- the name still means
 * "the red theme," it just looks calmer than it used to, same as every
 * other returning visitor picks up palette tweaks to their saved theme.
 * Anything that still isn't a recognized name (e.g. a value saved while
 * 'red' was genuinely absent, or garbage) falls back to a safe default
 * instead of rendering a nonexistent theme.
 */
export const isThemeName = (value: string | null): value is ThemeName =>
  value !== null && (THEME_NAMES as readonly string[]).includes(value);

/**
 * ColorModeContext context that provides the active theme, its name, and a
 * function to switch it.
 */
export const ColorModeContext = createContext<{
  mode: typeof darkTheme;
  themeName: ThemeName;
  toggleColorMode: (name: ThemeName) => void;
}>({
  mode: darkTheme,
  themeName: 'dark',
  toggleColorMode: () => {},
});

/**
 * useColorMode hook that returns the current color mode and a function to toggle the color mode
 * @returns {UseColorMode}
 */
export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  return context;
};
