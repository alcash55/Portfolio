import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { ThemeButton } from "./ThemeButton";
import { LayoutButton } from "./LayoutButton";

interface SettingsDrawerProps {
  settingDrawer: boolean;
  setSettingDrawer: (value: boolean) => void;
}

export const SettingsDrawer = ({
  settingDrawer,
  setSettingDrawer,
}: SettingsDrawerProps) => {
  const theme = useTheme();
  const tempSidebar = useMediaQuery(theme.breakpoints.down(2561));
  const isMobile = useMediaQuery(theme.breakpoints.down(426));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const SettingDrawerTopItem = () => (
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
      <IconButton
        aria-label="Close Settings Drawer"
        onClick={() => setSettingDrawer(false)}
      >
        <Close />
      </IconButton>
    </Stack>
  );

  const SettingDrawerBottomItem = () => (
    <Stack
      direction={"row"}
      justifyContent="center"
      alignItems="center"
      sx={{ width: "100%" }}
    >
      Insert Logo/Brand
    </Stack>
  );

  const SettingDrawerContent = () => (
    <Stack
      spacing={2}
      justifyContent="flex-start"
      alignItems="center"
      sx={{ width: "100%", height: "100%" }}
    >
      <Card sx={{ width: "100%" }}>
        <CardHeader title="Select a Theme" />
        <CardContent>
          <ThemeButton />
        </CardContent>
      </Card>
      <Card sx={{ width: "100%" }}>
        <CardHeader title="Select a Layout" />
        <CardContent>
          <LayoutButton />
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <Drawer
      anchor={"right"}
      open={settingDrawer}
      onClose={() => setSettingDrawer(false)}
      PaperProps={{
        sx: {
          width: isMobile ? "100%" : isTablet ? "50%" : tempSidebar ? 280 : 280,
        },
      }}
    >
      <Stack
        spacing={2}
        justifyContent="center"
        alignItems="center"
        sx={{ px: 2, py: 2, height: "100%" }}
      >
        <SettingDrawerTopItem />
        <SettingDrawerContent />
        <SettingDrawerBottomItem />
      </Stack>
    </Drawer>
  );
};
