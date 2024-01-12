import { useState } from "react";
export const useSettingDrawer = () => {
  const [settingDrawer, setSettingDrawer] = useState(false);

  const openSettingDrawer = () => {
    setSettingDrawer(true);
  };

  const closeSettingsDrawer = () => {
    setSettingDrawer(false);
  };

  return {
    openSettingDrawer,
    closeSettingsDrawer,
    settingDrawer,
    setSettingDrawer,
  };
};
