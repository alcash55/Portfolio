import {
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";

const About = () => {
  return (
    <Stack id="about" component={"section"} sx={{ height: "100vh" }}>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          width: "100%",
          p: 0,
          m: 0,
        }}
      >
        <CardHeader
          sx={{
            width: "100%",
          }}
          titleTypographyProps={{
            textAlign: "start",
            variant: "h4",
            component: "h1",
          }}
          avatar={
            <IconButton aria-label="settings" href="#about" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="About Me"
        />
        <CardContent></CardContent>
      </Card>
    </Stack>
  );
};

export default About;
