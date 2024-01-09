import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { PropsWithChildren } from "react";
import { darkTheme } from "./darkTheme";

// export default function ThemeProvider({ children }: PropsWithChildren) {
//   const theme = useTheme();
//   return (
//     <MuiThemeProvider theme={theme}>
//       <CssBaseline>{children}</CssBaseline>
//     </MuiThemeProvider>
//   );
// }

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <MuiThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};
