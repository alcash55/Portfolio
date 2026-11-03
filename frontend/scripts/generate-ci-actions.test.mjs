import { mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  actionPaths,
  firstSentence,
  generateCiActions,
  renderCiActions,
} from './generate-ci-actions.mjs';

const tree = (paths) => ({ tree: paths.map((path) => ({ path, type: 'blob' })) });

describe('actionPaths', () => {
  it('names an action by the folder that holds its action.yml, nested or not', () => {
    expect(
      actionPaths(
        tree([
          'README.md',
          'diff/action.yml',
          'diff/index.js',
          'security/betterleaks/action.yml',
          'security/betterleaks/comment/action.yaml',
          'package.json',
        ]),
      ),
    ).toEqual(['diff', 'security/betterleaks', 'security/betterleaks/comment']);
  });

  it('ignores fixtures and tooling folders that carry an action.yml', () => {
    expect(
      actionPaths(tree(['diff/action.yml', 'node_modules/x/action.yml', '.github/a/action.yml'])),
    ).toEqual(['diff']);
  });

  it('throws on a response that is not a tree, so an error page never becomes a count', () => {
    expect(() => actionPaths({ message: 'API rate limit exceeded' })).toThrow(/tree/i);
  });
});

describe('firstSentence', () => {
  it('takes the first sentence of a folded description', () => {
    expect(
      firstSentence(
        'List the files changed in a pull request, split into\n  files that can be processed.\n  And more.',
      ),
    ).toBe('List the files changed in a pull request, split into files that can be processed.');
  });
});

describe('renderCiActions', () => {
  it('writes a module that carries the actions and the tree it read', () => {
    const out = renderCiActions([{ name: 'diff', description: 'Lists files.' }], 'abc123');
    expect(out).toContain('"name": "diff"');
    expect(out).toContain('treeSha: "abc123"');
  });
});

describe('generateCiActions', () => {
  let dir;
  let out;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ci-actions-'));
    out = join(dir, 'ciActions.ts');
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const reply = (body) => ({ ok: true, json: async () => body, text: async () => body });
  const fetchFor = (paths) =>
    vi.fn(async (url) => {
      if (String(url).includes('/git/trees/')) return reply({ sha: 's1', ...tree(paths) });
      return reply(`name: x\ndescription: Does the thing for ${String(url)}. More text.\n`);
    });

  it('writes every action it finds, with its description', async () => {
    const fetchImpl = fetchFor(['diff/action.yml', 'ats-check/action.yml']);
    const result = await generateCiActions({ out, fetchImpl, log: () => {} });
    expect(result.status).toBe('written');
    const body = await readFile(out, 'utf8');
    expect(body).toContain('"name": "ats-check"');
    expect(body).toContain('"name": "diff"');
    expect(result.count).toBe(2);
  });

  it('picks up an action that is added and drops one that is removed', async () => {
    await generateCiActions({
      out,
      fetchImpl: fetchFor(['a/action.yml', 'b/action.yml']),
      log: () => {},
      maxAgeMs: 0,
    });
    await generateCiActions({
      out,
      fetchImpl: fetchFor(['b/action.yml', 'c/action.yml']),
      log: () => {},
      maxAgeMs: 0,
    });
    const body = await readFile(out, 'utf8');
    expect(body).toContain('"name": "c"');
    expect(body).not.toContain('"name": "a"');
  });

  it('skips the network when the file is fresh', async () => {
    await generateCiActions({ out, fetchImpl: fetchFor(['a/action.yml']), log: () => {} });
    const again = fetchFor(['a/action.yml', 'b/action.yml']);
    const result = await generateCiActions({ out, fetchImpl: again, log: () => {} });
    expect(result.status).toBe('fresh');
    expect(again).not.toHaveBeenCalled();
  });

  it('refreshes a file older than the max age', async () => {
    await generateCiActions({ out, fetchImpl: fetchFor(['a/action.yml']), log: () => {} });
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await utimes(out, old, old);
    const result = await generateCiActions({
      out,
      fetchImpl: fetchFor(['a/action.yml', 'b/action.yml']),
      log: () => {},
    });
    expect(result.status).toBe('written');
    expect(await readFile(out, 'utf8')).toContain('"name": "b"');
  });

  it('keeps the last good file when GitHub cannot be reached', async () => {
    await generateCiActions({
      out,
      fetchImpl: fetchFor(['a/action.yml']),
      log: () => {},
      maxAgeMs: 0,
    });
    const before = await readFile(out, 'utf8');
    const log = vi.fn();
    const result = await generateCiActions({
      out,
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
      log,
      maxAgeMs: 0,
    });
    expect(result.status).toBe('kept');
    expect(await readFile(out, 'utf8')).toBe(before);
    expect(log.mock.calls[0]?.[0]).toMatch(/offline/);
  });

  it('writes an empty module when it has never succeeded, so the page uses its fallback list', async () => {
    const result = await generateCiActions({
      out,
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
      log: () => {},
    });
    expect(result.status).toBe('empty');
    expect(await readFile(out, 'utf8')).toContain('export default null');
  });

  it('never fails the build', async () => {
    await expect(
      generateCiActions({
        out,
        fetchImpl: vi.fn().mockRejectedValue(new Error('boom')),
        log: () => {},
      }),
    ).resolves.toBeDefined();
    await stat(out);
  });
});
