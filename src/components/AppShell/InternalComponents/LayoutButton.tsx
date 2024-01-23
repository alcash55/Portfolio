import { Stack, Button } from "@mui/material";
import { useAppShellLayout } from "../AppShell";
import { Default } from "./Layouts/Default";
import { SideNav } from "./Layouts/SideNav";

export const LayoutButton = () => {
  const { toggleLayout, layout } = useAppShellLayout();
  console.log({ layout });
  return (
    <Stack
      direction={"row"}
      spacing={1}
      justifyContent={"center"}
      alignItems={"center"}
    >
      <Button
        variant={layout === <Default /> ? "contained" : "outlined"}
        onClick={() => toggleLayout("default")}
      >
        Default (Footer + Header)
      </Button>
      <Button
        variant={layout === <SideNav /> ? "contained" : "outlined"}
        onClick={() => toggleLayout("sideNav")}
      >
        Left Side Nav collapsible + Header + FAB
      </Button>
    </Stack>
  );
};
