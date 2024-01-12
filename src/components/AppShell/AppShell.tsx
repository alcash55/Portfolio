import { Stack } from "@mui/material";
import { NavBar } from "./InternalComponents/NavBar";
import { PropsWithChildren, createContext } from "react";
import { Footer } from "./InternalComponents/Footer";
import { useSettingDrawer } from "./InternalComponents/useSettingsDrawer";
import { SettingsDrawer } from "./InternalComponents/SettingsDrawer";

const AppShellContext = createContext({});

export default function AppShellProvider({ children }: PropsWithChildren) {
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();
  return (
    <Stack>
      <NavBar setSettingDrawer={setSettingDrawer} />
      <AppShellContext.Provider value={{}}>
        <SettingsDrawer
          settingDrawer={settingDrawer}
          setSettingDrawer={setSettingDrawer}
        />
        {children}
      </AppShellContext.Provider>
      <Footer />
    </Stack>
  );
}
