import { PropsWithChildren, useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material';
import { darkTheme } from './darkTheme';
import { blueTheme } from './blueTheme';
import { lightTheme } from './lightTheme';
import { ColorModeContext, ThemeName, isThemeName } from './ColorModeContext';

const themes: Record<ThemeName, typeof darkTheme> = {
  dark: darkTheme,
  blue: blueTheme,
  light: lightTheme,
};

/**
 * Resolves the saved theme name synchronously, before first paint.
 *
 * This mirrors `resolveInitialMode` in AppShell.tsx: this component used to
 * start every visitor at `darkTheme` and correct to the saved theme in a
 * `useEffect`, so anyone who had saved 'blue' or 'light' got a dark first
 * paint that then swapped -- the same bug (and the same fix) as the layout
 * mode had, worth 21 Lighthouse performance points there, plus a visible
 * colour flash here. Reading `localStorage` in the lazy initializer instead
 * renders the right theme on the first frame.
 *
 * Also the migration point for the red theme's removal: `isThemeName`
 * rejects 'red' (and anything else unrecognized), so a returning visitor
 * with `theme: 'red'` saved falls back to 'dark' instead of rendering a
 * deleted theme.
 */
const resolveInitialThemeName = (): ThemeName => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme');
  return isThemeName(stored) ? stored : 'dark';
};

/**
 *  ToggleColorMode component that provides the color mode context and a function to toggle the color mode
 * @param {PropsWithChildren} children
 * @returns {JSX.Element}
 */
export default function ToggleColorMode({ children }: PropsWithChildren) {
  const [themeName, setThemeName] = useState<ThemeName>(resolveInitialThemeName);

  useEffect(() => {
    // Normalizes a legacy/invalid stored value (e.g. 'red') on disk so the
    // next visit reads a valid name directly; the name to render was already
    // resolved above, so this doesn't need to touch state.
    if (localStorage.getItem('theme') !== themeName) {
      localStorage.setItem('theme', themeName);
    }
    // Only ever needs to run once, to clean up whatever was on disk at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColorMode = (name: ThemeName) => {
    setThemeName(name);
    localStorage.setItem('theme', name);
  };

  const contextValue = {
    mode: themes[themeName],
    themeName,
    toggleColorMode,
  };

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={themes[themeName]}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}
