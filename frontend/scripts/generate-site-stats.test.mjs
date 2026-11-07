import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countPlaywrightTests,
  countVitestTests,
  fingerprintTree,
  generateSiteStats,
  renderSiteStats,
} from './generate-site-stats.mjs';

describe('countVitestTests', () => {
  it('counts one test per entry of `vitest list --json`', () => {
    const list = [{ name: 'a > b' }, { name: 'a > c' }, { name: 'd' }];
    expect(countVitestTests(JSON.stringify(list))).toBe(3);
  });

  it('counts zero for an empty project', () => {
    expect(countVitestTests('[]')).toBe(0);
  });

  it('throws on output that is not a list, so a bad run never becomes a number', () => {
    expect(() => countVitestTests('{"errors":[]}')).toThrow(/did not print a list/i);
    expect(() => countVitestTests('Error: boom')).toThrow();
  });
});

describe('countPlaywrightTests', () => {
  // The shape `playwright test --list --reporter=json` writes: files hold suites
  // (describe blocks) that hold specs, and each spec holds one test per project.
  const report = {
    suites: [
      {
        title: 'a.spec.ts',
        specs: [{ title: 'top level', tests: [{ projectName: 'chromium' }] }],
        suites: [
          {
            title: 'group',
            specs: [
              { title: 'one', tests: [{ projectName: 'chromium' }] },
              { title: 'two', tests: [{ projectName: 'chromium' }] },
            ],
            suites: [
              {
                title: 'nested',
                specs: [{ title: 'three', tests: [{ projectName: 'chromium' }] }],
              },
            ],
          },
        ],
      },
      { title: 'b.spec.ts', specs: [{ title: 'four', tests: [{ projectName: 'chromium' }] }] },
    ],
  };

  it('counts specs at every depth', () => {
    expect(countPlaywrightTests(JSON.stringify(report))).toBe(5);
  });

  it('counts a spec once per project it runs in', () => {
    const two = {
      suites: [
        {
          specs: [{ tests: [{ projectName: 'chromium' }, { projectName: 'firefox' }] }],
        },
      ],
    };
    expect(countPlaywrightTests(JSON.stringify(two))).toBe(2);
  });

  it('throws on output without a suites list', () => {
    expect(() => countPlaywrightTests('{}')).toThrow(/suites/i);
  });
});

describe('renderSiteStats', () => {
  it('writes a default export with both counts and the fingerprint', () => {
    const source = renderSiteStats({ unitTests: 390, browserTests: 153 }, 'abc123');
    expect(source).toContain('export default {');
    expect(source).toContain('unitTests: 390,');
    expect(source).toContain('browserTests: 153,');
    expect(source).toContain('fingerprint: "abc123",');
  });

  it('writes null for a count that could not be derived', () => {
    const source = renderSiteStats({ unitTests: 390, browserTests: null }, 'abc123');
    expect(source).toContain('browserTests: null,');
  });
});

describe('generateSiteStats', () => {
  let root;
  let out;
  let log;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'stats-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'e2e'), { recursive: true });
    await writeFile(join(root, 'src', 'a.test.ts'), 'it("a", () => {});\n');
    await writeFile(join(root, 'e2e', 'a.spec.ts'), 'test("a", () => {});\n');
    out = join(root, 'src', 'generated', 'siteStats.ts');
    log = vi.fn();
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const runner = (counts) =>
    vi.fn(async (kind) => {
      const value = counts[kind];
      if (value instanceof Error) throw value;
      return value;
    });

  const good = {
    unit: JSON.stringify([{ name: 'x' }, { name: 'y' }, { name: 'z' }]),
    e2e: JSON.stringify({ suites: [{ specs: [{ tests: [{}, {}] }] }] }),
    analytics: JSON.stringify({ suites: [{ specs: [{ tests: [{}] }] }] }),
  };

  it('counts unit tests, and browser tests from both Playwright configs, and writes them', async () => {
    const run = runner(good);
    const result = await generateSiteStats({ root, out, run, log });

    expect(result).toEqual({ unitTests: 3, browserTests: 3, status: 'written' });
    const source = await readFile(out, 'utf8');
    expect(source).toContain('unitTests: 3,');
    expect(source).toContain('browserTests: 3,');
  });

  it('skips the runners when nothing under src, e2e or scripts changed', async () => {
    await generateSiteStats({ root, out, run: runner(good), log });
    const run = runner(good);

    const result = await generateSiteStats({ root, out, run, log });

    expect(result.status).toBe('unchanged');
    expect(run).not.toHaveBeenCalled();
  });

  it('counts again after a test file changes', async () => {
    await generateSiteStats({ root, out, run: runner(good), log });
    await writeFile(join(root, 'src', 'a.test.ts'), 'it("a", () => {}); it("b", () => {});\n');
    const run = runner({ ...good, unit: JSON.stringify([{}, {}, {}, {}]) });

    const result = await generateSiteStats({ root, out, run, log });

    expect(result).toEqual({ unitTests: 4, browserTests: 3, status: 'written' });
  });

  it('does not let its own output change the fingerprint', async () => {
    await generateSiteStats({ root, out, run: runner(good), log });
    const before = await fingerprintTree(root);
    await writeFile(out, `${await readFile(out, 'utf8')}// touched\n`);
    expect(await fingerprintTree(root)).toBe(before);
  });

  it('writes null for the count a runner could not produce, and still succeeds', async () => {
    const run = runner({ ...good, e2e: new Error('no browser') });

    const result = await generateSiteStats({ root, out, run, log });

    expect(result).toEqual({ unitTests: 3, browserTests: null, status: 'written' });
    expect(await readFile(out, 'utf8')).toContain('browserTests: null,');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('no browser'));
  });

  it('writes null for both when both runners fail, never a guess', async () => {
    const run = runner({ unit: new Error('x'), e2e: new Error('y'), analytics: new Error('z') });

    const result = await generateSiteStats({ root, out, run, log });

    expect(result).toEqual({ unitTests: null, browserTests: null, status: 'written' });
  });

  it('does not cache a partial result, so the next run tries again', async () => {
    await generateSiteStats({ root, out, run: runner({ ...good, e2e: new Error('x') }), log });
    const run = runner(good);

    const result = await generateSiteStats({ root, out, run, log });

    expect(result).toEqual({ unitTests: 3, browserTests: 3, status: 'written' });
  });
});
