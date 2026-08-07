import { createContext, useContext } from 'react';
import { darkTheme } from './darkTheme';

/** The set of themes reachable from the UI. Keep in sync with `themes` in Context.tsx. */
export type ThemeName = 'dark' | 'blue' | 'light';

const THEME_NAMES: readonly ThemeName[] = ['dark', 'blue', 'light'];

/**
 * Narrows an arbitrary `localStorage` value to a known `ThemeName`.
 *
 * The migration point for the red theme's removal: a returning visitor's
 * saved `theme: 'red'` (or anything else no longer valid) fails this check,
 * so the caller falls back to a safe default instead of rendering a deleted
 * theme.
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
