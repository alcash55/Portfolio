import {
  Stack,
  Link,
  Toolbar,
  Typography,
  Card,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import ConnectForm from "../../ConnectForm/ConnectForm";

export const Footer = () => {
  const theme = useTheme();
  const tablet = useMediaQuery(theme.breakpoints.down(768));
  const date = new Date().getFullYear();
  return (
    <Toolbar component={"footer"} sx={{ zIndex: 0 }}>
      <Card
        sx={{
          width: "100%",
          p: 2,
          display: "flex",
          flexDirection: tablet ? "column" : "row",
          alignItems: "center",
          backgroundColor: "#202020",
          gap: 2,
        }}
      >
        <Stack
          spacing={2}
          width={"50%"}
          order={tablet ? 2 : 1}
          sx={{ textAlign: "start" }}
        >
          <Typography variant="h6">Sitemap</Typography>
          <Link
            underline="hover"
            target="_blank"
            href="https://www.linkedin.com/in/alexander-cash/"
          >
            LinkedIn
          </Link>
          <Link
            underline="hover"
            target="_blank"
            href="https://github.com/alcash55"
          >
            Github
          </Link>
          <Link
            underline="hover"
            target="_blank"
            href="https://alcash55.github.io/Portfolio/sitemap.xml"
          >
            Sitemap.xml
          </Link>
          <Typography>All rights reserved © Alex Cash {date}</Typography>
        </Stack>
        <Box order={tablet ? 1 : 2}>
          <ConnectForm />
        </Box>
      </Card>
    </Toolbar>
  );
};
