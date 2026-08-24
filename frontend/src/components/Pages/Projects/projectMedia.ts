/**
 * The demo-clip manifest: which projects have a short screen recording, and
 * everything the player needs to show it without changing the card's height.
 *
 * The record is **empty on purpose**. The clips are recorded and encoded
 * separately from this component work, and the entries get filled in when
 * those assets land. Until then every project falls through the missing-entry
 * path and renders exactly as it did before -- the still `.webp` screenshot,
 * same box, same height, no video element in the DOM and no request made.
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
export const projectMedia: Partial<Record<string, ProjectMedia>> = {};

export default projectMedia;
