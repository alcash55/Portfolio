// Writes src/generated/siteStats.ts with the *real* number of unit tests and
// browser tests in this repo, counted at build time.
//
// Why this exists: the Portfolio card's dialog copy quotes those counts as
// evidence ("102 unit tests, 9 browser tests gate every deploy"). A
// hand-typed number is wrong the moment somebody writes a test, and nothing
// would ever fail to tell us -- so the number that ships is the one the test
// runners themselves report.
//
// Deliberately *not* the same shape as generate-sitemap.mjs, which writes
// straight into `dist/`. This output is imported by application source, so it
// has to exist before `tsc` and `vite build` run, and it is committed to git:
// a fresh clone must typecheck and `bun run dev` must work without anyone
// having run this script first. Treat the committed file as a cache of the
// last build's answer, not as hand-editable source.
//
// Counting method, and why each half is a subprocess rather than a regex over
// the test files:
//
//   - Unit tests: `vitest list` collects (but does not run) every spec and
//     prints one line per test. That is the only count that survives
//     `it.each([...])` -- this repo has five of those, and a regex over `it(`
//     reports 75 where the runner reports 102. Slow (~30-70s on this /mnt/c
//     mount, a few seconds on a CI runner) because collection has to transform
//     every test file.
//   - Browser tests: `playwright test --list --reporter=json`. Fast, and it
//     does NOT start the `webServer` from playwright.config.ts, so this cannot
//     recurse into `bun run build`.
//
// Lighthouse scores are NOT here on purpose: they need a real audit run
// against a deployed page, so they stay a hand-maintained constant with a
// "last measured" date next to the copy that quotes them -- see
// LIGHTHOUSE_SCORES in src/components/Pages/Projects/projectDetails.ts.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendDir = fileURLToPath(new URL('..', import.meta.url));
const OUT_PATH = path.join(frontendDir, 'src', 'generated', 'siteStats.ts');

// Local escape hatch. Collecting the unit tests costs ~70s on this /mnt/c
// mount, and `bun run test:e2e` rebuilds the site on every run -- which turns a
// two-minute browser loop into a four-minute one for a number that has not
// changed. CI never sets this, so the deployed build is always freshly counted.
if (process.env.SKIP_SITE_STATS === '1' && existsSync(OUT_PATH)) {
  console.log('[generate-site-stats] SKIP_SITE_STATS=1, keeping the committed counts');
  process.exit(0);
}

/**
 * Runs a command and returns its stdout, or `null` if it fails for any reason.
 * Every failure here is non-fatal by design: a missing dev dependency or a
 * broken collection must not take the production build down over a number in
 * a paragraph. The previous committed count is kept instead, and the warning
 * says so.
 */
const tryRun = (command, args) => {
  try {
    return execFileSync(command, args, {
      cwd: frontendDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    console.warn(`[generate-site-stats] \`${command} ${args.join(' ')}\` failed: ${error.message}`);
    return null;
  }
};

/**
 * One line per collected test, in `file > suite > name` form. Blank lines and
 * any stray tool chatter that isn't a test path are dropped -- a count that
 * silently absorbs a warning line is worse than no count.
 */
const countUnitTests = () => {
  const stdout = tryRun('bunx', ['vitest', 'list']);
  if (stdout === null) return null;
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^src[/\\].+\.test\.tsx?\s>\s/.test(line));
  return lines.length > 0 ? lines.length : null;
};

/** Recursively counts `specs` across Playwright's nested suite JSON. */
const countSpecs = (suites) =>
  suites.reduce(
    (total, suite) =>
      total + (suite.specs?.length ?? 0) + (suite.suites ? countSpecs(suite.suites) : 0),
    0,
  );

const countBrowserTests = () => {
  const stdout = tryRun('bunx', [
    'playwright',
    'test',
    '--config',
    'e2e/playwright.config.ts',
    '--list',
    '--reporter=json',
  ]);
  if (stdout === null) return null;
  try {
    const report = JSON.parse(stdout);
    const count = countSpecs(report.suites ?? []);
    return count > 0 ? count : null;
  } catch (error) {
    console.warn(
      `[generate-site-stats] could not parse the Playwright list JSON: ${error.message}`,
    );
    return null;
  }
};

/**
 * Pulls a number back out of the committed file so a failed collection keeps
 * the last known-good count instead of writing a zero. Returns `null` when
 * the file does not exist yet (first run) or has been reformatted beyond
 * recognition.
 */
const previousValue = (key) => {
  if (!existsSync(OUT_PATH)) return null;
  const match = new RegExp(`${key}:\\s*(\\d+)`).exec(readFileSync(OUT_PATH, 'utf8'));
  return match ? Number(match[1]) : null;
};

const unitTests = countUnitTests() ?? previousValue('unitTests');
const browserTests = countBrowserTests() ?? previousValue('browserTests');

if (unitTests === null || browserTests === null) {
  // Nothing to fall back on: this is the first run and collection failed.
  // Fail loudly rather than emit a file claiming zero tests.
  console.error(
    '[generate-site-stats] no counts available and no previous file to fall back on. ' +
      'Run `bun install` and try again.',
  );
  process.exit(1);
}

const file = `// GENERATED FILE -- do not edit by hand.
//
// Written by \`frontend/scripts/generate-site-stats.mjs\`, which runs from the
// \`build\` script before \`tsc\`. Committed to git on purpose: it is imported by
// application source, so a fresh clone has to typecheck and run without anyone
// having built first.
//
// Edit the generator, not this file. Anything typed here is overwritten on the
// next build.

/** Test counts as reported by the runners themselves, not by hand. */
export interface SiteStats {
  /** Tests collected by \`vitest list\` -- \`it.each\` tables counted per case. */
  unitTests: number;
  /** Playwright specs collected by \`playwright test --list\`. */
  browserTests: number;
  /** ISO timestamp of the build that produced these numbers. */
  generatedAt: string;
}

export const siteStats: SiteStats = {
  unitTests: ${unitTests},
  browserTests: ${browserTests},
  generatedAt: '${new Date().toISOString()}',
};

export default siteStats;
`;

mkdirSync(path.dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, file);
console.log(
  `[generate-site-stats] wrote ${OUT_PATH}: ${unitTests} unit tests, ${browserTests} browser tests`,
);
