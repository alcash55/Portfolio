import { PropsWithChildren } from 'react';
import { Box, Fab, Stack, useMediaQuery } from '@mui/material';
import Menu from '@mui/icons-material/Menu';
import { AppShellLayoutMode } from '../../AppShellLayoutContext';
import { NavBar } from '../NavBar';
import { SettingsDrawer } from '../SettingsDrawer';
import { SidebarNav } from '../SidebarNav';
import { MobileChrome } from './MobileChrome';
import { useShowNavBar } from '../useShowNavBar';

interface AppShellLayoutProps extends PropsWithChildren {
  mode: AppShellLayoutMode;
  settingDrawer: boolean;
  setSettingDrawer: (value: boolean) => void;
}

/**
 * The single, stable shell wrapper rendered for every layout mode.
 *
 * Previously `AppShellProvider` swapped between three separate top-level components
 * (`Default`, `Mobile`, `SideNav`), each wrapping `children` differently. Because the
 * rendered component *type* changed, React tore down and rebuilt the whole subtree,
 * including in-progress state below the shell, such as a half-typed contact message.
 * on every resize across the 650px breakpoint.
 *
 * This component is always the same type; only `mode` changes. `children` is rendered
 * in a single, explicitly-keyed spot inside a Stack whose type never changes, so
 * crossing breakpoints only mounts/unmounts the chrome around it (nav bar, sidebar nav
 * column, bottom nav), never `children` itself. The chrome pieces are fixed/sticky or
 * portaled (Drawer), so their position in the DOM relative to `children` doesn't affect
 * visual layout, letting the mode-specific pieces come and go freely.
 */
export const AppShellLayout = ({
  children,
  mode,
  settingDrawer,
  setSettingDrawer,
}: AppShellLayoutProps) => {
  const isSideNav = mode === 'sideNav';
  // The sideNav Fab follows exactly the same rule as the `default` layout's
  // NavBar: stay out of the way while the viewport is still on the hero, and
  // arrive as the hero's down arrow leaves the top of the screen. Reusing the
  // hook rather than re-deriving the rule is the point -- `useShowNavBar`
  // measures the arrow's own rect, and a second implementation here would be
  // free to drift away from the bar's timing.
  //
  // The hero carries its own theme and layout controls (see HeroControls), so
  // nothing is unreachable while the Fab is hidden -- which is what makes
  // hiding it safe rather than merely tidier.
  const showFab = useShowNavBar();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Matches NavBar's 220ms in / 160ms out, for the same reason: this is
  // chrome, so it should keep up with the scroll rather than perform.
  const fabDuration = prefersReducedMotion ? 0 : showFab ? 220 : 160;

  return (
    <Stack
      sx={{
        px: isSideNav ? 2 : 0,
        width: '100%',
      }}
    >
      <Stack direction={isSideNav ? 'row' : 'column'} sx={{ width: '100%' }}>
        {isSideNav && <SidebarNav />}
        {mode === 'default' && <NavBar setSettingDrawer={setSettingDrawer} />}
        <Box key="app-shell-content" sx={{ width: isSideNav ? '100%' : undefined }}>
          {children}
        </Box>
        {mode === 'mobile' && <MobileChrome setSettingDrawer={setSettingDrawer} />}
      </Stack>
      <SettingsDrawer settingDrawer={settingDrawer} setSettingDrawer={setSettingDrawer} />
      {isSideNav && (
        <Fab
          size="medium"
          color="secondary"
          aria-label="open settings drawer"
          onClick={() => setSettingDrawer(true)}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            opacity: showFab ? 1 : 0,
            transform: showFab || prefersReducedMotion ? 'none' : 'translateY(10px)',
            // `visibility`, not a conditional render: it takes the hidden Fab
            // out of the tab order and off the hit-testing surface, while
            // leaving the element mounted so the transition has something to
            // animate. Delayed to the end of the exit so the button does not
            // vanish mid-fade.
            visibility: showFab ? 'visible' : 'hidden',
            transition: (theme) =>
              `${theme.transitions.create(['opacity', 'transform'], {
                duration: fabDuration,
              })}, visibility 0s linear ${showFab ? 0 : fabDuration}ms`,
            pointerEvents: showFab ? 'auto' : 'none',
          }}
        >
          <Menu />
        </Fab>
      )}
    </Stack>
  );
};
