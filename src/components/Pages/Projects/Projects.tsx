import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CardMedia,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";

const Projects = () => {
  const projectsList = [
    {
      name: "Game Competition Website",
      img: "",
      href: "https://littletown.gay/",
      alt: "",
      description:
        "A fullstack website for OSRS Bingo competitions using React",
    },
    {
      name: "AC Composite Actions",
      img: "",
      href: "https://github.com/alcash55/ac-composite-actions",
      alt: "",
      description:
        "A repository of workflows and composite actions to use in CI/CD pipelines",
    },
    { name: "Project 1", img: "", href: "", alt: "", description: "" },
    { name: "Project 1", img: "", href: "", alt: "", description: "" },
  ];
  return (
    <Stack id="projects" component={"section"}>
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
              aria-label="navigate to projects"
              href="#projects"
              sx={{ zIndex: 0 }}
            >
              <LinkIcon />
            </IconButton>
          }
          title="Projects"
        />
        <CardContent
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
          }}
        >
          <Grid container spacing={2} width={"100%"} justifyContent={"center"}>
            {projectsList.map((project) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
                <Card>
                  <CardActionArea href={project.href} target="_blank">
                    <CardMedia
                      component="img"
                      height="100%"
                      alt={project.alt}
                      image={project.img}
                    />
                    <CardContent>
                      <Typography gutterBottom variant="h5" component="div">
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {project.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Projects;
