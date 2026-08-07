import { PropsWithChildren, useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { AppShellLayout } from './InternalComponents/Layouts/AppShellLayout';
import { AppShellLayoutContext, AppShellLayoutMode } from './AppShellLayoutContext';

/**
 * The AppShellProvider component that provides the layout context
 * @param {PropsWithChildren} children - children to render
 * @returns {JSX.Element}
 */
/**
 * Resolves the layout mode synchronously, before the first paint.
 *
 * This has to be a lazy initializer rather than an effect. Starting at
 * 'default' and correcting in an effect means the first paint renders the
 * default layout on every device -- including phones -- and Landing's inline
 * nav (which only renders in 'default') then unmounts a frame later. That
 * single pop cost a 0.65 cumulative layout shift on a mobile Lighthouse run,
 * enough on its own to drag the performance score from 96 to 75.
 */
const resolveInitialMode = (mobileBreakpointPx: number): AppShellLayoutMode => {
  if (typeof window === 'undefined') return 'default';
  if (window.matchMedia(`(max-width: ${mobileBreakpointPx - 0.05}px)`).matches) return 'mobile';
  return localStorage.getItem('layout') === 'sideNav' ? 'sideNav' : 'default';
};

export default function AppShellProvider({ children }: PropsWithChildren) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(650));
  const [mode, setMode] = useState<AppShellLayoutMode>(() => resolveInitialMode(650));

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
