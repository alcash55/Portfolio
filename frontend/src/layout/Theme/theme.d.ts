import '@mui/material/styles';

// Two additions shared by every theme file in this directory:
//
// - `palette.focusRing`: the color MuiButtonBase's focus-visible outline
//   uses (see muiButtonBaseOverrides.ts). Every theme sets it explicitly
//   because the right color depends on the *page* background behind the
//   ring, not on `primary`/`common` values that already mean something else.
//
// - `palette.background.hero`: the Landing hero's surface color. The hero is
//   a deliberate exception to "everything follows the theme" -- it stays
//   dark in dark, blue, and light alike (see Landing.tsx) -- so it cannot be
//   `background.default`, which inverts to a light value in the light theme.
declare module '@mui/material/styles' {
  interface Palette {
    focusRing: string;
  }
  interface PaletteOptions {
    focusRing?: string;
  }
  interface TypeBackground {
    hero: string;
  }
}
