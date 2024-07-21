import {
  Stack,
  Link,
  Toolbar,
  Typography,
  Card,
  useMediaQuery,
  useTheme,
} from "@mui/material";

export const Footer = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down(650));
  const date = new Date().getFullYear();
  return (
    <Toolbar component={"footer"} disableGutters={true} sx={{ width: "100%" }}>
      <Card
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          mb: mobile ? "56px" : 0,
        }}
      >
        <Stack spacing={2} width={"50%"} sx={{ textAlign: "start", p: 2 }}>
          <Typography variant="h6" component={"h1"}>
            Sitemap
          </Typography>
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
          <Typography>© Alex Cash {date}</Typography>
        </Stack>
      </Card>
    </Toolbar>
  );
};
