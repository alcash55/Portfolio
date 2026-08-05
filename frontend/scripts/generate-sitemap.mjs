// Regenerates public/sitemap.xml with a fresh <lastmod> on every build so it
// never goes stale. The site is a single page with client-side section
// scrolling, so there is exactly one URL entry.
//
// Invoked from `bun run build` (see package.json) before `vite build`, which
// copies everything in `public/` into `dist/` verbatim.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://alcash55.github.io/Portfolio/';
const OUT_PATH = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));

const lastmod = new Date().toISOString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
<url>
<loc>${SITE_URL}</loc>
<lastmod>${lastmod}</lastmod>
</url>
</urlset>
`;

writeFileSync(OUT_PATH, xml);
console.log(`[generate-sitemap] wrote ${OUT_PATH} with lastmod ${lastmod}`);
