import { CssBaseline } from "@mui/material";
import { PropsWithChildren } from "react";
import ToggleColorMode from "../../layout/Theme/Context";

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <ToggleColorMode>
      <CssBaseline />
      {children}
    </ToggleColorMode>
  );
};
