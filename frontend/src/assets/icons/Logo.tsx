import { SvgIcon, SvgIconProps } from '@mui/material';

/**
 * The "AC" monogram: an A enclosed by a broken ring that reads as a C.
 *
 * Drawn with strokes and `currentColor` so it inherits the surrounding text
 * colour and works on any theme. The previous `Logo.svg` hardcoded a black
 * fill against a white `color` attribute, so it could only ever sit on one
 * background -- and it was never wired up anywhere.
 *
 * Strokes scale with the viewBox rather than being pinned, so the mark keeps
 * its proportions from 24px in the nav up to 512px as a PWA icon. Verified
 * legible at 24/48/96px on both dark and light backgrounds.
 */
export const Logo = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 48 48" {...props}>
    {/* The C: a ring broken on the right, so the A reads inside it rather than
        behind it. The gap is what stops the two glyphs merging at small sizes. */}
    <path
      d="M35.6 10.2 A18 18 0 1 0 35.6 37.8"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
    />
    {/* The A, sized to leave clearance inside the ring: apex, legs, crossbar.
        The crossbar sits low so the counter stays open when the mark is small. */}
    <path
      d="M17.4 32.6 L24 15 L30.6 32.6"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20.2 27.8 H27.8"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinecap="round"
    />
  </SvgIcon>
);

export default Logo;
