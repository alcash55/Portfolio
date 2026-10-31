import type { HomeDiagram, HomeNode, HomePoint } from '~/content/projects';

// All numbers are in the diagram's own units, which the SVG viewBox scales.
const MARGIN = 8;
const LINE_STEP = 22;
/** Distance from a line's center to its baseline, for the 15 and 16 unit type used here. */
const BASELINE_DROP = 5;
const CORNER = 8;
const HEAD_LEN = 10;
const HEAD_HALF = 6;
const CHIP_W = 96;
const CHIP_H = 30;
const CHIP_GAP = 24;
const CHIP_TOP = 70;
const CHIP_ARROW_INSET = 4;
const CHIP_HEAD = 6;
/** A node that holds chips keeps its text at the top, above them. */
const TEXT_TOP_WITH_CHIPS = 26;

export interface HomeTextLine {
  readonly text: string;
  readonly role: 'label' | 'sub';
  readonly x: number;
  readonly y: number;
}

export interface HomeChip {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly text: string;
  /** Text anchor, centered in the chip. */
  readonly tx: number;
  readonly ty: number;
}

export interface HomePlacedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly lines: readonly HomeTextLine[];
  readonly chips: readonly HomeChip[];
  /** The arrow between the chips, as one path, or null for a node without chips. */
  readonly chipArrow: string | null;
}

export interface HomePlacedEdge {
  readonly path: string;
  readonly head: string;
  /** Position in the reveal stagger. */
  readonly order: number;
  /** The first and last point, kept so a test can check both ends sit on a node. */
  readonly start: HomePoint;
  readonly end: HomePoint;
}

export interface HomeDiagramLayout {
  readonly viewBox: string;
  readonly nodes: readonly HomePlacedNode[];
  readonly edges: readonly HomePlacedEdge[];
}

function placeNode(node: HomeNode): HomePlacedNode {
  const rows: readonly { text: string; role: 'label' | 'sub' }[] = [
    ...node.label.map((text) => ({ text, role: 'label' as const })),
    ...node.sub.map((text) => ({ text, role: 'sub' as const })),
  ];
  const chipTexts = node.chips ?? [];
  const first =
    chipTexts.length > 0
      ? node.y + TEXT_TOP_WITH_CHIPS
      : node.y + node.h / 2 - ((rows.length - 1) * LINE_STEP) / 2 + BASELINE_DROP;
  const cx = node.x + node.w / 2;
  const lines = rows.map((row, i) => ({ ...row, x: cx, y: first + i * LINE_STEP }));

  const rowWidth = chipTexts.length * CHIP_W + (chipTexts.length - 1) * CHIP_GAP;
  const chipY = node.y + CHIP_TOP;
  const chips = chipTexts.map((text, i) => {
    const x = node.x + (node.w - rowWidth) / 2 + i * (CHIP_W + CHIP_GAP);
    return {
      x,
      y: chipY,
      w: CHIP_W,
      h: CHIP_H,
      text,
      tx: x + CHIP_W / 2,
      ty: chipY + CHIP_H / 2 + BASELINE_DROP,
    };
  });
  const [a, b] = chips;
  let chipArrow: string | null = null;
  if (a && b) {
    const y = chipY + CHIP_H / 2;
    const from = a.x + a.w + CHIP_ARROW_INSET;
    const to = b.x - CHIP_ARROW_INSET;
    chipArrow =
      `M${from} ${y}H${to}` +
      `M${to - CHIP_HEAD} ${y - CHIP_HEAD}L${to} ${y}L${to - CHIP_HEAD} ${y + CHIP_HEAD}`;
  }
  return { id: node.id, x: node.x, y: node.y, w: node.w, h: node.h, lines, chips, chipArrow };
}

/** A polyline with each corner rounded by a quarter circle. Two points make a plain line. */
function roundedPath(points: readonly HomePoint[]): string {
  const first = points[0];
  if (!first) return '';
  let d = `M${first[0]} ${first[1]}`;
  if (points.length === 2) {
    const last = points[1];
    return last ? `${d}L${last[0]} ${last[1]}` : d;
  }
  let at: HomePoint = first;
  for (let i = 1; i < points.length; i += 1) {
    const corner = points[i];
    const next = points[i + 1];
    if (!corner) break;
    if (!next) {
      d += moveAlong(at, corner);
      break;
    }
    const inDir = unit(at, corner);
    const outDir = unit(corner, next);
    const before: HomePoint = [corner[0] - inDir[0] * CORNER, corner[1] - inDir[1] * CORNER];
    const after: HomePoint = [corner[0] + outDir[0] * CORNER, corner[1] + outDir[1] * CORNER];
    d += `${moveAlong(at, before)}Q${corner[0]} ${corner[1]} ${after[0]} ${after[1]}`;
    at = after;
  }
  return d;
}

/** A vertical or horizontal move to the point, whichever axis the two share. */
function moveAlong(from: HomePoint, to: HomePoint): string {
  return from[0] === to[0] ? `V${to[1]}` : `H${to[0]}`;
}

function unit(from: HomePoint, to: HomePoint): HomePoint {
  return [Math.sign(to[0] - from[0]), Math.sign(to[1] - from[1])];
}

function arrowHead(from: HomePoint, to: HomePoint): string {
  const [dx, dy] = unit(from, to);
  const backX = to[0] - dx * HEAD_LEN;
  const backY = to[1] - dy * HEAD_LEN;
  // The two barbs sit on the axis across the line, so their offsets use |dy| and |dx|.
  const ox = Math.abs(dy) * HEAD_HALF;
  const oy = Math.abs(dx) * HEAD_HALF;
  return `M${backX - ox} ${backY - oy}L${to[0]} ${to[1]}L${backX + ox} ${backY + oy}`;
}

export function layoutHomeDiagram(diagram: HomeDiagram): HomeDiagramLayout {
  const nodes = diagram.nodes.map(placeNode);
  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + n.h));
  const edges = diagram.edges.map((edge, order): HomePlacedEdge => {
    const start = edge.points[0];
    const end = edge.points.at(-1);
    const before = edge.points.at(-2);
    if (!start || !end || !before) {
      throw new Error(`Diagram "${diagram.key}" has an edge with fewer than two points`);
    }
    return {
      path: roundedPath(edge.points),
      head: arrowHead(before, end),
      order,
      start,
      end,
    };
  });
  return {
    viewBox: `${-MARGIN} ${-MARGIN} ${maxX + 2 * MARGIN} ${maxY + 2 * MARGIN}`,
    nodes,
    edges,
  };
}
