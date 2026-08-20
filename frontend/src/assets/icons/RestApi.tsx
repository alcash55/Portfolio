import { SvgIcon, SvgIconProps } from '@mui/material';

/**
 * `{ HTTP }` -- a mark for the REST API skill.
 *
 * REST is an architectural style with no vendor and therefore no logo, so
 * this is assembled rather than borrowed: Material's `Http` glyph (which
 * draws the four letters as vectors, so no font has to load for the mark to
 * read) set inside the two braces from its `DataObject` glyph.
 *
 * Deliberately a wide viewBox (59.8x24, ~2.5:1) rather than a square one. The
 * chip renders icons at 16px *tall*, and squeezing four letters plus two
 * braces into a 16px square leaves the lettering about 2px high -- unreadable.
 * Letting the mark run wide, the way the Go/Node/Express wordmarks do, is what
 * buys the lettering its height: at this ratio the letters are half the mark's
 * height (12 of 24 units, ~8px on a 16px chip). `TechIcon` sizes on height
 * with `width: auto`, so a wide viewBox needs nothing special from the caller.
 *
 * `fill="currentColor"` is set explicitly rather than left to inherit from
 * `SvgIcon`. MUI clones a single `<svg>` child onto its own root, and the
 * merged element came out with fill at its initial value (black) -- the mark
 * was invisible on the dark themes. Stating it here makes the glyph follow
 * the chip's text color in all six themes regardless of that merge.
 */

// Material's `Http`: the letters H-T-T-P, bbox x 1-23, y 9-15.
const LETTERS =
  'M4.5 11h-2V9H1v6h1.5v-2.5h2V15H6V9H4.5zm2.5-.5h1.5V15H10v-4.5h1.5V9H7zm5.5 0H14V15h1.5v-4.5H17V9h-4.5zm9-1.5H18v6h1.5v-2h2c.8 0 1.5-.7 1.5-1.5v-1c0-.8-.7-1.5-1.5-1.5m0 2.5h-2v-1h2z';

// The two halves of Material's `DataObject`, split into separate paths so each
// brace can be placed independently. Both have bbox height 16 (y 4-20); the
// left spans x 2-10, the right x 14-22.
const BRACE_LEFT =
  'M4 7v2c0 .55-.45 1-1 1H2v4h1c.55 0 1 .45 1 1v2c0 1.65 1.35 3 3 3h3v-2H7c-.55 0-1-.45-1-1v-2c0-1.3-.84-2.42-2-2.83v-.34C5.16 11.42 6 10.3 6 9V7c0-.55.45-1 1-1h3V4H7C5.35 4 4 5.35 4 7';
const BRACE_RIGHT =
  'M21 10c-.55 0-1-.45-1-1V7c0-1.65-1.35-3-3-3h-3v2h3c.55 0 1 .45 1 1v2c0 1.3.84 2.42 2 2.83v.34c-1.16.41-2 1.52-2 2.83v2c0 .55-.45 1-1 1h-3v2h3c1.65 0 3-1.35 3-3v-2c0-.55.45-1 1-1h1v-4z';

const RestApi = (props: SvgIconProps) => {
  const svg = (
    <svg viewBox="0 0 59.8 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <title>REST API</title>
      {/* Braces: narrowed to 0.8 and stretched to 1.1, spanning y 3.2-20.8.
          They read as punctuation around the word rather than as two more
          letters, and still stand taller than the caps -- which is how braces
          sit around text in a monospace face. */}
      <path d={BRACE_LEFT} transform="translate(-1.6, -1.2) scale(0.8, 1.1)" />
      {/* Letters at 2x, spanning y 6-18: centred on the mark's midline and as
          tall as they can go while the braces still enclose them. */}
      <path d={LETTERS} transform="translate(5.9, -12) scale(2)" />
      <path d={BRACE_RIGHT} transform="translate(42.2, -1.2) scale(0.8, 1.1)" />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default RestApi;
