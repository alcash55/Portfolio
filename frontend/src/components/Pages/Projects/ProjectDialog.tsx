import { Fragment, type ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StarIcon from '@mui/icons-material/StarBorder';
import type { DisplayProject } from './displayProject';
import { formatUpdatedAt } from './displayProject';
import { projectDetails } from './projectDetails';
import { projectLinks } from './projectLinks';
import { projectMedia } from './projectMedia';
import { ProjectMediaPlayer } from './ProjectMediaPlayer';
import { useProjectClip } from './useProjectClip';

/**
 * MUI ships this as `@mui/utils`' `visuallyHidden`, but importing it pulls a
 * second package path into the bundle for eight declarations. Same rules:
 * clipped to nothing, still in the accessibility tree.
 */
const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const;

/** The `<h2>` the dialog is labelled by. One dialog is open at a time. */
const TITLE_ID = 'project-dialog-title';

/**
 * Renders `` `code` `` and `*emphasis*` inside a paragraph of hand-written
 * copy.
 *
 * The alternative was a markdown dependency for two constructs, or writing
 * `getContrastText` as plain prose and losing the distinction between an
 * identifier and a word. Anything the regex does not match is plain text, so
 * an unclosed backtick renders as a backtick rather than eating the paragraph.
 */
const RichText = ({ children }: { children: string }) => {
  const parts = children.split(/(`[^`]+`|\*[^*]+\*)/g).map((part, index): ReactNode => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <Box
          key={index}
          component="code"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.9em',
            px: 0.5,
            borderRadius: 0.5,
            bgcolor: 'action.hover',
          }}
        >
          {part.slice(1, -1)}
        </Box>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });

  return <>{parts}</>;
};

const Paragraph = ({ children }: { children: string }) => (
  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, lineHeight: 1.7 }}>
    <RichText>{children}</RichText>
  </Typography>
);

export interface ProjectDialogProps {
  /**
   * The project to show. Kept non-null for the whole open/close cycle by the
   * caller so the content does not blank out mid-close-transition.
   */
  project: DisplayProject | null;
  open: boolean;
  onClose: () => void;
}

/**
 * The depth behind a project card: the demo clip, the story, what it is built
 * with, the live GitHub metadata, and every outbound link the project has.
 *
 * Accessibility notes, all of which are load-bearing rather than habit:
 *
 * - `aria-labelledby` points at the title, so a screen reader announces
 *   "Portfolio Website, dialog" rather than just "dialog".
 * - Escape, the backdrop and the close button all dismiss, which MUI gives us
 *   for the first two and the third is explicit -- a modal with no visible
 *   close control is a trap on a touch device, where there is no Escape key
 *   and the backdrop is easy to miss.
 * - `disableRestoreFocus` is set because focus restoration is the caller's
 *   job here: the dialog can be opened from a `#projects/<slug>` link on a
 *   cold load, where MUI's "focus whatever was focused before" means the
 *   `<body>`, and the visitor is dropped at the top of the document on close.
 *   `Projects.tsx` focuses the matching card instead.
 */
const ProjectDialog = ({ project, open, onClose }: ProjectDialogProps) => {
  const theme = useTheme();
  // MUI's own recommendation for `fullScreen`, and the same breakpoint the
  // cards drop their image at.
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const media = project ? projectMedia[project.name] : undefined;
  // Autoplays because it is the thing the visitor just asked to see, muted and
  // looping because it has no sound and a six-second clip that stops on a dead
  // frame reads as a broken video. Native controls are on: WCAG 2.2.2 wants
  // anything that moves for more than five seconds to be stoppable, and the
  // browser's own control is better than one I would write.
  const clip = useProjectClip({ media, autoPlay: open });

  const detail = project ? projectDetails[project.name] : undefined;
  const links = project ? projectLinks(project) : [];
  const updatedAt = project?.live?.updatedAt ? formatUpdatedAt(project.live.updatedAt) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby={TITLE_ID}
      disableRestoreFocus
      // Fade carries the backdrop and the paper's opacity; the paper's own
      // keyframe below carries the movement. Timings are asymmetric on purpose
      // -- leaving should be quicker than arriving, or closing feels sticky.
      transitionDuration={reducedMotion ? 0 : { enter: 260, exit: 180 }}
      slotProps={{
        paper: {
          sx: {
            // Room for the glow-free, flat-ish surface the rest of the page
            // uses; `backgroundImage: none` kills MUI's dark-mode elevation
            // overlay, which tints the paper a different shade than the cards.
            backgroundImage: 'none',
            ...(fullScreen
              ? {}
              : {
                  '@keyframes projectDialogIn': {
                    from: { transform: 'translateY(14px) scale(0.98)' },
                    to: { transform: 'none' },
                  },
                  // The paper mounts when the dialog opens, so this runs once,
                  // on open. `translateY` + a 2% scale rather than MUI's Grow
                  // (which starts at 0.75 and reads as a pop): the intent is a
                  // surface settling into place, matching the easing the
                  // scroll reveal already uses everywhere else on the page.
                  animation: 'projectDialogIn 260ms cubic-bezier(0.22, 0.61, 0.36, 1)',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }),
          },
        },
      }}
    >
      <DialogTitle
        id={TITLE_ID}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1,
        }}
      >
        <Box component="span" sx={{ flexGrow: 1, minWidth: 0 }}>
          {project?.name}
        </Box>
        <IconButton
          aria-label="Close project details"
          onClick={onClose}
          // Nudged up to sit on the title's optical line rather than its box.
          sx={{ mt: -0.5 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {project && (
          <>
            <ProjectMediaPlayer
              clip={clip}
              image={project.img}
              alt={project.alt}
              // Wider than the card's 2:1. The dialog has the room, and a clip
              // recorded from a browser window letterboxes into 16:9 with far
              // less dead space than into the card's strip.
              aspectRatio="16 / 9"
              controls
              loop
            />

            <Box sx={{ mt: 2 }}>
              {/* Falls back to the card's own description, so a project nobody
                  has written long copy for still opens a dialog with something
                  in it rather than an empty box. */}
              <Paragraph>{detail?.summary ?? project.description}</Paragraph>

              {detail?.sections?.map((section) => (
                <Box key={section.heading} sx={{ mt: 2.5 }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                    {section.heading}
                  </Typography>
                  {section.body.map((paragraph, index) => (
                    <Paragraph key={index}>{paragraph}</Paragraph>
                  ))}
                </Box>
              ))}
            </Box>

            {detail?.tech && detail.tech.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  // A list semantically (it is one), but without the bullets
                  // and indent a browser would add.
                  sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}
                  component="ul"
                  aria-label={`Built with, ${project.name}`}
                >
                  {detail.tech.map((tech) => (
                    <li key={tech}>
                      <Chip label={tech} size="small" variant="outlined" />
                    </li>
                  ))}
                </Stack>
              </>
            )}

            {detail?.facts && detail.facts.length > 0 && (
              <Box
                component="ul"
                sx={{ mt: 2, mb: 0, pl: 2.5, color: 'text.secondary' }}
                aria-label={`Measured facts, ${project.name}`}
              >
                {detail.facts.map((fact) => (
                  <Typography key={fact} component="li" variant="caption">
                    <RichText>{fact}</RichText>
                  </Typography>
                ))}
              </Box>
            )}

            {/* Live metadata (F1): only rendered once the API has actually
                matched this repo, so a fallback or still-static dialog never
                shows a stray "0 stars" for a repo we have no data for. */}
            {project.live && (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary', mt: 2 }}
              >
                {project.live.language && (
                  <Typography variant="caption">{project.live.language}</Typography>
                )}
                <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                  <StarIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption">{project.live.stars}</Typography>
                </Stack>
                {updatedAt && <Typography variant="caption">Updated {updatedAt}</Typography>}
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      {/* The links the card used to carry. Wrapping is allowed because at
          320px two buttons do not fit on one line, and a button pushed off the
          edge is a link that does not exist. */}
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, py: 2 }}>
        {links.map((link, index) => (
          <Button
            key={link.href}
            href={link.href}
            target="_blank"
            // `noopener` is the security half (the opened tab cannot touch
            // `window.opener`); `noreferrer` keeps the referrer off it too.
            rel="noopener noreferrer"
            variant={index === 0 ? 'contained' : 'outlined'}
            endIcon={<OpenInNewIcon />}
            // Overrides MUI's default of pushing DialogActions children to the
            // right edge only -- with `flexWrap` on, a lone wrapped button
            // should not jump alignment.
            sx={{ ml: 0 }}
          >
            {link.label}
            {/* Announced by a screen reader, invisible on screen: the icon is
                decorative and "opens in a new tab" is information a sighted
                user gets from it. */}
            <Box component="span" sx={visuallyHidden}>
              {' '}
              (opens in a new tab)
            </Box>
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
};

export default ProjectDialog;
