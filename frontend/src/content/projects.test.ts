import { describe, expect, it } from 'vitest';
import { EXPERIENCE_SLUGS, PROJECT_SLUGS, findExperience, findProject } from './pages';
import { siteStats, testCountStat } from '~/lib/siteStats';
import { EXPERIENCE } from './people';
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
      'portfolio-website': 9,
      'game-competition-website': 13,
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
    expect(golem.links).toEqual([
      { label: 'Play in your browser', href: '/play/golem-miners/', desktopOnly: true },
    ]);
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

  it('keeps the two NCR pages image-free, with a status line and no actions', () => {
    for (const slug of EXPERIENCE_SLUGS) {
      const d = DETAILS[slug];
      expect(d.media.kind).toBe('none');
      expect(d.status).toBeDefined();
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

  it('states no check count for the NCR pull request step, since no source gives one', () => {
    const labels = strings(DETAILS['ncr-voyix-docs'].diagram);
    expect(labels.filter((s) => /\b(three|3)\s+checks?\b/i.test(s))).toEqual([]);
    expect(labels).toContain('Spelling, Markdown, alt text');
  });

  it('keeps only the rows that carry a number the page does not already say', () => {
    const figures = (slug: Detail['slug']) => DETAILS[slug].stats?.map((f) => f.figure);
    // The last Portfolio stat comes from the generated test counts and is absent when they are unknown.
    const countStat = testCountStat(siteStats);
    expect(figures('portfolio-website')).toEqual([
      '10×',
      '50 to 2',
      '35 of 40',
      ...(countStat ? [countStat.figure] : []),
    ]);
    expect(figures('game-competition-website')).toEqual(['888', '422 to 22 KB']);
    expect(figures('ac-composite-actions')).toEqual(['11', '26 min', '36']);
    expect(figures('clipper')).toEqual(['3.0', '387', '8 of 8']);
    expect(figures('golem-miners')).toEqual(['1,815', '7 GB to 198 MB']);
    expect(figures('vscode-royalty-theme')).toEqual(['174 of 174', '8.1:1', '241 to 43', '187']);
  });

  it('gives the two NCR pages no stats, since their rows only restated the text', () => {
    expect(DETAILS['ncr-voyix-docs'].stats).toBeUndefined();
    expect(DETAILS['starbucks-store-health'].stats).toBeUndefined();
  });

  it('labels every stat, and keeps the VS Code install caveat beside its number', () => {
    for (const d of all) {
      for (const stat of d.stats ?? []) {
        expect(stat.figure.trim(), `${d.slug} figure`).not.toBe('');
        expect(stat.label.trim(), `${d.slug} ${stat.figure}`).not.toBe('');
      }
    }
    const installs = DETAILS['vscode-royalty-theme'].stats?.at(-1);
    expect(installs?.label).toBe(
      'installs on the Visual Studio Marketplace. The listing still serves version 2.2.0, and v3.0.0 is on GitHub, not yet published.',
    );
  });

  it('ends the Portfolio Website stats with the unit test count from the build', () => {
    if (siteStats.unitTests === null) return;
    const last = DETAILS['portfolio-website'].stats?.at(-1);
    expect(last?.label).toContain(`${siteStats.unitTests.toLocaleString('en-US')} unit`);
    expect(last?.label).toMatch(/gate every deploy/);
  });

  it('counts paragraphs and stats per page', () => {
    expect(
      Object.fromEntries(all.map((d) => [d.slug, [d.built.length, d.stats?.length ?? 0]])),
    ).toEqual({
      'portfolio-website': [2, testCountStat(siteStats) ? 4 : 3],
      'game-competition-website': [5, 2],
      'ac-composite-actions': [4, 3],
      clipper: [3, 3],
      'golem-miners': [6, 2],
      'vscode-royalty-theme': [2, 4],
      'ncr-voyix-docs': [5, 0],
      'starbucks-store-health': [5, 0],
    });
  });
});

describe('experience highlights', () => {
  const builtText = (slug: Detail['slug']) => DETAILS[slug].built.join('\n');

  it('keeps the home chapter for a role with a write-up free of the bullets and stack line', () => {
    for (const spec of EXPERIENCE.filter((e) => e.writeUp)) {
      expect('more' in spec, `${spec.id} more`).toBe(false);
      expect('stack' in spec, `${spec.id} stack`).toBe(false);
    }
  });

  it('keeps the bullets and stack for the one role with no write-up', () => {
    const bare = EXPERIENCE.filter((e) => !e.writeUp);
    expect(bare.map((e) => e.id)).toEqual(['experience']);
  });

  it('carries the Voyix bullets that the write-up did not already say', () => {
    const text = builtText('ncr-voyix-docs');
    expect(text).toContain('Commerce Design Docs that product teams build against');
    expect(text).toContain('static analysis composite GitHub Actions that gate every merge');
    // The other four bullets were already in the write-up, so they are said once.
    expect(text.match(/review comment updates/g)).toHaveLength(1);
    expect(text.match(/analytics pipelines/gi)).toHaveLength(1);
  });

  it('carries the Store Health instrumentation detail in one sentence with Tag Manager', () => {
    const text = builtText('starbucks-store-health');
    expect(text).toContain(
      'instrumented digital connected services with Google Tag Manager and FullStory',
    );
    expect(text.match(/Google Tag Manager/g)).toHaveLength(1);
    expect(text).toContain('7/2020 to 9/2020');
    expect(text).toContain('Slack');
  });

  it('shows the same stack line on a write-up as the role had on the home page', () => {
    expect(DETAILS['ncr-voyix-docs'].stack).toBe(
      'Next.js, Strapi, remark, GitHub Actions, BigQuery, Looker',
    );
    expect(DETAILS['starbucks-store-health'].stack).toBe(
      'React, MUI, Figma, FigJam, Design Systems, Accessibility, Google Tag Manager',
    );
  });
});
