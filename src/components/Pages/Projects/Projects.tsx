import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CardMedia,
  Grid,
  IconButton,
  Stack,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";

const Projects = () => {
  const projectsList = [
    { name: "Project 1", img: "", href: "" },
    { name: "Project 1", img: "", href: "" },
    { name: "Project 1", img: "", href: "" },
    { name: "Project 1", img: "", href: "" },
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
                  <CardActionArea>
                    <CardMedia
                      component="img"
                      height="100%"
                      alt="logo"
                      image={project.img}
                    />
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
