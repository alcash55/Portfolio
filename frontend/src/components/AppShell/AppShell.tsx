import { PropsWithChildren, useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { AppShellLayout } from './InternalComponents/Layouts/AppShellLayout';
import { AppShellLayoutContext, AppShellLayoutMode } from './AppShellLayoutContext';

/**
 * The AppShellProvider component that provides the layout context
 * @param {PropsWithChildren} children - children to render
 * @returns {JSX.Element}
 */
export default function AppShellProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppShellLayoutMode>('default');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(650));

  useEffect(() => {
    //set initial layout
    let newMode: AppShellLayoutMode = 'default';

    //check window size for mobile bp if not mobile get layout from local storage
    if (isMobile) {
      newMode = 'mobile';
    } else if (localStorage.getItem('layout') === 'sideNav') {
      newMode = 'sideNav';
    }

    applyMode(newMode);
    // applyMode closes over `isMobile` and is redefined on every render;
    // adding it here would rerun this effect (and rewrite localStorage) on every render
    // instead of only when `isMobile` changes, a real behavior change out of scope here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, window.innerWidth]);

  /**
   * logic for applying a layout mode (mobile always wins on small viewports; otherwise
   * respects the mode requested via `toggleLayout`)
   * @param {string} newLayout - new layout to apply ('default' | 'sideNav')
   */
  const applyMode = (newLayout: string) => {
    if (isMobile) {
      setMode('mobile');
    } else if (newLayout === 'sideNav') {
      setMode('sideNav');
    } else {
      setMode('default');
    }

    localStorage.setItem('layout', newLayout); // update local storage
  };

  const contextValue = {
    layout: mode,
    toggleLayout: applyMode,
  };

  return (
    <AppShellLayoutContext.Provider value={contextValue}>
      <AppShellLayout mode={mode}>{children}</AppShellLayout>
    </AppShellLayoutContext.Provider>
  );
}
