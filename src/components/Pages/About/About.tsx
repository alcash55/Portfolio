import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import SwipeableCards from "../../SwipeableCards/SwipeableCards";
import LinkIcon from "@mui/icons-material/Link";

const About = () => {
  return (
    <Stack id="about" component={"section"}>
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
            <IconButton
              aria-label="navigate to about"
              href="#about"
              sx={{ zIndex: 0 }}
            >
              <LinkIcon />
            </IconButton>
          }
          title="About Me"
        />
        <CardContent
          sx={{
            display: "flex",
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <SwipeableCards />
          <Stack spacing={2}>
            <Typography variant="h5" component={"h2"}>
              About me About meAbout meAbout meAbout meAbout meAbout meAbout
            </Typography>
            <Typography>
              About me About me About me About me About me About me About me
              About me About meAbout meAbout meAbout meAbout me About me About
              me About me About meAbout meAbout meAbout meAbout meAbout meAbout
              me
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default About;
