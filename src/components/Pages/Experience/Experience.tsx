import {
  Stack,
  Card,
  CardHeader,
  IconButton,
  CardContent,
  Typography,
  Box,
  Divider,
  Chip,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import ExperienceTimeline from "../../ExperienceTimeline/ExperienceTimeline";
import { experienceData } from "./experienceData";

const Experience = () => {
  const skills = {
    Languages: ["TypeScript", "JavaScript", "Go"],
    Frameworks: ["React", "Node.js, Bun", "Express", "Next.js"],
    Tools: ["Docker", "Git", "GitHub"],
  };
  return (
    <Stack
      id="experience"
      component={"section"}
      sx={{ height: "auto", width: "100%" }}
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
          <Divider sx={{ my: 2, width: "100%" }} />
          <Box sx={{ width: "100%" }}>
            <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
              Skills & Tech
            </Typography>
            <Stack spacing={2} sx={{ width: "100%" }}>
              {Object.entries(skills).map(([group, items]) => (
                <Box key={group}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {group}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {items.map((label) => (
                      <Chip
                        key={label}
                        label={label}
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Experience;
