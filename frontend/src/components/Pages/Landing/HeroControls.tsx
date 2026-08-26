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
 * The width at or below which the shell pins itself to the `mobile` layout
 * (`AppShell.tsx`'s `resolveInitialMode(650)`), and therefore the width at or
 * below which this file switches from a floating field to the in-flow band.
 *
 * Exported because `Landing.tsx` has to close the gap the band replaces at the
 * same width, and two hardcoded 650s that can drift apart is exactly how the
 * band would end up sitting on 80px of margin it does not own.
 */
export const HERO_BAND_BREAKPOINT_PX = 650;

/**
 * The band's height, and the only vertical space the six mobile controls have.
 *
 * `Landing.tsx` hands the band the whole gap between the social links and the
 * bento photographs (it zeroes the margins that used to make that gap), so this
 * number *is* the gap. It is not a free parameter:
 *
 *   14 (drift slack below the social links)
 * + 44 (a control)
 * + 64 (the vertical room the two tiers need between them)
 * + 14 (drift slack above the photographs)
 * = 136
 *
 * The 64 is arithmetic, not taste. Two controls whose 12px laps carry them
 * toward each other need 44 + 24 = 68px between their centres to never touch.
 * The narrowest phone in scope, 320px, leaves 204px of usable centre-to-centre
 * width -- the hero is 272px there, and a control's lap has to stay inside it,
 * because the hero clips its own overflow. Three controls to a tier is
 * therefore the most a tier can hold (two 68px gaps need 136 of that 204), so
 * six controls means two tiers, and the tiers have to clear each other:
 *
 *   64px apart vertically leaves sqrt(68^2 - 64^2) = 23px as the smallest
 *   horizontal gap a control in one tier may have from one in the other.
 *
 * That 23px is the whole point of the number. A 118px band gives 46px of
 * separation and demands 50px of horizontal gap, which forces the six into an
 * even lattice -- 204/5 = 40.8px apart, alternating tiers -- and an even
 * lattice is the ruled zig-zag ladder that was already rejected once. 23px of
 * floor leaves the seeded search enough room to make the gaps and the tops
 * genuinely uneven instead.
 *
 * The 56px of hero this costs (the gap was 80px) is paid for in `Landing.tsx`,
 * which tightens three margins above the social links, on mobile only. At
 * 390x844 the content column already fills its box -- measured before the
 * change, ~16px of slack above the caption's ink and ~22px between the last row
 * of photographs and `MobileChrome`'s bottom navigation bar. A taller band
 * would push the photographs under that bar.
 */
export const HERO_BAND_HEIGHT_PX = 136;

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
 * - `field`, below 1024px and above the 650px mobile cut: the side bands are
 *   gone -- the subtitle runs to within ~35px of both edges at 700px wide --
 *   so the controls move to the lower half of the hero and scatter across its
 *   full width. Below 650px there is no field either; see BAND_PLACEMENTS.
 *
 * The field starts at ~52% rather than hard against the social links above it
 * because the hero's content column is centred: while the webfonts are still
 * loading, fallback metrics push that column ~96px further down a 320px-wide
 * screen, and a tighter row would spend that first moment sitting on the
 * social icons.
 *
 * Overlapping the bento photographs used to be allowed and deliberate -- they
 * are decorative, they sit behind a 0.5-alpha black scrim, and the decorative
 * particles have always drifted over them. That is no longer true: they are
 * photographs *of Alex*, a control parked on his face is not something a
 * scrim excuses, and the geometry sweep now counts every `#landing img` as an
 * obstacle alongside the text, the social links and the scroll arrow.
 *
 * `left` is the control's left edge, so it has to stay below
 * `100% - 44px - drift` at the narrowest viewport in its regime, or the page
 * grows a horizontal scrollbar -- `smoke.spec.ts` asserts there is none at
 * 320px.
 */
interface Placement {
  /** >= 1024px: scattered through the side bands the centred column leaves. */
  gutter: { left: string; top: string };
  /** 650-1023px: scattered across the lower half, between the photographs. */
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
 * ── Four a side, in the gutter regime ──
 * Six controls down the left and two at the bottom right is what the hero used
 * to look like, and it read as lopsided -- the right band opened with a 59.5%
 * stretch of nothing above the first layout button. So purple and green moved
 * across, giving four a side: dark, blue, light and red down the left, purple,
 * green and the two layout buttons down the right.
 *
 * ── Tab order ──
 * DOM order is unchanged, and it is column-major: the whole left band
 * top-to-bottom (dark, blue, light, red), then the whole right band
 * top-to-bottom (purple, green, top nav, side nav). Two bands separated by the
 * entire width of the hero are read one after the other, not zig-zagged
 * between -- a row-major order would send focus flying left-right-left-right
 * across ~1200px eight times. It also keeps the six themes contiguous in the
 * tab order rather than interleaving the two layout buttons among them, so the
 * `aria-pressed` set is still walked as one group.
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
 * against hero geometry measured in a real browser across every viewport x
 * layout x theme combination the e2e suite sweeps (each theme ships its own
 * font, and at 320px four of the six wrap the h1 to a second line, which
 * pushes the social links 96px down the hero) -- rejecting any point that
 * lands on text, on the social links, on the bento photographs, on the scroll
 * arrow, on the app chrome painted over the hero from outside it (the mobile
 * settings Fab and bottom navigation bar, the sideNav Fab), off an edge, or
 * within 8px of another control's drift envelope in *any* of them; plus a
 * shape filter: no two controls sharing a horizontal rule, no two gaps between
 * successive tops within 1.5% of each other, and at least one same-side
 * neighbour in each band so the set cannot read as a ladder. The winning set
 * was then pasted here. What ships is fixed; only the search that found it was
 * random.
 *
 * ── The photograph re-solve ──
 * Adding `#landing img` to that obstacle set moved the `field` regime wholesale
 * and nudged three of the gutter placements. The field regime only has to cover
 * 650-1023px now (below that the controls are in the band), and in that range
 * the bento grid is a 4-across row of photographs across the middle of the
 * lower half -- so the field is no longer "the lower half" but the two strips
 * the photographs leave: above their top edge and below their bottom edge, plus
 * the margins outside the 896px grid at the wider end of the range.
 */
const THEME_PLACEMENTS: Placement[] = [
  { gutter: { left: '21%', top: '3%' }, field: { left: '4%', top: '54.5%' } },
  { gutter: { left: '2%', top: '16%' }, field: { left: '86%', top: '57%' } },
  { gutter: { left: '3%', top: '40%' }, field: { left: '2.5%', top: '73.5%' } },
  { gutter: { left: '24.5%', top: '68.5%' }, field: { left: '90%', top: '77%' } },
  { gutter: { left: '86.5%', top: '22.5%' }, field: { left: '20%', top: '87.5%' } },
  { gutter: { left: '83%', top: '44.5%' }, field: { left: '63%', top: '86%' } },
];

/**
 * Where the six theme controls rest on a phone, as percentages of the *band*
 * rather than of the hero, and pixels from the band's top edge.
 *
 * ── Why this table exists at all ──
 * Alex asked for the controls to move "to the space in between the pictures of
 * me and the github, linkedin, and email icons". That space cannot be written
 * down as a percentage of the hero, which is what every other placement here
 * is. Measured, it is between 38.8% and 48.3% of the hero at 390x844 and
 * between 72.5% and 86.5% of it at 320x568 in the green theme -- the h1 wraps
 * in four of the six themes at phone widths, and a wrapped h1 pushes the social
 * links ~96px down a hero whose height is also whatever the phone's is. A fixed
 * percentage that lands in the gap on one phone lands on a photograph on the
 * next.
 *
 * So on a phone the controls are not a floating layer at all: they are an
 * in-flow band that *is* the gap (`HeroControlBand` below), and these numbers
 * are offsets inside it. The band moves with the content by construction, in
 * every theme and at every height, with nothing measured at runtime.
 *
 * ── Not a row ──
 * Six 44px controls cannot make a row here even if a row were wanted. Two
 * controls whose 12px laps carry them toward each other need 44 + 24 = 68px
 * between their centres to never touch, and the widest phone in scope leaves
 * about 200px of usable centre-to-centre range at 320px -- five gaps of 68px
 * needs 340. The set has to be at least two deep, which is what makes an
 * irregular arrangement available rather than merely desirable.
 *
 * They are two loose rows of three, and deliberately not two ruled rows of
 * three: the six `top`s are all different, the three horizontal gaps in each
 * row are all different, and the two rows do not share a left edge. The seeded
 * search that produced them held the pairwise 68px floor, kept every control
 * 14px clear of the band's own edges (which is the drift slack the sweep
 * demands against the social links above and the photographs below), and then
 * maximised the smallest pairwise distance so the set spreads rather than
 * clumps.
 *
 * `left` is a percentage of the band, which spans the hero's full width; the
 * floors and ceilings are set by the narrowest phone, 320px, where the band is
 * 272px wide and 5.2%-78.6% is the range in which a control's 12px lap stays
 * inside the hero's clipping box.
 */
const BAND_PLACEMENTS: { left: string; top: string }[] = [
  // Upper tier, left to right: dark, blue, light.
  { left: '4.5%', top: '19px' },
  { left: '37%', top: '15px' },
  { left: '71.5%', top: '23px' },
  // Lower tier, left to right: red, purple, green. Green's 90px is past the
  // band's own floor on purpose -- the bento grid steps every other column
  // 2rem lower, and green sits under the high column's neighbour rather than
  // under a photograph. The sweep checks that at every phone width in both
  // bento layouts (2-across below 600px, 4-across above it), which is the only
  // reason it is allowed to.
  { left: '24.5%', top: '77px' },
  { left: '53%', top: '71px' },
  { left: '79%', top: '90px' },
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
 * picked (see `AppShell`'s `applyMode`), so a button for it would do nothing.
 * Icons rather than swatches: a window with a bar across its top, and one with
 * a column down its left, which is what the two layouts look like.
 *
 * Both regimes place them clear of the scroll-indicator arrow, which lives in
 * the middle ~10% of the hero's width, of the bento photographs, and of the six
 * theme controls at every width where these two render (>= 650px) -- the same
 * offline scatter that placed the swatches placed these. They are last in DOM
 * order, and they are the bottom two of the right band, which is the same thing
 * (see the tab-order note above).
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
    place: { gutter: { left: '75%', top: '59.5%' }, field: { left: '35%', top: '54%' } },
  },
  {
    id: 'sideNav',
    mode: 'sideNav',
    label: 'Side nav layout',
    Icon: VerticalSplit,
    place: { gutter: { left: '91.5%', top: '79.5%' }, field: { left: '43%', top: '89%' } },
  },
];

/** Diameter of a control. 44px is the usual floor for a touch target and the
 *  size at which one of these reads as a button rather than as a speck. */
const SIZE = 44;

/** Where one control rests inside whichever box is holding it. */
interface ControlPosition {
  left: string;
  top: string;
}

/**
 * Builds the `sx` every control shares, wherever it is being placed.
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
const useControlSx = () => {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (position: ControlPosition, index: number) => ({
    position: 'absolute' as const,
    ...position,
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
};

/**
 * The six theme swatches, in `THEME_OPTIONS` order, which is DOM order, which
 * is the tab order. `positionOf` is the only thing that differs between the
 * floating field and the phone band.
 */
const ThemeControls = ({ positionOf }: { positionOf: (index: number) => ControlPosition }) => {
  const { themeName, toggleColorMode } = useColorMode();
  const controlSx = useControlSx();

  return (
    <>
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
              sx={controlSx(positionOf(index), index)}
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
    </>
  );
};

/* Scoped to this component rather than added to Landing's keyframe block: the
   decorative `float` there is a different animation with a different job (see
   the drift note above), and the two should not be able to drift -- pun
   intended -- into using each other's values.

   Three closed wander-loops, each written out as twelve evenly spaced samples
   of a smooth curve. The stop count is the whole trick: with four stops a lap
   is four straight legs and four hard turns, which the eye reads as a repeating
   shape; with twelve the turns are 30 degrees apart and, played `linear`, the
   control simply wanders. Every sample is inside a 12px radius of the resting
   point; the e2e geometry suite leaves 14px of slack around every control to
   match, and one of its tests reads these rules back out of the CSSOM so that
   widening a lap without widening that slack fails rather than quietly parking
   a control on the subtitle. `transform` and nothing else: animating
   `top`/`left` would put every frame through layout.

   Exactly one of `HeroControls` and `HeroControlBand` renders at a time, so
   these rules are only ever in the document once. */
const DriftKeyframes = () => (
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
);

/**
 * The hero's theme and layout controls above 650px: eight of the floating dots,
 * grown into buttons.
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
 * problem for anyone whose pointer is not steady. Two things keep it
 * hittable, and neither of them is a slow lap:
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
 * The first version of this file tried to buy that hittability by barely
 * moving at all -- 6px of travel over 20-28s, about 0.3px per second. That is
 * slow enough that the browser spends seconds at a time on the same rendered
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
 */
export const HeroControls = () => {
  const theme = useTheme();
  const { layout, toggleLayout } = useAppShellLayout();
  const controlSx = useControlSx();

  // The same breakpoint, in the same direction, as `SettingsDrawer`'s
  // `showLayout` gate. Below 650px `AppShell` pins the layout to `mobile` and
  // ignores whatever `toggleLayout` is asked for, so a layout button there is a
  // button that lies -- spec 03 asks for it to be absent. It is also the width
  // below which the six theme controls leave this layer entirely for the
  // in-flow band (`HeroControlBand`), so this whole layer renders nothing.
  const isBandWidth = useMediaQuery(theme.breakpoints.down(HERO_BAND_BREAKPOINT_PX));

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

  if (isBandWidth) return null;

  const placementOf = (place: Placement) => (hasGutters ? place.gutter : place.field);

  return (
    // The layer is full-bleed and `pointerEvents: 'none'` so that a
    // transparent sheet over the whole hero cannot swallow clicks meant for
    // the nav links, the social icons or the images underneath it; each
    // control opts itself back in. See Landing.tsx for why it is stacked and
    // ordered where it is.
    <Box ref={layerRef} sx={{ position: 'absolute', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
      <ThemeControls positionOf={(index) => placementOf(THEME_PLACEMENTS[index])} />

      {LAYOUT_CONTROLS.map(({ id, mode, label, Icon, place }, index) => {
        const selected = layout === mode;

        return (
          <Tooltip key={id} title={label} enterDelay={300}>
            <ButtonBase
              aria-label={label}
              aria-pressed={selected}
              onClick={() => toggleLayout(mode)}
              sx={{
                ...controlSx(placementOf(place), THEME_OPTIONS.length + index),
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

      <DriftKeyframes />
    </Box>
  );
};

/**
 * The same six theme controls on a phone, in the band between the social links
 * and the bento photographs.
 *
 * ── Why this is in the flow and the other one is not ──
 * `HeroControls` is a full-bleed absolute layer that costs zero layout height,
 * which is the right shape for a field scattered over a hero. This is the
 * opposite: the band's whole job is to *be* a piece of vertical space in the
 * content column, between two things a percentage of the hero cannot reliably
 * point at (see BAND_PLACEMENTS). `Landing.tsx` zeroes the margins that used to
 * make that gap and hands it to this element instead, so the gap and the
 * controls in it are the same box and cannot come apart.
 *
 * It renders after the social links in the DOM, so on a phone the tab order is
 * the reading order: nav (absent in the mobile shell), heading, social links,
 * theme controls, scroll arrow. Above 650px the controls are back to being the
 * first eight tab stops, painted at the hero's top corners, which is the same
 * rule -- tab order follows the eye.
 *
 * The negative horizontal margin cancels the content column's `px: 2` so the
 * band spans the hero's full width rather than the 960px text measure; at 320px
 * that is the difference between 240px and 272px of room, and the controls need
 * every pixel of it (BAND_PLACEMENTS explains the 68px they need between
 * centres).
 */
export const HeroControlBand = () => {
  const theme = useTheme();
  const isBandWidth = useMediaQuery(theme.breakpoints.down(HERO_BAND_BREAKPOINT_PX));

  if (!isBandWidth) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        height: HERO_BAND_HEIGHT_PX,
        mx: -2,
        // The band is only ever a frame for six absolutely-positioned coins;
        // it must not eat the taps meant for the hero behind it.
        pointerEvents: 'none',
      }}
    >
      <ThemeControls positionOf={(index) => BAND_PLACEMENTS[index]} />
      <DriftKeyframes />
    </Box>
  );
};
