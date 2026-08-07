import { Box } from '@mui/material';
import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';

interface TechIconProps {
  icon: ComponentType<SvgIconProps>;
  size?: number;
  /**
   * Accessible name. Omit when the icon sits next to its own visible text
   * label (e.g. a Skills chip) -- the icon stays `aria-hidden` and the
   * adjacent text carries the name, so it isn't announced twice. Pass one
   * when the icon stands alone (e.g. About's core-stack row) so it isn't
   * silently dropped from the accessibility tree.
   */
  label?: string;
}

/**
 * Fixed-height, auto-width wrapper for the tech icon components in
 * `assets/icons/**`. Several of those wrap a full nested `<svg>` with a
 * literal pixel width/height (Docker: 800x800, Node/Express/Next: wide
 * wordmark logotypes) -- MUI's `SvgIcon` `fontSize` prop only resizes the
 * *outer* svg it renders, so the inner one keeps its own hardcoded
 * dimensions and gets clipped to a ~1em box instead of scaling down.
 *
 * Setting `height: 100%, width: auto` on every descendant `<svg>` (the
 * outer SvgIcon root and the inner nested one alike) overrides those
 * attributes via CSS -- which wins over presentation attributes -- while
 * `preserveAspectRatio`'s default (`xMidYMid meet`) keeps each icon's
 * native aspect ratio intact. Square glyphs (Docker, Typescript) and wide
 * wordmarks (Express, Node, Next) both render legibly at a shared height
 * instead of being cropped. Can't fix this in the icon files themselves --
 * `assets/icons/**` is import-only for this sprint.
 */
export const TechIcon = ({ icon: Icon, size = 18, label }: TechIconProps) => (
  <Box
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: size,
      flexShrink: 0,
      '& svg': { height: '100%', width: 'auto', display: 'block' },
    }}
  >
    <Icon focusable="false" aria-hidden={label ? undefined : true} />
  </Box>
);

export default TechIcon;
