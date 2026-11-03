import { describe, expect, it } from 'vitest';
import { buildCheckRows, countWord, parseCiActions } from './ciActions';

const CURATED = {
  diff: 'Lists the files changed',
  'ats-check': 'Scores a resume PDF',
};

describe('parseCiActions', () => {
  it('keeps well-formed actions and drops anything else', () => {
    expect(
      parseCiActions({
        actions: [{ name: 'diff', description: 'x.' }, { name: 3 }, null, { name: '' }],
      }),
    ).toEqual([{ name: 'diff', description: 'x.' }]);
  });

  it('returns null when the build could not read the repo', () => {
    expect(parseCiActions(null)).toBeNull();
    expect(parseCiActions({})).toBeNull();
    expect(parseCiActions({ actions: [] })).toBeNull();
  });
});

describe('buildCheckRows', () => {
  const fallback = [{ name: 'diff', does: 'fallback diff' }];

  it('uses the fallback list when nothing was generated', () => {
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
