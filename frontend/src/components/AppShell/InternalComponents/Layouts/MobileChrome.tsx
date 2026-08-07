import Menu from '@mui/icons-material/Menu';
import { Fragment, SyntheticEvent, useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { navLinks } from '../navLinks';

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
  const [value, setValue] = useState(`#${navLinks[0].id}`);

  const theme = useTheme();
  const isLargeMobile = useMediaQuery(theme.breakpoints.down(425));

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
        sx={{
          width: '100%',
          position: 'fixed',
          bottom: 0,
          // `position: fixed` creates a stacking context, but with no z-index it
          // sits in that context's default (`auto`) paint layer. Nothing between
          // here and the document root creates a stacking context either, so this
          // bar's `auto` layer is a sibling of any positive z-index set deep inside
          // page content -- e.g. Landing's hero Box (`zIndex: 10`), which then
          // paints on top of this "fixed" bar during scroll despite being earlier
          // in the DOM. Match the theme's appBar layer, same fix NavBar already
          // applies for the equivalent problem on desktop.
          zIndex: (theme) => theme.zIndex.appBar,
        }}
        value={value}
        onChange={handleChange}
      >
        {navLinks.map((link) => {
          const Icon = link.icon;
          const href = `#${link.id}`;
          return (
            <BottomNavigationAction
              sx={{
                minWidth: isLargeMobile ? '65px' : 'auto',
                // Root stacks icon + label in a column and centers that group
                // vertically (MUI's ButtonBase default `justifyContent: center`).
                // "Skills & Tech" is long enough to wrap to two lines while every
                // other label stays on one, so centering the taller group shifts
                // its icon up relative to its neighbours. Anchoring to the top
                // with a fixed `pt` instead pins every icon at the same offset
                // regardless of how many lines its label takes.
                justifyContent: 'flex-start',
                pt: 1.75,
                '& .MuiBottomNavigationAction-label': {
                  whiteSpace: 'nowrap',
                },
              }}
              key={link.id}
              label={link.label}
              value={href}
              icon={<Icon />}
              href={href}
            />
          );
        })}
      </BottomNavigation>
    </Fragment>
  );
};
