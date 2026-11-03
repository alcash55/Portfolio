/** An action folder in alcash55/ac-composite-actions, as the build read it. */
export interface GeneratedAction {
  readonly name: string;
  readonly description: string;
}

export interface CheckRow {
  readonly name: string;
  readonly does: string;
}

/** Turns the generated module's default export into actions. Null means the build could not read the repo. */
export function parseCiActions(input: unknown): readonly GeneratedAction[] | null {
  if (typeof input !== 'object' || input === null) return null;
  const list = (input as { actions?: unknown }).actions;
  if (!Array.isArray(list)) return null;
  const actions = list.flatMap((item: unknown): GeneratedAction[] => {
    if (typeof item !== 'object' || item === null) return [];
    const { name, description } = item as { name?: unknown; description?: unknown };
    if (typeof name !== 'string' || name === '') return [];
    return [{ name, description: typeof description === 'string' ? description : '' }];
  });
  return actions.length > 0 ? actions : null;
}

const NO_DESCRIPTION = 'Runs from my other repos';

const stripFullStop = (text: string) => text.replace(/\.$/, '');

/**
 * One row per action the repo has. Written descriptions win and set the order. Actions
 * added later follow alphabetically with their own action.yml sentence, so a new folder
 * shows up without anyone editing this site.
 */
export function buildCheckRows(
  generated: readonly GeneratedAction[] | null,
  written: Readonly<Record<string, string>>,
  fallback: readonly CheckRow[],
): readonly CheckRow[] {
  if (!generated) return fallback;
  const order = Object.keys(written);
  const rank = (name: string) => {
    const at = order.indexOf(name);
    return at === -1 ? order.length : at;
  };
  return [...generated]
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

// scripts/generate-ci-actions.mjs writes this file before dev, build and test. See
// siteStats.ts for why this is a guarded glob and not an import.
export function readGeneratedActions(): readonly GeneratedAction[] | null {
  try {
    const found = import.meta.glob('../generated/ciActions.ts', { eager: true, import: 'default' });
    return parseCiActions(Object.values(found)[0]);
  } catch {
    return null;
  }
}
