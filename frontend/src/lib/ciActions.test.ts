import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCheckRows, CI_ACTIONS_TIMEOUT_MS, countWord, fetchCiActions } from './ciActions';

const CURATED = {
  diff: 'Lists the files changed',
  'ats-check': 'Scores a resume PDF',
};

const API = 'https://api.example.test/';

function respond(status: number, body: string) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));
}

describe('fetchCiActions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the actions the API lists, from /api/v1/ci-actions', async () => {
    const fetchImpl = respond(
      200,
      JSON.stringify({
        actions: [
          { name: 'diff', description: 'List files.' },
          { name: 'ats-check', description: '' },
        ],
        treeSha: 'abc',
        stale: true,
      }),
    );
    await expect(fetchCiActions({ fetch: fetchImpl, apiUrl: API })).resolves.toEqual([
      { name: 'diff', description: 'List files.' },
      { name: 'ats-check', description: '' },
    ]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.test/api/v1/ci-actions');
  });

  it('drops malformed entries and keeps the rest', async () => {
    const fetchImpl = respond(
      200,
      JSON.stringify({ actions: [{ name: 'diff', description: 'x.' }, { name: 3 }, null, {}] }),
    );
    await expect(fetchCiActions({ fetch: fetchImpl, apiUrl: API })).resolves.toEqual([
      { name: 'diff', description: 'x.' },
    ]);
  });

  it('returns null on a 502 from the API', async () => {
    const fetchImpl = respond(502, JSON.stringify({ error: 'could not load ci actions' }));
    await expect(fetchCiActions({ fetch: fetchImpl, apiUrl: API })).resolves.toBeNull();
  });

  it.each([
    ['a body that is not JSON', 'Service waking up'],
    ['JSON with no action list', '{"error":"x"}'],
    ['an empty action list', '{"actions":[]}'],
    ['a list of junk', '{"actions":[1,"a",null]}'],
  ])('returns null for %s', async (_name, body) => {
    await expect(fetchCiActions({ fetch: respond(200, body), apiUrl: API })).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    await expect(fetchCiActions({ fetch: fetchImpl, apiUrl: API })).resolves.toBeNull();
  });

  it('gives up and returns null when the API does not answer in time', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );
    const result = fetchCiActions({ fetch: fetchImpl, apiUrl: API });
    await vi.advanceTimersByTimeAsync(CI_ACTIONS_TIMEOUT_MS);
    await expect(result).resolves.toBeNull();
  });

  it('makes no request when no API URL is configured', async () => {
    const fetchImpl = respond(200, '{}');
    await expect(fetchCiActions({ fetch: fetchImpl, apiUrl: '' })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('buildCheckRows', () => {
  const fallback = [{ name: 'diff', does: 'fallback diff' }];

  it('uses the fallback list when the API gave nothing', () => {
    expect(buildCheckRows(null, CURATED, fallback)).toEqual(fallback);
  });

  it('counts an action that was added, using its own description when none is written', () => {
    const rows = buildCheckRows(
      [
        { name: 'diff', description: 'ignored' },
        { name: 'new-thing', description: 'Does the new thing.' },
      ],
      CURATED,
      fallback,
    );
    expect(rows).toEqual([
      { name: 'diff', does: 'Lists the files changed' },
      { name: 'new-thing', does: 'Does the new thing' },
    ]);
  });

  it('drops an action that was removed', () => {
    const rows = buildCheckRows([{ name: 'ats-check', description: '' }], CURATED, fallback);
    expect(rows.map((r) => r.name)).toEqual(['ats-check']);
  });

  it('keeps the written order first, then the rest alphabetically', () => {
    const rows = buildCheckRows(
      [
        { name: 'zeta', description: 'Z.' },
        { name: 'ats-check', description: '' },
        { name: 'alpha', description: 'A.' },
        { name: 'diff', description: '' },
      ],
      CURATED,
      fallback,
    );
    expect(rows.map((r) => r.name)).toEqual(['diff', 'ats-check', 'alpha', 'zeta']);
  });

  it('never shows a row with no description', () => {
    const rows = buildCheckRows([{ name: 'mystery', description: '' }], CURATED, fallback);
    expect(rows[0]?.does).toBe('Runs from my other repos');
  });
});

describe('countWord', () => {
  it('spells small counts and uses digits past twenty', () => {
    expect(countWord(1)).toBe('one');
    expect(countWord(9)).toBe('nine');
    expect(countWord(10)).toBe('ten');
    expect(countWord(20)).toBe('twenty');
    expect(countWord(21)).toBe('21');
  });
});
