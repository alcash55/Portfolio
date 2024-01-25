import { Button, Stack } from "@mui/material";
import { useColorMode } from "../../../layout/Theme/Context";

export const ThemeButton = () => {
  const { toggleColorMode, mode } = useColorMode();

  return (
    <Stack
      direction={"row"}
      justifyContent={"space-evenly"}
      alignItems={"center"}
      sx={{ flexWrap: "wrap", gap: 1 }}
    >
      <Button
        variant={
          mode.palette?.background?.paper === "#731010"
            ? "contained"
            : "outlined"
        }
        onClick={() => toggleColorMode("red")}
      >
        Red
      </Button>
      <Button
        variant={
          mode.palette?.background?.paper === "#292929"
            ? "contained"
            : "outlined"
        }
        onClick={() => toggleColorMode("dark")}
      >
        Dark
      </Button>
      <Button
        variant={
          mode.palette?.background?.paper === "#24344d"
            ? "contained"
            : "outlined"
        }
        onClick={() => toggleColorMode("blue")}
      >
        Blue
      </Button>
    </Stack>
  );
};
