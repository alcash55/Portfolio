import { Box, AppBar, Toolbar, Button, IconButton } from "@mui/material";
import { Menu } from "@mui/icons-material/";

interface NavBarProps {
  setSettingDrawer: (value: boolean) => void;
}

export const NavBar = ({ setSettingDrawer }: NavBarProps) => {
  return (
    <Box sx={{ flexGrow: 1, top: 0, position: "sticky", zIndex: 1 }}>
      <AppBar sx={{ bgcolor: "black" }}>
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
            onClick={() => setSettingDrawer(true)}
          >
            <Menu sx={{ color: "white" }} />
          </IconButton>
        </Toolbar>
      </AppBar>
    </Box>
  );
};
