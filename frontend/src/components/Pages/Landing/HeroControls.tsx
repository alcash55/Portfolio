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
 * (`AppShell.tsx`'s `resolveInitialMode(650)`) and so stops offering a layout
 * choice at all. The band holds six controls below it and eight above it, and
 * is deeper below it -- see BAND_PLACEMENTS_PHONE.
 */
const MOBILE_BREAKPOINT_PX = 650;

/** One control's resting place inside whichever box is holding it. */
interface ControlPosition {
  left: string;
  top: string;
}

/**
 * Where the eight controls rest in the gutter regime, as percentages of the
 * hero, in the order they are painted and in the order they take focus.
 *
 * -- Four a side --
 * Six controls down the left and two at the bottom right is what the hero used
 * to look like, and it read as lopsided -- the right band opened with a 59.5%
 * stretch of nothing above the first layout button. So purple and green moved
 * across, giving four a side: dark, blue, light and red down the left, purple,
 * green and the two layout buttons down the right.
 *
 * -- Tab order --
 * DOM order is the tab order, and it is column-major: the whole left band
 * top-to-bottom (dark, blue, light, red), then the whole right band
 * top-to-bottom (purple, green, top nav, side nav). Two bands separated by the
 * entire width of the hero are read one after the other, not zig-zagged
 * between -- a row-major order would send focus flying left-right-left-right
 * across ~1200px eight times. It also keeps the six themes contiguous in the
 * tab order rather than interleaving the two layout buttons among them, so the
 * `aria-pressed` set is still walked as one group.
 *
 * -- Irregular, and fixed --
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
 * layout x theme combination the e2e suite sweeps -- rejecting any point that
 * lands on text, on the social links, on the bento photographs, on the scroll
 * arrow, on the app chrome painted over the hero from outside it (the sideNav
 * Fab), off an edge, or within 70px of another control's centre in *any* of
 * them; plus a shape filter: no two controls sharing a horizontal rule or a
 * column, no two gaps between successive tops within 1.5% of each other, and no
 * three on a line. The winning set was pasted here. What ships is fixed; only
 * the search that found it was random.
 *
 * -- What the photographs changed --
 * The photographs are pictures of Alex, so they joined the obstacle set: a
 * control parked on his face is not something the bento's 0.5-alpha scrim
 * excuses, whatever the decorative particles get away with. All eight
 * placements moved as a result, and the shape of the answer changed with them.
 *
 * The bento grid is 896px wide and centred. On the widest heroes that leaves
 * ~490px of clear margin either side of it, but the gutter regime starts at a
 * 1024px hero, where the same grid leaves 64px -- narrower than a control plus
 * its lap. So the intersection over every hero in the regime has no room at all
 * below the photographs' top edge, and both bands now run 2%-57% of the hero
 * rather than 3%-80%. Everything below that is either a photograph on a narrow
 * hero or the scroll arrow. The two bands stay four and four, and each is still
 * scattered through its band's depth rather than ruled down one column: left
 * runs 1.5%-19% deep, right 72.5%-94.5%.
 */
const GUTTER_PLACEMENTS: ControlPosition[] = [
  // Left band, top to bottom: dark, blue, light, red.
  { left: '4%', top: '2%' },
  { left: '13%', top: '23.5%' },
  { left: '1.5%', top: '44.5%' },
  { left: '19%', top: '48.5%' },
  // Right band, top to bottom: purple, green, top nav, side nav.
  { left: '83.5%', top: '10%' },
  { left: '85.5%', top: '35%' },
  { left: '72.5%', top: '51%' },
  { left: '94.5%', top: '56.5%' },
];

/**
 * Where the six theme controls rest on a phone: percentages of the *band*
 * rather than of the hero, and pixels down from the band's top edge.
 *
 * -- Why the band exists at all --
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
 * So below 1024px the controls are not a floating layer at all: they are an
 * in-flow band that *is* the gap (`HeroControlBand`), and these are offsets
 * inside it. The band moves with the content by construction, in every theme
 * and at every height, with nothing measured at runtime.
 *
 * -- Why the band replaced the floating field entirely, not only on phones --
 * There used to be a second set of hero percentages for 650-1023px, scattered
 * across the hero's lower half. Adding the photographs to the obstacle set
 * killed it: the lower half of a sub-1024px hero *is* the bento grid, wall to
 * wall, and the upper half is the heading and the subtitle. Sweeping a 1% grid
 * of the hero across nineteen viewport/layout combinations in that range, in
 * all six themes, left twelve cells clear out of 10,201 -- one pocket near the
 * right edge, room for one control, not eight. The band is the only region that
 * is reliably clear, so everything below 1024px uses it.
 *
 * -- Not a row --
 * Six 44px controls could not make a row here even if a row were wanted. Two
 * controls whose 12px laps carry them toward each other need 44 + 24 = 68px
 * between their centres to never touch, and the narrowest phone leaves about
 * 204px of usable centre-to-centre range at 320px -- five gaps of 68px needs
 * 340. The set has to be at least two deep, which is what makes an irregular
 * arrangement available rather than merely desirable.
 *
 * Two loose tiers of three, deliberately not two ruled rows of three: the six
 * `top`s are all different, the five horizontal gaps are all different, and no
 * two controls share a column. The seeded search held the 68px floor, kept
 * every control 15px clear of everything (the sweep's 14px of drift slack plus
 * a pixel of rounding margin), and then maximised the *spread* of the gaps
 * rather than the spacing itself -- optimising for separation alone drives the
 * set straight into an even lattice, which is the ruled zig-zag ladder that has
 * already been rejected here once.
 */
const BAND_PLACEMENTS_PHONE: ControlPosition[] = [
  // Upper tier, left to right: dark, blue, light.
  { left: '4.5%', top: '19px' },
  { left: '37%', top: '15px' },
  { left: '71.5%', top: '23px' },
  // Lower tier, left to right: red, purple, green. Green's 90px is past the
  // band's own floor on purpose: the bento grid steps every other column 2rem
  // lower, and green rests over that step rather than over a photograph. The
  // sweep checks it at every phone width in both bento layouts (2-across below
  // 600px, 4-across above it), which is the only reason it is allowed to.
  { left: '24.5%', top: '77px' },
  { left: '53%', top: '71px' },
  { left: '79%', top: '90px' },
];

/**
 * The same band from 650px up to a 1024px hero, where the layout buttons are
 * offered too, so it holds eight controls instead of six.
 *
 * A wider band needs less depth: the eight interleave across 534-1000px of
 * usable width, so their tiers only have to clear each other by 44px rather
 * than the phone band's 64px. That matters, because the vertical budget here is
 * *worse* than a phone's rather than better -- measured, at 960x720 the last
 * row of photographs clears the hero's bottom edge by 9px, and in sideNav at
 * 1280x720 the caption clears the top by 6px, both before this band existed.
 * 116px against the 80px gap it replaces costs 36px, and `Landing.tsx` gives
 * back 32 of those in margins.
 *
 * Two of the eight rest at negative offsets, i.e. slightly *above* the band, in
 * the columns either side of the social links -- that space is clear at every
 * width in this range because the three social buttons only span ~176px of a
 * 580-1023px hero. Two more sit below the band's floor, over the 2rem step the
 * bento grid puts between its alternate columns. Using those pockets is what
 * keeps eight controls from reading as two ruled rows: the eight `top`s here
 * range over 100px where the band itself is only 116 deep.
 *
 * DOM order is reading order -- upper tier then lower, left to right -- which
 * is also the order the six themes and then the two layout buttons are rendered
 * in.
 */
const BAND_PLACEMENTS_WIDE: ControlPosition[] = [
  // Upper tier, left to right: dark, blue, light, red.
  { left: '5.5%', top: '-11px' },
  { left: '27.5%', top: '29px' },
  { left: '52%', top: '16px' },
  { left: '78%', top: '-5px' },
  // Lower tier, left to right: purple, green, top nav, side nav.
  { left: '14.5%', top: '44px' },
  { left: '35.5%', top: '89px' },
  { left: '64%', top: '42px' },
  { left: '88.5%', top: '72px' },
];

/**
 * How deep the band is, and so how much of the hero it spends.
 *
 * The phone number is arithmetic rather than taste:
 *
 *   14 (drift slack below the social links)
 * + 44 (a control)
 * + 64 (the vertical room the two tiers need between them)
 * + 14 (drift slack above the photographs)
 * = 136
 *
 * The 64 is what buys the irregularity. Three controls to a tier is the most a
 * 320px phone can hold (two 68px gaps out of 204px of usable width), so six
 * means two tiers, and the tiers have to clear each other. 64px apart leaves
 * sqrt(68^2 - 64^2) = 23px as the smallest horizontal gap a control in one tier
 * may have from one in the other, and 23px of floor is enough slack for the
 * gaps and the tops to come out genuinely uneven. At 46px of separation the
 * floor is 50px, which forces the six onto an even 204/5 lattice -- the ruled
 * ladder again.
 *
 * The 56px of hero this costs (the gap it replaces was 80px) is paid for in
 * `Landing.tsx`, which tightens three margins above the social links whenever
 * the band is live. Measured at 390x844 before the change: ~16px of slack above
 * the caption's ink, ~22px between the last row of photographs and
 * `MobileChrome`'s bottom navigation bar. A deeper band would push the
 * photographs under that bar.
 */
const bandHeightPx = (isPhone: boolean) => (isPhone ? 136 : 116);

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
 * picked (see `AppShell`'s `applyMode`), so a button for it would do nothing --
 * which is why neither of these renders below 650px. Icons rather than
 * swatches: a window with a bar across its top, and one with a column down its
 * left, which is what the two layouts look like.
 */
const LAYOUT_CONTROLS: {
  id: string;
  mode: 'default' | 'sideNav';
  label: string;
  Icon: SvgIconComponent;
}[] = [
  { id: 'default', mode: 'default', label: 'Top nav layout', Icon: WebAsset },
  { id: 'sideNav', mode: 'sideNav', label: 'Side nav layout', Icon: VerticalSplit },
];

/** Diameter of a control. 44px is the usual floor for a touch target and the
 *  size at which one of these reads as a button rather than as a speck. */
const SIZE = 44;

/**
 * Builds the `sx` every control shares, wherever it is being placed.
 *
 * -- Contrast, which this hero has burned people on before --
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
    // The box around these is `pointerEvents: 'none'` so it cannot swallow
    // clicks meant for the hero underneath; the buttons opt themselves back in.
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
 * The controls themselves -- six theme swatches, then the two layout buttons --
 * in DOM order, which is the tab order.
 *
 * `positions` is the only thing that differs between the floating gutter field
 * and the in-flow band. `showLayout` is false only below 650px, where the shell
 * forces the mobile layout and a layout button would be a button that lies
 * (spec 03 asks for it to be absent).
 */
const Controls = ({
  positions,
  showLayout,
}: {
  positions: ControlPosition[];
  showLayout: boolean;
}) => {
  const { themeName, toggleColorMode } = useColorMode();
  const { layout, toggleLayout } = useAppShellLayout();
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
              sx={controlSx(positions[index], index)}
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

      {showLayout &&
        LAYOUT_CONTROLS.map(({ id, mode, label, Icon }, index) => {
          const selected = layout === mode;
          const at = THEME_OPTIONS.length + index;

          return (
            <Tooltip key={id} title={label} enterDelay={300}>
              <ButtonBase
                aria-label={label}
                aria-pressed={selected}
                onClick={() => toggleLayout(mode)}
                sx={{
                  ...controlSx(positions[at], at),
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
 * The hero's theme and layout controls on a >= 1024px hero: eight of the
 * floating dots, grown into buttons.
 *
 * -- What this is --
 * The site has six themes and two layouts, and until recently both were
 * reachable only through a settings drawer behind a hamburger icon -- which is
 * to say they were invisible. The hero already had thirty dots drifting across
 * it; eight of them are now controls. They keep drifting, they stay scattered,
 * and they are not collected into a bar (an earlier attempt did exactly that
 * and was rejected: the dots are the point).
 *
 * -- Making a drifting target actually usable --
 * A control that moves is a control you have to chase, and that is a genuine
 * problem for anyone whose pointer is not steady. Two things keep it hittable,
 * and neither of them is a slow lap:
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
 * The first version of this file tried to buy that hittability by barely moving
 * at all -- 6px of travel over 20-28s, about 0.3px per second. That is slow
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
 */
export const HeroControls = () => (
  // The layer is full-bleed and `pointerEvents: 'none'` so that a transparent
  // sheet over the whole hero cannot swallow clicks meant for the nav links,
  // the social icons or the images underneath it; each control opts itself back
  // in. See Landing.tsx for why it is stacked and ordered where it is.
  <Box sx={{ position: 'absolute', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
    <Controls positions={GUTTER_PLACEMENTS} showLayout />
    <DriftKeyframes />
  </Box>
);

/**
 * The same controls below a 1024px hero, in the band between the social links
 * and the bento photographs.
 *
 * -- Why this is in the flow and the other one is not --
 * `HeroControls` is a full-bleed absolute layer that costs zero layout height,
 * which is the right shape for a field scattered over a hero. This is the
 * opposite: the band's whole job is to *be* a piece of vertical space in the
 * content column, between two things a percentage of the hero cannot reliably
 * point at (see BAND_PLACEMENTS_PHONE). `Landing.tsx` closes the margins that
 * used to make that gap and hands it to this element instead, so the gap and
 * the controls in it are the same box and cannot come apart.
 *
 * It renders after the social links in the DOM, so here the tab order is the
 * reading order: nav, heading, social links, controls, scroll arrow. On a
 * >= 1024px hero the controls are the first eight tab stops, painted at the
 * hero's top corners, which is the same rule -- tab order follows the eye.
 *
 * The negative horizontal margin cancels the content column's `px` so the band
 * spans the hero's full width rather than the 960px text measure; at 320px that
 * is the difference between 240px and 272px of room, and the controls need
 * every pixel of it.
 */
export const HeroControlBand = () => {
  const theme = useTheme();
  // Same breakpoint, same direction, as `SettingsDrawer`'s `showLayout` gate.
  const isPhone = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT_PX));

  return (
    <Box
      sx={{
        position: 'relative',
        height: bandHeightPx(isPhone),
        mx: { xs: -2, sm: -4 },
        // The band is only ever a frame for absolutely-positioned coins; it
        // must not eat the taps meant for the hero behind it.
        pointerEvents: 'none',
      }}
    >
      <Controls
        positions={isPhone ? BAND_PLACEMENTS_PHONE : BAND_PLACEMENTS_WIDE}
        showLayout={!isPhone}
      />
      <DriftKeyframes />
    </Box>
  );
};
