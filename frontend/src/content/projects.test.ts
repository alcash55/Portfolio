import { describe, expect, it } from 'vitest';
import { EXPERIENCE_SLUGS, PROJECT_SLUGS, findExperience, findProject } from './pages';
import { DETAILS, DETAIL_SLUGS, countFlows, getDetail, nextAfter, type Detail } from './projects';

const all: readonly Detail[] = DETAIL_SLUGS.map((slug) => DETAILS[slug]);

/** Every string reachable from a value, so one check covers every field. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('project and experience data', () => {
  it('has one entry per page the router knows, named like its h1', () => {
    expect([...DETAIL_SLUGS].sort()).toEqual([...PROJECT_SLUGS, ...EXPERIENCE_SLUGS].sort());
    for (const detail of all) {
      const page = findProject(detail.slug) ?? findExperience(detail.slug);
      expect(detail.name, `name of ${detail.slug}`).toBe(page?.h1);
    }
  });

  it('files the two NCR pages under experience and the rest under projects', () => {
    expect(all.filter((d) => d.kind === 'experience').map((d) => d.slug)).toEqual([
      'ncr-voyix-docs',
      'starbucks-store-health',
    ]);
    expect(all.filter((d) => d.kind === 'project')).toHaveLength(6);
  });

  it('links each page to the next one in its own list, and ends with null', () => {
    expect(nextAfter('portfolio-website')?.slug).toBe('game-competition-website');
    expect(nextAfter('golem-miners')?.slug).toBe('vscode-royalty-theme');
    expect(nextAfter('vscode-royalty-theme')).toBeNull();
    expect(nextAfter('ncr-voyix-docs')?.slug).toBe('starbucks-store-health');
    expect(nextAfter('starbucks-store-health')).toBeNull();
  });

  it('looks a slug up, and returns undefined for one that has no page', () => {
    expect(getDetail('clipper')?.name).toBe('Clipper');
    expect(getDetail('no-such-project')).toBeUndefined();
  });

  it('draws only edges between nodes that exist', () => {
    for (const { slug, diagram } of all) {
      const ids = new Set(diagram.nodes.map((n) => n.id));
      expect(ids.size, `${slug} node ids are unique`).toBe(diagram.nodes.length);
      for (const edge of diagram.edges) {
        expect(ids.has(edge.from), `${slug}: ${edge.from}`).toBe(true);
        if (edge.kind === 'link') expect(ids.has(edge.to), `${slug}: ${edge.to}`).toBe(true);
      }
    }
  });

  it('numbers the flows the way the diagram write-ups count them', () => {
    expect(Object.fromEntries(all.map((d) => [d.slug, countFlows(d.diagram)]))).toEqual({
      'portfolio-website': 8,
      'game-competition-website': 7,
      'ac-composite-actions': 7,
      clipper: 8,
      'golem-miners': 7,
      'vscode-royalty-theme': 5,
      'ncr-voyix-docs': 8,
      'starbucks-store-health': 7,
    });
  });

  it('names every node in at least one flow, so the text version lists them all', () => {
    for (const { slug, diagram } of all) {
      const flows = diagram.edges.flatMap((e) => (e.text ? [e.text] : [])).join(' ');
      for (const node of diagram.nodes) {
        expect(flows, `${slug}: ${node.label}`).toContain(node.label);
      }
    }
  });

  it('never gives a node a subtitle that a two-line label would hide', () => {
    for (const { slug, diagram } of all) {
      for (const node of diagram.nodes) {
        if (node.label.length > 21) expect(node.sub, `${slug}: ${node.label}`).toBe('');
      }
    }
  });

  it('draws the planned links dashed: the Golem FishNet edge, Clipper schedule and Marketplace', () => {
    const planned = (slug: Detail['slug']) =>
      DETAILS[slug].diagram.edges.filter((e) => e.planned).map((e) => e.from);
    expect(planned('golem-miners')).toEqual(['sb']);
    expect(planned('clipper')).toEqual(['run']);
    expect(planned('vscode-royalty-theme')).toEqual(['json']);
    expect(planned('portfolio-website')).toEqual([]);
  });

  it('gives the AC page a diagram and no media, so no checks figure follows it', () => {
    expect(DETAILS['ac-composite-actions'].media).toEqual({ kind: 'none' });
  });

  it('gives Golem Miners a gallery with the Camp clip, a status line and a play note', () => {
    const golem = DETAILS['golem-miners'];
    expect(golem.status?.role).toBe('Prototype.');
    expect(golem.playNote).toMatch(/^Single-player, about 62 MB/);
    expect(golem.links).toEqual([{ label: 'Play in your browser', href: '/play/golem-miners/' }]);
    expect(golem.media.kind).toBe('gallery');
    if (golem.media.kind === 'gallery') {
      expect(golem.media.slides.map((s) => s.caption)).toEqual(['Camp']);
      expect(golem.media.slides[0].src).toBe('/media/golem-gameplay.mp4');
    }
  });

  it('points every recording and poster at a file under /media', () => {
    for (const { slug, media } of all) {
      if (media.kind === 'reveal') {
        expect(media.src, slug).toMatch(/^\/media\/[a-z-]+\.mp4$/);
        expect(media.poster, slug).toMatch(/^\/media\/[a-z-]+-poster\.webp$/);
      }
    }
  });

  it('keeps the two NCR pages image-free, with a status line and an owner notice', () => {
    for (const slug of EXPERIENCE_SLUGS) {
      const d = DETAILS[slug];
      expect(d.media.kind).toBe('none');
      expect(d.status).toBeDefined();
      expect(d.notice).toBe('The code belongs to NCR.');
      expect(d.links).toEqual([]);
    }
  });

  it('ships no comp-only placeholder and no em dash in any string', () => {
    for (const { slug, ...rest } of all) {
      for (const s of strings(rest)) {
        expect(s, `${slug}: ${s}`).not.toMatch(/\[[A-Z ]+(?::[^\]]*)?\]/);
        expect(s, `${slug}: ${s}`).not.toContain('—');
      }
    }
  });

  it('carries the measured facts as written, with the cut rows left out', () => {
    const leads = (slug: Detail['slug']) => DETAILS[slug].facts.map((f) => f.lead);
    expect(leads('portfolio-website')).toEqual([
      '10 times lighter',
      '50 requests, 2 calls',
      '502 to 200',
      '35 of 40 blocked',
    ]);
    expect(leads('vscode-royalty-theme').at(-1)).toBe('187 installs');
    expect(DETAILS['vscode-royalty-theme'].facts.at(-1)?.body).toBe(
      '187 installs on the Visual Studio Marketplace. The listing still serves version 2.2.0, and v3.0.0 is on GitHub, not yet published.',
    );
    expect(leads('clipper')).toEqual([
      '3.0 faces per frame',
      '58 seconds, 1080x1920',
      '387 tests',
      '8 of 8',
    ]);
    expect(leads('ac-composite-actions')).toEqual([
      '11 repos',
      '26 minutes',
      '33 files, not 30',
      '36 tests',
    ]);
  });

  it('counts paragraphs and facts per page', () => {
    expect(Object.fromEntries(all.map((d) => [d.slug, [d.built.length, d.facts.length]]))).toEqual({
      'portfolio-website': [2, 4],
      'game-competition-website': [3, 3],
      'ac-composite-actions': [4, 4],
      clipper: [3, 4],
      'golem-miners': [6, 3],
      'vscode-royalty-theme': [2, 4],
      'ncr-voyix-docs': [4, 2],
      'starbucks-store-health': [5, 2],
    });
  });
});
