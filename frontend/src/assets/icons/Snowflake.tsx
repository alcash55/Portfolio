import { SvgIcon, SvgIconProps } from '@mui/material';

// Snowflake's brand blue (#29B5E8) -- mid-tone and saturated, so it reads on
// light's near-white background and on all five dark backgrounds without a
// per-theme swap, same reasoning as the other database marks.
//
// The mark is three bars crossed at 60 degrees with a small centre hub, which
// is what the real logo reduces to at chip size; the fine arrow tips on the
// full logo turn to mud below about 24px, so they are deliberately dropped.
const Snowflake = (props: SvgIconProps) => {
  const svg = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Snowflake Logo</title>
      <g stroke="#29B5E8" strokeWidth="2.6" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
        <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
      </g>
      <circle cx="12" cy="12" r="3.1" fill="#29B5E8" />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default Snowflake;
