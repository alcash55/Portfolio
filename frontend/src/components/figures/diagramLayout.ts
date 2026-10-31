import type { Diagram, DiagramEdge, DiagramNode, Side } from '~/content/projects';

// All numbers are in the diagram's own units, which the SVG viewBox scales.
const NODE_W = 216;
const NODE_H = 72;
const PITCH = 266;
const MARGIN = 24;
const BADGE_R = 11;
const WRAP_AT = 21;
const STUB_LEN = 70;
const STUB_LABEL_ROOM = 110;
const HEAD_LEN = 10;
const HEAD_HALF = 6;
/** Candidate spots along an edge for its number badge, best first. */
const BADGE_SPOTS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.2, 0.8, 0.14, 0.86] as const;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Vec {
  readonly dx: number;
  readonly dy: number;
}

const DIR: Readonly<Record<Side, Vec>> = {
  r: { dx: 1, dy: 0 },
  l: { dx: -1, dy: 0 },
  t: { dx: 0, dy: -1 },
  b: { dx: 0, dy: 1 },
};

export interface TextLine {
  readonly text: string;
  readonly role: 'label' | 'sub';
  readonly x: number;
  readonly y: number;
}

export interface PlacedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly planned: boolean;
  readonly lines: readonly TextLine[];
}

interface PlacedEdgeBase {
  readonly path: string;
  readonly head: string;
  readonly planned: boolean;
  /** The flow number, or null for an edge that shares the sentence before it. */
  readonly number: number | null;
  /** Position in the reveal stagger. An unnumbered edge reveals with the edge before it. */
  readonly order: number;
  readonly badge: Point | null;
}

export type PlacedEdge =
  | (PlacedEdgeBase & { readonly kind: 'link' })
  | (PlacedEdgeBase & {
      readonly kind: 'exit';
      readonly label: Point & { readonly text: string };
    });

export interface Flow {
  readonly number: number;
  readonly text: string;
  readonly planned: boolean;
}

export interface DiagramLayout {
  readonly width: number;
  readonly height: number;
  readonly viewBox: string;
  readonly nodes: readonly PlacedNode[];
  readonly edges: readonly PlacedEdge[];
  readonly flows: readonly Flow[];
}

export function wrapLabel(label: string, max: number = WRAP_AT): readonly string[] {
  if (label.length <= max) return [label];
  const at = label.lastIndexOf(' ', max);
  if (at < 1) return [label];
  return [label.slice(0, at), label.slice(at + 1)];
}

function placeNode(node: DiagramNode): PlacedNode {
  const x = node.col * PITCH;
  const y = node.y;
  const lx = x + 16;
  const wrapped = wrapLabel(node.label);
  let lines: TextLine[];
  const [first, second] = wrapped;
  if (first !== undefined && second !== undefined) {
    lines = [
      { text: first, role: 'label', x: lx, y: y + 31 },
      { text: second, role: 'label', x: lx, y: y + 52 },
    ];
  } else if (node.sub) {
    lines = [
      { text: node.label, role: 'label', x: lx, y: y + 32 },
      { text: node.sub, role: 'sub', x: lx, y: y + 53 },
    ];
  } else {
    lines = [{ text: node.label, role: 'label', x: lx, y: y + 42 }];
  }
  return { id: node.id, x, y, planned: node.planned, lines };
}

function anchor(node: PlacedNode, side: Side, along: number | undefined): Point {
  const o = along ?? 0.5;
  switch (side) {
    case 'r':
      return { x: node.x + NODE_W, y: node.y + NODE_H * o };
    case 'l':
      return { x: node.x, y: node.y + NODE_H * o };
    case 't':
      return { x: node.x + NODE_W * o, y: node.y };
    case 'b':
      return { x: node.x + NODE_W * o, y: node.y + NODE_H };
    default: {
      const never: never = side;
      return never;
    }
  }
}

interface Curve {
  readonly a: Point;
  readonly b: Point;
  readonly c1: Point | null;
  readonly c2: Point | null;
}

/** Edge geometry before badges are placed, so badges can see every arrowhead. */
interface Drawn {
  readonly edge: DiagramEdge;
  readonly curve: Curve;
  readonly path: string;
  readonly head: string;
  readonly number: number | null;
  readonly order: number;
}

function pointOn(curve: Curve, t: number): Point {
  const { a, b, c1, c2 } = curve;
  if (!c1 || !c2) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/**
 * Ports the comp's two-pass layout. Pass one fixes every edge's geometry. Pass
 * two places each number badge where it clears the others, the nodes and the
 * arrowheads, because a badge on an edge must stay readable on a crowded row.
 */
export function layoutDiagram(diagram: Diagram): DiagramLayout {
  const nodes = diagram.nodes.map(placeNode);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const find = (id: string): PlacedNode => {
    const found = byId.get(id);
    if (!found) throw new Error(`Diagram edge points at unknown node "${id}"`);
    return found;
  };

  let maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
  let maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
  let count = 0;
  const drawn: Drawn[] = [];

  for (const edge of diagram.edges) {
    const numbered = edge.text !== null;
    if (numbered) count += 1;
    const number = numbered ? count : null;
    const order = count - 1;
    const from = anchor(find(edge.from), edge.fromSide, edge.fromAt);

    if (edge.kind === 'exit') {
      const b = { x: from.x + STUB_LEN, y: from.y };
      maxX = Math.max(maxX, b.x + STUB_LABEL_ROOM);
      drawn.push({
        edge,
        curve: { a: from, b, c1: null, c2: null },
        path: `M${from.x} ${from.y}L${b.x} ${b.y}`,
        head: `M${b.x - HEAD_LEN} ${b.y - HEAD_HALF}L${b.x} ${b.y}L${b.x - HEAD_LEN} ${b.y + HEAD_HALF}`,
        number,
        order,
      });
      continue;
    }

    const b = anchor(find(edge.to), edge.toSide, edge.toAt);
    const d0 = DIR[edge.fromSide];
    const dt = DIR[edge.toSide];
    const straight =
      (Math.abs(from.x - b.x) < 1 && d0.dx === 0 && dt.dx === 0) ||
      (Math.abs(from.y - b.y) < 1 && d0.dy === 0 && dt.dy === 0);
    let path: string;
    let c1: Point | null = null;
    let c2: Point | null = null;
    if (straight) {
      path = `M${from.x} ${from.y}L${b.x} ${b.y}`;
    } else {
      const opposite = d0.dx === -dt.dx && d0.dy === -dt.dy;
      const same = d0.dx === dt.dx && d0.dy === dt.dy;
      const reach = opposite
        ? Math.max(20, 0.5 * Math.abs(d0.dx ? b.x - from.x : b.y - from.y))
        : same
          ? 48
          : 40;
      c1 = { x: from.x + d0.dx * reach, y: from.y + d0.dy * reach };
      c2 = { x: b.x + dt.dx * reach, y: b.y + dt.dy * reach };
      path = `M${from.x} ${from.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
      // A loop under the nodes needs room below them.
      if (d0.dy === 1 && dt.dy === 1) maxY = Math.max(maxY, Math.max(from.y, b.y) + reach * 0.75);
    }
    const px = -dt.dy;
    const py = dt.dx;
    const head =
      `M${b.x + dt.dx * HEAD_LEN + px * HEAD_HALF} ${b.y + dt.dy * HEAD_LEN + py * HEAD_HALF}` +
      `L${b.x} ${b.y}` +
      `L${b.x + dt.dx * HEAD_LEN - px * HEAD_HALF} ${b.y + dt.dy * HEAD_LEN - py * HEAD_HALF}`;
    drawn.push({ edge, curve: { a: from, b, c1, c2 }, path, head, number, order });
  }

  // Pass two: badges.
  const placed: Point[] = [];
  const badges = new Map<Drawn, Point>();

  /** Null when the spot is clear, otherwise how far the nearest thing is (smaller is worse). */
  const overlap = (c: Point, g: Drawn): number | null => {
    for (const p of placed) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < 2 * BADGE_R + 6) return d;
    }
    for (const n of nodes) {
      const dx = Math.max(n.x - c.x, 0, c.x - (n.x + NODE_W));
      const dy = Math.max(n.y - c.y, 0, c.y - (n.y + NODE_H));
      const d = Math.hypot(dx, dy);
      if (d < BADGE_R + 4) return d;
    }
    for (const o of drawn) {
      if (o.edge.kind === 'link' && Math.hypot(c.x - o.curve.b.x, c.y - o.curve.b.y) < BADGE_R + 16) return 0;
    }
    if (g.edge.kind === 'exit' && c.x > g.curve.b.x - BADGE_R) return 0;
    return null;
  };

  for (const g of drawn) {
    if (g.number === null) continue;
    let best: Point | null = null;
    let bestScore = -1;
    for (const t of BADGE_SPOTS) {
      const c: Point =
        g.edge.kind === 'exit' ? { x: g.curve.a.x + 24, y: g.curve.a.y - 18 } : pointOn(g.curve, t);
      const score = overlap(c, g);
      if (score === null) {
        best = c;
        break;
      }
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best) {
      badges.set(g, best);
      placed.push(best);
    }
  }

  const edges: PlacedEdge[] = drawn.map((g) => {
    const base: PlacedEdgeBase = {
      path: g.path,
      head: g.head,
      planned: g.edge.kind === 'link' && g.edge.planned === true,
      number: g.number,
      order: g.order,
      badge: badges.get(g) ?? null,
    };
    if (g.edge.kind === 'exit') {
      return {
        ...base,
        kind: 'exit',
        label: { x: g.curve.b.x + 10, y: g.curve.b.y + 5, text: 'The build' },
      };
    }
    return { ...base, kind: 'link' };
  });

  const flows: Flow[] = [];
  for (const g of drawn) {
    if (g.number !== null && g.edge.text !== null) {
      flows.push({ number: g.number, text: g.edge.text, planned: g.edge.planned === true });
    }
  }

  const width = maxX + MARGIN;
  const height = maxY + MARGIN;
  return { width, height, viewBox: `${-MARGIN / 2} ${-MARGIN / 2} ${width} ${height}`, nodes, edges, flows };
}
