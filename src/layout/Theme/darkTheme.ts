import { ThemeOptions, createTheme } from "@mui/material/styles";

export const darkTheme: ThemeOptions = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#379dee",
    },
    secondary: {
      main: "#989798",
    },
    error: {
      main: "#ff6459",
    },
    success: {
      main: "#59a94f",
    },
    warning: {
      main: "#dc8126",
    },
    info: {
      main: "#7b8fff",
    },
    text: {
      primary: "#ffffff",
      secondary: "#a3a4a6",
      disabled: "#6b696d",
    },
    action: {
      active: "#a3a2a7",
      hover: "#2e2e31",
      selected: "#363536",
      disabled: "#666569",
      focus: "#414145",
    },
    background: {
      paper: "#292929",
      default: "#202020",
    },
    grey: {
      "50": "#262626",
      "100": "#302f30",
      "200": "#343334",
      "300": "#3c3c3c",
      "400": "#515353",
      "500": "#6a6a68",
      "600": "#919190",
      "700": "#a9a9a9",
      "800": "#d7d6d9",
      "900": "#fafafa",
    },
  },
  typography: {
    overline: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0.499,
      textCase: "uppercase",
    },
    h1: {
      fontSize: 96,
      fontWeight: 700,
      letterSpacing: -2.141,
    },
    h2: {
      fontSize: 60,
      fontWeight: 700,
      letterSpacing: -1.34,
    },
    h3: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: -1.07,
    },
    h4: {
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: -0.741,
    },
    h5: {
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: -0.046,
    },
    h6: {
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: -0.334,
    },
    body1: {
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: -0.176,
    },
    body2: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: -0.087,
    },
    subtitle1: {
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: -0.176,
    },
    subtitle2: {
      fontSize: 14,
      fontWeight: 500,
      letterSpacing: -0.087,
    },
    caption: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: -0.006,
    },
    button: {
      fontSize: 14,
      lineHeight: 1.75,
      textTransform: "none",
    },
  },
});
