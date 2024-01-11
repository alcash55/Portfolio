import { useState } from "react";
export const useSettingDrawer = () => {
  const [openSettingDrawer, setOpenSettingDrawer] = useState(false);

  const handleSettingDrawer = () => {
    setOpenSettingDrawer(!openSettingDrawer);
  };

  return { openSettingDrawer, handleSettingDrawer };
};
