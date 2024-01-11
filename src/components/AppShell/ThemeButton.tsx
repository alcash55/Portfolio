import { Button, Stack } from "@mui/material";
import { useColorMode } from "../../layout/Theme/Context";

export const ThemeButton = () => {
  const { toggleColorMode } = useColorMode();

  return (
    <Stack direction={"row"} spacing={1}>
      <Button variant="outlined" onClick={() => toggleColorMode("red")}>
        Red
      </Button>
      <Button variant="outlined" onClick={() => toggleColorMode("dark")}>
        Dark
      </Button>
      <Button variant="outlined" onClick={() => toggleColorMode("blue")}>
        Blue
      </Button>
    </Stack>
  );
};
