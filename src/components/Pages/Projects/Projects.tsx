import {
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  IconButton,
  Stack,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";

const Projects = () => {
  return (
    <Stack
      id="projects"
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
              aria-label="navigate to projects"
              href="#projects"
              sx={{ zIndex: 0 }}
            >
              <LinkIcon />
            </IconButton>
          }
          title="Projects"
        />
        <CardContent></CardContent>
      </Card>
    </Stack>
  );
};

export default Projects;
