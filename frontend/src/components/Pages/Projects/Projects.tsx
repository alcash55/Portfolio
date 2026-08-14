import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CardMedia,
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
import { type Theme } from '@mui/material/styles';
import { staticProjects, type StaticProject } from './staticProjects';
import useProjects, { type ApiProject } from './useProjects';
import { useScrollReveal } from '../../../hooks/useScrollReveal';
import { hoverGlow } from '../../../layout/Theme/hoverGlow';

/**
 * Narrowest a card may get before the grid drops a column. Everything about the
 * section's density follows from this one number, and it is the only knob worth
 * turning here.
 *
 * Deliberately an `auto-fill` grid rather than fixed breakpoint columns. Fixed
 * columns pin the count -- `lg: 3` meant four per row and no more, so every
 * project added past the fourth became a new *row*, and the section outgrew a
 * laptop viewport at eight. Auto-fill spends extra width on more columns
 * instead, so new projects fill the row that already exists first.
 *
 * 230 specifically, because the column count snaps and the useful values are
 * few. Measured at 1366x768, the tightest screen that matters here:
 *
 *   min 200 -> 6 columns, 201px cards -- too small
 *   min 230 -> 5 columns, 244px cards -- eight projects still fit one screen
 *   min 250 -> 4 columns, 310px cards -- eight projects overflow by 52px
 *
 * So 230 is the widest card that keeps a second row on screen at 1366. Going
 * wider costs a column, and a lost column costs a whole row.
 */
const PROJECT_CARD_MIN_WIDTH = 230;

/**
 * The card shell, shared with the skeleton. The border is doing real work
 * rather than decoration: in the light theme the card background (#f4f5f7) sat
 * on the section's white paper with almost no edge, so the cards read as
 * screenshots floating on the page instead of as cards.
 */
const projectCardSx = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'background.default',
  border: '1px solid',
  borderColor: 'divider',
  // Kept visible, like the section cards: MUI's Card default of `hidden`
  // combined with a flex parent is what silently clipped content elsewhere on
  // this page. Nothing here needs clipping.
  overflow: 'visible',
};

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
  // An entry with no `repoName` isn't on GitHub, so there is nothing to match.
  // Guarded explicitly rather than left to `find` -- `p.name === undefined`
  // would be false for every real repo today, but that's an accident of the
  // data, not a rule, and a single API entry with a missing name would quietly
  // attach itself to every non-GitHub project.
  const live = project.repoName
    ? (apiProjects?.find((p) => p.name === project.repoName) ?? null)
    : null;
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
  const reveal = useScrollReveal();
  // The cards cascade in instead of arriving as one slab.
  const cards = useScrollReveal({ stagger: 80, distance: 18 });
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(600));
  const { apiProjects, isLoading } = useProjects();

  const displayProjects = staticProjects.map((project) => mergeProject(project, apiProjects));

  return (
    <Stack id="projects" component={'section'} ref={reveal.ref} sx={reveal.sx}>
      <Card
        sx={{
          // `overflow: visible` is load-bearing, not cosmetic. MUI's Card sets
          // `overflow: hidden`, and a flex item only gets an automatic minimum
          // size while its overflow is visible -- so as a child of Home's flex
          // column this Card could shrink below its own content and silently
          // clip the bottom. Measured: About lost 124px at 1280px and 1057px
          // at 390px, which was most of "Outside of Work". Setting height:auto
          // does NOT fix it; restoring the min-size does.
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Deliberately NOT `height: '100%'`. As a flex child this resolved to
          // a fixed 826px while the content wanted more, and MUI's Card sets
          // `overflow: hidden` -- so the bottom of the section was silently
          // clipped (About lost 124px at 1280px and 1057px at 390px). A
          // content section must be as tall as its content.
          width: '100%',
          p: 0,
          m: 0,
        }}
      >
        <CardHeader
          sx={{
            width: '100%',
          }}
          avatar={
            <IconButton aria-label="navigate to projects" href="#projects" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="Projects"
          slotProps={{
            title: {
              variant: 'h4',
              component: 'h2',
              sx: { textAlign: 'start' },
            },
          }}
        />
        <CardContent
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            flexGrow: 1,
          }}
        >
          <Box
            ref={cards.ref}
            sx={[
              {
                width: '100%',
                display: 'grid',
                // `auto-fill` (not `auto-fit`): with few projects on a very wide
                // screen, auto-fit would stretch them to fill the row and undo
                // the whole point of a compact card. auto-fill keeps the column
                // width and leaves the empty tracks empty.
                gridTemplateColumns: `repeat(auto-fill, minmax(${PROJECT_CARD_MIN_WIDTH}px, 1fr))`,
                gap: 2,
                // CSS grid stretches items to their row's height on its own, so
                // cards line up without the flex plumbing this needed before.
                alignItems: 'stretch',
              },
              cards.sx,
            ]}
          >
            {/* Keyed by `name`, not `repoName`: names are unique and always
                present, while a project that isn't on GitHub has no repo. */}
            {isLoading
              ? staticProjects.map((project) => (
                  <ProjectCardSkeleton key={project.name} largeMobile={largeMobile} />
                ))
              : displayProjects.map((project) => (
                  <ProjectCard key={project.name} project={project} largeMobile={largeMobile} />
                ))}
          </Box>
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
    <Box
      data-testid="project-grid-item"
      // `display: flex` is what passes the grid row's height down to the Card.
      // Without it each card sized to its own content and the row bottoms came
      // out ragged -- 20px apart on desktop and 72px on mobile, where a
      // two-line description against a one-line one is the whole difference.
      sx={{ display: 'flex' }}
    >
      {/* Still no fixed height on the card -- `height: 300` plus a `height:
          '50%'` image and a `maxHeight: '60%'` CardContent once looked like a
          deliberate 50/60 split, but percentages don't clip cleanly and Card's
          default `overflow: hidden` swallowed the excess silently. Cards match
          each other by stretching within the row, not by being told a height. */}
      <Card
        sx={{
          ...projectCardSx,
          transition: (theme: Theme) =>
            theme.transitions.create(['transform', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
          '&:hover': {
            // Lift + glow, and deliberately *not* a border swap. The card used
            // to also flip `borderColor` to `primary.main`, which was doing the
            // work of signalling hover back when the shadow was MUI's neutral
            // elevation 6 and read as almost nothing. `hoverGlow` carries the
            // primary hue now, so the outline was a second, louder statement of
            // the same thing. The resting `divider` border stays -- it is what
            // gives the card an edge against the light theme's near-white
            // section, and it never changes on hover.
            boxShadow: (theme: Theme) => hoverGlow(theme),
            transform: 'translateY(-4px)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:hover': { transform: 'none' },
          },
        }}
      >
        <CardActionArea
          href={project.href}
          target="_blank"
          sx={{
            width: '100%',
            // Fills the stretched card so the whole surface stays clickable,
            // and lets the content column push its metadata row to the bottom.
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            // MUI's own hover overlay, neutralised in favour of the card rule
            // above. The focus-visible ring is untouched -- it comes from the
            // shared MuiButtonBase override, not from this highlight.
            '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
            '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0 },
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
                // 2:1 rather than the images' own 16:9. The image is the single
                // biggest contributor to card height, and height is what
                // decides whether a second row of projects still fits on one
                // screen: at 16:9 two rows came to 665px against the 657px a
                // 1366x768 laptop actually has. This buys back ~13px a card.
                aspectRatio: '2 / 1',
                // `contain`, not `cover`: two of these are logos and one is a
                // marketplace listing, all of which lose their subject when
                // cropped. The tinted panel behind makes the resulting
                // letterboxing look deliberate rather than like a gap.
                objectFit: 'contain',
                bgcolor: 'action.hover',
              }}
            />
          )}
          {!largeMobile && !project.img && (
            <Box
              sx={{
                width: '100%',
                // Matches the real image's ratio so a project without a
                // screenshot is the same height as one with.
                aspectRatio: '2 / 1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'action.hover',
              }}
            >
              <CodeIcon
                sx={{
                  // Was 120px, set when the image box was 339px tall; it
                  // now overflows a ~100px box.
                  fontSize: 56,
                  color: 'action.disabled',
                }}
              />
            </Box>
          )}
          <CardContent
            sx={{
              width: '100%',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              // Tighter than MUI's default 16px/24px. At a 200px column that
              // padding was a meaningful share of the card's width.
              p: 1.5,
              '&:last-child': { pb: 1.5 },
            }}
          >
            <Typography
              variant="subtitle1"
              component="div"
              sx={{
                // `h6` (20px) was set when cards were 288px wide; at 200px it
                // pushed most names onto the second line.
                fontWeight: 600,
                // No `gutterBottom`: the reserved two lines below already
                // separate the title from the body on one-line names.
                // Always two lines' worth of space, clamped at two. "Game
                // Competition Website" wraps where the other three names don't,
                // which started its description a line lower than its
                // neighbours'; reserving the space lines every card's body up.
                lineHeight: 1.3,
                minHeight: '2.6em',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {project.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                // Two lines, then ellipsis. Descriptions run from 50 to 130
                // characters, which was most of the height difference between
                // cards -- and the live API can replace one with a longer repo
                // description at any time, so capping it keeps the row tidy
                // without depending on anyone writing to a length.
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {project.description}
            </Typography>
            {/* Live metadata (F1): only rendered once the API has actually
                matched this repo, so a fallback or still-static card never
                shows a stray "0 stars" for a repo we have no data for. */}
            {project.live && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  color: 'text.secondary',
                  // Pinned to the bottom of the stretched card so the metadata
                  // rows line up across a row instead of floating at whatever
                  // height each description happens to end at.
                  mt: 'auto',
                  pt: 1,
                }}
              >
                {project.live.language && (
                  <Typography variant="caption">{project.live.language}</Typography>
                )}
                <Stack
                  direction="row"
                  spacing={0.25}
                  sx={{
                    alignItems: 'center',
                  }}
                >
                  <StarIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption">{project.live.stars}</Typography>
                </Stack>
                {updatedAt && <Typography variant="caption">Updated {updatedAt}</Typography>}
              </Stack>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  );
};

/**
 * Skeleton (F2) matching ProjectCard's layout so the section doesn't jump
 * when data lands. A sleeping Render backend takes ~50s to wake, so this can
 * stay on screen a while -- it needs to read as "loading", not "broken".
 */
const ProjectCardSkeleton = ({ largeMobile }: { largeMobile: boolean }) => (
  <Box data-testid="project-grid-item" sx={{ display: 'flex' }}>
    <Card sx={projectCardSx}>
      <Box
        sx={{
          width: '100%',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!largeMobile && (
          <Skeleton variant="rectangular" width="100%" sx={{ aspectRatio: '2 / 1' }} />
        )}
        <CardContent sx={{ width: '100%' }}>
          {/* Two description lines, matching ProjectCard's clamp, so the swap
              from skeleton to card doesn't change the card's height. */}
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="75%" />
        </CardContent>
      </Box>
    </Card>
  </Box>
);

export default Projects;
