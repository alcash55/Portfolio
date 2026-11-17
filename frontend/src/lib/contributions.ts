import { apiEndpoint } from './apiUrl';

/** One column of the GitHub calendar. `days` starts on Sunday and can be short at either end. */
export interface ContributionWeek {
  readonly start: string;
  readonly days: readonly number[];
}

export interface ContributionSummary {
  readonly weeks: readonly ContributionWeek[];
  readonly total: number;
  /** The month the first shown week starts in, for example "May". */
  readonly since: string;
}

/** Six months. Most of the year's activity is recent, and a full year would show an empty half. */
export const SHOWN_WEEKS = 26;

// The graph sits on the first screen with its size held, so a late answer moves nothing.
// A cold Render API takes about 30 seconds to wake. Twenty covers most of that.
export const CONTRIBUTIONS_TIMEOUT_MS = 20_000;

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/** Turns a GET /api/v1/contributions body into weeks. Null when anything in it is malformed. */
function parseWeeks(input: unknown): readonly ContributionWeek[] | null {
  if (typeof input !== 'object' || input === null) return null;
  const list: unknown = 'weeks' in input ? input.weeks : undefined;
  if (!Array.isArray(list) || list.length === 0) return null;
  const weeks: ContributionWeek[] = [];
  for (const item of list as unknown[]) {
    if (typeof item !== 'object' || item === null) return null;
    const start: unknown = 'start' in item ? item.start : undefined;
    const days: unknown = 'days' in item ? item.days : undefined;
    if (typeof start !== 'string' || !Array.isArray(days)) return null;
    const counts = days as unknown[];
    if (!counts.every(isCount)) return null;
    weeks.push({ start, days: counts });
  }
  return weeks;
}

export interface ContributionsDeps {
  readonly fetch: typeof fetch;
  /** Base URL of the Go API. Empty means none is configured. */
  readonly apiUrl: string;
}

/** The calendar from the API, or null on any failure, so the caller can drop the graph. */
export async function fetchContributions(
  deps: ContributionsDeps,
): Promise<readonly ContributionWeek[] | null> {
  if (deps.apiUrl === '') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTRIBUTIONS_TIMEOUT_MS);
  try {
    const response = await deps.fetch(apiEndpoint(deps.apiUrl, '/api/v1/contributions'), {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return parseWeeks(body);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The last `shown` weeks and their total. Null when they hold nothing worth showing. */
export function summarize(
  weeks: readonly ContributionWeek[],
  shown = SHOWN_WEEKS,
): ContributionSummary | null {
  const recent = weeks.slice(-shown);
  const first = recent[0];
  const total = recent.reduce((sum, w) => sum + w.days.reduce((a, b) => a + b, 0), 0);
  if (!first || total === 0) return null;
  const since = new Date(`${first.start}T00:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
  return { weeks: recent, total, since };
}

/** The shade of a day's square, on GitHub's five-step scale. */
export function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count < 4) return 1;
  if (count < 10) return 2;
  if (count < 25) return 3;
  return 4;
}
