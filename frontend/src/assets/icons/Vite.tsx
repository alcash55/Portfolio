import { useId } from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

// Vite's mark is a two-tone lightning bolt -- cyan fading to violet, the
// same diagonal gradient used across vite.dev and the project's own social
// card. Both stops are mid-tone and saturated (not near-white or
// near-black), so the gradient reads on light's near-white background and
// on all five dark ones without per-theme adjustment. Gradient id is scoped
// with useId so multiple instances of this icon on one page (e.g. reused
// outside Skills) don't collide over a shared <linearGradient> id.
const Vite = (props: SvgIconProps) => {
  const gradientId = `vite-gradient-${useId()}`;
  const svg = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Vite Logo</title>
      <defs>
        <linearGradient id={gradientId} x1="6" y1="1" x2="18" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#41D1FF" />
          <stop offset="1" stopColor="#BD34FE" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M13.056 23.238a.57.57 0 0 1-1.02-.355v-5.202c0-.63-.512-1.143-1.144-1.143H5.148a.57.57 0 0 1-.464-.903l3.777-5.29c.54-.753 0-1.804-.93-1.804H.57a.574.574 0 0 1-.543-.746.6.6 0 0 1 .08-.157L5.008.78a.57.57 0 0 1 .467-.24h14.589a.57.57 0 0 1 .466.903l-3.778 5.29c-.54.755 0 1.806.93 1.806h5.745c.238 0 .424.138.513.322a.56.56 0 0 1-.063.603z"
      />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default Vite;
