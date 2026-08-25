import type { Theme } from '@mui/material/styles';
import { ThemeName } from '../../../layout/Theme/ColorModeContext';
import { darkTheme } from '../../../layout/Theme/darkTheme';
import { blueTheme } from '../../../layout/Theme/blueTheme';
import { lightTheme } from '../../../layout/Theme/lightTheme';
import { redTheme } from '../../../layout/Theme/redTheme';
import { purpleTheme } from '../../../layout/Theme/purpleTheme';
import { greenTheme } from '../../../layout/Theme/greenTheme';

/** One selectable theme: the name `toggleColorMode` takes, a human label, and the
 *  theme object itself so a picker can preview the palette it is offering. */
export interface ThemeOption {
  name: ThemeName;
  label: string;
  theme: Theme;
}

/**
 * The six themes, in the order every picker shows them.
 *
 * This list used to live inside `ThemeButton.tsx`, which was fine while the
 * settings drawer was the only place a visitor could change themes. There are
 * two pickers now -- the drawer's swatch grid and the hero's control bar (see
 * `Pages/Landing/HeroControls.tsx`) -- and a second copy of the list is exactly
 * the kind of thing that goes stale when a seventh theme is added: one picker
 * would silently offer five of six. Both import this.
 *
 * Every theme file is typed `ThemeOptions` (createTheme's *input* shape,
 * optional fields throughout) even though `createTheme` always returns a full
 * `Theme` at runtime -- see each theme file. The casts below reflect that
 * runtime reality so `background.default/paper` and `getContrastText` are usable
 * without fighting the optional-everything input type.
 */
export const THEME_OPTIONS: ThemeOption[] = [
  { name: 'dark', label: 'Dark', theme: darkTheme as Theme },
  { name: 'blue', label: 'Blue', theme: blueTheme as Theme },
  { name: 'light', label: 'Light', theme: lightTheme as Theme },
  { name: 'red', label: 'Red', theme: redTheme as Theme },
  { name: 'purple', label: 'Purple', theme: purpleTheme as Theme },
  { name: 'green', label: 'Green', theme: greenTheme as Theme },
];
