import { Stack, Link, Toolbar, Typography, Card } from "@mui/material";
import ConnectForm from "../../ConnectForm/ConnectForm";

export const Footer = () => {
  const date = new Date().getFullYear();
  return (
    <Toolbar component={"footer"}>
      <Card
        sx={{
          width: "100%",
          p: 2,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack spacing={2} width={"50%"}>
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
        <ConnectForm />
      </Card>
    </Toolbar>
  );
};
