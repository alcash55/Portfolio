import { Box, AppBar, Toolbar, Button, IconButton } from "@mui/material";
import { Menu } from "@mui/icons-material/";
import { useSettingDrawer } from "./useSettingsDrawer";
import { SettingsDrawer } from "./SettingsDrawer";

export const NavBar = () => {
  const { openSettingDrawer, handleSettingDrawer } = useSettingDrawer();

  return (
    <>
      <Box sx={{ flexGrow: 1, top: 0, position: "sticky" }}>
        <AppBar position="sticky" sx={{ bgcolor: "black" }}>
          <Toolbar>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-evenly",
                width: "100%",
                flexWrap: "wrap",
              }}
            >
              <Button variant="text" sx={{ color: "white" }} href="#summary">
                Home
              </Button>
              <Button variant="text" sx={{ color: "white" }} href="#about">
                About
              </Button>
              <Button variant="text" sx={{ color: "white" }} href="#projects">
                Projects
              </Button>
              <Button variant="text" sx={{ color: "white" }} href="#contact">
                Contact
              </Button>
            </Box>
            <IconButton
              aria-label="Open Settings Drawer"
              onClick={handleSettingDrawer}
            >
              <Menu sx={{ color: "white" }} />
            </IconButton>
          </Toolbar>
        </AppBar>
      </Box>
      <SettingsDrawer open={openSettingDrawer} close={handleSettingDrawer} />
    </>
  );
};
