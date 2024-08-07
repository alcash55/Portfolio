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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import vsCodeTheme from "../../../assets/images/vsCodeTheme.png";
import littleTown from "../../../assets/images/littleTown.png";
import compositeActions from "../../../assets/images/compositeActions.png";

const Projects = () => {
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(600));
  /** OSRS Bingo description
   * @see https://www.youtube.com/watch?v=MF6LjbPVFtA
   */
  const projectsList = [
    {
      name: "Game Competition Website",
      img: littleTown,
      href: "https://littletown.gay/",
      alt: "",
      description:
        "A fullstack website for OSRS Bingo competitions using React",
    },
    {
      name: "AC Composite Actions",
      img: compositeActions,
      href: "https://github.com/alcash55/ac-composite-actions",
      alt: "Composite actions code",
      description:
        "A repository of workflows and composite actions to use in CI/CD pipelines",
    },
    {
      name: "VS Code Royalty Theme",
      img: vsCodeTheme,
      href: "https://marketplace.visualstudio.com/items?itemName=Alcash55.royaltytheme",
      alt: "Royalty VS Code Theme",
      description: "A custom theme for VS Code inspired by the color scheme ",
    },
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
            justifyContent: "center",
            alignItems: "center",
            flexGrow: 1,
          }}
        >
          <Grid
            container
            spacing={2}
            width={"100%"}
            height={"100%"}
            justifyContent={"center"}
          >
            {projectsList.map((project, idx) => (
              <Grid
                key={idx}
                item
                xs={12}
                sm={6}
                md={4}
                lg={4}
                xl={4}
                justifyContent={"center"}
                sx={{ height: largeMobile ? "auto" : 300 }}
              >
                <Card sx={{ width: "100%", height: "100%" }}>
                  <CardActionArea
                    href={project.href}
                    target="_blank"
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {!largeMobile && (
                      <CardMedia
                        component="img"
                        alt={project.alt}
                        image={project.img}
                        sx={{
                          width: "100%",
                          height: "50%",
                          objectFit: "contain",
                        }}
                      />
                    )}
                    <CardContent sx={{ maxHeight: "60%" }}>
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
