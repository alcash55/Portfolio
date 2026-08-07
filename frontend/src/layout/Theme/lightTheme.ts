import { ThemeOptions, createTheme } from '@mui/material/styles';
import '@fontsource/plus-jakarta-sans';
import { muiButtonBaseOverrides } from './muiButtonBaseOverrides';

export const lightTheme: ThemeOptions = createTheme({
  palette: {
    // First light theme in this app -- every other theme is `mode: 'dark'`.
    // Any component relying on a MUI-derived default (divider, overlay,
    // action states, getContrastText) that has only ever been exercised in
    // dark mode is unverified until this renders. `focusRing`,
    // `background.hero`, and the explicit `warning`/`info`/`primary.light`
    // overrides below are what that surfaced.
    mode: 'light',
    primary: {
      main: '#0958d9',
      // Footer/About/Contact read `primary.light` for link/accent text
      // (Sprint 4: `primary.main` alone was too low-contrast against paper
      // in blue). MUI's default tonal offset makes `light` *lighter* than
      // `main`, which is the right direction on a dark page and the wrong
      // one here. Set explicitly rather than let it auto-lighten toward
      // white: `light` means "the variant guaranteed AA against paper/
      // default," not "a lighter tint," in every theme including this one.
      light: '#0958d9',
      dark: '#063886',
    },
    secondary: {
      main: '#6d28d9',
    },
    // MUI's stock light-mode `warning`/`info` fall short of AA body-text
    // contrast against this theme's `paper`/`default` (measured 3.11:1 and
    // 3.86:1) -- `error` (4.98:1) and `success` (5.13:1) already clear it,
    // so left at MUI's default. darkTheme tunes all four explicitly to the
    // same standard; these match that discipline for the two that needed it.
    warning: {
      main: '#a15c00',
    },
    info: {
      main: '#01669e',
    },
    text: {
      primary: '#16181d',
      secondary: '#53565f',
    },
    background: {
      default: '#f4f5f7',
      paper: '#ffffff',
      // See theme.d.ts -- Landing's hero stays dark by design, so it can't
      // read `background.default`. Reuses darkTheme's own default so the
      // hero looks identical to the dark theme's, regardless of which theme
      // is active.
      hero: '#202020',
    },
    focusRing: '#000000',
    grey: {
      // Only 400 is consumed (Experience.tsx timeline connector/badge, on
      // `background.paper`); MUI's stock 400 (#bdbdbd) reads under 2:1 there.
      // Left the rest of the scale at MUI's default.
      400: '#757575',
    },
  },
  components: {
    MuiButtonBase: muiButtonBaseOverrides,
  },
  typography: {
    fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
    overline: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0.499,
      textCase: 'uppercase',
    },
    h1: {
      fontSize: 96,
      fontWeight: 700,
      letterSpacing: -2.141,
    },
    h2: {
      fontSize: 60,
      fontWeight: 700,
      letterSpacing: -1.34,
    },
    h3: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: -1.07,
    },
    h4: {
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: -0.741,
    },
    h5: {
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: -0.046,
    },
    h6: {
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: -0.334,
    },
    body1: {
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: -0.176,
    },
    body2: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: -0.087,
    },
    subtitle1: {
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: -0.176,
    },
    subtitle2: {
      fontSize: 14,
      fontWeight: 500,
      letterSpacing: -0.087,
    },
    caption: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: -0.006,
    },
    button: {
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.75,
      textTransform: 'none',
    },
  },
});
