import { describe, expect, it } from 'vitest';
import { parseSiteStats, testCountStat } from './siteStats';

describe('parseSiteStats', () => {
  it('reads both counts from the generated module', () => {
    expect(parseSiteStats({ unitTests: 174, browserTests: 194, fingerprint: 'abc' })).toEqual({
      unitTests: 174,
      browserTests: 194,
    });
  });

  it('keeps a null count as null', () => {
    expect(parseSiteStats({ unitTests: 174, browserTests: null })).toEqual({
      unitTests: 174,
      browserTests: null,
    });
  });

  it.each([
    ['nothing at all', undefined],
    ['a string', '174'],
    ['an array', [174, 194]],
    ['null', null],
  ])('treats %s as unknown rather than guessing', (_name, input) => {
    expect(parseSiteStats(input)).toEqual({ unitTests: null, browserTests: null });
  });

  it.each([
    ['a negative count', -1],
    ['a fractional count', 1.5],
    ['NaN', Number.NaN],
    ['a count written as text', '174'],
  ])('treats %s as unknown', (_name, bad) => {
    expect(parseSiteStats({ unitTests: bad, browserTests: 5 })).toEqual({
      unitTests: null,
      browserTests: 5,
    });
  });

  it('drops only the bad count and keeps the good one', () => {
    expect(parseSiteStats({ unitTests: -1, browserTests: 5 })).toEqual({
      unitTests: null,
      browserTests: 5,
    });
  });
});

describe('testCountStat', () => {
  it('shows the total as the figure and splits it in the label when both counts are known', () => {
    expect(testCountStat({ unitTests: 174, browserTests: 194 })).toEqual({
      figure: '368',
      label: 'tests gate every deploy: 174 unit and 194 browser.',
    });
  });

  it('puts a thousands separator in a long count', () => {
    expect(testCountStat({ unitTests: 1234, browserTests: 5 })).toEqual({
      figure: '1,239',
      label: 'tests gate every deploy: 1,234 unit and 5 browser.',
    });
  });

  it('renders only the unit count when the browser count is unknown', () => {
    expect(testCountStat({ unitTests: 174, browserTests: null })).toEqual({
      figure: '174',
      label: 'unit tests gate every deploy.',
    });
  });

  it('renders only the browser count when the unit count is unknown', () => {
    expect(testCountStat({ unitTests: null, browserTests: 194 })).toEqual({
      figure: '194',
      label: 'browser tests gate every deploy.',
    });
  });

  it('uses the singular for a count of one', () => {
    expect(testCountStat({ unitTests: 1, browserTests: null })).toEqual({
      figure: '1',
      label: 'unit test gates every deploy.',
    });
  });

  it('returns nothing when no count is known, so the stat is cut', () => {
    expect(testCountStat({ unitTests: null, browserTests: null })).toBeUndefined();
  });

  it('returns nothing for a count of zero, since "0 tests gate every deploy" is false', () => {
    expect(testCountStat({ unitTests: 0, browserTests: 0 })).toBeUndefined();
  });
});
