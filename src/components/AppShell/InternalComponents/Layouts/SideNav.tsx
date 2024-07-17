import { PropsWithChildren } from "react";
import { Fab, Stack } from "@mui/material";
import { Menu } from "@mui/icons-material";
import { useSettingDrawer } from "../useSettingsDrawer";
import { SettingsDrawer } from "../SettingsDrawer";
import { Sidebar } from "../Sidebar";
import { Footer } from "../Footer";

export const SideNav = ({ children }: PropsWithChildren) => {
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();

  return (
    <Stack px={2}>
      <SettingsDrawer
        settingDrawer={settingDrawer}
        setSettingDrawer={setSettingDrawer}
      />
      <Sidebar children={children} />

      <Footer />
      <Fab
        size="medium"
        color="secondary"
        aria-label="open settings drawer"
        onClick={() => setSettingDrawer(true)}
        sx={{ position: "fixed", bottom: 20, right: 20 }}
      >
        <Menu />
      </Fab>
    </Stack>
  );
};
