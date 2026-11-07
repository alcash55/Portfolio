import { describe, expect, it } from 'vitest';
import { CHAPTER_GROUPS } from '~/content/home';
import { EXPERIENCE_SLUGS, PROJECT_SLUGS } from '~/content/pages';
import { homeAnchor } from './homeAnchor';

const CHAPTER_IDS = new Set(CHAPTER_GROUPS.flatMap((group) => group.items.map((item) => item.id)));

describe('homeAnchor', () => {
  it('sends a project back to its own chapter', () => {
    expect(homeAnchor('ac-composite-actions')).toBe('ac-composite-actions');
    expect(homeAnchor('golem-miners')).toBe('golem-miners');
  });

  it('keeps the first project on the shared projects anchor', () => {
    expect(homeAnchor('portfolio-website')).toBe('projects');
  });

  it('sends an experience write-up back to its role, not the first one', () => {
    expect(homeAnchor('ncr-voyix-docs')).toBe('ncr-voyix');
    expect(homeAnchor('starbucks-store-health')).toBe('ncr-store-health');
  });

  it.each([...PROJECT_SLUGS, ...EXPERIENCE_SLUGS])(
    'lands %s on a chapter that exists on the home page',
    (slug) => {
      expect(CHAPTER_IDS, `no home chapter has the id "${homeAnchor(slug)}"`).toContain(
        homeAnchor(slug),
      );
    },
  );
});
