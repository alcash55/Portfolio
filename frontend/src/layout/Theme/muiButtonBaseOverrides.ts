import { Components, Theme } from '@mui/material/styles';

// MUI's ButtonBase (Button, IconButton, Fab, BottomNavigationAction, ...)
// sets `outline: 0` unconditionally and expects the app to restore a
// focus-visible indicator; none of this project's themes did, so every
// button site-wide was keyboard-focusable but invisible while focused
// (WCAG 2.4.7). `outlineOffset` puts the ring over the surrounding
// page/paper background rather than the button's own surface.
//
// The ring color itself must be theme-aware: it was originally a fixed
// `common.white`, chosen back when every theme had a dark page background.
// That's invisible on the light theme's white/near-white surfaces. Rather
// than branch on `theme.palette.mode` here, each theme declares its own
// `palette.focusRing` (see theme.d.ts) -- dark, blue, red, purple, and green
// all keep white (their backgrounds are all dark), light uses a dark ring --
// and this override, shared by every theme, just reads it.
export const muiButtonBaseOverrides: Components<Theme>['MuiButtonBase'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      '&.Mui-focusVisible': {
        outline: `2px solid ${theme.palette.focusRing}`,
        outlineOffset: 2,
      },
    }),
  },
};
