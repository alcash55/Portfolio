import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SwipeableCards from "../../SwipeableCards/SwipeableCards";
import LinkIcon from "@mui/icons-material/Link";
import CodeIcon from "@mui/icons-material/Code";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";

const About = () => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const techStack = [
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "Docker",
    "Git/GitHub",
  ];

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
            width: "100%",
            height: "100%",
            p: { xs: 2, md: 4 },
          }}
        >
          <Grid container spacing={4}>
            {/* Photos Section */}
            <Grid item xs={12} md={6}>
              <SwipeableCards />
            </Grid>

            {/* Text Content */}
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                {/* Professional Summary */}
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <CodeIcon color="primary" />
                    Developer & Engineer
                  </Typography>
                  <Typography variant="body1" paragraph>
                    A dedicated software engineer with over four years of
                    hands-on development experience building scalable web and
                    mobile applications. I'm committed to crafting clean,
                    maintainable code and delivering solutions that drive
                    business value.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    My approach combines technical expertise with collaborative
                    teamwork, always striving to write code that's both
                    performant and maintainable.
                  </Typography>
                </Box>

                <Divider />

                {/* Education */}
                <Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <SchoolIcon color="primary" sx={{ fontSize: 20 }} />
                    Education & Background
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Masters in Web & Mobile Information Systems
                  </Typography>
                  <Typography variant="body2">
                    Combined with Division I athletics experience, I bring a
                    unique blend of technical expertise and the discipline,
                    teamwork, and resilience needed to thrive in fast-paced
                    development environments.
                  </Typography>
                </Box>

                <Divider />

                {/* Tech Stack */}
                <Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <CodeIcon color="primary" sx={{ fontSize: 20 }} />
                    Tech Stack
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    {techStack.map((tech) => (
                      <Chip
                        key={tech}
                        label={tech}
                        size={isSmallMobile ? "small" : "medium"}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Divider />

                {/* Outside of Work */}
                <Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <PersonIcon color="primary" sx={{ fontSize: 20 }} />
                    Outside of Code
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    When I'm not at my desk, you'll find me coaching youth
                    lacrosse, exploring national parks with my two dogs Troy and
                    Leon, or contributing to open-source projects. I believe in
                    maintaining a healthy work-life balance and bringing diverse
                    experiences to every project.
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default About;
