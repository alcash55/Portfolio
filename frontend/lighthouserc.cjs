// Lighthouse CI config. `bun run lighthouse` runs it once per form factor against the
// production build served by `vite preview`, the same Workers runtime that deploys.
// Not wired into CI: Alex decides whether it gates a pull request.
//
// The floors are the scores of the first version of the site (93 performance,
// 100 accessibility, 96 best practices, 100 SEO). A score under a floor fails the run.
const formFactor = process.env.LH_FORM_FACTOR === 'desktop' ? 'desktop' : 'mobile';
const port = process.env.LH_PORT ?? '4175';
const outDir = process.env.LH_OUT ?? `${__dirname}/.lighthouseci/results`;

module.exports = {
  ci: {
    collect: {
      url: [
        `http://127.0.0.1:${port}/`,
        `http://127.0.0.1:${port}/projects/portfolio-website`,
        `http://127.0.0.1:${port}/experience/ncr-voyix-docs`,
        `http://127.0.0.1:${port}/contact`,
      ],
      // Three runs per page and the median, because one run on a laptop swings several points.
      numberOfRuns: 3,
      startServerCommand: `cd ${__dirname} && bunx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 60000,
      settings: {
        // Lighthouse's default is mobile. 'desktop' switches to its desktop preset.
        preset: formFactor === 'desktop' ? 'desktop' : undefined,
        chromeFlags: '--no-sandbox --headless=new',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      aggregationMethod: 'median-run',
      assertions: {
        'categories:performance': ['error', { minScore: 0.93 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.96 }],
        'categories:seo': ['error', { minScore: 1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: outDir },
  },
};
