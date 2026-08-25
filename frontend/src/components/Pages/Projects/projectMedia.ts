import littleTown from '../../../assets/images/littleTown.webp';
import portfolio from '../../../assets/images/portfolio.webp';
import vsCodeTheme from '../../../assets/images/vsCodeTheme.webp';
import littleTownClip from '../../../assets/videos/littleTown.mp4';
import portfolioClip from '../../../assets/videos/portfolio.mp4';
import vsCodeThemeClip from '../../../assets/videos/vsCodeTheme.mp4';

/**
 * The demo-clip manifest: which projects have a short screen recording, and
 * everything the player needs to show it without changing the card's height.
 *
 * Three projects have a clip; the other two deliberately do not. The Cliper-er
 * keeps its channel logo (its output lives on YouTube), and AC Composite
 * Actions is deferred -- capturing a workflow run needs a login. Both fall
 * through the missing-entry path and render exactly as they did before: the
 * still `.webp` screenshot, same box, same height, no video element in the DOM
 * and no request made.
 *
 * Every clip is encoded at exactly 1000x500 -- the card's `2 / 1` box -- so
 * `objectFit: 'contain'` has nothing to letterbox and card heights are
 * unchanged.
 *
 * Adding an entry is: import the `.mp4` and the existing screenshot, then key
 * the object by the project's `StaticProject.name` (the same key
 * `projectDetails.ts` uses -- names are unique and always present, where a
 * project may have no repo).
 */
export interface ProjectMedia {
  /** imported .mp4 module URL */
  src: string;
  /** the existing .webp screenshot, used as the poster frame */
  poster: string;
  /** intrinsic pixel size, so the player can letterbox into the 2:1 box */
  width: number;
  height: number;
  /** short, factual, for the aria-label / caption */
  caption: string;
}

/** Keyed by `StaticProject.name`. A project absent from this map has no clip
 *  and renders exactly as it does today. */
export const projectMedia: Partial<Record<string, ProjectMedia>> = {
  'Game Competition Website': {
    src: littleTownClip,
    poster: littleTown,
    width: 1000,
    height: 500,
    caption:
      "Little Town home page and its public bingo board, viewed as a guest, showing the board's tile grid.",
  },
  'Portfolio Website': {
    src: portfolioClip,
    poster: portfolio,
    width: 1000,
    height: 500,
    // Recorded against the Settings drawer, which is where theme switching
    // lived when this was captured. The hero now carries its own floating
    // theme and layout controls, so this clip shows a route to the same
    // settings that is no longer the primary one -- worth re-recording
    // against the hero controls next time the site is captured.
    caption:
      "This site's Settings drawer cycling all six themes, then switching from top nav to a side nav layout.",
  },
  'VS Code Royalty Theme': {
    src: vsCodeThemeClip,
    poster: vsCodeTheme,
    width: 1000,
    height: 500,
    caption:
      "The Royalty Theme's Visual Studio Marketplace listing page, scrolling from the install command through the theme's overview and metadata.",
  },
};

export default projectMedia;
