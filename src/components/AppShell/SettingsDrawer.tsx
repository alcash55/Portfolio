import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { ThemeButton } from "./ThemeButton";

interface SettingsDrawerProps {
  open: boolean;
  close: () => void;
}

export const SettingsDrawer = ({ open, close }: SettingsDrawerProps) => {
  return (
    <Drawer anchor={"right"} open={open} onClose={close}>
      <Stack
        spacing={2}
        justifyContent="center"
        alignItems="center"
        sx={{ px: 2, py: 2 }}
      >
        <Stack
          direction={"row"}
          justifyContent="center"
          alignItems="center"
          sx={{ width: "100%" }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              ml: 4,
            }}
          >
            <Typography variant="h6" component={"h1"}>
              Settings
            </Typography>
          </Box>
          <IconButton aria-label="Close Settings Drawer" onClick={close}>
            <Close />
          </IconButton>
        </Stack>
        <Card sx={{ width: "100%" }}>
          <CardHeader title="Select a Theme" />
          <CardContent>
            <ThemeButton />
          </CardContent>
        </Card>
        <Card sx={{ width: "100%" }}>
          <CardHeader title="Select a Layout" />
          <CardContent>{/* Add layout selections */}</CardContent>
        </Card>
      </Stack>
    </Drawer>
  );
};
