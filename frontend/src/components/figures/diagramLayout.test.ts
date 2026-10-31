import { describe, expect, it } from 'vitest';
import { DETAILS, DETAIL_SLUGS, type Diagram } from '~/content/projects';
import { layoutDiagram, wrapLabel } from './diagramLayout';

const NODE_W = 216;
const NODE_H = 72;
const BADGE_R = 11;

const pair: Diagram = {
  nodes: [
    { id: 'a', label: 'Browser', sub: 'Loads the page', col: 0, y: 0, planned: false },
    { id: 'b', label: 'Web host', sub: '', col: 1, y: 0, planned: false },
  ],
  edges: [{ kind: 'link', from: 'a', fromSide: 'r', to: 'b', toSide: 'l', text: 'Browser to Web host.' }],
  alt: 'x',
};

describe('wrapLabel', () => {
  it('keeps a short label on one line', () => {
    expect(wrapLabel('Chunk mesh builder')).toEqual(['Chunk mesh builder']);
  });

  it('breaks a long label at the last space before 21 characters', () => {
    expect(wrapLabel('Digital Connected Services API')).toEqual(['Digital Connected', 'Services API']);
  });

  it('leaves a long label with no space whole', () => {
    expect(wrapLabel('security/betterleaks-and-more-scanning')).toEqual([
      'security/betterleaks-and-more-scanning',
    ]);
  });
});

describe('layoutDiagram', () => {
  it('draws a straight edge between two nodes in a row, with an arrowhead on the target', () => {
    const { edges } = layoutDiagram(pair);
    const edge = edges[0];
    expect(edge?.path).toBe('M216 36L266 36');
    expect(edge?.head).toBe('M256 30L266 36L256 42');
  });

  it('sizes the canvas to the farthest node plus a 24 unit margin', () => {
    const layout = layoutDiagram(pair);
    expect(layout.width).toBe(266 + NODE_W + 24);
    expect(layout.height).toBe(NODE_H + 24);
    expect(layout.viewBox).toBe(`-12 -12 ${layout.width} ${layout.height}`);
  });

  it('numbers the edges that have a sentence, in order, and leaves the others bare', () => {
    const clipper = layoutDiagram(DETAILS.clipper.diagram);
    const numbers = clipper.edges.map((e) => e.number);
    expect(numbers).toEqual([1, null, 2, 3, 4, 5, 6, 7, 8]);
    expect(clipper.flows.map((f) => f.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('gives an edge with no number the stagger index of the edge before it', () => {
    const clipper = layoutDiagram(DETAILS.clipper.diagram);
    expect(clipper.edges.map((e) => e.order)).toEqual([0, 0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('lists each flow sentence once, and marks the planned ones', () => {
    const clipper = layoutDiagram(DETAILS.clipper.diagram);
    expect(clipper.flows.at(-1)).toEqual({
      number: 8,
      text: 'Daily run script to Fetch: starts the run. The script exists, and no schedule calls it yet.',
      planned: true,
    });
    expect(clipper.flows.filter((f) => f.planned)).toHaveLength(1);
  });

  it('turns an exit edge into a stub that reaches past the last node, labelled for the build', () => {
    const layout = layoutDiagram(DETAILS['vscode-royalty-theme'].diagram);
    const stub = layout.edges.find((e) => e.kind === 'exit');
    expect(stub).toMatchObject({ kind: 'exit', path: 'M482 216L552 216', head: 'M542 210L552 216L542 222' });
    expect(stub?.label).toEqual({ x: 562, y: 221, text: 'The build' });
  });

  it('wraps a long label onto two lines and puts a subtitle under a short one', () => {
    const dcs = layoutDiagram(DETAILS['starbucks-store-health'].diagram).nodes.find((n) => n.id === 'api');
    expect(dcs?.lines.map((l) => l.text)).toEqual(['Digital Connected', 'Services API']);
    const host = layoutDiagram(DETAILS['portfolio-website'].diagram).nodes.find((n) => n.id === 'browser');
    expect(host?.lines).toEqual([
      { text: 'Browser', role: 'label', x: 16, y: 32 },
      { text: 'Loads the page', role: 'sub', x: 16, y: 53 },
    ]);
    const solo = layoutDiagram(pair).nodes.find((n) => n.id === 'b');
    expect(solo?.lines).toEqual([{ text: 'Web host', role: 'label', x: 282, y: 42 }]);
  });

  it('carries the planned flag on nodes and edges, and the drawn x from the column', () => {
    const golem = layoutDiagram(DETAILS['golem-miners'].diagram);
    expect(golem.nodes.find((n) => n.id === 'fish')).toMatchObject({ planned: true, x: 2 * 266, y: 150 });
    expect(golem.edges.filter((e) => e.planned)).toHaveLength(1);
  });

  it.each(DETAIL_SLUGS)('%s: no badge touches another badge, a node, or an arrowhead', (slug) => {
    const layout = layoutDiagram(DETAILS[slug].diagram);
    const badges = layout.edges.flatMap((e) => (e.badge ? [e.badge] : []));
    expect(badges).toHaveLength(layout.flows.length);
    badges.forEach((a, i) => {
      badges.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${slug}: badges ${i}`).toBeGreaterThanOrEqual(2 * BADGE_R);
      });
      layout.nodes.forEach((n) => {
        const dx = Math.max(n.x - a.x, 0, a.x - (n.x + NODE_W));
        const dy = Math.max(n.y - a.y, 0, a.y - (n.y + NODE_H));
        expect(Math.hypot(dx, dy), `${slug}: badge ${i} vs ${n.id}`).toBeGreaterThanOrEqual(BADGE_R);
      });
    });
  });

  it.each(DETAIL_SLUGS)('%s: every node sits inside the canvas', (slug) => {
    const layout = layoutDiagram(DETAILS[slug].diagram);
    for (const n of layout.nodes) {
      expect(n.x + NODE_W).toBeLessThanOrEqual(layout.width - 12);
      expect(n.y + NODE_H).toBeLessThanOrEqual(layout.height - 12);
    }
  });
});
