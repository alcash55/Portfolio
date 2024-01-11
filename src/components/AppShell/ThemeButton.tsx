import { Button, Stack } from "@mui/material";
import { useColorMode } from "../../layout/Theme/Context";

export const ThemeButton = () => {
  const { toggleColorMode } = useColorMode();

  return (
    <Stack direction={"row"}>
      <Button variant="outlined" onClick={() => toggleColorMode("red")}>
        Red
      </Button>
      <Button onClick={() => toggleColorMode("dark")}>Dark</Button>
    </Stack>
  );
};
