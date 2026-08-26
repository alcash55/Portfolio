import {
  Box,
  Card,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GitHub from '@mui/icons-material/GitHub';
import LinkedIn from '@mui/icons-material/LinkedIn';
import Mail from '@mui/icons-material/Mail';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { Logo } from '../../../assets/icons/Logo';
import { navLinks } from './navLinks';
import resumePdf from '../../../assets/AlexResume.pdf';
import { ANALYTICS_EVENTS, useAnalytics } from '../../../hooks/useAnalytics';

// Same targets as the hero's social buttons (Landing.tsx) and About's resume
// button -- kept as one constant each so the footer can't silently drift to a
// different URL than its counterpart elsewhere on the page.
const GITHUB_URL = 'https://github.com/alcash55';
const LINKEDIN_URL = 'https://www.linkedin.com/in/alexander-cash';
const EMAIL = 'alex.e.cash28@gmail.com';

// primary.light, not the MuiLink default of primary.main: primary.main
// clears WCAG AA body-text contrast (4.5:1) against paper on every dark-mode
// theme, but only just in blue and dark (4.99:1 and 5.00:1); primary.light
// gives real headroom there instead. Same choice as About's resume button and
// Contact's link list -- see Contact.tsx for the full per-theme numbers and
// for how to measure them.
const linkSx = { color: 'primary.light' };

const socialButtonSx = {
  color: 'text.primary',
  border: '1px solid',
  borderColor: 'divider',
};

export const Footer = () => {
  const capture = useAnalytics();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down(650));
  const date = new Date().getFullYear();

  return (
    <Toolbar component={'footer'} disableGutters={true} sx={{ width: '100%' }}>
      <Card
        sx={{
          width: '100%',
          mb: mobile ? '56px' : 0,
        }}
      >
        <Grid container spacing={4} sx={{ p: { xs: 3, md: 4 } }}>
          {/* Brand */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Stack
              spacing={2}
              sx={{
                alignItems: { xs: 'center', sm: 'flex-start' },
                textAlign: { xs: 'center', sm: 'start' },
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                {/* Decorative next to the visible "Alex Cash" text right after it --
                    no titleAccess, so MUI's SvgIcon leaves it aria-hidden and a
                    screen reader announces the name once, not twice. */}
                <Logo sx={{ fontSize: 36, color: 'primary.light' }} />
                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                  Alex Cash
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                Software Engineer crafting elegant, reliable systems with React, TypeScript, and
                Go.
              </Typography>
              {/* Same three destinations, hrefs, and aria-label wording as the hero's
                  social buttons (Landing.tsx) so the two never drift apart. */}
              <Stack direction="row" spacing={1}>
                <IconButton
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alex's GitHub profile (opens in a new tab)"
                  sx={socialButtonSx}
                >
                  <GitHub fontSize="small" />
                </IconButton>
                <IconButton
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alex's LinkedIn profile (opens in a new tab)"
                  sx={socialButtonSx}
                >
                  <LinkedIn fontSize="small" />
                </IconButton>
                <IconButton
                  href={`mailto:${EMAIL}`}
                  aria-label={`Email Alex at ${EMAIL}`}
                  sx={socialButtonSx}
                >
                  <Mail fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Grid>

          {/* Sitemap -- rendered from navLinks, the single source of truth NavBar and
              SidebarNav already read from (Sprint 8). A fourth hand-maintained list
              here is exactly the drift that let About go unlinked for four sprints. */}
          <Grid size={{ xs: 6, sm: 3, md: 4 }}>
            <Stack spacing={1.5} sx={{ textAlign: 'start' }}>
              <Typography variant="h6" component="h2">
                Sitemap
              </Typography>
              <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {navLinks.map((link) => (
                  <Typography component="li" key={link.id} variant="body2">
                    <Link underline="hover" sx={linkSx} href={`#${link.id}`}>
                      {link.label}
                    </Link>
                  </Typography>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* Resources */}
          <Grid size={{ xs: 6, sm: 3, md: 4 }}>
            <Stack spacing={1.5} sx={{ textAlign: 'start' }}>
              <Typography variant="h6" component="h2">
                Resources
              </Typography>
              <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                <Typography component="li" variant="body2">
                  {/* Same resumePdf asset and aria-label wording as About's resume
                      button, so the two links can't point to different files. */}
                  <Link
                    underline="hover"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={resumePdf}
                    // Counted separately from About's copy of this link (see
                    // there) -- same file, different intent: one is read on the
                    // way through the page, this one on the way out.
                    onClick={() => capture(ANALYTICS_EVENTS.RESUME_CLICKED, { location: 'footer' })}
                    aria-label="View Resume (opens Alex Cash's resume PDF in a new tab)"
                    sx={{ ...linkSx, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <DescriptionOutlined fontSize="inherit" /> Resume
                  </Link>
                </Typography>
                <Typography component="li" variant="body2">
                  <Link
                    underline="hover"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={linkSx}
                    href="https://alcash55.github.io/Portfolio/sitemap.xml"
                  >
                    Sitemap.xml
                  </Link>
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © Alex Cash {date}
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" color="text.secondary">
              Built with React, TypeScript &amp; Go
            </Typography>
          </Box>
        </Stack>
      </Card>
    </Toolbar>
  );
};
