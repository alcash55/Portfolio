import {
  Stack,
  Card,
  CardHeader,
  IconButton,
  CardContent,
  Box,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import ExperienceTimeline from "../../DataVis/ExperienceTimeline/ExperienceTimeline";

const Experience = () => {
  return (
    <Stack
      id="experience"
      component={"section"}
      sx={{ height: "calc(100vh - 73.98px)" }}
    >
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
          <ExperienceTimeline
            experiences={[
              {
                date: "2020",
                description: "Software Engineer Intern at NCR Corporation",
              },
              {
                date: "2021",
                description: `Graduated with a MS in Web & Mobile Information Systems`,
              },
              {
                date: "2021",
                description: "Graduated with a BS in Software Engineering",
              },
              {
                date: "2021",
                description: "Software Engineer I at NCR Corporation",
              },
              {
                date: "2023",
                description: "Middle School Lacrosse Coach",
              },
              {
                date: "2023",
                description: "Software Engineer II at NCR Corporation",
              },
              {
                date: "2024",
                description: "High School Lacrosse Coach",
              },
              {
                date: "2023",
                description: "Software Engineer II at NCR Voyix Corporation",
              },
            ]}
          />
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Experience;
