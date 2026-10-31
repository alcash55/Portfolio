import { describe, expect, it } from 'vitest';
import {
  ABOUT,
  CHAPTER_COUNT,
  CHAPTER_GROUPS,
  PROJECTS_INTRO,
  PROJECT_CHAPTERS,
  chapterTitle,
  chapterNumber,
} from './home';
import { PROJECT_SLUGS } from './pages';

const allStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
};

describe('chapter index', () => {
  it('numbers twelve chapters in page order, grouped as the header menu reads', () => {
    const flat = CHAPTER_GROUPS.flatMap((g) => g.items.map((i) => [g.label, i.n, i.id, i.title]));
    expect(flat).toEqual([
      ['About', 1, 'about', 'About me'],
      ['Projects', 2, 'portfolio-website', 'Portfolio Website'],
      ['Projects', 3, 'game-competition-website', 'Game Competition'],
      ['Projects', 4, 'ac-composite-actions', 'AC Composite Actions'],
      ['Projects', 5, 'clipper', 'Clipper'],
      ['Projects', 6, 'golem-miners', 'Golem Miners'],
      ['Projects', 7, 'vscode-royalty-theme', 'Royalty Theme'],
      ['Experience', 8, 'experience', 'Solea Energy'],
      ['Experience', 9, 'ncr-voyix', 'NCR Voyix'],
      ['Experience', 10, 'ncr-store-health', 'NCR Store Health'],
      ['Experience', 11, 'education', 'Education'],
      ['Contact', 12, 'contact', 'Say hi'],
    ]);
    expect(CHAPTER_COUNT).toBe(12);
  });

  it('formats the header counter number and title', () => {
    expect(chapterNumber(1)).toBe('01');
    expect(chapterNumber(12)).toBe('12');
    expect(chapterTitle(6)).toBe('Golem Miners');
    expect(() => chapterTitle(13)).toThrow('No chapter 13');
  });
});

describe('project chapters', () => {
  it('follow the comp order and number their figures 1 to 6', () => {
    expect(PROJECT_CHAPTERS.map((c) => [c.n, c.id, c.fig.n])).toEqual([
      [2, 'portfolio-website', 1],
      [3, 'game-competition-website', 2],
      [4, 'ac-composite-actions', 3],
      [5, 'clipper', 4],
      [6, 'golem-miners', 5],
      [7, 'vscode-royalty-theme', 6],
    ]);
  });

  it('alternate the figure side, starting on the left at chapter 2', () => {
    expect(PROJECT_CHAPTERS.map((c) => c.reverse)).toEqual([true, false, true, false, true, false]);
  });

  it('link each write-up to a real project slug', () => {
    for (const chapter of PROJECT_CHAPTERS) {
      const writeUp = chapter.links.find((l) => l.kind === 'write-up');
      expect(writeUp, chapter.id).toBeDefined();
      if (writeUp?.kind === 'write-up') expect(PROJECT_SLUGS).toContain(writeUp.slug);
      expect(writeUp && 'slug' in writeUp ? writeUp.slug : '').toBe(chapter.id);
    }
  });

  it('keep the proof lines from the copy deck', () => {
    const proof = (id: string) =>
      PROJECT_CHAPTERS.find((c) => c.id === id)?.paragraphs.find((p) => p.kind === 'proof')?.text;
    expect(proof('portfolio-website')).toBe(
      'Page weight cut tenfold, 4.03 MB to 397 KB. Lighthouse accessibility 86 to 100.',
    );
    expect(proof('clipper')).toBe(
      'One command turns a YouTube or Twitch clip into a captioned, upload-ready Short. 387 tests pass.',
    );
    expect(proof('vscode-royalty-theme')).toBe(
      'Keyword contrast raised from 2.96:1 to 8.1:1. A build check blocks any colour below WCAG AA.',
    );
  });

  it('say the code is private on Clipper and Golem Miners only', () => {
    const noted = PROJECT_CHAPTERS.filter((c) => c.note).map((c) => [c.id, c.note]);
    expect(noted).toEqual([
      ['clipper', 'The code is private.'],
      ['golem-miners', 'The code is private.'],
    ]);
  });
});

describe('copy hygiene', () => {
  it('has no dashes used as punctuation, no curly quotes, no html entities', () => {
    const strings = allStrings([ABOUT, PROJECTS_INTRO, PROJECT_CHAPTERS, CHAPTER_GROUPS]);
    const bad = strings.filter((s) => /[–—‘’“”]|&[a-z]+;/.test(s));
    expect(bad).toEqual([]);
  });
});

describe('about and projects intro', () => {
  it('use the lead-approved h1 and the projects intro line', () => {
    expect(ABOUT.heading).toBe('Alex Cash builds the Go API and the page that reads it.');
    expect(PROJECTS_INTRO).toEqual({
      id: 'projects',
      heading: 'Projects.',
      line: 'Each project links to its source, or says the code is private.',
    });
  });
});
