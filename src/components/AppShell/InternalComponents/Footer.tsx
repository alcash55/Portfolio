import { Stack, Link, Toolbar, Typography, Card } from "@mui/material";

export const Footer = () => {
  const date = new Date().getFullYear();
  return (
    <Toolbar component={"footer"}>
      <Card sx={{ width: "100%", p: 2 }}>
        <Stack spacing={2}>
          <Typography>Sitemap</Typography>
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
      </Card>
    </Toolbar>
  );
};
