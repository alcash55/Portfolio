// Downloads the latest resume PDF before a build, so /resume serves a file that
// ships with the site. The download is anonymous. This script never reads,
// sends or stores a token.
//
// Flags (environment):
//   RESUME_PDF_URL    Another place to download from, e.g. a public mirror.
//   RESUME_REQUIRED=1 Fail the build when no PDF can be fetched. Set it in the
//                     deploy workflow so a production site never ships without
//                     a resume. Without it a missing PDF only logs a warning,
//                     so a local build or a pull request build still works.
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_RESUME_URL =
  'https://github.com/alcash55/Resume/releases/latest/download/fullstack.pdf';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATHS = {
  pdf: resolve(here, '../public/resume.pdf'),
  info: resolve(here, '../src/generated/resume.json'),
};

const isPdf = (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';

async function writeInfo(path, info) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(info)}\n`);
}

async function previousCopy(path) {
  try {
    const buffer = await readFile(path);
    return isPdf(buffer) ? (await stat(path)).size : null;
  } catch {
    return null;
  }
}

/**
 * @param {object} options
 * @param {typeof fetch} [options.fetch]
 * @param {{ pdf: string, info: string }} [options.paths]
 * @param {string} [options.url]
 * @param {boolean} [options.strict]
 * @param {(line: string) => void} [options.log]
 * @returns {Promise<
 *   | { status: 'fetched', bytes: number }
 *   | { status: 'reused', bytes: number }
 *   | { status: 'unavailable', reason: string }
 * >}
 */
export async function fetchResume({
  fetch: doFetch = fetch,
  paths = DEFAULT_PATHS,
  url = DEFAULT_RESUME_URL,
  strict = false,
  log = console.warn,
} = {}) {
  let reason;
  let isNetworkFailure = false;
  try {
    const response = await doFetch(url, { redirect: 'follow' });
    if (!response.ok) {
      reason = `HTTP ${response.status} from ${url}`;
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (isPdf(buffer)) {
        await mkdir(dirname(paths.pdf), { recursive: true });
        await writeFile(paths.pdf, buffer);
        await writeInfo(paths.info, { available: true, bytes: buffer.length });
        return { status: 'fetched', bytes: buffer.length };
      }
      reason = `the response from ${url} is not a PDF`;
    }
  } catch (error) {
    isNetworkFailure = true;
    reason = error instanceof Error ? error.message : String(error);
  }

  if (strict) throw new Error(`Resume fetch failed: ${reason}`);

  // Offline builds keep the copy from the last good fetch. A bad answer from
  // the server (404, not a PDF) does not, since it means the source changed.
  const bytes = isNetworkFailure ? await previousCopy(paths.pdf) : null;
  if (bytes !== null) {
    log(`Resume fetch failed (${reason}). Keeping the earlier download.`);
    await writeInfo(paths.info, { available: true, bytes });
    return { status: 'reused', bytes };
  }

  log(
    `Resume fetch failed (${reason}). /resume will show an explanation page. ` +
      'Set RESUME_PDF_URL to a public copy, or RESUME_REQUIRED=1 to fail the build instead.',
  );
  await rm(paths.pdf, { force: true });
  await writeInfo(paths.info, { available: false });
  return { status: 'unavailable', reason };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fetchResume({
    url: process.env.RESUME_PDF_URL || DEFAULT_RESUME_URL,
    strict: process.env.RESUME_REQUIRED === '1',
  }).then(
    (result) => console.log(`resume: ${result.status}`),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
