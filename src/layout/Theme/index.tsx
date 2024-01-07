import { CssBaseline } from "@mui/material";
import { PropsWithChildren, createContext } from "react";

const ThemeContext = createContext({});

export default function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <>
      <CssBaseline />
      <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>
    </>
  );
}
