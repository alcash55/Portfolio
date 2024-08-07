import { Box, AppBar, Toolbar, Button, IconButton, Fade } from "@mui/material";
import { Menu } from "@mui/icons-material/";
import { showNavBar } from "./showNavBar";

interface NavBarProps {
  setSettingDrawer: (value: boolean) => void;
}

export const NavBar = ({ setSettingDrawer }: NavBarProps) => {
  const isVisible = showNavBar();
  return (
    <Fade in={isVisible} timeout={1000}>
      <Box
        sx={{
          flexGrow: 1,
          top: 0,
          position: "sticky",
          zIndex: 1,
          width: "100%",
          transition: "top 1.0s",
          visibility: isVisible ? "visible" : "hidden",
        }}
      >
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
              <Button variant="text" sx={{ color: "white" }} href="#experience">
                Experience
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
    </Fade>
  );
};
