import { describe, expect, it } from 'vitest';
import {
  HOME,
  NOT_FOUND,
  EXPERIENCE_SLUGS,
  PROJECT_SLUGS,
  findExperience,
  findProject,
  pageHref,
} from './pages';

describe('home page copy', () => {
  it('uses the hero sentence as the h1 and the home title', () => {
    expect(HOME.h1).toBe('Alex Cash builds the Go API and the page that reads it.');
    expect(HOME.title).toBe('Alex Cash, software engineer');
  });
});

describe('project pages', () => {
  it('lists the six projects in comp order', () => {
    expect(PROJECT_SLUGS).toEqual([
      'portfolio-website',
      'game-competition-website',
      'ac-composite-actions',
      'clipper',
      'golem-miners',
      'vscode-royalty-theme',
    ]);
  });

  it.each([
    ['portfolio-website', 'Portfolio Website', 'Portfolio Website, work by Alex Cash'],
    [
      'game-competition-website',
      'Game Competition Website',
      'Game Competition Website, work by Alex Cash',
    ],
    ['ac-composite-actions', 'AC Composite Actions', 'AC Composite Actions, work by Alex Cash'],
    ['clipper', 'Clipper', 'Clipper, work by Alex Cash'],
    ['golem-miners', 'Golem Miners', 'Golem Miners, work by Alex Cash'],
    ['vscode-royalty-theme', 'VS Code Royalty Theme', 'VS Code Royalty Theme, work by Alex Cash'],
  ])('%s has the h1 and title from the copy deck', (slug, h1, title) => {
    expect(findProject(slug)).toMatchObject({ h1, title });
  });

  it('returns undefined for an unknown slug', () => {
    expect(findProject('nope')).toBeUndefined();
  });
});

describe('experience pages', () => {
  it('lists the two experience slugs', () => {
    expect(EXPERIENCE_SLUGS).toEqual(['ncr-voyix-docs', 'starbucks-store-health']);
  });

  it('keeps the h1 and the title as separate strings, as the copy deck has them', () => {
    expect(findExperience('ncr-voyix-docs')).toMatchObject({
      h1: 'NCR Voyix docs site',
      title: 'NCR Voyix documentation site, work by Alex Cash',
    });
    expect(findExperience('starbucks-store-health')).toMatchObject({
      h1: 'Starbucks UK Store Health',
      title: 'Starbucks Store Health, work by Alex Cash',
    });
  });

  it('does not find a project slug as an experience page', () => {
    expect(findExperience('clipper')).toBeUndefined();
    expect(findProject('ncr-voyix-docs')).toBeUndefined();
  });
});

describe('not found copy', () => {
  it('has the route and slug variants', () => {
    expect(NOT_FOUND.title).toBe('Page not found, Alex Cash');
    expect(NOT_FOUND.route.h1).toBe("That page doesn't exist.");
    expect(NOT_FOUND.route.line).toBe('The address may have changed, or it was mistyped.');
    expect(NOT_FOUND.slug.h1).toBe('There is no project at that address.');
  });
});

describe('pageHref', () => {
  it('sends project slugs to /projects and experience slugs to /experience', () => {
    expect(pageHref('clipper')).toBe('/projects/clipper');
    expect(pageHref('ncr-voyix-docs')).toBe('/experience/ncr-voyix-docs');
  });
});

describe('copy rules', () => {
  const all = [
    HOME,
    ...PROJECT_SLUGS.map((s) => findProject(s)),
    ...EXPERIENCE_SLUGS.map((s) => findExperience(s)),
  ];

  it('keeps every description under 160 characters', () => {
    for (const page of all) {
      expect(page?.description.length, page?.title).toBeLessThan(160);
    }
  });

  it('has no em dashes in any string', () => {
    expect(JSON.stringify([all, NOT_FOUND])).not.toContain('—');
  });
});
