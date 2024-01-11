import { CssBaseline } from "@mui/material";
import { PropsWithChildren } from "react";
import ToggleColorMode from "../../layout/Theme/Context"; // Import your ToggleColorMode component

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <ToggleColorMode>
      <CssBaseline />
      {children}
    </ToggleColorMode>
  );
};
