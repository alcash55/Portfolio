import {
  ConnectWithoutContact,
  Construction,
  EmojiPeople,
  Home,
  Menu,
  Work,
} from "@mui/icons-material";
import {
  Stack,
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { PropsWithChildren, SyntheticEvent, useState } from "react";
import { useSettingDrawer } from "../useSettingsDrawer";
import { SettingsDrawer } from "../SettingsDrawer";

export const Mobile = ({ children }: PropsWithChildren) => {
  const [value, setValue] = useState("summary");
  const { settingDrawer, setSettingDrawer } = useSettingDrawer();

  const theme = useTheme();
  const isLargeMobile = useMediaQuery(theme.breakpoints.down(425));

  const navItems = [
    {
      route: "#summary",
      name: "Home",
      icon: <Home />,
    },
    {
      route: "#about",
      name: "About",
      icon: <EmojiPeople />,
    },
    {
      route: "#experience",
      name: "Experience",
      icon: <Work />,
    },
    {
      route: "#projects",
      name: "Projects",
      icon: <Construction />,
    },
    {
      route: "#contact",
      name: "Contact",
      icon: <ConnectWithoutContact />,
    },
  ];

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <Stack>
      {children}
      <Fab
        size="medium"
        color="secondary"
        aria-label="open settings drawer"
        onClick={() => setSettingDrawer(true)}
        sx={{ position: "fixed", bottom: 65, right: 30 }}
      >
        <Menu />
      </Fab>
      <SettingsDrawer
        settingDrawer={settingDrawer}
        setSettingDrawer={setSettingDrawer}
      />
      <BottomNavigation
        sx={{ width: "100%", position: "fixed", bottom: 0 }}
        value={value}
        onChange={handleChange}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            sx={{
              minWidth: isLargeMobile ? "65px" : "auto",
            }}
            key={item.route}
            label={item.name}
            value={item.route}
            icon={item.icon}
            href={item.route}
          />
        ))}
      </BottomNavigation>
    </Stack>
  );
};
