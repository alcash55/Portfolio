import { createContext, useContext } from 'react';

/**
 * The three chrome variants `AppShellProvider` can render. Renamed from a stored
 * `JSX.Element` (see git history) to a plain string so the shell can render one
 * stable wrapper component and vary its chrome by prop instead of swapping React
 * component types — swapping types was unmounting/remounting everything below the
 * shell (including in-progress form state) on every breakpoint crossing.
 */
export type AppShellLayoutMode = 'default' | 'mobile' | 'sideNav';

/**
 * AppShellLayoutContext context that provides the current layout mode, a function to
 * change it (used by `LayoutButton` in the settings drawer to switch between top-nav and
 * side-nav on non-mobile viewports), and a function to open the settings drawer itself.
 *
 * `openSettingDrawer` exists here so any descendant can reach the one settings-drawer
 * state that lives in `AppShellProvider`, without prop-drilling it through `children`.
 * Landing needs this: it renders its own inline nav (see Landing.tsx `showInlineNav`)
 * to cover the gap left by `useShowNavBar` hiding the global `NavBar` -- and therefore
 * its own gear icon -- while the viewport is on the hero.
 */
export const AppShellLayoutContext = createContext<{
  layout: AppShellLayoutMode;
  toggleLayout: (newLayout: string) => void;
  openSettingDrawer: () => void;
}>({
  layout: 'default',
  toggleLayout: () => {},
  openSettingDrawer: () => {},
});

/**
 * useAppShellLayout hook that returns the current layout and a function to toggle the layout
 * @returns {UseAppShellLayout}
 */
export const useAppShellLayout = () => {
  const context = useContext(AppShellLayoutContext);
  return context;
};
