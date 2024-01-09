import { Card, Stack, Typography } from "@mui/material";

const About = () => {
  return (
    <Stack id="about" component={"section"} sx={{ height: "100vh" }}>
      <Card sx={{ height: "100%" }}>
        <Typography>about me</Typography>
      </Card>
    </Stack>
  );
};

export default About;
