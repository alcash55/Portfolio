import { ThemeOptions, createTheme } from '@mui/material/styles';
import '@fontsource/oxygen';
import { muiButtonBaseOverrides } from './muiButtonBaseOverrides';

// Sprint 12 restore. The original red theme (Sprint 4.5) paired `default:
// #310000` with `paper: #731010` -- a saturated blood red on every card and
// section surface, which is what made it "too aggressive" everywhere except
// the hero. Card/paper here is a subtle lift in the same hue instead (see
// `paper lift` below), the way blue's already was; the deep near-black
// `default` Alex liked for the hero is unchanged in spirit.
export const redTheme: ThemeOptions = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffab73',
      // Footer/About/Contact read `primary.light`, not `main`, as their link
      // colour (Sprint 4). Left unset here: MUI's auto-derived `light`
      // (lighten by the default 0.2 tonal offset) is #ffbc8f, which measures
      // 9.42:1 against `paper` and 11.04:1 against `default` -- `default` is
      // the darker surface, so it's the one that gains most from lightening
      // `main`; either way lightening raises contrast on a dark page, same
      // direction as dark/blue, so there's no reason to pin it the way light
      // had to. Unrounded WCAG 2.1 figures -- see Contact.tsx for the
      // measurement method.
    },
    // Complements the warm primary rather than repeating it -- same role
    // blue's teal secondary plays against its blue primary. Purely
    // decorative (Landing's ambient blend circles, About's accent bar), but
    // measured anyway: 8.26:1 on `default`, 7.05:1 on `paper`.
    secondary: {
      main: '#e6a23c',
    },
    // Same tuned set as darkTheme, re-measured against this theme's darker
    // background: 6.21:1 on `default`, 5.30:1 on `paper` for all four --
    // clears AA with room even though none of these currently render as
    // visible text/UI (see ConnectNotification.tsx, which hardcodes its own
    // colors rather than reading the palette).
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
      default: '#2a0d0d',
      paper: '#3d1a1a',
    },
    // Paper lift (luminance): 0.0100 -- close to dark's 0.0077 and well
    // under old red's 0.0340. text/default 18.07:1, text/paper 15.43:1
    // (white body text, per palette.text below).
    // White ring: this theme's backgrounds are all dark, same as dark/blue.
    focusRing: '#ffffff',
  },
  components: {
    MuiButtonBase: muiButtonBaseOverrides,
  },
  typography: {
    fontFamily: 'Oxygen, Arial, sans-serif',
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
