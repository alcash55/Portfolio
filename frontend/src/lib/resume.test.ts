import { describe, expect, it } from 'vitest';
import { parseResumeInfo, resumeLinkName, resumeSizeLabel } from './resume';

describe('parseResumeInfo', () => {
  it('reads a recorded download', () => {
    expect(parseResumeInfo({ available: true, bytes: 23_326 })).toEqual({
      available: true,
      bytes: 23_326,
    });
  });

  it.each([
    ['a missing file', undefined],
    ['an unavailable record', { available: false }],
    ['a record with no size', { available: true }],
    ['a record with a text size', { available: true, bytes: '23326' }],
    ['an empty file', { available: true, bytes: 0 }],
    ['a list', []],
    ['null', null],
  ])('treats %s as unavailable', (_name, input) => {
    expect(parseResumeInfo(input)).toEqual({ available: false });
  });
});

describe('resumeSizeLabel', () => {
  it.each([
    [23_326, 'PDF, 23 KB'],
    [23_500, 'PDF, 24 KB'],
    [499, 'PDF, 1 KB'],
    [1_049_000, 'PDF, 1049 KB'],
  ])('formats %i bytes as %s, 1 KB being 1,000 bytes and never below 1', (bytes, label) => {
    expect(resumeSizeLabel(bytes)).toBe(label);
  });
});

describe('resumeLinkName', () => {
  it('puts the visible text first and names the type, size and new tab', () => {
    expect(resumeLinkName({ available: true, bytes: 23_326 })).toBe(
      'View resume (PDF, 23 KB, opens in a new tab)',
    );
  });

  it('drops the size and the new tab when there is no file to open', () => {
    expect(resumeLinkName({ available: false })).toBe('View resume');
  });
});
