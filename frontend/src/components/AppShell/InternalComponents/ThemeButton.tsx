import { Box, ButtonBase, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import { useColorMode } from '../../../layout/Theme/ColorModeContext';
import { THEME_OPTIONS } from './themeOptions';

// Sprint 12: six themes made the old row of text `Button`s (built for three)
// cramped at 320px, so each option is now a small swatch previewing its own
// `background.default`/`paper` instead of a label alone -- self-documenting,
// and scales past six without wrapping awkwardly. Alex may want a different
// treatment later; the swatch markup lives entirely in this one component,
// keyed off `THEME_OPTIONS`, so that's a local change, not a theme-file one.
//
// `THEME_OPTIONS` itself moved out to `themeOptions.ts` once the hero grew its
// own picker (Pages/Landing/HeroControls.tsx) -- two components offering "the
// themes" must not each keep their own idea of what those are.

export const ThemeButton = () => {
  const { toggleColorMode, themeName } = useColorMode();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
        gap: 1.5,
        width: '100%',
      }}
    >
      {THEME_OPTIONS.map(({ name, label, theme }) => {
        const selected = themeName === name;
        // Computed per-theme, not assumed: a check mark readable on one
        // theme's swatch (e.g. white on dark's near-black default) can be
        // invisible on another's (white on light's near-white default).
        const markColor = theme.palette.getContrastText(theme.palette.background.default);

        return (
          <ButtonBase
            key={name}
            // The swatch below is `aria-hidden`; this text is what makes
            // "Red" (say) the button's accessible name -- a colour alone
            // isn't one. `aria-pressed` layers the selected state on top,
            // so the set reads as a toggle group rather than six unrelated
            // actions.
            aria-pressed={selected}
            onClick={() => toggleColorMode(name)}
            sx={{
              flexDirection: 'column',
              gap: 0.5,
              py: 1,
              px: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: theme.palette.background.default,
                // Own theme's own focusRing would fight the just-switched
                // theme's outline on `:focus-visible` (see
                // muiButtonBaseOverrides.ts); this is a static selection
                // ring, `text.primary` of whichever theme is *currently*
                // active, not the swatch being previewed.
                border: '2px solid',
                borderColor: selected ? 'text.primary' : 'divider',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {/* The card/paper surface this theme's cards would read
                  against its own default -- one swatch, both surfaces. */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                  bgcolor: theme.palette.background.paper,
                }}
              />
              {selected && (
                <Check
                  fontSize="small"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    m: 'auto',
                    color: markColor,
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.2 }}>
              {label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
};
