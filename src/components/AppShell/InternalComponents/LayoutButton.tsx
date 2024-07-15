import { Stack, Button } from "@mui/material";
import { useAppShellLayout } from "../AppShell";

export const LayoutButton = () => {
  const { toggleLayout } = useAppShellLayout();

  return (
    <Stack
      direction={"row"}
      spacing={1}
      justifyContent={"space-evenly"}
      alignItems={"center"}
      sx={{ flexWrap: "wrap" }}
    >
      <Button
        variant={
          localStorage.getItem("layout") === "default"
            ? "contained"
            : "outlined"
        }
        onClick={() => toggleLayout("default")}
      >
        Top Nav
      </Button>
      <Button
        variant={
          localStorage.getItem("layout") === "sideNav"
            ? "contained"
            : "outlined"
        }
        onClick={() => toggleLayout("sideNav")}
      >
        Side Nav
      </Button>
    </Stack>
  );
};
