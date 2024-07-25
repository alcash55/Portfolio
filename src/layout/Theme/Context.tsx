import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { ThemeProvider } from "@mui/material";
import { redTheme } from "./redTheme";
import { darkTheme } from "./darkTheme";
import { blueTheme } from "./blueTheme";

/**
 * ColorModeContext context that provides the color mode and a function to toggle the color mode
 */
const ColorModeContext = createContext({
  mode: darkTheme,
  toggleColorMode: (color: string) => {},
});

/**
 * useColorMode hook that returns the current color mode and a function to toggle the color mode
 * @returns {UseColorMode}
 */
export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  return context;
};

/**
 *  ToggleColorMode component that provides the color mode context and a function to toggle the color mode
 * @param {PropsWithChildren} children
 * @returns {JSX.Element}
 */
export default function ToggleColorMode({ children }: PropsWithChildren) {
  const [mode, setMode] = useState(darkTheme);

  useEffect(() => {
    const initialTheme = localStorage.getItem("theme") || "dark";
    toggleColorMode(initialTheme);
  }, []); // Run only once on mount to set initial layout

  const toggleColorMode = (color: string) => {
    if (color === "red") setMode(redTheme);
    else if (color === "dark") setMode(darkTheme);
    else if (color === "blue") setMode(blueTheme);

    localStorage.setItem("theme", color); //update local storage
  };

  const contextValue = {
    mode,
    toggleColorMode,
  };

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={mode}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}
