import { Stack, Link, Toolbar, Typography, Card, useMediaQuery, useTheme } from '@mui/material';

export const Footer = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down(650));
  const date = new Date().getFullYear();
  return (
    <Toolbar component={'footer'} disableGutters={true} sx={{ width: '100%' }}>
      <Card
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          mb: mobile ? '56px' : 0,
        }}
      >
        {/*
          Links use primary.light rather than the MuiLink default (primary.main):
          primary.main only clears WCAG AA body-text contrast (4.5:1) against
          paper in the dark and red themes (5.0-5.1:1); in blue it measures
          3.98:1. primary.light clears AA in all three (5.1-6.6:1) without
          changing the hue.
        */}
        <Stack
          spacing={2}
          sx={{
            width: '50%',
            textAlign: 'start',
            p: 2,
          }}
        >
          <Typography variant="h6" component={'h2'}>
            Sitemap
          </Typography>
          <Link
            underline="hover"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.light' }}
            href="https://www.linkedin.com/in/alexander-cash/"
          >
            LinkedIn
          </Link>
          <Link
            underline="hover"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.light' }}
            href="https://github.com/alcash55"
          >
            Github
          </Link>
          <Link
            underline="hover"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.light' }}
            href="https://alcash55.github.io/Portfolio/sitemap.xml"
          >
            Sitemap.xml
          </Link>
          <Typography>© Alex Cash {date}</Typography>
        </Stack>
      </Card>
    </Toolbar>
  );
};
