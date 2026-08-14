import { alpha, type Theme } from '@mui/material/styles';

/**
 * The page's one hover glow, shared by every card and chip that lifts on
 * hover (Skills chips, Experience cards, Project cards).
 *
 * It was duplicated in each of those files with a "keep them in sync" comment,
 * which held for exactly as long as nobody added a fourth surface -- so the
 * geometry lives here instead. `0 25px 20px -20px` is a wide, low, blurred
 * pool under the element rather than a ring around it, and the color is
 * derived from `primary.main` (never hardcoded) so it follows the active
 * theme: the original fixed `rgb(18, 72, 116)` stayed navy under the
 * red/purple/green themes and fought the light theme's bright background.
 * Alpha 0.55 stands in for that fixed color's implied darkness -- glow, not
 * neon.
 */
export const hoverGlow = (theme: Theme) =>
  `0px 25px 20px -20px ${alpha(theme.palette.primary.main, 0.55)}`;

export default hoverGlow;
