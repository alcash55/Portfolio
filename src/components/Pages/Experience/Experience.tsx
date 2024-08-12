import {
  Stack,
  Card,
  CardHeader,
  IconButton,
  CardContent,
  Typography,
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
            flexDirection: "column",
            alignItems: "center",
            height: "100%",
            width: "100%",
            px: 4,
          }}
        >
          <Typography variant="h6" component={"p"} sx={{ fontWeight: 500 }}>
            With 4+ years of software engineering experience, a masters degree
            in Web and Mobile Information systems, and a background in division
            one athletics, I bring a unique blend of technical expertise and
            competitive drive to every task and project I tackles. This
            combination enables me to approach challenges with both analytical
            precision and a determined mindset, ensuring innovative and
            effective solutions. Whether collaborating with a team or working
            independently, I leverages my diverse background to deliver
            high-quality results.
          </Typography>
          <ExperienceTimeline experiences={experienceData} />
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Experience;
