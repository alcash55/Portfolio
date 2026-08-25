// Writes dist/sitemap.xml with a fresh <lastmod> on every build so it never
// goes stale.
//
// Invoked from `bun run build` (see package.json) *after* `vite build`, so
// it writes straight into the build output rather than a tracked source
// file - sitemap.xml is a build artifact (its only meaningful content is
// the build time), not something that belongs in git.
//
// The site is a single page, but it is not a single URL any more: every
// project card opens a dialog addressable by `#projects/<slug>` (see
// projectSlug.ts), and a shared link should point straight at one. So this
// emits the root plus one entry per project.
//
// Those entries are fragment URLs (`.../Portfolio/#projects/<slug>`), and
// fragments are not something a crawler treats as a distinct page: Google
// canonicalises a URL by dropping everything after `#`, so every entry here
// collapses to the same document as far as indexing is concerned. See
// `sitemapUrls()`'s doc comment and the "duplicates modulo fragment" test in
// generate-sitemap.test.mjs for what that costs. This still ships because it
// is what was asked for - a sitemap that lists the dialogs a visitor can
// deep-link to - not because it is expected to get five extra pages indexed.
// Real indexable URLs would mean real routes, which is a separate, much
// larger change.
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

export const SITE_URL = 'https://alcash55.github.io/Portfolio/';
const OUT_PATH = fileURLToPath(new URL('../dist/sitemap.xml', import.meta.url));

/**
 * Loads the project list and the slug rule through a throwaway Vite SSR
 * module graph instead of importing the source files as plain Node ESM.
 * Plain `node` cannot do it at all: `staticProjects.ts` is TypeScript and
 * imports five `.webp` files, and Node understands neither the syntax nor
 * the asset import.
 *
 * The alternative was extracting the slug rule (and the project list) into
 * a hand-shared module that both the app and this script import - the
 * option the brief calls out as reasonable. That still leaves something
 * duplicated: either the project list lives in two places, or
 * `staticProjects.ts` has to be restructured to source its `name` fields
 * from the shared module, which is a change to app data this role does not
 * own. Loading the *actual* `staticProjects.ts` and `projectSlug.ts`
 * through Vite - the same tool that just built the app one line earlier in
 * `bun run build` - means there is nothing to keep in sync: this script
 * runs whatever `projectSlug()` and `staticProjects` currently are. If a
 * future change renames an export, breaks a TS type, or makes either module
 * fail to evaluate, `ssrLoadModule` throws and the build fails instead of
 * silently shipping a sitemap that points at slugs the app no longer
 * recognises.
 *
 * Measured at ~1.4s on this machine - a throwaway dev server standing up to
 * evaluate two small modules - against a build already dominated by
 * `generate-site-stats`'s ~90s `vitest list` / `playwright test --list`
 * subprocesses. Not worth optimising further.
 */
export async function loadProjectHashes() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    // This process loads two modules and exits; nobody is watching for the
    // dev-server banner.
    logLevel: 'silent',
  });
  try {
    const { staticProjects } = await server.ssrLoadModule(
      '/src/components/Pages/Projects/staticProjects.ts',
    );
    const { projectHash } = await server.ssrLoadModule(
      '/src/components/Pages/Projects/projectSlug.ts',
    );
    return staticProjects.map((project) => projectHash(project));
  } finally {
    await server.close();
  }
}

/** The root URL plus one fragment URL per project hash, in that order. */
export function sitemapUrls(projectHashes) {
  return [SITE_URL, ...projectHashes.map((hash) => `${SITE_URL}${hash}`)];
}

/** Pure so it is trivial to assert against without spinning up Vite. */
export function buildSitemapXml(locs, lastmod) {
  const urlEntries = locs
    .map((loc) => `<url>\n<loc>${loc}</loc>\n<lastmod>${lastmod}</lastmod>\n</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>
`;
}

async function main() {
  const lastmod = new Date().toISOString();
  const projectHashes = await loadProjectHashes();
  const xml = buildSitemapXml(sitemapUrls(projectHashes), lastmod);
  writeFileSync(OUT_PATH, xml);
  console.log(
    `[generate-sitemap] wrote ${OUT_PATH} with lastmod ${lastmod} (${1 + projectHashes.length} URLs)`,
  );
}

// Only run when invoked directly (`node scripts/generate-sitemap.mjs`), not
// when generate-sitemap.test.mjs imports this module for its exports.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
