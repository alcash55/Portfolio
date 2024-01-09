import { Box, AppBar, Toolbar, Button } from "@mui/material";

export const NavBar = () => {
  return (
    <Box sx={{ flexGrow: 1, top: 0, position: "sticky" }}>
      <AppBar position="sticky" sx={{ bgcolor: "black", width: "100%" }}>
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 5,
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
        </Toolbar>
      </AppBar>
    </Box>
  );
};
