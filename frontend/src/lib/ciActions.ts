import { apiEndpoint } from './apiUrl';

/** An action folder in alcash55/ac-composite-actions, as the API lists it. */
export interface RepoAction {
  readonly name: string;
  readonly description: string;
}

export interface CheckRow {
  readonly name: string;
  readonly does: string;
}

/** Turns a GET /api/v1/ci-actions body into actions. Null means it held none worth showing. */
function parseActions(input: unknown): readonly RepoAction[] | null {
  if (typeof input !== 'object' || input === null) return null;
  const list: unknown = 'actions' in input ? input.actions : undefined;
  if (!Array.isArray(list)) return null;
  const actions = list.flatMap((item: unknown): RepoAction[] => {
    if (typeof item !== 'object' || item === null) return [];
    const name: unknown = 'name' in item ? item.name : undefined;
    const description: unknown = 'description' in item ? item.description : undefined;
    if (typeof name !== 'string' || name === '') return [];
    return [{ name, description: typeof description === 'string' ? description : '' }];
  });
  return actions.length > 0 ? actions : null;
}

// The figure already shows the fallback list, so a slow answer only costs a stale count.
// Five seconds covers a warm API and gives up on a cold one instead of holding a socket.
export const CI_ACTIONS_TIMEOUT_MS = 5_000;

export interface CiActionsDeps {
  readonly fetch: typeof fetch;
  /** Base URL of the Go API. Empty means none is configured. */
  readonly apiUrl: string;
}

/** The repo's actions from the API, or null on any failure, so the caller keeps its fallback. */
export async function fetchCiActions(deps: CiActionsDeps): Promise<readonly RepoAction[] | null> {
  if (deps.apiUrl === '') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CI_ACTIONS_TIMEOUT_MS);
  try {
    const response = await deps.fetch(apiEndpoint(deps.apiUrl, '/api/v1/ci-actions'), {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return parseActions(body);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const NO_DESCRIPTION = 'Runs from my other repos';

const stripFullStop = (text: string) => text.replace(/\.$/, '');

/**
 * One row per action the repo has. Written descriptions win and set the order. Actions
 * added later follow alphabetically with their own action.yml sentence, so a new folder
 * shows up without anyone editing this site.
 */
export function buildCheckRows(
  actions: readonly RepoAction[] | null,
  written: Readonly<Record<string, string>>,
  fallback: readonly CheckRow[],
): readonly CheckRow[] {
  if (!actions) return fallback;
  const order = Object.keys(written);
  const rank = (name: string) => {
    const at = order.indexOf(name);
    return at === -1 ? order.length : at;
  };
  return [...actions]
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
    .map((action) => ({
      name: action.name,
      does: written[action.name] ?? (stripFullStop(action.description) || NO_DESCRIPTION),
    }));
}

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/** A count as a word up to twenty, as digits after that. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
