import { Box, Button, Toolbar, Typography, Divider, Stack } from '@mui/material';
import Home from '@mui/icons-material/Home';
import ConnectWithoutContact from '@mui/icons-material/ConnectWithoutContact';
import Construction from '@mui/icons-material/Construction';
import Work from '@mui/icons-material/Work';
import Build from '@mui/icons-material/Build';

const SideBarTopItem = () => {
  return (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* This is persistent shell chrome (a brand label repeated in every layout
            mode), not the page's title, so it's rendered as a plain div rather than
            an h1 or demoted heading — Landing's hero h1 ("Alex Cash") is the page's
            one real title; a second element with the same text would be a duplicate
            heading, not a subordinate one. */}
        <Typography variant={'h1'} component={'div'} fontSize={24} sx={{ color: 'text.primary' }}>
          Alex Cash
        </Typography>
      </Toolbar>
      <Divider />
    </>
  );
};

const SideBarItems = () => {
  const navItems = [
    {
      href: '#landing',
      name: 'Home',
      icon: <Home />,
    },
    {
      href: '#experience',
      name: 'Experience',
      icon: <Work />,
    },
    {
      href: '#skills',
      name: 'Skills & Tech',
      icon: <Build />,
    },
    {
      href: '#projects',
      name: 'Projects',
      icon: <Construction />,
    },
    {
      href: '#contact',
      name: 'Contact',
      icon: <ConnectWithoutContact />,
    },
  ];
  return (
    <Stack
      spacing={2}
      sx={{
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        py: 2,
      }}
    >
      {navItems.map((item) => (
        <Button
          variant="contained"
          startIcon={item.icon}
          href={item.href}
          key={item.name}
          sx={{
            minWidth: 150,
            display: 'flex',
            justifyContent: 'space-evenly',
          }}
        >
          {item.name}
        </Button>
      ))}
    </Stack>
  );
};

/**
 * The sideNav layout's fixed left-hand nav column only — deliberately does not wrap
 * `children`. `AppShellLayout` renders this as a sibling of the page content so that
 * content's position in the tree (and therefore its React state) is unaffected by
 * this nav column mounting or unmounting when the layout mode changes.
 */
export const SidebarNav = () => {
  return (
    <Box
      component="nav"
      position={'sticky'}
      sx={{
        width: 240,
        height: '100%',
        px: 1,
        py: 2,
        top: 0,
      }}
    >
      <SideBarTopItem />
      <SideBarItems />
    </Box>
  );
};
