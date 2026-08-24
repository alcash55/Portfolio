import { Box, IconButton, Tooltip } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import type { ProjectClip } from './useProjectClip';

export interface ProjectMediaPlayerProps {
  /** State from `useProjectClip`, owned by the card or dialog around this. */
  clip: ProjectClip;
  /** The still screenshot. Shown whenever there is no clip playing. */
  image?: string;
  /** Alt text for the still. Only meaningful alongside `image`. */
  alt?: string;
  /**
   * The box the media letterboxes into. The card passes `2 / 1` -- the same
   * ratio the screenshots have always used there, and the number that decides
   * whether a second row of projects still fits on a 1366x768 laptop, so a
   * clip must never change it.
   */
  aspectRatio: string;
  /** Dialog only: native controls, so pause/mute/scrub are all reachable. */
  controls?: boolean;
  /** Dialog only: loop the clip rather than stopping on the last frame. */
  loop?: boolean;
}

/**
 * The media surface of a project card or dialog: a still screenshot, a demo
 * clip, or the placeholder panel for a project that has neither.
 *
 * Every branch renders into the *same* fixed-ratio box with `objectFit:
 * contain`, which is the whole trick. The clips are recorded at whatever size
 * the thing being demoed happens to be, the screenshots are 16:9, two of them
 * are logos -- and none of that is allowed to change a card's height, because
 * the grid row's height is shared and one tall card drags four others with it.
 */
export const ProjectMediaPlayer = ({
  clip,
  image,
  alt,
  aspectRatio,
  controls = false,
  loop = false,
}: ProjectMediaPlayerProps) => {
  const { clip: media, mounted, videoRef, handleError } = clip;

  const boxSx = {
    width: '100%',
    aspectRatio,
    // `contain`, not `cover`: two of these are logos and one is a marketplace
    // listing, all of which lose their subject when cropped. The tinted panel
    // behind makes the resulting letterboxing look deliberate rather than like
    // a gap -- and it is what a 9:16 clip will letterbox against too.
    objectFit: 'contain',
    bgcolor: 'action.hover',
    display: 'block',
  } as const;

  if (media && mounted) {
    return (
      <Box
        component="video"
        ref={videoRef}
        // Poster is the screenshot the card has always shown, so the swap from
        // still to clip is invisible: same image, same box, no reflow, and no
        // black frame while the first keyframe decodes.
        poster={media.poster}
        src={media.src}
        // Muted and inline are not decoration -- they are the conditions every
        // browser puts on programmatic playback without a user gesture. A clip
        // here has no soundtrack worth hearing anyway.
        muted
        playsInline
        loop={loop}
        controls={controls}
        // The element only mounts once something wants to play it, so there is
        // nothing to gain from preloading and a whole clip to lose if the
        // visitor never hovers.
        preload="none"
        aria-label={media.caption}
        onError={handleError}
        sx={boxSx}
      />
    );
  }

  if (image) {
    return <Box component="img" src={image} alt={alt ?? ''} loading="lazy" sx={boxSx} />;
  }

  return (
    <Box
      sx={{
        ...boxSx,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Sized against the ~100px-tall card box, not the 339px one this was
          first written for. */}
      <CodeIcon sx={{ fontSize: 56, color: 'action.disabled' }} />
    </Box>
  );
};

export interface ProjectClipToggleProps {
  clip: ProjectClip;
  /** True while the card is hovered or holds focus -- raises the control. */
  active?: boolean;
}

/**
 * Play/pause for a card's demo clip.
 *
 * Rendered as a **sibling** of the card's `CardActionArea`, positioned over
 * the media, never as a child of it. A `<button>` inside a `<button>` is
 * invalid HTML, browsers disagree about which one gets the click, and axe
 * flags it as nested interactive content -- which would cost the accessibility
 * score this section is holding at 100. As a sibling it is its own tab stop,
 * its clicks never reach the card, and the card keeps its single focus ring.
 *
 * It is also always present when a clip exists, at a lower resting opacity,
 * rather than appearing on hover. Two reasons: a control that only exists
 * while the pointer is over the card cannot be tabbed to (focus leaves the
 * card, the control unmounts, focus lands on the next card), and at rest it is
 * the one visible sign that this card has something to play.
 */
export const ProjectClipToggle = ({ clip, active = false }: ProjectClipToggleProps) => {
  const { clip: media, playing, toggle } = clip;
  if (!media) return null;

  const label = playing ? `Pause the ${media.caption} preview` : `Play the ${media.caption} preview`;

  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        size="small"
        onClick={toggle}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          // Above the action area's own surface, so this receives the click
          // instead of the card opening its dialog underneath the pointer.
          zIndex: 1,
          color: 'common.white',
          // A fixed dark scrim rather than a theme colour: this sits on top of
          // arbitrary video frames, and the one thing it cannot do is inherit
          // the contrast of whatever is behind it.
          bgcolor: 'rgba(0, 0, 0, 0.55)',
          opacity: active ? 1 : 0.75,
          transition: 'opacity 150ms',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.75)' },
          '&:focus-visible': { opacity: 1 },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

export default ProjectMediaPlayer;
