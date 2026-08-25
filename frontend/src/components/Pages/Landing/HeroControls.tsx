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
 * - `gutter`, from 1024px up: the content column is centred and its longest
 *   line of ink -- the subtitle -- ends around 24% of the hero at 1280px, the
 *   tightest of the wide widths. That leaves a band roughly 265px wide down
 *   each side, not a hairline margin, so the controls are scattered *through*
 *   that band at depths between 2% and 24% rather than ruled down a single
 *   column at its edge.
 * - `field`, below 1024px: there is no band left. The subtitle runs to within
 *   ~35px of both edges at 700px wide -- narrower than one control plus its
 *   drift -- so anything at the edges would sit on the text. The controls move
 *   instead to the lower half of the hero, which is clear of every piece of
 *   text at every width down to 320px, and scatter across its full width.
 *
 * The field starts at ~52% rather than hard against the social links above it
 * because the hero's content column is centred: while the webfonts are still
 * loading, fallback metrics push that column ~96px further down a 320px-wide
 * screen, and a tighter row would spend that first moment sitting on the
 * social icons.
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
  /** >= 1024px: scattered through the side bands the centred column leaves. */
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
 * ── Irregular, and fixed ──
 * These are constants, not `Math.random()` calls like the decorative particles
 * in Landing.tsx. DOM order is the tab order, so randomising positions would
 * mean a control field that tabs in a different order on every reload -- a WCAG
 * 2.4.3 failure that changes shape each time you look at it. But *irregular*
 * and *random* are different things, and the first version of this file
 * confused them: it alternated 4% / 7.5% / 3% / 7% against tops ruled every
 * 11%, which is a ladder, and a ladder reads as a widget bolted to the edge
 * rather than as dots.
 *
 * So the numbers below were generated once, offline, by a seeded scatter run
 * against the hero geometry measured in a real browser in all ninety-six
 * combinations of nine viewports, both switchable layouts and all six themes
 * (each theme ships its own font, and at 320px four of the six wrap the h1 to
 * a second line, which pushes the social links 96px down the hero) --
 * rejecting any point that lands on text, on the social links, on the scroll
 * arrow, on the app chrome painted over the hero from outside it (the mobile
 * settings Fab and bottom navigation bar, the sideNav Fab), off an edge, or
 * within 8px of another control's drift envelope in *any* of them; plus a shape filter: no two controls sharing a horizontal rule, no two
 * gaps between successive tops within 1.5% of each other, and no side-to-side
 * alternation. The winning set was then pasted here. What ships is fixed; only
 * the search that found it was random.
 *
 * DOM order is top-to-bottom in both regimes (loose rows, left-to-right, in the
 * field), so tabbing still walks the field in a reading order even though the
 * positions do not line up.
 */
const THEME_PLACEMENTS: Placement[] = [
  { gutter: { left: '21%', top: '3%' }, field: { left: '32.5%', top: '62.5%' } },
  { gutter: { left: '2%', top: '16%' }, field: { left: '78%', top: '61%' } },
  { gutter: { left: '3%', top: '40%' }, field: { left: '8%', top: '68%' } },
  { gutter: { left: '24.5%', top: '47.5%' }, field: { left: '72%', top: '70.5%' } },
  { gutter: { left: '4%', top: '73%' }, field: { left: '18.5%', top: '80.5%' } },
  { gutter: { left: '22.5%', top: '90%' }, field: { left: '43%', top: '77%' } },
];

/**
 * Per-control motion, indexed the same way the controls are: which of the three
 * wander paths it takes, how long one lap lasts, and how far into that lap it
 * starts.
 *
 * Three paths rather than one so eight controls do not trace the same shape at
 * eight speeds, and the durations are deliberately not an arithmetic run -- an
 * evenly-stepped set of periods re-synchronises into a visible pulse every so
 * often. The offsets are *negative*: a positive `animation-delay` would leave
 * every control frozen at its resting point for the first few seconds after
 * load, so the field would appear dead exactly when someone first looks at it.
 * A negative one starts the lap already in progress.
 */
const DRIFT: { path: 'A' | 'B' | 'C'; seconds: number; offset: number }[] = [
  { path: 'A', seconds: 13.4, offset: -2.4 },
  { path: 'B', seconds: 16.1, offset: -9.1 },
  { path: 'C', seconds: 14.2, offset: -5.6 },
  { path: 'A', seconds: 18.3, offset: -13.2 },
  { path: 'B', seconds: 15, offset: -7.3 },
  { path: 'C', seconds: 17.2, offset: -1.1 },
  { path: 'A', seconds: 15.8, offset: -11.4 },
  { path: 'B', seconds: 13.9, offset: -4.7 },
];

/**
 * The two layout modes a visitor can actually choose between. `mobile` is the
 * third `AppShellLayoutMode`, but it is forced by viewport width rather than
 * picked (see `AppShellProvider`'s `applyMode`), so a button for it would do
 * nothing. Icons rather than swatches: a window with a bar across its top, and
 * one with a column down its left, which is what the two layouts look like.
 *
 * Both regimes place them clear of the scroll-indicator arrow, which lives in
 * the middle ~10% of the hero's width, and clear of the six theme controls at
 * every width where these two render (>= 650px) -- the same offline scatter
 * that placed the swatches placed these, with the swatches held fixed.
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
    place: { gutter: { left: '75%', top: '59.5%' }, field: { left: '59.5%', top: '64%' } },
  },
  {
    id: 'sideNav',
    mode: 'sideNav',
    label: 'Side nav layout',
    Icon: VerticalSplit,
    place: { gutter: { left: '91.5%', top: '79.5%' }, field: { left: '34.5%', top: '87%' } },
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
 *  1. Hover and keyboard focus both pause the animation outright
 *     (`animation-play-state: paused`, which freezes it where it is rather than
 *     snapping it home). Once you are on one, it stops -- and it stops before a
 *     pointer that is still travelling can arrive, because the pause fires on
 *     `mouseover`, not on click.
 *  2. 44px targets against a lap that never carries a control more than 12px
 *     from its resting point: a raw click at the coordinates a control occupied
 *     a moment ago still lands inside it, which is what the e2e suite checks
 *     rather than taking the arithmetic on trust.
 *
 * The first version of this file tried to buy that hittability with speed
 * instead -- 6px of travel over 20-28s, about 0.3px per second. That is slow
 * enough that the browser spends seconds at a time on the same rendered
 * position and then jumps to the next one, which is exactly what reads as
 * choppy. The drift now covers 65-82px of path per lap in 13.4-18.3s (~4-6px
 * per second), which is the same order as the decorative dots' ~7-20px/s and
 * comfortably above the threshold where discrete steps become visible. The
 * pause, not the speed, is what makes it aimable.
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
    // would read as the whole set sliding rather than as dots drifting. See
    // DRIFT above for the paths, periods and (negative) offsets.
    //
    // `linear`, not `ease-in-out`: the easing belongs to the path, not to the
    // timing. Each lap is twelve samples of a smooth closed curve, so a
    // constant-speed traversal already turns gradually -- where an ease-in-out
    // over four stops decelerated into a stop and reversed four times a lap,
    // which is what made the motion read as a repeating shape rather than as
    // drifting.
    animation: prefersReducedMotion
      ? 'none'
      : `heroControlDrift${DRIFT[index].path} ${DRIFT[index].seconds}s linear ` +
        `${DRIFT[index].offset}s infinite`,
    // Promotes the control to its own compositor layer, so each frame is a
    // layer transform rather than a repaint of the disc, its border and its
    // shadow. Left off under reduced motion, where there is nothing to hint.
    willChange: prefersReducedMotion ? 'auto' : 'transform',
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
    <Box ref={layerRef} sx={{ position: 'absolute', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
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
          able to drift -- pun intended -- into using each other's values.

          Three closed wander-loops, each written out as twelve evenly spaced
          samples of a smooth curve. The stop count is the whole trick: with
          four stops a lap is four straight legs and four hard turns, which the
          eye reads as a repeating shape; with twelve the turns are 30 degrees
          apart and, played `linear`, the control simply wanders. Every sample
          is inside a 12px radius of the resting point; the e2e geometry suite
          leaves 14px of slack around every control to match, and one of its
          tests reads these rules back out of the CSSOM so that widening a lap
          without widening that slack fails rather than quietly parking a
          control on the subtitle. `transform` and nothing else:
          animating `top`/`left` would put every frame through layout. */}
      <style>{`
        @keyframes heroControlDriftA {
          0% { transform: translate(1.3px, -9.6px); }
          8.333% { transform: translate(6.7px, -6.2px); }
          16.667% { transform: translate(9.2px, -4.8px); }
          25% { transform: translate(9.1px, -2.1px); }
          33.333% { transform: translate(7.5px, 4.8px); }
          41.667% { transform: translate(5.0px, 10.4px); }
          50% { transform: translate(1.3px, 9.6px); }
          58.333% { transform: translate(-3.7px, 6.2px); }
          66.667% { transform: translate(-8.8px, 4.8px); }
          75% { transform: translate(-11.7px, 2.1px); }
          83.333% { transform: translate(-10.5px, -4.8px); }
          91.667% { transform: translate(-5.4px, -10.4px); }
          100% { transform: translate(1.3px, -9.6px); }
        }  /* max displacement 11.8px, path 66px per cycle */

        @keyframes heroControlDriftB {
          0% { transform: translate(-5.2px, 7.3px); }
          8.333% { transform: translate(-4.3px, 9.9px); }
          16.667% { transform: translate(-1.7px, 9.4px); }
          25% { transform: translate(5.5px, 6.9px); }
          33.333% { transform: translate(10.7px, 3.7px); }
          41.667% { transform: translate(8.9px, -0.0px); }
          50% { transform: translate(5.2px, -4.3px); }
          58.333% { transform: translate(4.3px, -8.4px); }
          66.667% { transform: translate(1.7px, -10.9px); }
          75% { transform: translate(-5.5px, -9.9px); }
          83.333% { transform: translate(-10.7px, -5.2px); }
          91.667% { transform: translate(-8.9px, 1.5px); }
          100% { transform: translate(-5.2px, 7.3px); }
        }  /* max displacement 11.9px, path 65px per cycle */

        @keyframes heroControlDriftC {
          0% { transform: translate(9.4px, 1.0px); }
          8.333% { transform: translate(4.7px, 6.6px); }
          16.667% { transform: translate(-2.3px, 4.0px); }
          25% { transform: translate(-7.6px, -3.4px); }
          33.333% { transform: translate(-8.8px, -7.4px); }
          41.667% { transform: translate(-6.5px, -3.2px); }
          50% { transform: translate(-3.6px, 5.8px); }
          58.333% { transform: translate(-1.8px, 10.7px); }
          66.667% { transform: translate(-0.6px, 6.4px); }
          75% { transform: translate(1.8px, -3.4px); }
          83.333% { transform: translate(5.9px, -9.8px); }
          91.667% { transform: translate(9.4px, -7.3px); }
          100% { transform: translate(9.4px, 1.0px); }
        }  /* max displacement 11.9px, path 82px per cycle */
      `}</style>
    </Box>
  );
};
