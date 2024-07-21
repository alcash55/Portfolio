import { Button, Stack, Typography } from "@mui/material";

const Error = () => {
  return (
    <Stack
      id="about"
      component={"section"}
      width={"100%"}
      height={"100vh"}
      justifyContent={"center"}
      alignItems={"center"}
      spacing={4}
    >
      <Typography variant="h1">404 :(</Typography>
      <Button size="large" variant="contained" href="/Portfolio/">
        Go Home
      </Button>
    </Stack>
  );
};

export default Error;
