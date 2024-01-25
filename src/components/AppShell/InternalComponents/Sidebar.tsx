import { PropsWithChildren } from "react";
import {
  Box,
  Button,
  Toolbar,
  Typography,
  Divider,
  Stack,
} from "@mui/material";
import {
  Home,
  ConnectWithoutContact,
  Construction,
  EmojiPeople,
} from "@mui/icons-material";

export const Sidebar = ({ children }: PropsWithChildren) => {
  const SideBarTopItem = () => {
    return (
      <>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant={"h1"} fontSize={24} sx={{ color: "white" }}>
            Alex Cash
          </Typography>
        </Toolbar>
        <Divider sx={{}} />
      </>
    );
  };

  const SideBarItems = () => {
    const navItems = [
      {
        href: "#summary",
        name: "Summary",
        icon: <Home />,
      },
      {
        href: "#about",
        name: "About",
        icon: <EmojiPeople />,
      },
      {
        href: "#projects",
        name: "Projects",
        icon: <Construction />,
      },
      {
        href: "#contact",
        name: "Contact",
        icon: <ConnectWithoutContact />,
      },
    ];
    return (
      <Stack
        spacing={2}
        sx={{
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          py: 2,
        }}
      >
        {navItems.map((item) => (
          <Button
            variant="contained"
            startIcon={item.icon}
            href={item.href}
            key={item.name}
            sx={{ minWidth: 150 }}
          >
            {item.name}
          </Button>
        ))}
      </Stack>
    );
  };

  return (
    <Stack direction={"row"}>
      <Box
        component="nav"
        position={"sticky"}
        sx={{
          width: 240,
          height: "100%",
          px: 1,
          py: 2,
          top: 0,
        }}
      >
        <SideBarTopItem />
        <SideBarItems />
      </Box>
      <Box width={"100%"}>{children}</Box>
    </Stack>
  );
};
