import { ThemeOptions, createTheme } from '@mui/material/styles';

export const redTheme: ThemeOptions = createTheme({
  palette: {
    // Explicit dark mode: without it MUI defaults to 'light', which makes
    // auto-derived tokens (palette.divider, default text color for any
    // Typography not wrapped in a Card/Paper override below) resolve to
    // near-black values that are unreadable against this theme's dark red
    // background. The Card/Paper/Divider overrides below were compensating
    // for that per-component instead of fixing the root cause.
    mode: 'dark',
    primary: {
      main: '#ff8f00',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#310000',
      paper: '#731010',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          elevation: 5,
          backgroundColor: '#310000',
          color: 'white',
          //   backgroundImage:
          //     "linear-gradient(rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.15))",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          color: 'white',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'paper',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.15))',
          boxShadow:
            'rgba(0, 0, 0, 0.2) 0px 8px 10px -5px, rgba(0, 0, 0, 0.14) 0px 16px 24px 2px, rgba(0, 0, 0, 0.12) 0px 6px 30px 5px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          backgroundColor: 'white',
        },
      },
    },
    // See darkTheme.ts for why this exists and why the ring color is fixed
    // white rather than `currentColor`: MUI's ButtonBase sets `outline: 0`
    // and expects the theme to restore a focus-visible indicator, which
    // none of this project's themes did.
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.palette.common.white}`,
            outlineOffset: 2,
          },
        }),
      },
    },
  },
  typography: {
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
      lineHeight: 1.75,
      textTransform: 'none',
    },
  },
});
