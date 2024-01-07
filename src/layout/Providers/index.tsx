import { RouterProvider } from "react-router-dom";
import { Router } from "../../components/Router/Router";
import ThemeProvider from "../Theme";
import AppShellProvider from "../../components/AppShell/AppShell";

export function Providers() {
  return (
    <ThemeProvider>
      <AppShellProvider>
        <RouterProvider router={Router} fallbackElement={<>loading</>} />
      </AppShellProvider>
    </ThemeProvider>
  );
}
