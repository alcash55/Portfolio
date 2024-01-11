//need to add persisting theme on refresh
import { createContext, PropsWithChildren, useContext, useState } from "react";
import { ThemeProvider } from "@mui/material";
import { redTheme } from "./redTheme";
import { darkTheme } from "./darkTheme";
import { blueTheme } from "./blueTheme";

const ColorModeContext = createContext({
  mode: darkTheme,
  toggleColorMode: (color: string) => {},
});

export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  return context;
};

export default function ToggleColorMode({ children }: PropsWithChildren) {
  const [mode, setMode] = useState(darkTheme);

  const toggleColorMode = (color: string) => {
    if (color === "red") setMode(redTheme);
    else if (color === "dark") setMode(darkTheme);
    else if (color === "blue") setMode(blueTheme);
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
