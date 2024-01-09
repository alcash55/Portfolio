import { ThemeOptions, createTheme } from "@mui/material/styles";

export const redTheme: ThemeOptions = createTheme({
  palette: {
    primary: {
      main: "#ff8f00",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#310000",
      paper: "#731010",
    },
  },
  typography: {
    overline: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0.499,
      lineHeight: 31.92,
      textCase: "uppercase",
      color: "white",
    },
    h1: {
      fontSize: 96,
      fontWeight: 700,
      letterSpacing: -2.141,
      lineHeight: 112.03,
      color: "white",
    },
    h2: {
      fontSize: 60,
      fontWeight: 700,
      letterSpacing: -1.34,
      lineHeight: 72,
      color: "white",
    },
    h3: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: -1.07,
      lineHeight: 56.016,
      color: "white",
    },
    h4: {
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: -0.741,
      lineHeight: 41.99,
      color: "white",
    },
    h5: {
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: -0.046,
      lineHeight: 32.016,
      color: "white",
    },
    h6: {
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: -0.334,
      lineHeight: 32,
      color: "white",
    },
    body1: {
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: -0.176,
      lineHeight: 24,
      color: "white",
    },
    body2: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: -0.087,
      lineHeight: 20.02,
      color: "white",
    },
    subtitle1: {
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: -0.176,
      lineHeight: 28,
      color: "white",
    },
    subtitle2: {
      fontSize: 14,
      fontWeight: 500,
      letterSpacing: -0.087,
      lineHeight: 21.98,
      color: "white",
    },
    caption: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: -0.006,
      lineHeight: 19.92,
      color: "white",
    },
    button: {
      fontSize: 14,
      lineHeight: 1.75,
      textTransform: "none",
      color: "white",
    },
  },
});
