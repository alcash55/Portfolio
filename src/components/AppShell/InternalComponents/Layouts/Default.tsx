import { PropsWithChildren } from "react";
import { Stack } from "@mui/material";
import { NavBar } from "../NavBar";
import { SettingsDrawer } from "../SettingsDrawer";
import { useSettingDrawer } from "../useSettingsDrawer";

export const Default = ({ children }: PropsWithChildren) => {
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();
  return (
    <Stack>
      <NavBar setSettingDrawer={setSettingDrawer} />
      <SettingsDrawer
        settingDrawer={settingDrawer}
        setSettingDrawer={setSettingDrawer}
      />
      {children}
    </Stack>
  );
};
