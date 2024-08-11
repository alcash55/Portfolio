import {
  Stack,
  Card,
  CardHeader,
  IconButton,
  CardContent,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import ExperienceTimeline from "../../ExperienceTimeline/ExperienceTimeline";
import { experienceData } from "./experienceData";

const Experience = () => {
  return (
    <Stack id="experience" component={"section"}>
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
              aria-label="navigate to contact"
              href="#experience"
              sx={{ zIndex: 0 }}
            >
              <LinkIcon />
            </IconButton>
          }
          title="Experience"
        />
        <CardContent
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "start",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <ExperienceTimeline experiences={experienceData} />
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Experience;
