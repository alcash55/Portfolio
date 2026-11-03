// Lists the actions in alcash55/ac-composite-actions and writes src/generated/ciActions.ts,
// so the AC Composite Actions figure and the counts in its copy follow the repo instead
// of a number typed by hand. Add an action folder there and the next build shows it.
//
// An action is any folder holding an action.yml. The GitHub tree API lists them in one
// call. Nothing here fails a build: with no network the last good file stays, and with
// none the module is empty and the site uses the list in src/content/checks.ts.
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = 'alcash55/ac-composite-actions';
const BRANCH = 'main';
const SKIPPED = /^(node_modules|\.github|\.playwright-cli|test|tests|fixtures)$/;
// A build and a test run both call this. Ten minutes keeps a watch loop off the API.
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

/** Folders that hold an action.yml, as they are named in a `uses:` line. */
export function actionPaths(tree) {
  if (!tree || !Array.isArray(tree.tree)) throw new Error('GitHub did not return a tree');
  return tree.tree
    .map((entry) => /^(?:(.+)\/)?action\.ya?ml$/.exec(entry.path ?? ''))
    .filter((match) => match?.[1] && !match[1].split('/').some((part) => SKIPPED.test(part)))
    .map((match) => match[1])
    .sort();
}

/** The first sentence of a YAML description, with folded lines joined. */
export function firstSentence(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  const end = flat.search(/[.!?](\s|$)/);
  return end === -1 ? flat : flat.slice(0, end + 1);
}

function descriptionOf(yaml) {
  const lines = yaml.split('\n');
  const at = lines.findIndex((line) => /^description:/.test(line));
  if (at === -1) return '';
  const first = lines[at].replace(/^description:\s*/, '');
  if (!/^[|>][+-]?$/.test(first.trim())) return first.trim().replace(/^['"]|['"]$/g, '');
  const block = [];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() !== '' && !/^\s/.test(line)) break;
    block.push(line.trim());
  }
  return block.join(' ').trim();
}

export function renderCiActions(actions, treeSha) {
  return [
    '// Written by scripts/generate-ci-actions.mjs before every dev, build and test run.',
    '// Do not edit. It is gitignored.',
    'export default {',
    `  actions: ${JSON.stringify(actions, null, 2).replace(/\n/g, '\n  ')},`,
    `  treeSha: ${JSON.stringify(treeSha)},`,
    '};',
    '',
  ].join('\n');
}

const EMPTY = [
  '// Written by scripts/generate-ci-actions.mjs. GitHub could not be read, so the site',
  '// uses the fallback list in src/content/checks.ts. Do not edit. It is gitignored.',
  'export default null;',
  '',
].join('\n');

function headers() {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'portfolio-build',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const ageOf = (path) =>
  stat(path).then(
    (s) => Date.now() - s.mtimeMs,
    () => null,
  );

/**
 * @param {object} options
 * @param {string} [options.out] where to write the module
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(message: string) => void} [options.log]
 * @param {number} [options.maxAgeMs] a file younger than this is left alone
 */
export async function generateCiActions({
  out = join(resolve(here, '..'), 'src', 'generated', 'ciActions.ts'),
  fetchImpl = fetch,
  log = console.warn,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
} = {}) {
  const age = await ageOf(out);
  const existing = await readFile(out, 'utf8').catch(() => null);
  if (
    maxAgeMs > 0 &&
    age !== null &&
    age < maxAgeMs &&
    existing &&
    !existing.includes('export default null')
  ) {
    return { status: 'fresh' };
  }

  try {
    const api = `https://api.github.com/repos/${REPO}`;
    const treeResponse = await fetchImpl(`${api}/git/trees/${BRANCH}?recursive=1`, {
      headers: headers(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!treeResponse.ok) throw new Error(`GitHub answered ${treeResponse.status}`);
    const tree = await treeResponse.json();
    const names = actionPaths(tree);
    if (names.length === 0) throw new Error('the repo lists no actions');

    const actions = await Promise.all(
      names.map(async (name) => {
        const raw = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${name}/action.yml`;
        const response = await fetchImpl(raw, { signal: AbortSignal.timeout(15_000) });
        const yaml = response.ok ? await response.text() : '';
        return { name, description: firstSentence(descriptionOf(yaml)) };
      }),
    );

    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, renderCiActions(actions, tree.sha ?? ''));
    return { status: 'written', count: actions.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
    log(`ci actions: could not read ${REPO} (${reason})`);
    if (existing) return { status: 'kept' };
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, EMPTY);
    return { status: 'empty' };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateCiActions();
}
