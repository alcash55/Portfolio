import { Stack } from "@mui/material";
import { NavBar } from "./NavBar";
import { PropsWithChildren, createContext } from "react";
import { Footer } from "./Footer";

const AppShellContext = createContext({});

export default function AppShellProvider({ children }: PropsWithChildren) {
  return (
    <Stack>
      <NavBar />
      <AppShellContext.Provider value={{}}>{children}</AppShellContext.Provider>
      <Footer />
    </Stack>
  );
}
