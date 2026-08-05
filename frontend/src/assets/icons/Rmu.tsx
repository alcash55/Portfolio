import { SvgIcon, SvgIconProps } from '@mui/material';
import rmuLogo from '../images/rmuLogo.webp';

const Rmu = (props: SvgIconProps) => {
  const svg = (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <title>Robert Morris University Logo</title>
      <g clipPath="url(#clip0_1053_588)">
        <rect width="48" height="48" rx="24" fill="white" />
        <g filter="url(#filter0_d_1053_588)">
          <rect
            width="48"
            height="49.0213"
            fill="url(#pattern0_1053_588)"
            shapeRendering="crispEdges"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_d_1053_588"
          x="-4"
          y="0"
          width="56"
          height="57.0215"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1053_588" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_1053_588"
            result="shape"
          />
        </filter>
        <pattern
          id="pattern0_1053_588"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_1053_588"
            transform="matrix(0.000833333 0 0 0.000815972 0 0.26704)"
          />
        </pattern>
        <clipPath id="clip0_1053_588">
          <rect width="48" height="48" rx="24" fill="white" />
        </clipPath>
        <image id="image0_1053_588" width="1200" height="571" xlinkHref={rmuLogo} />
      </defs>
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default Rmu;
