import { PropsWithChildren } from "react";
import { Button, Fab, Stack } from "@mui/material";
import { Menu } from "@mui/icons-material";
import { useSettingDrawer } from "../useSettingsDrawer";
import { SettingsDrawer } from "../SettingsDrawer";

export const SideNav = ({ children }: PropsWithChildren) => {
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();

  const navItems = [
    {
      href: "#summary",
      name: "Summary",
    },
    {
      href: "#about",
      name: "About",
    },
    {
      href: "#projects",
      name: "Projects",
    },
    {
      href: "#contact",
      name: "Contact",
    },
  ];

  const SideNav = (
    <Stack sx={{}}>
      {navItems.map((item) => (
        <Button href={item.href} key={item.name}>
          {item.name}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Stack px={2}>
      <SettingsDrawer
        settingDrawer={settingDrawer}
        setSettingDrawer={setSettingDrawer}
      />
      <Stack>
        <Stack direction={"row"}>
          {SideNav}
          {children}
        </Stack>
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
    </Stack>
  );
};
