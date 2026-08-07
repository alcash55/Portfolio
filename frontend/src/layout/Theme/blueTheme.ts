import { ThemeOptions, createTheme } from '@mui/material/styles';
import '@fontsource/public-sans';
import { muiButtonBaseOverrides } from './muiButtonBaseOverrides';

export const blueTheme: ThemeOptions = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5893df',
      // Sprint 4: `primary.main` measured 3.98:1 against `background.paper`
      // here (the other themes cleared AA with `main` alone), so links use
      // `primary.light` instead. Re-measured this sprint: `main` is still
      // 3.98:1 (unchanged, still fails), auto-derived `light` is 5.11:1
      // (still clears AA) -- still the right call, so left unset rather
      // than pinned to a literal value.
    },
    secondary: {
      main: '#2ec5d3',
    },
    background: {
      default: '#192231',
      paper: '#24344d',
      // Landing's hero stays dark in every theme by design; see theme.d.ts.
      // Unchanged from this theme's own default, so blue is visually identical.
      hero: '#192231',
    },
    // See muiButtonBaseOverrides.ts. White ring, unchanged from before this
    // was made theme-aware: this theme's backgrounds are all dark.
    focusRing: '#ffffff',
  },
  components: {
    // See muiButtonBaseOverrides.ts for the focus-visible ring; shared
    // across all three themes and reads `palette.focusRing` above.
    MuiButtonBase: muiButtonBaseOverrides,
  },
  typography: {
    fontFamily: 'public-sans, sans-serif',
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
