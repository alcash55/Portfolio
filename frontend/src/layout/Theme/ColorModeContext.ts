import { createContext, useContext } from 'react';
import { darkTheme } from './darkTheme';

/**
 * ColorModeContext context that provides the color mode and a function to toggle the color mode
 */
export const ColorModeContext = createContext<{
  mode: typeof darkTheme;
  toggleColorMode: (color: string) => void;
}>({
  mode: darkTheme,
  toggleColorMode: () => {},
});

/**
 * useColorMode hook that returns the current color mode and a function to toggle the color mode
 * @returns {UseColorMode}
 */
export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  return context;
};
