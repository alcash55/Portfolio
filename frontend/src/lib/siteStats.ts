import type { Stat } from '~/content/projects';

/** Test counts the build read from the repo. A null count could not be derived. */
export interface SiteStats {
  readonly unitTests: number | null;
  readonly browserTests: number | null;
}

const UNKNOWN: SiteStats = { unitTests: null, browserTests: null };

function asCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Turns the generated module's default export into typed counts. Anything odd becomes null. */
export function parseSiteStats(input: unknown): SiteStats {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return UNKNOWN;
  const record = input as Record<string, unknown>;
  return { unitTests: asCount(record.unitTests), browserTests: asCount(record.browserTests) };
}

// scripts/generate-site-stats.mjs writes this file before dev, build and test. A glob
// returns an empty object when it is missing, where a plain import would fail the build,
// and CI type-checks before it generates anything.
//
// Vite rewrites the glob call. Playwright loads some specs under plain Node, where
// import.meta.glob does not exist and the call throws. Those specs read diagram data,
// not the stats, so an empty result is right for them.
function readGenerated(): unknown {
  try {
    const found = import.meta.glob('../generated/siteStats.ts', {
      eager: true,
      import: 'default',
    });
    return Object.values(found)[0];
  } catch {
    return undefined;
  }
}

export const siteStats: SiteStats = parseSiteStats(readGenerated());

const count = new Intl.NumberFormat('en-US');

/**
 * The "tests gate every deploy" stat. Names only the counts that are known, and returns
 * nothing when none is, so the page never states a number the build could not read.
 */
export function testCountStat({ unitTests, browserTests }: SiteStats): Stat | undefined {
  // A count of zero is treated as unknown, since "0 tests gate every deploy" would be false.
  const unit = unitTests || null;
  const browser = browserTests || null;
  if (unit && browser) {
    return {
      figure: count.format(unit + browser),
      label: `tests gate every deploy: ${count.format(unit)} unit and ${count.format(browser)} browser.`,
    };
  }
  const only = unit ?? browser;
  if (!only) return undefined;
  const kind = unit ? 'unit' : 'browser';
  return {
    figure: count.format(only),
    label: `${kind} ${only === 1 ? 'test gates' : 'tests gate'} every deploy.`,
  };
}
