import { Box, Typography, Button, IconButton, Grid, Stack, useMediaQuery } from '@mui/material';
import rmu_lacrosse from '../../../assets/images/rmu_lacrosse.webp';
import west_ms_coaching from '../../../assets/images/west_ms_coaching.webp';
import joshua_tree from '../../../assets/images/joshua_tree.webp';
import troy_leon from '../../../assets/images/troy_leon.webp';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import GitHub from '@mui/icons-material/GitHub';
import LinkedIn from '@mui/icons-material/LinkedIn';
import Mail from '@mui/icons-material/Mail';
import { navLinks } from '../../AppShell/InternalComponents/navLinks';
import { useAppShellLayout } from '../../AppShell/AppShellLayoutContext';

const Landing = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { layout } = useAppShellLayout();

  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  // Landing IS the "landing" section, so a link back to it would be a no-op;
  // NavBar (the global bar shown once the viewport scrolls past this
  // section) keeps that entry since it links back to the top from anywhere.
  const landingNavLinks = navLinks.filter((link) => link.id !== 'landing');

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

        {/* Floating Particles - skipped entirely for prefers-reduced-motion */}
        {!prefersReducedMotion && (
          <Box sx={{ position: 'absolute', inset: 0 }}>
            {[...Array(30)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  bgcolor: 'rgba(255,255,255,0.2)',
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

        {/* Mouse-following gradient */}
        <Box
          sx={{
            position: 'absolute',
            width: 600,
            height: 600,
            bgcolor: 'primary.main',
            opacity: 0.1,
            borderRadius: '50%',
            filter: 'blur(48px)',
            pointerEvents: 'none',
            transition: 'all 1s ease',
          }}
        />
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
        {/* Navigation -- only in the `default` layout; `sideNav` and `mobile`
            already render their own persistent nav (see showInlineNav above). */}
        {showInlineNav && (
          <Box
            component="nav"
            sx={{
              px: { xs: 2, sm: 4 },
              py: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
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
                    color: 'rgba(255,255,255,0.6)',
                    '&:hover': { color: '#fff' },
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
            px: 4,
          }}
        >
          <Box sx={{ maxWidth: 960, width: '100%' }}>
            {/* Hero Text */}
            <Box sx={{ textAlign: 'center', mb: 10 }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'inline-block',
                    mb: 1,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
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
                    color: 'rgba(255,255,255,0.6)',
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
                  mb: 6,
                }}
              >
                <IconButton
                  href="https://github.com/alcash55"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alex's GitHub profile (opens in a new tab)"
                  sx={{
                    width: 48,
                    height: 48,
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  <GitHub fontSize="small" />
                </IconButton>
                <IconButton
                  href="https://www.linkedin.com/in/alexander-cash"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alex's LinkedIn profile (opens in a new tab)"
                  sx={{
                    width: 48,
                    height: 48,
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  <LinkedIn fontSize="small" />
                </IconButton>
                <IconButton
                  href="mailto:alex.e.cash28@gmail.com"
                  aria-label="Email Alex at alex.e.cash28@gmail.com"
                  sx={{
                    width: 48,
                    height: 48,
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  <Mail fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Bento Grid Images */}
            <Box sx={{ maxWidth: 896, mx: 'auto', mb: 6 }}>
              <Grid container spacing={2}>
                {images.map((image, index) => (
                  <Grid key={index} size={3}>
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
          <IconButton
            size={'large'}
            onClick={() => scrollToSection('experience')}
            aria-label="Scroll to Experience section"
          >
            <ArrowDownward
              sx={{
                width: 18,
                height: 18,
                color: 'rgba(255,255,255,0.5)',
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
