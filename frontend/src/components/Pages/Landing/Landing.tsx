import { Box, Typography, Button, IconButton, Grid, Stack, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import rmu_lacrosse from '../../../assets/images/rmu_lacrosse.webp';
import west_ms_coaching from '../../../assets/images/west_ms_coaching.webp';
import joshua_tree from '../../../assets/images/joshua_tree.webp';
import troy_leon from '../../../assets/images/troy_leon.webp';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import GitHub from '@mui/icons-material/GitHub';
import LinkedIn from '@mui/icons-material/LinkedIn';
import Mail from '@mui/icons-material/Mail';
import { navLinks } from '../../AppShell/InternalComponents/navLinks';
import {
  SCROLL_INDICATOR_ATTR,
  navBarRevealScrollY,
  stickyTopOffset,
} from '../../AppShell/InternalComponents/useShowNavBar';
import { useAppShellLayout } from '../../AppShell/AppShellLayoutContext';
import {
  HERO_BAND_BREAKPOINT_PX,
  HeroControlBand,
  HeroControls,
} from './HeroControls';

/**
 * `el`'s top edge in document coordinates, ignoring every CSS transform on the
 * way up.
 *
 * `getBoundingClientRect()` is the obvious tool and the wrong one here. Every
 * section on this page is wrapped in `useScrollReveal`, which holds it
 * `translateY(24px)` below its laid-out position until it has revealed -- and
 * the section being scrolled to has not revealed yet at the moment the click
 * is handled, by definition. A rect read then reports where the section is
 * *sitting*, not where it will come to rest, so the scroll lands 24px too far
 * down and the reveal then slides the heading up under the nav bar. That 24px
 * is precisely the 8px of covered heading measured at 1920x1080, 1366x768,
 * 1440x650 and 820x1180 (24px of drift against 16px of intended clearance).
 *
 * The offset chain reports the laid-out position instead, because `offsetTop`
 * is a layout value and transforms are a paint-time effect. It assumes the
 * document is the only scroll container between `el` and the root, which holds
 * on this page -- no section sits inside a nested scroller.
 */
const layoutTop = (el: HTMLElement): number => {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
};

/**
 * The vertical band the scroll-indicator button owns at the bottom of the hero:
 * its own 42px height plus the 24px it sits above the hero's bottom edge.
 *
 * Named once because two places need the same number -- the indicator's
 * position and the content column's reserved space for it -- and they must not
 * drift apart.
 */
const SCROLL_INDICATOR_BAND_PX = 66;

/**
 * Breathing room left between the sticky bar's bottom edge (or the top of the
 * window, in a layout with no bar) and the heading of the section scrolled to.
 * Small on purpose: enough that the heading is not touching the chrome, not so
 * much that the section appears to have been scrolled past.
 */
const HEADING_CLEARANCE_PX = 16;

/**
 * Where the window has to be scrolled for `section` to read as "arrived at".
 *
 * Measured to the section's *heading* rather than its top edge. The heading is
 * the thing a visitor checks to know where they are, and it sits 16px inside
 * the section's Card -- aligning the section's own top edge instead spends that
 * 16px and leaves the heading that much closer to the bar.
 */
const sectionScrollTarget = (section: HTMLElement): number => {
  const heading = section.querySelector('h2') ?? section;
  return Math.max(0, layoutTop(heading as HTMLElement) - stickyTopOffset() - HEADING_CLEARANCE_PX);
};

const Landing = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { layout } = useAppShellLayout();
  const theme = useTheme();

  // Below 650px the six theme controls stop floating over the hero and become
  // an in-flow band between the social links and the photographs
  // (`HeroControlBand`). Three of the margins below are the gap that band
  // replaces, so they have to close at exactly the same width -- hence the
  // shared constant rather than a second literal 650 here. Read as a media
  // query rather than off `layout === 'mobile'` so it matches the query the
  // band itself uses, frame for frame, during a resize.
  const usesControlBand = useMediaQuery(theme.breakpoints.down(HERO_BAND_BREAKPOINT_PX));

  // Every "white" on the hero below used to be a literal `rgba(255,255,255,…)`/
  // `#fff`, which only worked because `background.hero` was pinned dark in
  // every theme (see the comment on that `bgcolor` below) -- on the light
  // theme's now-light hero it went invisible. Deriving from `text.primary`
  // instead keeps the same translucent-white-on-dark look on dark/blue/red/
  // purple/green (whose `text.primary` is white) and flips to a translucent
  // dark tone on light, so it reads against whichever surface is actually
  // under it.
  //
  // `heroTextReadable` covers every text node that has to clear WCAG AA on
  // its own (nav links, the "Software Engineer" caption, the subtitle) --
  // 0.82 is the alpha Sprint 10 already validated against the hero's ambient
  // blend circles for the caption specifically (measured 3.81:1 and failing
  // intermittently at 0.5, since the circles are randomly positioned each
  // load); reused here rather than inventing a second ratio to re-validate.
  const heroTextReadable = alpha(theme.palette.text.primary, 0.82);
  // Decorative-only derivatives: borders, hover fills, the particle field,
  // and the scroll-indicator icon. None of these are text nodes an
  // accessibility audit scores for contrast, so they keep the original
  // design's lower alphas -- just theme-relative instead of fixed white.
  const heroBorder = alpha(theme.palette.text.primary, 0.2);
  const heroBorderHover = alpha(theme.palette.text.primary, 0.4);
  const heroSurfaceHover = alpha(theme.palette.text.primary, 0.05);
  const heroParticle = alpha(theme.palette.text.primary, 0.2);
  const heroScrollIcon = alpha(theme.palette.text.primary, 0.6);
  // Shared by all three social IconButtons below -- was three copies of the
  // same literal `rgba(255,255,255,…)` trio.
  const socialButtonSx = {
    width: 48,
    height: 48,
    border: `1px solid ${heroBorder}`,
    '&:hover': {
      borderColor: heroBorderHover,
      bgcolor: heroSurfaceHover,
    },
  };

  // `'instant'` rather than `'auto'` for the reduced-motion path. `'auto'`
  // means "defer to the scrolling box's `scroll-behavior`", and global.css sets
  // `scroll-behavior: smooth` on html/body -- so `'auto'` here animated the
  // scroll for exactly the visitors who asked it not to. `'instant'` is the
  // value that actually means no animation.
  const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'instant' : 'smooth';

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    // Not `scrollIntoView()`: it aligns the target's top with the top of the
    // window and knows nothing about the sticky bar that appears at that same
    // moment. (`scroll-padding: 64px` in global.css does offset it, but that is
    // a hardcoded copy of the bar's height, applies in the two layouts that
    // have no bar at all, and still cannot see the reveal transform.)
    window.scrollTo({ top: sectionScrollTarget(section), behavior: scrollBehavior });
  };

  /**
   * The scroll-indicator arrow's own handler, which has one requirement the
   * nav links do not: it is the click that hands navigation over from the
   * hero's inline nav to the global bar, so it must not stop anywhere the bar
   * is still hidden. Landing short leaves a visitor with no navigation at all
   * -- the hero's nav has scrolled away and the global one has not arrived.
   *
   * `sectionScrollTarget` alone is normally already past that point (by 40px at
   * every size measured). The floor is here because "normally" is what broke
   * last time: it makes the requirement explicit and self-healing if the gap
   * between the arrow and About's heading ever changes.
   */
  const scrollPastHero = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    const top = Math.max(sectionScrollTarget(section), navBarRevealScrollY() ?? 0);
    window.scrollTo({ top, behavior: scrollBehavior });
  };

  // Landing IS the "landing" section, so a link back to it would be a no-op;
  // NavBar (the global bar shown once the viewport scrolls past this
  // section) keeps that entry since it links back to the top from anywhere.
  const landingNavLinks = navLinks.filter((link) => link.id !== 'landing');

  // The scroll-indicator arrow's target: whatever section actually follows
  // the hero in document order, read from the same single source of truth
  // (navLinks.ts) that Home.tsx's section order is meant to match, instead
  // of a name hardcoded here. Landing.tsx:417 used to hardcode 'experience'
  // -- correct back when Experience was the section right after the hero,
  // but Sprint 4 inserted About between them and this target was never
  // updated, silently skipping the whole section. Deriving it means
  // inserting another section (or reordering) can't cause the same drift
  // again: whichever link is first in `landingNavLinks` is the target.
  const nextSection = landingNavLinks[0];

  // Landing's own nav only covers the gap left by `useShowNavBar` hiding the
  // global NavBar while the viewport is on the hero -- that gap only exists
  // in the `default` layout (AppShellLayout.tsx gates NavBar the same way).
  // `sideNav` and `mobile` already render a persistent nav, so rendering
  // this one too was duplicate, unhideable chrome in those layouts.
  const showInlineNav = layout === 'default';

  const images = [
    {
      src: troy_leon,
      alt: "Alex's two dogs Troy (left) and Leon (right)",
      title: 'Dog Person',
    },
    {
      src: rmu_lacrosse,
      alt: 'Alex playing lacrosse at RMU',
      title: 'Division I Athlete',
    },
    {
      src: west_ms_coaching,
      alt: 'Alex coaching middle school lacrosse',
      title: 'Community Leader',
    },
    {
      src: joshua_tree,
      alt: 'Alex at Joshua Tree National Park',
      title: 'Adventure & Travel',
    },
  ];

  return (
    <Box
      component={'section'}
      id="landing"
      sx={{
        position: 'relative',
        height: '100vh',
        // The hero is just this theme's page surface -- same as every other
        // section. It used to sit on a separate `background.hero` token
        // pinned to a fixed dark color in every theme, including light --
        // that was the bug ("light theme does not change the colors on the
        // home section"). `background.hero` is gone now (see theme.d.ts);
        // the text/icon colors below are derived from `text.primary` instead
        // of hardcoded white specifically so they stay legible against
        // `background.default` whichever theme it resolves to.
        bgcolor: 'background.default',
        overflow: 'hidden',
        scrollBehavior: prefersReducedMotion ? 'auto' : 'smooth',
      }}
    >
      {/* Animated Background */}
      <Box sx={{ position: 'absolute', inset: 0 }}>
        {/* Animated Gradient Mesh */}
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '25%',
              width: 384,
              height: 384,
              bgcolor: 'primary.main',
              borderRadius: '50%',
              filter: 'blur(48px)',
              mixBlendMode: 'multiply',
              animation: prefersReducedMotion ? 'none' : 'pulse 4s ease-in-out infinite',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '33%',
              right: '25%',
              width: 384,
              height: 384,
              bgcolor: 'secondary.main',
              borderRadius: '50%',
              filter: 'blur(48px)',
              mixBlendMode: 'multiply',
              animation: prefersReducedMotion ? 'none' : 'pulse 6s ease-in-out infinite',
              animationDelay: '1s',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '25%',
              left: '33%',
              width: 384,
              height: 384,
              bgcolor: 'info.main',
              borderRadius: '50%',
              filter: 'blur(48px)',
              mixBlendMode: 'multiply',
              animation: prefersReducedMotion ? 'none' : 'pulse 5s ease-in-out infinite',
              animationDelay: '2s',
            }}
          />
        </Box>

        {/* Floating Particles - skipped entirely for prefers-reduced-motion.
            22, not the original 30: eight of these dots are now the theme and
            layout controls drifting in the same field (HeroControls.tsx). These
            22 are the ones that stayed decorative, which is why they can still
            be skipped wholesale when motion is unwelcome and still be placed
            with `Math.random()` -- neither is true of the eight that became
            buttons. */}
        {!prefersReducedMotion && (
          <Box sx={{ position: 'absolute', inset: 0 }}>
            {[...Array(22)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  bgcolor: heroParticle,
                  borderRadius: '50%',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 10}s`,
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* The theme/layout controls: eight of the hero's floating dots, grown
          into real buttons (see HeroControls.tsx for the whole design).

          Deliberately its own full-bleed layer rather than a child of the
          content column below:

          - `position: absolute` means it costs zero layout height. The hero is
            `height: 100vh` with `overflow: hidden`, so it does not scroll --
            anything that does not fit is cut off, starting with the
            scroll-indicator arrow at the bottom that `useShowNavBar` measures.
            An in-flow control bar pushed that arrow a further 10px past the
            fold at 1280x800; this pushes nothing.
          - It sits *before* the content column in the DOM so the controls come
            first in the tab order, matching where they are painted (the hero's
            top-left and right edges, ahead of the nav links). `zIndex: 11`
            then puts them back on top of the content column, which would
            otherwise cover them.
          - It renders its own full-bleed, click-through layer (see
            HeroControls) rather than being given one here, because it also
            measures that layer to decide where the hero's empty space is. */}
      <HeroControls />

      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          // The band the scroll indicator occupies at the bottom of the hero,
          // held open even though the indicator itself is no longer in this
          // column (it is absolutely positioned below, so the hero's clipping
          // cannot eat it).
          //
          // Taking it out of the flow without reserving its space handed those
          // 66px back to the centred content above, which then sat 33px lower
          // -- measured at 900x800 in the sideNav layout, where that drop put
          // the social links under the floating Dark-theme control, and 8px
          // lower at 320x700. The hero's floating controls are placed as
          // percentages of the hero, so they do not move with the content:
          // anything that shifts the content changes those clearances. The
          // reserve keeps the content where the controls were placed around it,
          // and keeps the hero's own text from running under the arrow.
          //
          // 66 = the 42px indicator button plus the 24px of bottom padding it
          // used to carry, i.e. exactly the footprint it had in this column.
          pb: `${SCROLL_INDICATOR_BAND_PX}px`,
        }}
      >
        {/* Navigation -- only in the `default` layout; `sideNav` and `mobile`
            already render their own persistent nav (see showInlineNav above).

            The settings-drawer hamburger that used to end this row is gone. It
            was the only way into that drawer while the viewport was on the hero
            in this layout (`useShowNavBar` hides the global NavBar, and its
            gear, until the hero's arrow has left), but the drawer contains
            nothing except `ThemeButton` and `LayoutButton` -- and both of those
            are now floating in the hero itself. Removing it takes no capability
            with it, and every other way in still works: NavBar's gear once you
            have scrolled, `AppShellLayout`'s Fab in sideNav, `MobileChrome`'s
            Fab on mobile. `openSettingDrawer` stays on the context for those. */}
        {showInlineNav && (
          <Box
            component="nav"
            sx={{
              px: { xs: 2, sm: 4 },
              py: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: { xs: 1, sm: 2 },
            }}
          >
            {/* flexWrap + a shrinking gap keep this reachable at phone widths: unwrapped
                with the sm+ gap, four links overflow past the left edge (off-screen,
                unreachable) at 390px and narrower. */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                rowGap: 1,
                columnGap: { xs: 1.5, sm: 4 },
                fontSize: 14,
              }}
            >
              {landingNavLinks.map((link) => (
                <Button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  variant="text"
                  sx={{
                    minWidth: 'auto',
                    px: { xs: 1, sm: 2 },
                    color: heroTextReadable,
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 2, sm: 4 },
          }}
        >
          <Box sx={{ maxWidth: 960, width: '100%' }}>
            {/* Hero Text */}
            {/* `mb` is the gap down to the photographs. On a phone the control
                band below owns that gap outright, so this and the social row's
                own `mb` both close -- otherwise the band would be stacked on top
                of 80px of margin and the controls would sit nowhere near the
                space Alex asked for them to occupy. */}
            <Box sx={{ textAlign: 'center', mb: usesControlBand ? 0 : 10 }}>
              {/* 32px down to the social links normally; 16px on a phone.
                  Those 16px, plus the 8 taken off the caption and the 8 off the
                  h1 below, are what pays for the control band: the hero is
                  `height: 100vh` with centred content and at 390x844 the column
                  already fills its box, so the band's extra 50px would
                  otherwise come half out of the caption at the top (~16px of
                  slack, measured) and half out of the clearance between the
                  last row of photographs and the mobile bottom bar (~22px).
                  Measured after: ~7px above the caption, ~13px below the
                  photographs. */}
              <Box sx={{ mb: usesControlBand ? 2 : 4 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'inline-block',
                    // See the note on the wrapper above: the phone values are
                    // the hero's contribution to the control band's height.
                    mb: usesControlBand ? 0 : 1,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    // See `heroTextReadable` above -- this is the element
                    // Sprint 10 measured against the hero's ambient blend
                    // circles (0.5 alpha scored 3.81:1, under the 4.5:1 AA
                    // floor for text this size, and passed intermittently
                    // only because the circles are randomly positioned).
                    color: heroTextReadable,
                  }}
                >
                  Software Engineer
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 56, md: 96, lg: 120 },
                    mb: usesControlBand ? 1 : 2,
                    letterSpacing: -1,
                  }}
                >
                  Alex Cash
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: 18, md: 22 },
                    color: heroTextReadable,
                    maxWidth: 680,
                    mx: 'auto',
                    lineHeight: 1.7,
                  }}
                >
                  Crafting elegant solutions with React, TypeScript, and Go. Building systems that
                  are both powerful and maintainable.
                </Typography>
              </Box>

              {/* Social Links - Horizontal */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                  // Normally collapsed into the wrapper's `mb: 10` above and so
                  // worth nothing; once that wrapper's margin closes on a phone
                  // this one stops collapsing and becomes a real 48px, which is
                  // 48px the band is not getting. Close it too.
                  mb: usesControlBand ? 0 : 6,
                }}
              >
                <IconButton
                  href="https://github.com/alcash55"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alex's GitHub profile (opens in a new tab)"
                  sx={socialButtonSx}
                >
                  <GitHub fontSize="small" />
                </IconButton>
                <IconButton
                  href="https://www.linkedin.com/in/alexander-cash"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alex's LinkedIn profile (opens in a new tab)"
                  sx={socialButtonSx}
                >
                  <LinkedIn fontSize="small" />
                </IconButton>
                <IconButton
                  href="mailto:alex.e.cash28@gmail.com"
                  aria-label="Email Alex at alex.e.cash28@gmail.com"
                  sx={socialButtonSx}
                >
                  <Mail fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* The phone arrangement of the theme controls: an in-flow band
                occupying the gap between the social links above and the
                photographs below, which is where Alex asked for them. It
                renders nothing at 650px and up, where `HeroControls` above has
                them floating over the hero instead -- exactly one of the two is
                ever live, so the six controls appear once and the tab order has
                no gaps. See HeroControls.tsx for why this one is in the flow
                when everything else about this hero is not. */}
            <HeroControlBand />

            {/* Bento Grid Images */}
            <Box sx={{ maxWidth: 896, mx: 'auto', mb: 6 }}>
              <Grid container spacing={2}>
                {images.map((image, index) => (
                  // 4-across at every width left each photo ~40px square on a
                  // 320px viewport -- rendered but not actually viewable.
                  // Two columns below `sm` roughly triples the render size;
                  // desktop keeps the original 4-across bento row.
                  <Grid key={index} size={{ xs: 6, sm: 3 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        aspectRatio: '1 / 1',
                        transform: index % 2 === 1 ? 'translateY(2rem)' : 'none',
                        cursor: 'pointer',
                        '&:hover .image': {
                          filter: 'grayscale(0)',
                          transform: 'scale(1.03)',
                        },
                        '&:hover .overlay': {
                          bgcolor: 'rgba(0,0,0,0.2)',
                          opacity: 1,
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={image.src}
                        alt={image.alt}
                        className="image"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'grayscale(1)',
                          transition: 'all 0.5s ease',
                        }}
                      />
                      <Box
                        className="overlay"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          transition: 'background-color 0.3s ease',
                        }}
                      />
                      <Typography
                        sx={{
                          position: 'absolute',
                          bottom: 16,
                          left: 16,
                          fontSize: 14,
                          // Fixed white, and correctly so: this caption sits on
                          // the rgba(0,0,0,0.5) scrim above, which is the same
                          // dark surface in every theme. Inheriting text.primary
                          // made it near-black on that scrim in the light theme.
                          // A knockout is only safe when it sits on its own
                          // opaque shape -- here it does.
                          color: 'common.white',
                          fontWeight: 600,
                          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                        }}
                        className="overlay"
                      >
                        {image.title}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Box>

      </Box>

      {/* Scroll Indicator -- a direct child of the hero section, not of the
          content column above it. */}
      <Stack
        sx={{
          // Pinned to the hero's own bottom edge instead of riding at the end
          // of the content column, and that is the fix for "the arrow is only
          // somewhat visible".
          //
          // The hero is `height: 100vh; overflow: hidden` while its content
          // column is `minHeight: 100vh`, so as soon as that content needs more
          // than one viewport -- which it does at every laptop height -- the
          // column grows past the hero's box and the last thing in it, this
          // arrow, is clipped away. Measured: the arrow's bottom edge fell
          // 28.7px past the hero's bottom at 1280x800, 60.7px at 1366x768,
          // 178.7px at 1440x650, 41.6px at 320x700. Invisible, unclickable, and
          // still the element `useShowNavBar` measures its threshold against --
          // which is how the bar's timing came to depend on window height again
          // by a second route, after the hook had already fixed the first.
          //
          // It has to be positioned against the *hero* (`position: relative`),
          // which is the box that clips, rather than against the content column
          // (also `position: relative`) that grows past it -- hence living out
          // here as a sibling of that column rather than inside it. `zIndex`
          // matches the column's so it still sits above the hero's animated
          // background, which it did as a descendant.
          position: 'absolute',
          left: 0,
          right: 0,
          // Clear of `MobileChrome`'s bottom nav in the `mobile` layout. That
          // bar is `position: fixed` at the bottom of the *window* and 56px
          // tall, so 24px put the arrow entirely behind it -- measured, the
          // whole 42px button sat under the bar at both 390x844 and 320x700,
          // which is the one layout where the arrow is the only way forward
          // that the hero itself offers. 72 = the bar's 56 plus the same 16px
          // of clearance used everywhere else here. It does not collide with
          // MobileChrome's settings Fab, which is off to the right while this
          // is centred.
          bottom: layout === 'mobile' ? 72 : 24,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {/* The attribute is load-bearing, not a test hook: `useShowNavBar`
            measures this element so the global NavBar appears as the arrow
            leaves the viewport.

            It sits here rather than on the Stack, which is stretched full-width
            and so is a much looser box than the button; and rather than on the
            arrow glyph itself, which is the tightest box but is running the
            `bounce` animation -- a 6px oscillation would drag the measured edge
            back and forth across the threshold and flicker the bar. This button
            is the tightest box that holds still. */}
        <IconButton
          {...{ [SCROLL_INDICATOR_ATTR]: true }}
          size={'large'}
          onClick={() => nextSection && scrollPastHero(nextSection.id)}
          aria-label={
            nextSection ? `Scroll to ${nextSection.label} section` : 'Scroll to next section'
          }
        >
          <ArrowDownward
            sx={{
              width: 18,
              height: 18,
              color: heroScrollIcon,
              animation: prefersReducedMotion ? 'none' : 'bounce 1.5s infinite',
            }}
          />
        </IconButton>
      </Stack>

      {/* CSS for animations */}
      <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(-10px) translateX(-10px); }
            75% { transform: translateY(-30px) translateX(5px); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
    </Box>
  );
};

export default Landing;
