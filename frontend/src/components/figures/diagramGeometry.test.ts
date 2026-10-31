import { describe, expect, it } from 'vitest';
import {
  DETAIL_SLUGS,
  DETAILS,
  HOME_DIAGRAMS,
  type Diagram,
  type HomeDiagram,
} from '~/content/projects';
import { detailDiagramProblems, homeDiagramProblems } from './diagramGeometryKit';

const HOME_KEYS = Object.keys(HOME_DIAGRAMS) as (keyof typeof HOME_DIAGRAMS)[];

describe('every diagram that renders', () => {
  it('covers each detail page and each home chapter diagram', () => {
    expect(DETAIL_SLUGS.length).toBeGreaterThan(0);
    expect(HOME_KEYS).toEqual(['solea', 'ncr-voyix', 'ncr-store-health']);
  });

  it.each(DETAIL_SLUGS)(
    '%s: nodes do not overlap, labels fit, every edge starts and ends on a node',
    (slug) => {
      expect(detailDiagramProblems(slug, DETAILS[slug].diagram)).toEqual([]);
    },
  );

  it.each(HOME_KEYS)(
    '%s: nodes do not overlap, labels and chips fit, every edge starts and ends on a node',
    (key) => {
      expect(homeDiagramProblems(HOME_DIAGRAMS[key])).toEqual([]);
    },
  );
});

// The checks above only mean something if they fail on a broken drawing.
describe('the geometry checks catch a broken drawing', () => {
  const solea: HomeDiagram = HOME_DIAGRAMS.solea;
  const voyix: HomeDiagram = HOME_DIAGRAMS['ncr-voyix'];
  const health: HomeDiagram = HOME_DIAGRAMS['ncr-store-health'];

  it('flags two home nodes that overlap', () => {
    const broken: HomeDiagram = {
      ...solea,
      nodes: solea.nodes.map((n) => (n.id === 'mfe' ? { ...n, x: 150 } : n)),
    };
    expect(homeDiagramProblems(broken)).toContain('solea: nodes "excel" and "mfe" overlap');
  });

  it('flags a home edge that ends in empty space', () => {
    const [first, ...rest] = solea.edges;
    if (!first) throw new Error('solea has no edges');
    const points = first.points.map((p, i, all) =>
      i === all.length - 1 ? ([p[0], p[1] - 12] as const) : p,
    );
    const broken: HomeDiagram = { ...solea, edges: [{ points }, ...rest] };
    expect(homeDiagramProblems(broken)).toEqual([
      'solea: edge 0 ends at 100,84, which is on no node',
    ]);
  });

  it('flags a home label wider than its node', () => {
    const broken: HomeDiagram = {
      ...voyix,
      nodes: voyix.nodes.map((n) =>
        n.id === 'comment' ? { ...n, label: ['PR comment on every commit'] } : n,
      ),
    };
    expect(homeDiagramProblems(broken)).toEqual([
      'ncr-voyix: label "PR comment on every commit" in "comment" is clipped: it needs 208 units and the node leaves 146',
    ]);
  });

  it('flags a chip that sticks out of its node and a label that runs into the chips', () => {
    const broken: HomeDiagram = {
      ...health,
      nodes: health.nodes.map((n) =>
        n.id === 'dashboard' ? { ...n, h: 80, sub: ['Live API data', 'Updated hourly'] } : n,
      ),
    };
    const problems = homeDiagramProblems(broken);
    expect(problems).toContain('ncr-store-health: chip "Store" sticks out of "dashboard"');
    expect(problems.some((p) => p.includes('runs into the chips'))).toBe(true);
  });

  it('flags two detail nodes that overlap, and a detail label that does not fit', () => {
    const base = DETAILS['portfolio-website'].diagram;
    const [a, b, ...rest] = base.nodes;
    if (!a || !b) throw new Error('portfolio-website needs two nodes');
    const overlapping: Diagram = {
      ...base,
      nodes: [a, { ...b, col: a.col, y: a.y + 20 }, ...rest],
    };
    expect(detailDiagramProblems('portfolio-website', overlapping)).toContain(
      `portfolio-website: nodes "${a.id}" and "${b.id}" overlap`,
    );
    const long: Diagram = {
      ...base,
      nodes: [{ ...a, label: 'Browser', sub: 'Loads the whole page and every script' }, b, ...rest],
    };
    expect(
      detailDiagramProblems('portfolio-website', long).some((p) => p.includes('is clipped')),
    ).toBe(true);
  });
});
