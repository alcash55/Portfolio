import { describe, expect, it } from 'vitest';
import { parseSiteStats, testCountFact } from './siteStats';

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

describe('testCountFact', () => {
  it('names both counts when both are known', () => {
    expect(testCountFact({ unitTests: 174, browserTests: 194 })).toEqual({
      lead: '174 and 194 tests',
      body: '174 unit tests and 194 browser tests gate every deploy.',
    });
  });

  it('puts a thousands separator in a long count', () => {
    expect(testCountFact({ unitTests: 1234, browserTests: 5 })?.body).toBe(
      '1,234 unit tests and 5 browser tests gate every deploy.',
    );
  });

  it('renders only the unit count when the browser count is unknown', () => {
    expect(testCountFact({ unitTests: 174, browserTests: null })).toEqual({
      lead: '174 unit tests',
      body: '174 unit tests gate every deploy.',
    });
  });

  it('renders only the browser count when the unit count is unknown', () => {
    expect(testCountFact({ unitTests: null, browserTests: 194 })).toEqual({
      lead: '194 browser tests',
      body: '194 browser tests gate every deploy.',
    });
  });

  it('uses the singular for a count of one', () => {
    expect(testCountFact({ unitTests: 1, browserTests: null })?.body).toBe(
      '1 unit test gates every deploy.',
    );
  });

  it('returns nothing when no count is known, so the row is cut', () => {
    expect(testCountFact({ unitTests: null, browserTests: null })).toBeUndefined();
  });

  it('returns nothing for a count of zero, since "0 tests gate every deploy" is false', () => {
    expect(testCountFact({ unitTests: 0, browserTests: 0 })).toBeUndefined();
  });
});
