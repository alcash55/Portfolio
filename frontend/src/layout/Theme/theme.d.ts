import '@mui/material/styles';

// Shared by every theme file in this directory:
//
// - `palette.focusRing`: the color MuiButtonBase's focus-visible outline
//   uses (see muiButtonBaseOverrides.ts). Every theme sets it explicitly
//   because the right color depends on the *page* background behind the
//   ring, not on `primary`/`common` values that already mean something else.
//
// Sprint 12 removed `palette.background.hero`. Sprint 10 pinned it to a
// fixed dark value so Landing's hero would "stay dark in every theme by
// design" -- that was wrong: it's why the light theme's hero rendered dark
// text-on-dark-background with no light surface underneath. Once Landing's
// hardcoded `rgba(255,255,255,…)`/`#fff` references become theme tokens
// (Sprint 12, Landing.tsx), the hero has no reason to differ from
// `background.default` in any of the six themes -- it just *is* that
// theme's page surface, the same way it already was in dark/blue before this
// token existed. A distinct token with no distinct value is dead weight, so
// Landing now reads `background.default` directly.
declare module '@mui/material/styles' {
  interface Palette {
    focusRing: string;
  }
  interface PaletteOptions {
    focusRing?: string;
  }
}
