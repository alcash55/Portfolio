import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * The hero width at which the controls stop floating and become a band.
 *
 * It is the *hero's* width, not the window's. In the sideNav layout the sidebar
 * takes 248px off the left (72px collapsed, and the visitor can toggle that at
 * any moment), so a 1280px window leaves a ~960px hero -- and a hero that
 * narrow has no side gutters whatever the window says.
 */
export const GUTTER_MIN_HERO_PX = 1024;

/**
 * Which arrangement the hero's controls are in.
 *
 * - `gutter`: eight controls floating in the side bands a >= 1024px hero leaves
 *   around its centred content column. This is the desktop hero, unchanged.
 * - `band`: the controls are an in-flow strip between the social links and the
 *   bento photographs. Below 1024px there is no floating field left to be in --
 *   see `HeroControls.tsx`'s BAND_PLACEMENTS_PHONE for the measurements behind
 *   that.
 */
export type HeroControlRegime = 'gutter' | 'band';

/**
 * Watches the hero and reports which arrangement its controls are in.
 *
 * `Landing.tsx` owns the decision because two different things depend on it in
 * two different places: which of the two control components renders, and
 * whether the margins that used to make the gap between the social links and
 * the photographs are open or closed. Two components reading the same query
 * separately could disagree for a frame and either double the controls or lose
 * them entirely.
 *
 * `useMediaQuery` supplies the value for the first paint, and for jsdom, which
 * has no ResizeObserver: the observer cannot report before it is attached, and
 * starting from `null` would put every control in the wrong place for a frame.
 * It is only ever a first guess -- in the sideNav layout the window is a poor
 * proxy for the hero, which is exactly why the observer exists.
 *
 * Its own module rather than a second export from `HeroControls.tsx` because a
 * component file that also exports a hook loses fast refresh
 * (`react-refresh/only-export-components`).
 */
export const useHeroControlRegime = (
  heroRef: RefObject<HTMLElement | null>,
): HeroControlRegime => {
  const theme = useTheme();
  const viewportHasGutters = useMediaQuery(theme.breakpoints.up(GUTTER_MIN_HERO_PX));
  const [heroWidth, setHeroWidth] = useState<number | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setHeroWidth(entry.contentRect.width));
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  const hasGutters = heroWidth === null ? viewportHasGutters : heroWidth >= GUTTER_MIN_HERO_PX;
  const regime: HeroControlRegime = hasGutters ? 'gutter' : 'band';

  useKeepControlFocusAcrossRegimeChange(regime);

  return regime;
};

/**
 * Puts focus back on the control a visitor was on when the regime changes under
 * them.
 *
 * The two arrangements are two different components in two different places in
 * the DOM, so crossing between them unmounts every control and mounts eight new
 * ones. Focus goes to `<body>` when that happens, and there is one way to make
 * it happen *from the keyboard*: press Enter on "Side nav layout" in a window
 * between 1024 and ~1366px wide. The sidebar appears, takes 248px off the hero,
 * and the hero drops under 1024px -- so the very button that was just used
 * stops existing, and a keyboard visitor is dumped back at the top of the
 * document by their own click. (Found by the e2e suite, which had been
 * asserting focus survives a layout switch since the sprint that added these.)
 *
 * The replacement control has the same accessible name, because it is the same
 * control in a different place, so the name is the handle used to find it
 * again. Nothing is restored unless focus really was lost from a hero control:
 * a resize that nobody was tabbing through must not steal focus from wherever
 * it actually is.
 */
const CONTROL_SELECTOR = '#landing [aria-pressed]';

const useKeepControlFocusAcrossRegimeChange = (regime: HeroControlRegime) => {
  const lastFocused = useRef<string | null>(null);
  const previousRegime = useRef(regime);

  useEffect(() => {
    const remember = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      lastFocused.current =
        target?.closest(CONTROL_SELECTOR)?.getAttribute('aria-label') ?? null;
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);

  // Layout effect, not an effect: the swap and the restore land in the same
  // frame, so no paint ever shows the focus ring missing.
  useLayoutEffect(() => {
    const changed = previousRegime.current !== regime;
    previousRegime.current = regime;
    if (!changed) return;

    const label = lastFocused.current;
    if (!label) return;
    // Only if the swap is what lost it. `document.body` is where focus lands
    // when the element holding it is removed.
    if (document.activeElement && document.activeElement !== document.body) return;

    const replacement = document.querySelector(
      `${CONTROL_SELECTOR}[aria-label="${CSS.escape(label)}"]`,
    );
    if (replacement instanceof HTMLElement) replacement.focus();
  }, [regime]);
};
