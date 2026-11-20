import { describe, expect, it, vi } from 'vitest';
import { fetchContributions, level, summarize, type ContributionWeek } from './contributions';

const API = 'https://api.example.test/';

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function week(start: string, days: number[]): ContributionWeek {
  return { start, days };
}

describe('fetchContributions', () => {
  it('reads the weeks from /api/v1/contributions', async () => {
    const fetchImpl = respond(200, {
      weeks: [
        { start: '2026-11-08', days: [0, 1, 2, 3, 4, 5, 6] },
        { start: '2026-11-15', days: [7, 1, 33] },
      ],
      stale: false,
    });

    await expect(fetchContributions({ fetch: fetchImpl, apiUrl: API })).resolves.toEqual([
      week('2026-11-08', [0, 1, 2, 3, 4, 5, 6]),
      week('2026-11-15', [7, 1, 33]),
    ]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.test/api/v1/contributions');
  });

  it.each([
    ['a 502', 502, { error: 'could not load contributions' }],
    ['an empty body', 200, {}],
    ['no weeks', 200, { weeks: [] }],
    ['a week with a bad count', 200, { weeks: [{ start: '2026-11-08', days: [1, 'x'] }] }],
    ['a week without a start', 200, { weeks: [{ days: [1] }] }],
  ])('gives null for %s', async (_name, status, body) => {
    await expect(
      fetchContributions({ fetch: respond(status, body), apiUrl: API }),
    ).resolves.toBeNull();
  });

  it('gives null without asking when no API is configured', async () => {
    const fetchImpl = respond(200, {});
    await expect(fetchContributions({ fetch: fetchImpl, apiUrl: '' })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('gives null when the request fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    await expect(fetchContributions({ fetch: fetchImpl, apiUrl: API })).resolves.toBeNull();
  });
});

describe('summarize', () => {
  const year = Array.from({ length: 53 }, (_, i) => {
    const start = new Date(Date.UTC(2025, 10, 16 + i * 7)).toISOString().slice(0, 10);
    return week(start, [i, 0, 0, 0, 0, 0, 0]);
  });

  it('keeps the last 26 weeks and counts only those', () => {
    const summary = summarize(year);
    expect(summary?.weeks).toHaveLength(26);
    expect(summary?.weeks[0]?.start).toBe('2026-05-24');
    // Weeks 27 to 52 carry 27 + 28 + ... + 52 contributions.
    expect(summary?.total).toBe(1027);
    expect(summary?.since).toBe('May');
  });

  it('shows every week when there are fewer than 26', () => {
    const summary = summarize([week('2026-11-08', [2]), week('2026-11-15', [3])]);
    expect(summary).toEqual({
      weeks: [week('2026-11-08', [2]), week('2026-11-15', [3])],
      total: 5,
      since: 'November',
    });
  });

  it('gives null for six months with nothing in them, so the page shows no empty grid', () => {
    expect(summarize([week('2026-11-08', [0, 0, 0])])).toBeNull();
  });
});

describe('level', () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 1],
    [4, 2],
    [9, 2],
    [10, 3],
    [24, 3],
    [25, 4],
    [108, 4],
  ])('%i contributions is level %i', (count, expected) => {
    expect(level(count)).toBe(expected);
  });
});
