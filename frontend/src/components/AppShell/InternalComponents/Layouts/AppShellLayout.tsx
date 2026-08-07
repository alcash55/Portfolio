import { PropsWithChildren } from 'react';
import { Box, Fab, Stack } from '@mui/material';
import Menu from '@mui/icons-material/Menu';
import { AppShellLayoutMode } from '../../AppShellLayoutContext';
import { NavBar } from '../NavBar';
import { SettingsDrawer } from '../SettingsDrawer';
import { SidebarNav } from '../SidebarNav';
import { useSettingDrawer } from '../useSettingsDrawer';
import { MobileChrome } from './MobileChrome';

interface AppShellLayoutProps extends PropsWithChildren {
  mode: AppShellLayoutMode;
}

/**
 * The single, stable shell wrapper rendered for every layout mode.
 *
 * Previously `AppShellProvider` swapped between three separate top-level components
 * (`Default`, `Mobile`, `SideNav`), each wrapping `children` differently. Because the
 * rendered component *type* changed, React tore down and rebuilt the whole subtree —
 * including in-progress state below the shell (e.g. a half-typed contact message) —
 * on every resize across the 650px breakpoint.
 *
 * This component is always the same type; only `mode` changes. `children` is rendered
 * in a single, explicitly-keyed spot inside a Stack whose type never changes, so
 * crossing breakpoints only mounts/unmounts the chrome around it (nav bar, sidebar nav
 * column, bottom nav) — never `children` itself. The chrome pieces are fixed/sticky or
 * portaled (Drawer), so their position in the DOM relative to `children` doesn't affect
 * visual layout, letting the mode-specific pieces come and go freely.
 */
export const AppShellLayout = ({ children, mode }: AppShellLayoutProps) => {
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();
  const isSideNav = mode === 'sideNav';

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
          sx={{ position: 'fixed', bottom: 20, right: 20 }}
        >
          <Menu />
        </Fab>
      )}
    </Stack>
  );
};
