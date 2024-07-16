import { PropsWithChildren } from "react";
import { Stack, Box, useTheme, useMediaQuery } from "@mui/material";
import { Footer } from "../Footer";
import { NavBar } from "../NavBar";
import { SettingsDrawer } from "../SettingsDrawer";
import { useSettingDrawer } from "../useSettingsDrawer";

export const Default = ({ children }: PropsWithChildren) => {
  const theme = useTheme();
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();
  const smallMobile = useMediaQuery(theme.breakpoints.down(335));
  return (
    <Stack>
      <NavBar setSettingDrawer={setSettingDrawer} />
      <SettingsDrawer
        settingDrawer={settingDrawer}
        setSettingDrawer={setSettingDrawer}
      />
      {children}
      <Footer />
    </Stack>
  );
};
