import { ThemeOptions, createTheme } from '@mui/material/styles';
import '@fontsource/space-grotesk';
import { muiButtonBaseOverrides } from './muiButtonBaseOverrides';

export const purpleTheme: ThemeOptions = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c9a7f5',
      // Footer/About/Contact read `primary.light`, not `main` (Sprint 4).
      // Left unset: MUI's auto-derived `light` (#d3b8f7) measures 8.76:1
      // against `paper` and 10.10:1 against `default` -- `default` is the
      // darker surface, so it's the one that gains most from lightening
      // `main`; either way lightening raises contrast on this dark page, so
      // pinning (as light theme must) isn't needed here. See Contact.tsx for
      // the measurement method.
    },
    // Warm complement to the violet primary -- same role blue's teal
    // secondary plays against its blue primary. Purely decorative (Landing's
    // ambient blend circles, About's accent bar), but measured anyway:
    // 9.50:1 on `default`, 8.24:1 on `paper`.
    secondary: {
      main: '#4fd1c5',
    },
    // Same tuned set as darkTheme, re-measured against this theme's
    // background: 6.09:1 on `default`, 5.28:1 on `paper` for all four.
    error: {
      main: '#ff6459',
    },
    success: {
      main: '#59a94f',
    },
    warning: {
      main: '#dc8126',
    },
    info: {
      main: '#7b8fff',
    },
    background: {
      default: '#1c1526',
      paper: '#2b2038',
    },
    // Paper lift (luminance): 0.0091. text/default 17.73:1, text/paper
    // 15.37:1 (white body text, per palette.text below).
    // White ring: this theme's backgrounds are all dark, same as dark/blue.
    focusRing: '#ffffff',
  },
  components: {
    MuiButtonBase: muiButtonBaseOverrides,
  },
  typography: {
    fontFamily: 'Space Grotesk, Arial, sans-serif',
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
