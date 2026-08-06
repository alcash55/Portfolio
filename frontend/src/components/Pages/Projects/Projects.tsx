import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CardMedia,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import StarIcon from '@mui/icons-material/StarBorder';
import { staticProjects, type StaticProject } from './staticProjects';
import useProjects, { type ApiProject } from './useProjects';

/**
 * A static project entry merged with live metadata (F1). The static entry
 * always wins for name/img/href/alt -- `description` falls back to the
 * live entry's only when the static one is blank, which none of the
 * current four are. `live` is `null` when there is no matching API entry,
 * the API is unreachable, or the request is still in flight -- any of
 * which means "render this card from static data alone".
 */
interface DisplayProject extends StaticProject {
  live: ApiProject | null;
}

const mergeProject = (project: StaticProject, apiProjects: ApiProject[] | null): DisplayProject => {
  const live = apiProjects?.find((p) => p.name === project.repoName) ?? null;
  return {
    ...project,
    description: project.description || live?.description || '',
    live,
  };
};

const formatUpdatedAt = (iso: string): string | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * @see https://mui-treasury.com/?path=/story/card-solidgame--solid-game
 */
const Projects = () => {
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(600));
  const { apiProjects, isLoading } = useProjects();

  const displayProjects = staticProjects.map((project) => mergeProject(project, apiProjects));

  return (
    <Stack id="projects" component={'section'}>
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          p: 0,
          m: 0,
        }}
      >
        <CardHeader
          sx={{
            width: '100%',
          }}
          titleTypographyProps={{
            textAlign: 'start',
            variant: 'h4',
            component: 'h2',
          }}
          avatar={
            <IconButton aria-label="navigate to projects" href="#projects" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="Projects"
        />
        <CardContent
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          <Grid container spacing={2} width={'100%'} height={'100%'} justifyContent={'center'}>
            {isLoading
              ? staticProjects.map((project) => (
                  <ProjectCardSkeleton key={project.repoName} largeMobile={largeMobile} />
                ))
              : displayProjects.map((project) => (
                  <ProjectCard key={project.repoName} project={project} largeMobile={largeMobile} />
                ))}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
};

const ProjectCard = ({
  project,
  largeMobile,
}: {
  project: DisplayProject;
  largeMobile: boolean;
}) => {
  const updatedAt = project.live?.updatedAt ? formatUpdatedAt(project.live.updatedAt) : null;

  return (
    <Grid
      item
      xs={12}
      sm={6}
      md={4}
      lg={4}
      xl={4}
      justifyContent={'center'}
      sx={{ height: largeMobile ? 'auto' : 300 }}
    >
      <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.default' }}>
        <CardActionArea
          href={project.href}
          target="_blank"
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {!largeMobile && project.img && (
            <CardMedia
              component="img"
              alt={project.alt}
              image={project.img}
              loading="lazy"
              sx={{
                width: '100%',
                height: '50%',
                objectFit: 'contain',
              }}
            />
          )}
          {!largeMobile && !project.img && (
            <Box
              sx={{
                width: '100%',
                height: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <CodeIcon
                sx={{
                  fontSize: 120,
                  color: 'rgba(255, 255, 255, 0.3)',
                }}
              />
            </Box>
          )}
          <CardContent sx={{ maxHeight: '60%' }}>
            <Typography gutterBottom variant="h5" component="div">
              {project.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {project.description}
            </Typography>
            {/* Live metadata (F1): only rendered once the API has actually
                matched this repo, so a fallback or still-static card never
                shows a stray "0 stars" for a repo we have no data for. */}
            {project.live && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                sx={{ mt: 1 }}
                color="text.secondary"
              >
                {project.live.language && (
                  <Typography variant="caption">{project.live.language}</Typography>
                )}
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <StarIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption">{project.live.stars}</Typography>
                </Stack>
                {updatedAt && <Typography variant="caption">Updated {updatedAt}</Typography>}
              </Stack>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
};

/**
 * Skeleton (F2) matching ProjectCard's layout so the section doesn't jump
 * when data lands. A sleeping Render backend takes ~50s to wake, so this can
 * stay on screen a while -- it needs to read as "loading", not "broken".
 */
const ProjectCardSkeleton = ({ largeMobile }: { largeMobile: boolean }) => (
  <Grid item xs={12} sm={6} md={4} lg={4} xl={4} sx={{ height: largeMobile ? 'auto' : 300 }}>
    <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.default' }}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!largeMobile && <Skeleton variant="rectangular" width="100%" height="50%" />}
        <CardContent sx={{ maxHeight: '60%' }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="75%" />
        </CardContent>
      </Box>
    </Card>
  </Grid>
);

export default Projects;
