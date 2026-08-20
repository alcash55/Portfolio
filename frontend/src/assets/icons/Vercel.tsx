import { SvgIcon, SvgIconProps } from '@mui/material';

// `fill="currentColor"` so the triangle flips with the theme (stated rather
// than inherited -- MUI's nested-svg merge drops inherited fill to black). Vercel's mark is pure black, which measures 1.85:1 against the dark
// themes' chip background -- all but invisible. Inverting is Vercel's own
// guidance for dark surfaces, so this follows the brand rather than bending it.
const Vercel = (props: SvgIconProps) => {
  const svg = (
    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Vercel Logo</title>
      <path d="m12 1.608 12 20.784H0Z" />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default Vercel;
