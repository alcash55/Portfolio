// Builds the site, then runs Lighthouse CI against it for mobile and desktop.
//
//   bun run lighthouse                        build, then both form factors
//   bun run lighthouse --skip-build           reuse the current dist/
//   LH_OUT=/tmp/results bun run lighthouse    where the raw reports go (default .lighthouseci/results)
//
// Chrome comes from the Playwright install, so there is no second browser to manage.
// @lhci/cli is fetched on use and is not a dependency, because it adds about 280 packages
// to every `bun install`, CI included.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

export const LHCI_VERSION = '0.15.1';
export const FORM_FACTORS = ['mobile', 'desktop'];

const root = resolve(import.meta.dirname, '..');

function run(command, args, { env = {}, cwd = root } = {}) {
  return (
    spawnSync(command, args, { stdio: 'inherit', cwd, env: { ...process.env, ...env } }).status ?? 1
  );
}

export function main(argv) {
  if (!argv.includes('--skip-build')) {
    const built = run('bun', ['run', 'build']);
    if (built !== 0) return built;
  }
  const chrome = chromium.executablePath();
  const outRoot = resolve(process.env.LH_OUT ?? join(root, '.lighthouseci', 'results'));
  // On WSL, chrome-launcher makes its profile folders under a Windows-style path that Linux
  // reads as a relative one, and leaves them in the working directory. A scratch directory
  // keeps them out of the repo.
  const scratch = mkdtempSync(join(tmpdir(), 'lhci-'));
  let failed = false;
  try {
    for (const formFactor of FORM_FACTORS) {
      console.log(`\nLighthouse, ${formFactor}\n`);
      const status = run(
        'bunx',
        [`@lhci/cli@${LHCI_VERSION}`, 'autorun', `--config=${join(root, 'lighthouserc.cjs')}`],
        {
          cwd: scratch,
          env: {
            CHROME_PATH: chrome,
            LH_FORM_FACTOR: formFactor,
            LH_OUT: join(outRoot, formFactor),
          },
        },
      );
      if (status !== 0) failed = true;
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.exit(main(process.argv.slice(2)));
}
