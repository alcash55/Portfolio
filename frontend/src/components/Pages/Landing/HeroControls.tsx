import { Box, ButtonBase, Divider, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Check from '@mui/icons-material/Check';
import WebAsset from '@mui/icons-material/WebAsset';
import VerticalSplit from '@mui/icons-material/VerticalSplit';
import { useColorMode } from '../../../layout/Theme/ColorModeContext';
import { THEME_OPTIONS } from '../../AppShell/InternalComponents/themeOptions';
import { useAppShellLayout } from '../../AppShell/AppShellLayoutContext';

/**
 * The two layout modes a visitor can actually choose between. `mobile` is the
 * third `AppShellLayoutMode`, but it is forced by viewport width rather than
 * picked (see AppShellProvider's `applyMode`), so offering it as a button would
 * be offering a switch that does nothing.
 */
const LAYOUT_OPTIONS = [
  {
    mode: 'default' as const,
    label: 'Top nav layout',
    // A window frame with a bar across its top, next to VerticalSplit's
    // left-hand column: the two icons draw the two layouts rather than
    // labelling them. (The obvious HorizontalSplit reads as a hamburger,
    // which is the exact glyph this bar just replaced.)
    Icon: WebAsset,
  },
  {
    mode: 'sideNav' as const,
    label: 'Side nav layout',
    Icon: VerticalSplit,
  },
];

/**
 * The hero's theme + layout control bar.
 *
 * Why it exists: the site's six themes and two layouts were reachable only
 * through a settings drawer behind a hamburger icon, which is to say they were
 * effectively invisible. This puts them on the first screen. It replaces the
 * hamburger in the hero's inline nav entirely -- the drawer holds nothing but
 * `ThemeButton` and `LayoutButton`, so once both live here there is nothing
 * left for that trigger to reveal. (`openSettingDrawer` stays on the context:
 * `NavBar`'s gear, `AppShellLayout`'s sideNav Fab and `MobileChrome`'s Fab all
 * still use it, and the drawer is still the way in from every other scroll
 * position and layout.)
 *
 * ── Why it is a bar and not eight dots scattered across the background ──
 * The ask was "replace some of the background dots that float around with
 * little icon buttons". These are styled as those dots -- same circular
 * language, and the decorative particle field gives up eight of its thirty to
 * pay for them (see Landing.tsx) -- but they are grouped, stationary and in
 * normal document flow, for three reasons that all outrank the visual gag:
 *
 *  1. The particles are placed with `Math.random()`. Scattering *controls* that
 *     way makes tab order unrelated to visual order on every page load, which
 *     is a WCAG 2.4.3 failure that changes shape every time you reload it.
 *  2. The particles drift on the `float` keyframes. A control that moves under
 *     the pointer is a control you have to chase (WCAG 2.5.8 / the spirit of
 *     2.2.2), and it cannot be hit reliably with a head pointer or a shaky
 *     hand at any size.
 *  3. Contrast. The hero's three blurred colour circles animate across it at
 *     randomised positions -- Landing.tsx already documents a 0.5-alpha caption
 *     measuring 3.81:1 there and passing only intermittently *because the
 *     circles move*. A control's label and focus ring must not be a dice roll,
 *     so the bar carries its own opaque `background.paper` surface: everything
 *     inside it is measured against one known colour, in every theme, whatever
 *     is drifting behind.
 *
 * Under `prefers-reduced-motion` the particle field is skipped entirely; this
 * bar is not, because it is functionality now rather than decoration. Only the
 * dots' motion is decorative.
 *
 * ── Accessible names ──
 * Each button's name is on the button (`aria-label`), never on the swatch
 * colour or the tooltip -- a colour is not a name, and a tooltip is not one you
 * can rely on. `aria-pressed` makes each group read as a toggle set rather than
 * as N unrelated actions, and the selected state is carried by a check mark and
 * a thicker ring as well as by colour (WCAG 1.4.1). The tooltips exist for the
 * sighted mouse/keyboard user, who otherwise sees six coloured circles with no
 * indication of which is which; MUI shows them on `:focus-visible` too, so
 * keyboard users get the same hint.
 */
export const HeroControls = () => {
  const theme = useTheme();
  const { themeName, toggleColorMode } = useColorMode();
  const { layout, toggleLayout } = useAppShellLayout();

  // Same breakpoint, and the same direction, as `SettingsDrawer`'s `showLayout`
  // gate. Below 650px `AppShellProvider` pins the layout to `mobile` and
  // ignores anything `toggleLayout` is asked for, so a layout button there
  // would be a button that lies.
  const isMobileWidth = useMediaQuery(theme.breakpoints.down(650));
  const showLayoutControls = !isMobileWidth;

  // The swatch button's box, not the swatch inside it: the focus ring is drawn
  // on this box at a 2px outline + 2px offset (muiButtonBaseOverrides.ts), so
  // the bar's own padding has to be at least 4px for the ring to land on the
  // bar's opaque surface rather than half off its edge onto the hero.
  const buttonSize = { xs: 32, sm: 36 };
  const swatchSize = { xs: 22, sm: 26 };

  const groupSx = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 0.5,
  } as const;

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 0.5,
        columnGap: 1,
        px: 1,
        py: 0.75,
        maxWidth: '100%',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        // Opaque on purpose -- see the contrast note in the block comment
        // above. Anything translucent here reintroduces the drifting-circle
        // lottery for every label and focus ring in the bar.
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        id="hero-theme-label"
        variant="caption"
        sx={{ color: 'text.secondary', pl: 0.5, lineHeight: 1.2 }}
      >
        Theme
      </Typography>
      <Box sx={groupSx} role="group" aria-labelledby="hero-theme-label">
        {THEME_OPTIONS.map(({ name, label, theme: optionTheme }) => {
          const selected = themeName === name;
          // Computed against the swatch it sits on, per theme: a check mark
          // readable on dark's near-black swatch is invisible on light's
          // near-white one.
          const markColor = optionTheme.palette.getContrastText(
            optionTheme.palette.background.default,
          );
          const controlLabel = `${label} theme`;

          return (
            <Tooltip key={name} title={controlLabel} enterDelay={300}>
              <ButtonBase
                aria-label={controlLabel}
                aria-pressed={selected}
                onClick={() => toggleColorMode(name)}
                sx={{
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: '50%',
                  '&:hover .hero-swatch': { borderColor: 'text.primary' },
                }}
              >
                {/* aria-hidden: the colour is the preview, the label above is
                    the name. Announcing this would announce nothing. */}
                <Box
                  aria-hidden
                  className="hero-swatch"
                  sx={{
                    position: 'relative',
                    width: swatchSize,
                    height: swatchSize,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    // The swatch previews `optionTheme`; the ring around it
                    // belongs to whichever theme is *currently* active, so it
                    // stays visible against the bar no matter which palettes
                    // are being previewed. 2px vs 1px is the non-colour half
                    // of the selected cue -- the check mark is the other half.
                    border: selected ? '2px solid' : '1px solid',
                    borderColor: selected ? 'text.primary' : 'text.secondary',
                    bgcolor: optionTheme.palette.background.default,
                  }}
                >
                  {/* The card surface this theme's content would sit on, cut
                      into the same circle -- one swatch, both surfaces. */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                      bgcolor: optionTheme.palette.background.paper,
                    }}
                  />
                  {selected && (
                    <Check
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        m: 'auto',
                        fontSize: 16,
                        color: markColor,
                      }}
                    />
                  )}
                </Box>
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Box>

      {showLayoutControls && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
          <Typography
            id="hero-layout-label"
            variant="caption"
            sx={{ color: 'text.secondary', lineHeight: 1.2 }}
          >
            Layout
          </Typography>
          <Box sx={groupSx} role="group" aria-labelledby="hero-layout-label">
            {LAYOUT_OPTIONS.map(({ mode, label, Icon }) => {
              const selected = layout === mode;

              return (
                <Tooltip key={mode} title={label} enterDelay={300}>
                  <ButtonBase
                    aria-label={label}
                    aria-pressed={selected}
                    onClick={() => toggleLayout(mode)}
                    sx={{
                      width: buttonSize,
                      height: buttonSize,
                      borderRadius: '50%',
                      color: 'text.primary',
                      border: selected ? '2px solid' : '1px solid',
                      borderColor: selected ? 'text.primary' : 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                  </ButtonBase>
                </Tooltip>
              );
            })}
          </Box>
        </>
      )}
    </Stack>
  );
};
