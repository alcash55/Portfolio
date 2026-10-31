import { describe, expect, it } from 'vitest';
import { HOME_DIAGRAMS } from '~/content/projects';
import { layoutHomeDiagram } from './homeDiagramLayout';

const solea = layoutHomeDiagram(HOME_DIAGRAMS.solea);
const voyix = layoutHomeDiagram(HOME_DIAGRAMS['ncr-voyix']);
const health = layoutHomeDiagram(HOME_DIAGRAMS['ncr-store-health']);

describe('layoutHomeDiagram', () => {
  it('sizes the canvas to the farthest node plus an 8 unit margin on every side', () => {
    expect(solea.viewBox).toBe('-8 -8 456 524');
    expect(voyix.viewBox).toBe('-8 -8 456 468');
    expect(health.viewBox).toBe('-8 -8 456 518');
  });

  it('centres each text line in its node and stacks them 22 units apart', () => {
    const iso = solea.nodes.find((n) => n.id === 'iso');
    expect(iso?.lines).toEqual([
      { text: 'Seven ISO submission APIs', role: 'label', x: 220, y: 441 },
      { text: 'CAISO, ERCOT, MISO, NEISO,', role: 'sub', x: 220, y: 463 },
      { text: 'NYISO, PJM, SPP', role: 'sub', x: 220, y: 485 },
    ]);
    const traders = solea.nodes.find((n) => n.id === 'traders');
    expect(traders?.lines).toEqual([{ text: 'Traders', role: 'label', x: 220, y: 29 }]);
  });

  it('names the Voyix source node with the Markdown line from the comp', () => {
    const repos = voyix.nodes.find((n) => n.id === 'repos');
    expect(repos?.lines.map((l) => l.text)).toEqual([
      'Product team repos',
      'Markdown stays with the team',
    ]);
  });

  it('closes the Store Health workflow on a country-level view', () => {
    const last = health.nodes.find((n) => n.id === 'present');
    expect(last?.lines.map((l) => l.text)).toEqual([
      'Management presentations',
      'Country-level view',
    ]);
  });

  it('draws an elbow with rounded corners and an arrowhead that ends on the target', () => {
    expect(solea.edges[0]).toMatchObject({
      path: 'M150 48V64Q150 72 142 72H108Q100 72 100 80V96',
      head: 'M94 86L100 96L106 86',
      order: 0,
    });
  });

  it('draws a straight edge as one line, and points the head along it', () => {
    expect(solea.edges[2]).toMatchObject({
      path: 'M220 48L220 204',
      head: 'M214 194L220 204L226 194',
    });
    expect(voyix.edges[5]).toMatchObject({
      path: 'M290 414L250 414',
      head: 'M260 408L250 414L260 420',
    });
  });

  it('numbers the stagger from the first edge, one step per edge', () => {
    expect(solea.edges.map((e) => e.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('places the chips of a container side by side with a short arrow between them', () => {
    const dashboard = health.nodes.find((n) => n.id === 'dashboard');
    expect(dashboard?.lines.map((l) => [l.text, l.y])).toEqual([
      ['React dashboard', 314],
      ['Live API data', 336],
    ]);
    expect(dashboard?.chips).toEqual([
      { x: 17, y: 358, w: 96, h: 30, text: 'Store', tx: 65, ty: 378 },
      { x: 137, y: 358, w: 96, h: 30, text: 'Country', tx: 185, ty: 378 },
    ]);
    expect(dashboard?.chipArrow).toBe('M117 373H133M127 367L133 373L127 379');
  });

  it('gives a node without chips no chip arrow', () => {
    const traders = solea.nodes.find((n) => n.id === 'traders');
    expect(traders?.chips).toEqual([]);
    expect(traders?.chipArrow).toBeNull();
  });
});
