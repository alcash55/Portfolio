import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Link,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ContactForm from '../../ConnectForm/ConnectForm';
import LinkIcon from '@mui/icons-material/Link';

const Contact = () => {
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(425));
  const tablet = useMediaQuery(theme.breakpoints.down(650));
  const listItemStyles = {
    '&:hover .MuiListItemText-secondary': {
      textDecoration: 'underline',
    },
  };
  // primary.light, not the MuiLink/ListItem default of primary.main: on every
  // dark-mode theme (dark/blue/red/purple/green) lightening `main` only raises
  // its contrast against `paper`, and blue's `main` alone falls short of AA
  // (see blueTheme.ts). In light theme, `light` is pinned equal to `main`
  // rather than auto-lightened toward white, specifically so it clears AA
  // there too (see lightTheme.ts). Same choice as Footer's and About's link
  // colour, for the same reason.
  const listLinkSx = { width: 'fit-content', p: 0, color: 'primary.light' };
  const headerStyles = {
    fontSize: largeMobile ? '1.5rem' : '2rem',
    textAlign: 'start',
    width: '100%',
    flexWrap: 'nowrap',
  };

  const ConnectList = (
    <Stack
      spacing={1}
      sx={{
        width: '100%',
      }}
    >
      <Typography variant="h3" component="h3" sx={headerStyles}>
        Lets Connect!
      </Typography>
      {/* `<ListItem>` stays a real `<li>` here (Lighthouse's `list` audit flags a
          `<ul>` whose children aren't `<li>`) -- the anchor lives one level down,
          on `ListItemButton`, via `component={Link}`. */}
      <List sx={{ p: 0, width: '100%' }}>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="mailto:alex.e.cash28@gmail.com" sx={listLinkSx}>
            <ListItemText primary="Email" secondary="alex.e.cash28@gmail.com" sx={listItemStyles} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="https://www.linkedin.com/in/alexander-cash"
            target="_blank"
            rel="noopener noreferrer"
            sx={listLinkSx}
          >
            <ListItemText
              primary="LinkedIn"
              secondary="linkedin.com/in/alexander-cash"
              sx={listItemStyles}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="https://github.com/alcash55"
            target="_blank"
            rel="noopener noreferrer"
            sx={listLinkSx}
          >
            <ListItemText primary="GitHub" secondary="github.com/alcash55" sx={listItemStyles} />
          </ListItemButton>
        </ListItem>
      </List>
    </Stack>
  );

  return (
    <Stack id="contact" component={'section'} sx={{ height: 'auto' }}>
      <Card
        sx={{
          // `overflow: visible` is load-bearing, not cosmetic. MUI's Card sets
          // `overflow: hidden`, and a flex item only gets an automatic minimum
          // size while its overflow is visible -- so as a child of Home's flex
          // column this Card could shrink below its own content and silently
          // clip the bottom. Measured: About lost 124px at 1280px and 1057px
          // at 390px, which was most of "Outside of Work". Setting height:auto
          // does NOT fix it; restoring the min-size does.
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          p: 0,
          m: 0,
        }}
      >
        <CardHeader
          sx={{
            width: '100%',
          }}
          avatar={
            <IconButton aria-label="navigate to contact" href="#contact" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="Contact"
          slotProps={{
            title: {
              variant: 'h4',
              component: 'h2',
              sx: { textAlign: 'start' },
            },
          }}
        />
        <CardContent
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            flexDirection: 'column',
          }}
        >
          <Stack
            spacing={3}
            direction={tablet ? 'column' : 'row'}
            sx={{
              width: 'auto',
              justifyContent: 'space-evenly',
            }}
          >
            {ConnectList}
            <ContactForm />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Contact;
