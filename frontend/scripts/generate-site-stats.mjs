// Counts the repo's tests and writes src/generated/siteStats.ts, so the number on
// the Portfolio Website page is read from the runners instead of typed by hand.
//
// Both counts come from the runners' own list modes, which expand every
// parameterised test the way a real run does. A source scan would miss them:
// counting `it(` calls in the unit suite gives 317 where the run gives 390.
// Nothing here executes a test or opens a browser.
//
// A count that cannot be derived is written as null and the page leaves it out.
// The script never fails a build over it and never writes a guess.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));

// Everything a test count can depend on. Build output and the generated file itself
// are left out, so writing the result does not invalidate it.
const TREES = ['src', 'e2e', 'scripts'];
const ROOT_FILES = [
  'package.json',
  'vitest.config.ts',
  'vitest.list.config.ts',
  'playwright.config.ts',
  'playwright.analytics.config.ts',
];
const SKIPPED_DIRS = /^(generated|test-results.*|playwright-report.*|node_modules)$/;

/** `vitest list --json` prints an array with one entry per test. */
export function countVitestTests(output) {
  const list = JSON.parse(output);
  if (!Array.isArray(list)) throw new Error('vitest list did not print a list of tests');
  return list.length;
}

/** `playwright test --list --reporter=json` nests suites. A spec holds one test per project. */
export function countPlaywrightTests(output) {
  const report = JSON.parse(output);
  if (!report || !Array.isArray(report.suites)) {
    throw new Error('playwright list did not print a suites array');
  }
  const walk = (suite) =>
    (suite.specs ?? []).reduce((sum, spec) => sum + (spec.tests?.length ?? 0), 0) +
    (suite.suites ?? []).reduce((sum, child) => sum + walk(child), 0);
  return report.suites.reduce((sum, suite) => sum + walk(suite), 0);
}

export function renderSiteStats({ unitTests, browserTests }, fingerprint) {
  return [
    '// Written by scripts/generate-site-stats.mjs before every dev, build and test run.',
    '// Do not edit. It is gitignored.',
    'export default {',
    `  unitTests: ${unitTests},`,
    `  browserTests: ${browserTests},`,
    `  fingerprint: ${JSON.stringify(fingerprint)},`,
    '};',
    '',
  ].join('\n');
}

async function filesUnder(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nested = await Promise.all(
    entries
      .filter((entry) => !(entry.isDirectory() && SKIPPED_DIRS.test(entry.name)))
      .map((entry) =>
        entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
      ),
  );
  return nested.flat().sort();
}

/** A hash of every file a test count can depend on. */
export async function fingerprintTree(root) {
  const files = [
    ...ROOT_FILES.map((name) => join(root, name)),
    ...(await Promise.all(TREES.map((tree) => filesUnder(join(root, tree))))).flat(),
  ];
  const hash = createHash('sha256');
  for (const file of files) {
    let body;
    try {
      body = await readFile(file);
    } catch {
      continue; // an optional root file that this checkout does not have
    }
    hash.update(`${relative(root, file)}\0`);
    hash.update(body);
  }
  return hash.digest('hex').slice(0, 16);
}

async function recordedFingerprint(out) {
  try {
    return /fingerprint: "([0-9a-f]+)"/.exec(await readFile(out, 'utf8'))?.[1] ?? null;
  } catch {
    return null;
  }
}

const fileExists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

/** Runs one runner's list mode and returns what it printed. */
export function defaultRun(root) {
  const timeout = 180_000;
  const options = { cwd: root, timeout, maxBuffer: 64 * 1024 * 1024 };
  const commands = {
    unit: [
      'node_modules/vitest/vitest.mjs',
      ['list', '--json', '--no-staticParse', '-c', 'vitest.list.config.ts'],
    ],
    e2e: ['node_modules/@playwright/test/cli.js', ['test', '--list', '--reporter=json']],
    analytics: [
      'node_modules/@playwright/test/cli.js',
      ['test', '--list', '--reporter=json', '-c', 'playwright.analytics.config.ts'],
    ],
  };
  return async (kind) => {
    const [script, args] = commands[kind];
    if (!(await fileExists(join(root, script)))) throw new Error(`${script} is not installed`);
    const { stdout } = await run(process.execPath, [script, ...args], options);
    return stdout;
  };
}

const describeError = (error) =>
  error instanceof Error ? error.message.split('\n')[0] : String(error);

/**
 * @param {object} options
 * @param {string} [options.root] the frontend directory
 * @param {string} [options.out] where to write the module
 * @param {(kind: 'unit' | 'e2e' | 'analytics') => Promise<string>} [options.run]
 * @param {(message: string) => void} [options.log]
 */
export async function generateSiteStats({
  root = resolve(here, '..'),
  out = join(root, 'src', 'generated', 'siteStats.ts'),
  run: runner = defaultRun(root),
  log = console.warn,
} = {}) {
  const fingerprint = await fingerprintTree(root);
  if ((await recordedFingerprint(out)) === fingerprint) return { status: 'unchanged' };

  const attempt = async (kinds, count) => {
    try {
      const counts = await Promise.all(kinds.map(async (kind) => count(await runner(kind))));
      return counts.reduce((sum, n) => sum + n, 0);
    } catch (error) {
      log(`site stats: could not count ${kinds.join(' and ')} tests (${describeError(error)})`);
      return null;
    }
  };
  // Browser tests are two Playwright configs. One alone would be a wrong total, so both or null.
  const [unitTests, browserTests] = await Promise.all([
    attempt(['unit'], countVitestTests),
    attempt(['e2e', 'analytics'], countPlaywrightTests),
  ]);

  // An incomplete result gets an empty fingerprint so the next run tries again.
  const complete = unitTests !== null && browserTests !== null;
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, renderSiteStats({ unitTests, browserTests }, complete ? fingerprint : ''));
  return { unitTests, browserTests, status: 'written' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateSiteStats().then(
    (result) =>
      console.log(
        result.status === 'unchanged'
          ? 'site stats: unchanged'
          : `site stats: ${result.unitTests ?? 'unknown'} unit, ${result.browserTests ?? 'unknown'} browser`,
      ),
    (error) => {
      // A failed count costs one fact on one page. It never stops a build.
      console.warn(`site stats: skipped (${describeError(error)})`);
    },
  );
}
