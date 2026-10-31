const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
} as const;

export function ExternalIcon() {
  return (
    <svg {...stroke} width={18} height={18}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg {...stroke} width={18} height={18}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ForwardIcon() {
  return (
    <svg {...stroke} width={28} height={28}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
