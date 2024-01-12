import { Stack, Link, Toolbar } from "@mui/material";

export const Footer = () => {
  return (
    <Toolbar component={"footer"}>
      <Stack spacing={2}>
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
      </Stack>
    </Toolbar>
  );
};
