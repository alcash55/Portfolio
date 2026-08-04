import { createContext, createElement, Fragment, useContext } from 'react';

/**
 * AppShellLayoutContext context that provides the layout and a function to toggle the layout
 *
 * The default `layout` below is only a typing placeholder: `AppShellProvider` always supplies
 * the real layout before any consumer reads it. It intentionally avoids importing a concrete
 * layout component (e.g. `Default`) here — `Default` -> `NavBar` -> `SettingsDrawer` ->
 * `LayoutButton` already imports `useAppShellLayout` from this file, so doing so would create a
 * circular import that throws "Cannot access 'Default' before initialization" at runtime.
 */
export const AppShellLayoutContext = createContext<{
  layout: JSX.Element;
  toggleLayout: (newLayout: string) => void;
}>({
  layout: createElement(Fragment),
  toggleLayout: () => {},
});

/**
 * useAppShellLayout hook that returns the current layout and a function to toggle the layout
 * @returns {UseAppShellLayout}
 */
export const useAppShellLayout = () => {
  const context = useContext(AppShellLayoutContext);
  return context;
};
