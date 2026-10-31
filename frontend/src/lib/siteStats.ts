import type { Fact } from '~/content/projects';

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

function phrase(n: number, noun: string): string {
  return `${count.format(n)} ${noun}${n === 1 ? '' : 's'}`;
}

/**
 * The "tests gate every deploy" fact. Names only the counts that are known, and returns
 * nothing when none is, so the page never states a number the build could not read.
 */
export function testCountFact(stats: SiteStats): Fact | undefined {
  const unit = stats.unitTests ? phrase(stats.unitTests, 'unit test') : null;
  const browser = stats.browserTests ? phrase(stats.browserTests, 'browser test') : null;
  if (unit && browser) {
    return {
      lead: `${count.format(stats.unitTests ?? 0)} and ${count.format(stats.browserTests ?? 0)} tests`,
      body: `${unit} and ${browser} gate every deploy.`,
    };
  }
  const only = unit ?? browser;
  if (!only) return undefined;
  return { lead: only, body: `${only} ${only.startsWith('1 ') ? 'gates' : 'gate'} every deploy.` };
}
