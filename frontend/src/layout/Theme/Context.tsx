import { PropsWithChildren, useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material';
import type { ThemeOptions } from '@mui/material/styles';
import { darkTheme } from './darkTheme';
import { blueTheme } from './blueTheme';
import { lightTheme } from './lightTheme';
import { redTheme } from './redTheme';
import { purpleTheme } from './purpleTheme';
import { greenTheme } from './greenTheme';
import { ColorModeContext, ThemeName, isThemeName } from './ColorModeContext';

const themes: Record<ThemeName, typeof darkTheme> = {
  dark: darkTheme,
  blue: blueTheme,
  light: lightTheme,
  red: redTheme,
  purple: purpleTheme,
  green: greenTheme,
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
 * Also the stored-value migration point: `isThemeName` (see
 * ColorModeContext.ts) accepts only the six current names, so a visitor
 * whose saved value predates a theme's addition or survived its removal
 * (e.g. 'red' from before Sprint 12 restored it with a new palette) either
 * resolves to the current theme of that name or, if the name is genuinely
 * unrecognized, falls back to 'dark' instead of rendering nothing.
 */
const resolveInitialThemeName = (): ThemeName => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme');
  return isThemeName(stored) ? stored : 'dark';
};

/**
 * Writes a `<meta name>` tag, creating it if the document doesn't have one.
 * `index.html` ships both of the tags below, but a test renderer mounts this
 * provider into a bare document, so neither can be assumed to exist.
 */
const setMeta = (name: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
};

/**
 * Keeps the *browser-painted* UI in step with the active theme -- the parts
 * the page cannot style itself.
 *
 * `index.html` hardcodes `color-scheme: dark` and `theme-color: #1a1a1a`,
 * which is right for five of the six themes and wrong for `light`: the UA
 * keeps painting scrollbars and native form controls (the Contact form's
 * inputs) dark on a page that has gone white. `color-scheme` follows
 * `palette.mode`, which every theme declares, and `theme-color` -- the colour
 * mobile browsers tint their own chrome with -- follows the theme's own
 * background instead of a fixed near-black.
 */
const syncBrowserChrome = (theme: ThemeOptions) => {
  // The theme modules export `ThemeOptions`, not `Theme`, so both of these are
  // optional to the type system even though all six themes set them.
  setMeta('color-scheme', theme.palette?.mode ?? 'dark');
  const background = theme.palette?.background?.default;
  if (background) setMeta('theme-color', background);
};

/**
 *  ToggleColorMode component that provides the color mode context and a function to toggle the color mode
 * @param {PropsWithChildren} children
 * @returns {JSX.Element}
 */
export default function ToggleColorMode({ children }: PropsWithChildren) {
  const [themeName, setThemeName] = useState<ThemeName>(resolveInitialThemeName);

  useEffect(() => {
    // Normalizes an unrecognized stored value on disk (e.g. garbage, or a
    // name from a theme that no longer exists) so the next visit reads a
    // valid name directly; the name to render was already resolved above,
    // so this doesn't need to touch state.
    if (localStorage.getItem('theme') !== themeName) {
      localStorage.setItem('theme', themeName);
    }
    // Only ever needs to run once, to clean up whatever was on disk at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncBrowserChrome(themes[themeName]);
  }, [themeName]);

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
