import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';
import Check from '@mui/icons-material/Check';
import WebAsset from '@mui/icons-material/WebAsset';
import VerticalSplit from '@mui/icons-material/VerticalSplit';
import { useColorMode } from '../../../layout/Theme/ColorModeContext';
import { THEME_OPTIONS } from '../../AppShell/InternalComponents/themeOptions';
import { useAppShellLayout } from '../../AppShell/AppShellLayoutContext';

/**
 * A control's resting place in the hero, as percentages of the hero box.
 *
 * Two sets, because the hero's empty space moves as the viewport narrows, and
 * these positions are measured rather than guessed (`e2e/hero-controls.spec.ts`
 * re-measures them on every run):
 *
 * - `gutter`, from 1024px up: the content column is centred and capped at
 *   960px, so both edges of the hero are clear. Six themes drift down the left
 *   gutter, the two layouts down the right one.
 * - `field`, below 1024px: there is no gutter left. The subtitle runs to within
 *   ~55px of both edges at 700px wide -- narrower than one control plus its
 *   drift -- so anything at the edges would sit on the text. The controls move
 *   instead to the lower half of the hero, which is clear of every piece of
 *   text at every width down to 320px.
 *
 * Overlapping the bento photographs down there is allowed and deliberate: they
 * are decorative, they are already behind a 0.5-alpha black scrim, and the
 * decorative particles have always drifted over them. Overlapping *text*, the
 * social links, or the scroll-indicator arrow is not allowed, and is what the
 * e2e geometry test actually asserts.
 *
 * `left` is the control's left edge, so it has to stay below
 * `100% - 44px - drift` at the narrowest viewport in its regime, or the page
 * grows a horizontal scrollbar -- `smoke.spec.ts` asserts there is none at
 * 320px.
 */
interface Placement {
  /** >= 1024px: down the left and right gutters. */
  gutter: { left: string; top: string };
  /** < 1024px: scattered across the lower half. */
  field: { left: string; top: string };
}

interface FloatingControl {
  /** Stable key, and the value handed to the toggler. */
  id: string;
  /** The accessible name. Not the colour, not the icon -- the name. */
  label: string;
  place: Placement;
}

/**
 * Where the six theme controls rest, in the order they are painted and in the
 * order they take focus.
 *
 * Hand-written, not generated with the `Math.random()` the decorative
 * particles use, because DOM order is the tab order: down the left gutter
 * top-to-bottom on a wide screen, and left-to-right, row by row, on a narrow
 * one. Randomised positions would mean a control field that tabs in a
 * different order on every reload -- a WCAG 2.4.3 failure that changes shape
 * each time you look at it.
 */
const THEME_PLACEMENTS: Placement[] = [
  { gutter: { left: '4%', top: '12%' }, field: { left: '4%', top: '58%' } },
  { gutter: { left: '7.5%', top: '23%' }, field: { left: '30%', top: '58%' } },
  { gutter: { left: '3%', top: '34%' }, field: { left: '66%', top: '58%' } },
  { gutter: { left: '7%', top: '45%' }, field: { left: '12%', top: '72%' } },
  { gutter: { left: '3.5%', top: '56%' }, field: { left: '44%', top: '72%' } },
  { gutter: { left: '7.5%', top: '67%' }, field: { left: '80%', top: '72%' } },
];

/**
 * The two layout modes a visitor can actually choose between. `mobile` is the
 * third `AppShellLayoutMode`, but it is forced by viewport width rather than
 * picked (see `AppShellProvider`'s `applyMode`), so a button for it would do
 * nothing. Icons rather than swatches: a window with a bar across its top, and
 * one with a column down its left, which is what the two layouts look like.
 *
 * The `field` row these two sit in is clear of the scroll-indicator arrow,
 * which lives in the middle ~10% of the hero's width.
 */
const LAYOUT_CONTROLS: (FloatingControl & {
  mode: 'default' | 'sideNav';
  Icon: SvgIconComponent;
})[] = [
  {
    id: 'default',
    mode: 'default',
    label: 'Top nav layout',
    Icon: WebAsset,
    place: { gutter: { left: '92%', top: '20%' }, field: { left: '20%', top: '86%' } },
  },
  {
    id: 'sideNav',
    mode: 'sideNav',
    label: 'Side nav layout',
    Icon: VerticalSplit,
    place: { gutter: { left: '88%', top: '33%' }, field: { left: '70%', top: '86%' } },
  },
];

/** Diameter of a control. 44px is the usual floor for a touch target and the
 *  size at which one of these reads as a button rather than as a speck. */
const SIZE = 44;

/**
 * The hero's theme and layout controls: eight of the floating dots, grown into
 * buttons.
 *
 * ── What this is ──
 * The site has six themes and two layouts, and until now both were reachable
 * only through a settings drawer behind a hamburger icon -- which is to say
 * they were invisible. The hero already had thirty dots drifting across it;
 * eight of them are now controls. They keep drifting, they stay scattered, and
 * they are not collected into a bar (an earlier attempt did exactly that and
 * was rejected: the dots are the point).
 *
 * ── Making a drifting target actually usable ──
 * A control that moves is a control you have to chase, and that is a genuine
 * problem for anyone whose pointer is not steady. Three things keep it
 * hittable:
 *
 *  1. The drift is deliberately not the decorative `float` keyframes, which
 *     throw a dot 30px around over 5-15s. `heroControlDrift` moves 6px over
 *     20-28s -- roughly a third of a millimetre per second on a laptop screen,
 *     i.e. slower than a pointer correction, and never further than a seventh
 *     of the button's own width, so the button under the cursor when you press
 *     is the one that was under it when you aimed.
 *  2. Hover and keyboard focus both pause the animation outright
 *     (`animation-play-state: paused`, which freezes it where it is rather than
 *     snapping it home). Once you are on one, it stops.
 *  3. 44px targets, which is bigger than the drift by a factor of seven.
 *
 * Under `prefers-reduced-motion` the animation is dropped entirely and every
 * control sits at its resting position. The decorative dots are skipped
 * wholesale in that case (see Landing.tsx); these are not, because they are
 * functionality now.
 *
 * ── Contrast, which this hero has burned people on before ──
 * Behind these buttons are three blurred colour circles at `opacity: 0.3`,
 * animating across randomised positions -- Landing.tsx documents a 0.5-alpha
 * caption measuring 3.81:1 against them and passing only intermittently
 * *because the circles move*. Nothing here is allowed to depend on that
 * lottery, so each control is its own opaque coin: a `background.paper` disc
 * that everything inside it -- swatch ring, layout icon, check mark, focus ring
 * -- is measured against. Those pairings are fixed per theme and measured
 * (worst case, the dark theme: 5.83:1 for the ring, 14.6:1 for the icon and the
 * focus ring, all above the 3:1 non-text and 4.5:1 text floors).
 *
 * The one thing the theme-wide focus-ring override
 * (`muiButtonBaseOverrides.ts`) would put outside that coin is the ring itself,
 * at `outlineOffset: 2` -- landing it on the hero background, over whatever
 * blurred circle or photograph happens to be behind. The offset is flipped
 * negative here, only here, so the ring is drawn *on* the coin. The colour
 * still comes from the theme's own `palette.focusRing`.
 */
export const HeroControls = () => {
  const theme = useTheme();
  const { themeName, toggleColorMode } = useColorMode();
  const { layout, toggleLayout } = useAppShellLayout();

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // The same breakpoint, in the same direction, as `SettingsDrawer`'s
  // `showLayout` gate. Below 650px `AppShellProvider` pins the layout to
  // `mobile` and ignores whatever `toggleLayout` is asked for, so a layout
  // button there is a button that lies -- spec 03 asks for it to be absent.
  const isMobileWidth = useMediaQuery(theme.breakpoints.down(650));

  // Which regime the controls are placed in depends on how wide *the hero* is,
  // not on how wide the window is. Those are different numbers in the sideNav
  // layout, where the sidebar takes 248px off the left (or 72px when it is
  // collapsed, which the visitor can toggle at any time): a 1280px window
  // there leaves a ~1000px hero with no gutters to speak of, and placing
  // controls as though it had them dropped them on top of the content. A
  // ResizeObserver on this component's own layer follows all of that without
  // having to know the sidebar's widths or its collapsed state.
  //
  // `useMediaQuery` still supplies the value for the first paint (and for
  // jsdom, which has no ResizeObserver): the observer cannot report before it
  // has been attached, and starting from `null` would put every control in the
  // wrong regime for a frame.
  const layerRef = useRef<HTMLDivElement>(null);
  const [heroWidth, setHeroWidth] = useState<number | null>(null);
  const viewportHasGutters = useMediaQuery(theme.breakpoints.up(1024));
  const hasGutters = heroWidth === null ? viewportHasGutters : heroWidth >= 1024;

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setHeroWidth(entry.contentRect.width));
    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  const controlSx = (place: Placement, index: number) => ({
    position: 'absolute' as const,
    // Picked in JS rather than through an `sx` breakpoint object: 1024 is not
    // one of the theme's named breakpoints, and reading it through the same
    // `useMediaQuery` the rest of the component uses keeps one source of truth
    // for which regime is live.
    ...(hasGutters ? place.gutter : place.field),
    width: SIZE,
    height: SIZE,
    borderRadius: '50%',
    // The layer above is `pointerEvents: 'none'` so it cannot swallow clicks
    // meant for the hero underneath; the buttons opt themselves back in.
    pointerEvents: 'auto' as const,
    // Opaque, on purpose -- see the contrast note above.
    bgcolor: 'background.paper',
    border: '1.5px solid',
    borderColor: 'text.secondary',
    color: 'text.primary',
    boxShadow: 3,
    // Staggered so eight identical animations don't move in lockstep, which
    // would read as the whole set sliding rather than as dots drifting.
    animation: prefersReducedMotion
      ? 'none'
      : `heroControlDrift ${20 + index}s ease-in-out ${index * 1.7}s infinite`,
    '&:hover, &.Mui-focusVisible': {
      // Freezes the drift where it is -- the button does not snap back to its
      // resting place under the pointer, it simply stops.
      animationPlayState: 'paused',
      borderColor: 'text.primary',
      boxShadow: 6,
    },
    '&.Mui-focusVisible': {
      // Inward, so the ring lands on this button's own opaque surface instead
      // of on whatever the hero is painting behind it.
      outlineOffset: '-4px',
    },
    // Not `transform`: the drift animation owns that property, and an
    // animation's value wins over a normal declaration -- a hover `scale()`
    // here would simply never apply (and would fight the pause above if it
    // did).
    transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 150 }),
  });

  return (
    // The layer is full-bleed and `pointerEvents: 'none'` so that a
    // transparent sheet over the whole hero cannot swallow clicks meant for
    // the nav links, the social icons or the images underneath it; each
    // control opts itself back in. See Landing.tsx for why it is stacked and
    // ordered where it is.
    <Box
      ref={layerRef}
      sx={{ position: 'absolute', inset: 0, zIndex: 11, pointerEvents: 'none' }}
    >
      {THEME_OPTIONS.map(({ name, label, theme: optionTheme }, index) => {
        const selected = themeName === name;
        // Computed against the swatch it sits on, per theme: a check readable
        // on dark's near-black swatch is invisible on light's near-white one.
        const markColor = optionTheme.palette.getContrastText(
          optionTheme.palette.background.default,
        );
        const controlLabel = `${label} theme`;

        return (
          <Tooltip key={name} title={controlLabel} enterDelay={300}>
            <ButtonBase
              // The swatch inside is `aria-hidden`: a colour is a preview, not
              // a name. `aria-pressed` makes the six read as one toggle set
              // rather than as six unrelated actions.
              aria-label={controlLabel}
              aria-pressed={selected}
              onClick={() => toggleColorMode(name)}
              sx={controlSx(THEME_PLACEMENTS[index], index)}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'relative',
                  width: SIZE - 18,
                  height: SIZE - 18,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  bgcolor: optionTheme.palette.background.default,
                  // The ring belongs to the *active* theme, not the previewed
                  // one, so it stays visible against the coin whichever
                  // palettes are on offer. Its weight is the non-colour half of
                  // the selected cue (WCAG 1.4.1); the check mark is the other.
                  border: selected ? '2px solid' : '1px solid',
                  borderColor: selected ? 'text.primary' : 'text.secondary',
                }}
              >
                {/* The card surface this theme's content would sit on, cut into
                    the same circle -- one swatch, both surfaces. */}
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
                    sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 16, color: markColor }}
                  />
                )}
              </Box>
            </ButtonBase>
          </Tooltip>
        );
      })}

      {!isMobileWidth &&
        LAYOUT_CONTROLS.map(({ id, mode, label, Icon, place }, index) => {
          const selected = layout === mode;

          return (
            <Tooltip key={id} title={label} enterDelay={300}>
              <ButtonBase
                aria-label={label}
                aria-pressed={selected}
                onClick={() => toggleLayout(mode)}
                sx={{
                  ...controlSx(place, THEME_OPTIONS.length + index),
                  // Selected layout: a heavier ring, matching the swatches'
                  // selected weight, plus `aria-pressed` for anyone not
                  // looking at it.
                  border: selected ? '2.5px solid' : '1.5px solid',
                  borderColor: selected ? 'text.primary' : 'text.secondary',
                }}
              >
                <Icon sx={{ fontSize: 20 }} />
              </ButtonBase>
            </Tooltip>
          );
        })}

      {/* Scoped to this component rather than added to Landing's keyframe
          block: the decorative `float` there is a different animation with a
          different job (see the drift note above), and the two should not be
          able to drift -- pun intended -- into using each other's values. */}
      <style>{`
        @keyframes heroControlDrift {
          0%, 100% { transform: translate(0, 0); }
          25%      { transform: translate(4px, -6px); }
          50%      { transform: translate(-3px, -3px); }
          75%      { transform: translate(-5px, 4px); }
        }
      `}</style>
    </Box>
  );
};
