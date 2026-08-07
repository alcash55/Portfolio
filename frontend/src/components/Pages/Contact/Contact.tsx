import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
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
  // primary.light, not the MuiLink/ListItem default of primary.main: primary.main
  // only clears WCAG AA body-text contrast (4.5:1) against paper in the dark and
  // red themes; in blue it measures 3.98:1. primary.light clears AA in all three.
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
      <List sx={{ p: 0, width: '100%' }}>
        <ListItem component={Link} href="mailto:alex.e.cash28@gmail.com" sx={listLinkSx}>
          <ListItemText primary="Email" secondary="alex.e.cash28@gmail.com" sx={listItemStyles} />
        </ListItem>

        <ListItem
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
        </ListItem>

        <ListItem
          component={Link}
          href="https://github.com/alcash55"
          target="_blank"
          rel="noopener noreferrer"
          sx={listLinkSx}
        >
          <ListItemText primary="GitHub" secondary="github.com/alcash55" sx={listItemStyles} />
        </ListItem>
      </List>
    </Stack>
  );

  return (
    <Stack id="contact" component={'section'} sx={{ height: 'auto' }}>
      <Card
        sx={{
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
              textAlign: 'start',
              variant: 'h4',
              component: 'h2',
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
