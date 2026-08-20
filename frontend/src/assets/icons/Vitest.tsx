import { SvgIcon, SvgIconProps } from '@mui/material';

// Vitest's brand green (#6E9F18). 3.59:1 on dark, 2.35:1 on light.
const Vitest = (props: SvgIconProps) => {
  const svg = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Vitest Logo</title>
      <path
        fill="#6E9F18"
        d="M11.545 23.3a.613.613 0 0 1-.895.197L.252 15.936A.61.61 0 0 1 0 15.439V6.325c0-.502.569-.792.975-.497l6.358 4.624c.594.433 1.432.25 1.793-.39L14.393.7a.62.62 0 0 1 .535-.314h8.455a.613.613 0 0 1 .537.916z"
      />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default Vitest;
