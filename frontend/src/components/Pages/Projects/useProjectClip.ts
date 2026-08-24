import { useCallback, useEffect, useRef, useState } from 'react';
// From the barrel, like every other MUI import here: the deep path
// (`@mui/material/useMediaQuery`) is a separate entry for Vite's dependency
// pre-bundling, and adding one mid-session made the dev server serve a module
// graph with two copies of React in it.
import { useMediaQuery } from '@mui/material';
import type { ProjectMedia } from './projectMedia';

export interface UseProjectClipOptions {
  /** The manifest entry, or `undefined` for a project with no clip. */
  media?: ProjectMedia;
  /**
   * Card variant: the card is hovered or holds focus. Playback follows this.
   * Ignored when `autoPlay` is set.
   */
  active?: boolean;
  /** Dialog variant: play as soon as the clip is on screen, and loop. */
  autoPlay?: boolean;
}

export interface ProjectClip {
  /**
   * The clip to render, or `null` when the still image is the whole story --
   * no manifest entry, `prefers-reduced-motion: reduce`, or a clip that
   * already failed to decode. Consumers branch on this one value rather than
   * re-deriving the three reasons.
   */
  clip: ProjectMedia | null;
  /** Attach to the `<video>`. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /**
   * Whether the `<video>` element should exist in the DOM at all. False until
   * something actually wants the clip, which is what makes this lazy: an
   * unmounted video has no `src`, so nothing is fetched for a card nobody
   * hovers. Once mounted it stays mounted -- re-fetching the same clip on
   * every hover would be worse than keeping ~1 MB of decoded video around.
   */
  mounted: boolean;
  /**
   * What the player is *trying* to do. Deliberately intent rather than the
   * element's own `paused` property: a browser is free to reject a play()
   * (a background tab will), and a toggle whose label flips to "Pause" only
   * once the decoder agrees reads as a broken button. The one case where this
   * lies is the one where nothing is visibly moving anyway.
   */
  playing: boolean;
  /** Play/pause from the card's overlay button. */
  toggle: () => void;
  /** Wire to the `<video>`'s `onError`. */
  handleError: React.ReactEventHandler<HTMLVideoElement>;
}

/**
 * Playback state for one project's demo clip.
 *
 * Three rules it exists to keep, in order of how badly each one bites:
 *
 * 1. **`prefers-reduced-motion` gets the poster and nothing else.** MUI helps
 *    with none of this -- an autoplaying, looping video is exactly the kind of
 *    motion the setting is about, and no amount of `transition: none` reaches
 *    a `<video>`. So the element is never rendered at all, rather than
 *    rendered and paused.
 * 2. **Nothing is fetched until it is wanted.** A grid of five cards that each
 *    preload a clip is megabytes spent on a section most visitors scroll past.
 * 3. **A clip that will not decode disappears.** One `console.error` (which
 *    the smoke suite's `zero console errors on load` will catch if it ever
 *    happens on load) and the still image takes over. A black rectangle where
 *    a screenshot used to be is a worse card than the one we started with.
 */
export const useProjectClip = ({
  media,
  active = false,
  autoPlay = false,
}: UseProjectClipOptions): ProjectClip => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Survives only as long as the pointer/focus stays on the card: pausing is
  // "stop this now", not a preference to remember. Leaving and coming back is
  // a new interaction, and a card stuck on a frozen frame forever would look
  // broken.
  const [userPaused, setUserPaused] = useState(false);

  const clip = media && !reducedMotion && !failed ? media : null;
  const wanted = Boolean(clip) && (autoPlay || active);
  const playing = wanted && !userPaused;

  useEffect(() => {
    if (wanted) setMounted(true);
  }, [wanted]);

  useEffect(() => {
    if (!userPaused) return;
    // The pointer left (or focus moved on) while paused -- forget it, so the
    // next hover plays instead of showing a still frame with a play button.
    if (!active && !autoPlay) setUserPaused(false);
  }, [active, autoPlay, userPaused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      // `play()` returns a promise that rejects when the browser declines
      // (backgrounded tab, or a policy this muted+inline clip is not supposed
      // to trip). Swallowed on purpose: it is not a failure of ours, the
      // poster frame is still on screen, and an unhandled rejection here would
      // fail `zero console errors on load`.
      void video.play()?.catch(() => {});
      return;
    }

    video.pause();
    // Back to the first frame, so a card that is hovered twice starts the clip
    // twice rather than resuming from the middle of a 6-second loop.
    if (!active && !autoPlay) video.currentTime = 0;
  }, [playing, active, autoPlay, mounted]);

  const toggle = useCallback(() => setUserPaused((paused) => !paused), []);

  const handleError = useCallback<React.ReactEventHandler<HTMLVideoElement>>(
    (event) => {
      const error = event.currentTarget.error;
      console.error(
        `Project clip failed to load, falling back to the still image: ${media?.src ?? 'unknown source'}`,
        error ? `${error.code}: ${error.message}` : '',
      );
      setFailed(true);
    },
    [media?.src],
  );

  return { clip, videoRef, mounted, playing, toggle, handleError };
};

export default useProjectClip;
