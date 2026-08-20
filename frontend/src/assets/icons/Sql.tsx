import { SvgIcon, SvgIconProps } from '@mui/material';

/**
 * SQL has no vendor and therefore no brand mark -- the universal shorthand is
 * the stacked-cylinder database glyph, drawn here rather than borrowed from a
 * specific engine (PostgreSQL's elephant and Snowflake's flake are already in
 * use for those products and would misattribute the skill).
 *
 * `fill="currentColor"` so the glyph follows the chip's text color across
 * light and the five dark themes -- the right treatment for a mark with no
 * brand colour to keep. It has to be stated, not inherited: MUI merges a
 * single nested `<svg>` child onto its own root and the merged element ends up
 * with fill at its initial value, i.e. black. That is what left this glyph,
 * the GitHub mark and the Express wordmark black-on-black until 2026-08-19.
 */
const Sql = (props: SvgIconProps) => {
  const svg = (
    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>SQL Logo</title>
      <path d="M12 2c4.418 0 8 1.343 8 3s-3.582 3-8 3-8-1.343-8-3 3.582-3 8-3z" />
      <path d="M20 8.75v3.25c0 1.657-3.582 3-8 3s-8-1.343-8-3V8.75c1.548 1.33 4.62 2.05 8 2.05s6.452-.72 8-2.05z" />
      <path d="M20 14.75V18c0 1.657-3.582 3-8 3s-8-1.343-8-3v-3.25c1.548 1.33 4.62 2.05 8 2.05s6.452-.72 8-2.05z" />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default Sql;
