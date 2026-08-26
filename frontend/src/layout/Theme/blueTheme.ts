import { ThemeOptions, createTheme } from '@mui/material/styles';
import '@fontsource/public-sans';
import { muiButtonBaseOverrides } from './muiButtonBaseOverrides';

export const blueTheme: ThemeOptions = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      // Sprint 15: `main` was `#5893df`, which failed AA in two places at
      // once -- `main` on `background.paper` (the mobile nav's selected
      // label) measured 3.98:1 against the 4.5:1 body-text minimum, and
      // white contained-button text on `main` measured 3.16:1. Both failures
      // came from the same root cause: MUI's `getContrastText` picks white
      // once a background clears *its* threshold (3:1 by default), which is
      // more permissive than AA (4.5:1) -- `#5893df` sat in the gap between
      // the two. Lightened (same hue/saturation, +0.07 HSL lightness) so
      // `main` itself clears AA as body text on `paper`, which pushes white-
      // on-`main` contrast down below MUI's 3:1 threshold and flips its
      // auto-picked contrastText to black -- pinned below anyway rather than
      // relying on that threshold crossing, so a future hue tweak can't
      // silently flip it back to white the way `#5893df` did.
      main: '#76a6e5',
      // Contained buttons (sideNav nav items, Send, 404's Go Home): black
      // clears every role that reads `main` as a background, so pin it
      // rather than depend on MUI auto-selecting it. Matches the value MUI
      // already computes by default for the other five themes' lighter/
      // brighter `main` colors (red/purple/green/light all auto-resolve to
      // this, or to white for light's darker `main` -- see the six-theme
      // table in this sprint's report).
      contrastText: 'rgba(0, 0, 0, 0.87)',
      // Footer/About/Contact read `primary.light`, not `main`, as their link
      // colour (Sprint 4). Re-measured this sprint against the new `main`:
      // auto-derived `light` is 6.12:1 on `paper` and 7.79:1 on `default`
      // (both clear AA with more margin than before) -- still the right
      // call, so left unset rather than pinned to a literal value. Unrounded
      // WCAG 2.1 figures -- see Contact.tsx for the measurement method.
    },
    secondary: {
      main: '#2ec5d3',
    },
    background: {
      default: '#192231',
      paper: '#24344d',
    },
    // See muiButtonBaseOverrides.ts. White ring, unchanged from before this
    // was made theme-aware: this theme's backgrounds are all dark.
    focusRing: '#ffffff',
  },
  components: {
    // See muiButtonBaseOverrides.ts for the focus-visible ring; shared
    // across every theme and reads `palette.focusRing` above.
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
