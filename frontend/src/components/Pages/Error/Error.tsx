import { Button, Stack, Typography } from '@mui/material';

const Error = () => {
  return (
    <Stack
      id="about"
      component={'section'}
      spacing={4}
      sx={{
        width: '100%',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="h1">404 :(</Typography>
      <Button size="large" variant="contained" href="/Portfolio/">
        Go Home
      </Button>
    </Stack>
  );
};

export default Error;
