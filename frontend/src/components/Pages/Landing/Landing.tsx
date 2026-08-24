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
import { SCROLL_INDICATOR_ATTR } from '../../AppShell/InternalComponents/useShowNavBar';
import { useAppShellLayout } from '../../AppShell/AppShellLayoutContext';
import { HeroControls } from './HeroControls';

const Landing = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { layout } = useAppShellLayout();
  const theme = useTheme();

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

  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
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
            Purely decorative, and the only thing in the hero that is: the
            field used to be 30 dots and is 22 now because eight of them
            became the theme/layout controls in the bar above (see
            HeroControls.tsx, which also explains why those eight stopped
            drifting and stopped landing at `Math.random()` positions once
            they became things you have to be able to hit and tab through). */}
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

      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Hero top row.

            The appearance controls (HeroControls) render in every layout: they
            are the hero's own theme/layout switcher and the reason the
            settings-drawer hamburger that used to sit at the end of this row is
            gone. That hamburger was the only way into the drawer while the
            viewport was on the hero in the `default` layout (`useShowNavBar`
            hides the global NavBar, and its gear, until the hero's arrow has
            left), but the drawer contains nothing except `ThemeButton` and
            `LayoutButton` -- both of which are now in this row -- so removing it
            takes no capability with it. Every other way in still works:
            NavBar's gear once you have scrolled, `AppShellLayout`'s Fab in
            sideNav, `MobileChrome`'s Fab on mobile.

            The nav links are still `default`-only; `sideNav` and `mobile`
            render their own persistent nav (see showInlineNav above), which is
            why this row is no longer gated on it as a whole.

            `space-between` puts the controls at the start and the links at the
            end, so DOM order and reading order agree at every width; both
            children wrap internally rather than pushing the row wider. */}
        <Box
          sx={{
            px: { xs: 2, sm: 4 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 2 },
          }}
        >
          <HeroControls />
          {showInlineNav && (
            /* flexWrap + a shrinking gap keep this reachable at phone widths: unwrapped
               with the sm+ gap, four links overflow past the left edge (off-screen,
               unreachable) at 390px and narrower. */
            <Box
              component="nav"
              aria-label="Hero"
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
          )}
        </Box>

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
            {/* The gap under the hero text used to be a flat `mb: 10` (80px).
                The hero is `height: 100vh` with `overflow: hidden`, so it does
                not scroll -- anything that does not fit is simply cut off, and
                the first thing to go is the scroll-indicator arrow at the
                bottom, which is also what `useShowNavBar` measures. Measured at
                1280x800 before this sprint the arrow's bottom edge was already
                29px past the fold; the appearance bar above costs ~50px more,
                so that space is paid for here rather than borrowed. Small
                screens, where the squeeze is worst, give up the most: `md` and
                up still gets the original 80px. */}
            <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 5, md: 10 } }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'inline-block',
                    mb: 1,
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
                    mb: 2,
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
                  // Same 100vh budget as the margin above -- see the comment on
                  // the hero text block.
                  mb: { xs: 3, md: 6 },
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

            {/* Bento Grid Images */}
            <Box sx={{ maxWidth: 896, mx: 'auto', mb: { xs: 2, md: 6 } }}>
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

        {/* Scroll Indicator */}
        <Stack
          sx={{
            pb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {/* The attribute is load-bearing, not a test hook: `useShowNavBar`
              measures this element so the global NavBar appears as the arrow
              leaves the viewport.

              It sits here rather than on the Stack, which adds 24px of bottom
              padding and so stays on screen well after the arrow has visibly
              gone; and rather than on the arrow glyph itself, which is the
              tightest box but is running the `bounce` animation -- a 6px
              oscillation would drag the measured edge back and forth across
              the threshold and flicker the bar. This button is the tightest
              box that holds still. */}
          <IconButton
            {...{ [SCROLL_INDICATOR_ATTR]: true }}
            size={'large'}
            onClick={() => nextSection && scrollToSection(nextSection.id)}
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
      </Box>

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
