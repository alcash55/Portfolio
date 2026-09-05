// GENERATED FILE -- do not edit by hand.
//
// Written by `frontend/scripts/generate-site-stats.mjs`, which runs from the
// `build` script before `tsc`. Committed to git on purpose: it is imported by
// application source, so a fresh clone has to typecheck and run without anyone
// having built first.
//
// Edit the generator, not this file. Anything typed here is overwritten on the
// next build.

/** Test counts as reported by the runners themselves, not by hand. */
export interface SiteStats {
  /** Tests collected by `vitest list` -- `it.each` tables counted per case. */
  unitTests: number;
  /** Playwright specs collected by `playwright test --list`. */
  browserTests: number;
}

export const siteStats: SiteStats = {
  unitTests: 170,
  browserTests: 194,
};

export default siteStats;
