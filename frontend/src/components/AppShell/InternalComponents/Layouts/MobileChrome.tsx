import ConnectWithoutContact from '@mui/icons-material/ConnectWithoutContact';
import Construction from '@mui/icons-material/Construction';
import EmojiPeople from '@mui/icons-material/EmojiPeople';
import Home from '@mui/icons-material/Home';
import Work from '@mui/icons-material/Work';
import Menu from '@mui/icons-material/Menu';
import { Fragment, SyntheticEvent, useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  useMediaQuery,
  useTheme,
} from '@mui/material';

interface MobileChromeProps {
  setSettingDrawer: (value: boolean) => void;
}

/**
 * The mobile layout's chrome only (settings FAB + bottom nav) — deliberately does not
 * wrap `children`. `AppShellLayout` renders this as a sibling of the page content so
 * content's position in the tree (and therefore its React state) is unaffected by this
 * chrome mounting or unmounting when the layout mode changes.
 */
export const MobileChrome = ({ setSettingDrawer }: MobileChromeProps) => {
  const [value, setValue] = useState('summary');

  const theme = useTheme();
  const isLargeMobile = useMediaQuery(theme.breakpoints.down(425));

  const navItems = [
    {
      route: '#summary',
      name: 'Home',
      icon: <Home />,
    },
    {
      route: '#about',
      name: 'About',
      icon: <EmojiPeople />,
    },
    {
      route: '#experience',
      name: 'Experience',
      icon: <Work />,
    },
    {
      route: '#skills',
      name: 'Skills & Tech',
      icon: <Work />,
    },
    {
      route: '#projects',
      name: 'Projects',
      icon: <Construction />,
    },
    {
      route: '#contact',
      name: 'Contact',
      icon: <ConnectWithoutContact />,
    },
  ];

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <Fragment>
      <Fab
        size="medium"
        color="secondary"
        aria-label="open settings drawer"
        onClick={() => setSettingDrawer(true)}
        sx={{ position: 'fixed', bottom: 65, right: 30 }}
      >
        <Menu />
      </Fab>
      <BottomNavigation
        sx={{ width: '100%', position: 'fixed', bottom: 0 }}
        value={value}
        onChange={handleChange}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            sx={{
              minWidth: isLargeMobile ? '65px' : 'auto',
            }}
            key={item.route}
            label={item.name}
            value={item.route}
            icon={item.icon}
            href={item.route}
          />
        ))}
      </BottomNavigation>
    </Fragment>
  );
};
