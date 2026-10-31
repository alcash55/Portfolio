import type { Diagram, HomeDiagram, HomePoint } from '~/content/projects';
import { layoutDiagram, NODE_H, NODE_W } from './diagramLayout';
import { layoutHomeDiagram } from './homeDiagramLayout';

/**
 * Geometry checks shared by the detail diagrams and the home diagrams. Each check
 * returns a list of plain sentences, so a failing test says which diagram, which
 * node and by how much. An empty list means the drawing is sound.
 */

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface Label {
  readonly text: string;
  /** Font size in the diagram's own units. */
  readonly size: number;
  /** x of the text anchor, and which way the text runs from it. */
  readonly x: number;
  readonly anchor: 'start' | 'middle';
  /** Baseline. */
  readonly y: number;
}

interface Shape {
  readonly id: string;
  readonly box: Box;
  readonly labels: readonly Label[];
  /** The gap to keep between the text and the node's left and right edge. */
  readonly pad: number;
}

/**
 * Average advance of one character as a share of the font size, for the site's
 * sans face (Geist) at weight 400 to 500. It is an estimate for a fast check in
 * the unit run, set at the low end of the long-phrase range (0.50 to 0.54 in
 * Chromium) so sound copy passes. Short words with wide letters measure up to 0.62,
 * so the browser check in e2e/diagram-geometry.spec.ts measures the real text and
 * has the last word.
 */
export const CHAR_EM = 0.5;
const ASCENT = 0.75;
const DESCENT = 0.25;
const TOUCH = 0.5;

export function textWidth(text: string, size: number): number {
  return text.length * size * CHAR_EM;
}

function span(label: Label): readonly [number, number] {
  const w = textWidth(label.text, label.size);
  return label.anchor === 'middle' ? [label.x - w / 2, label.x + w / 2] : [label.x, label.x + w];
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inside(inner: Box, outer: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

function onBorder(p: HomePoint, b: Box): boolean {
  const [x, y] = p;
  const withinX = x >= b.x - TOUCH && x <= b.x + b.w + TOUCH;
  const withinY = y >= b.y - TOUCH && y <= b.y + b.h + TOUCH;
  const near = (edge: number, value: number) => Math.abs(value - edge) <= TOUCH;
  return (
    (withinY && (near(b.x, x) || near(b.x + b.w, x))) ||
    (withinX && (near(b.y, y) || near(b.y + b.h, y)))
  );
}

function strictlyInside(p: HomePoint, b: Box): boolean {
  return (
    p[0] > b.x + TOUCH && p[0] < b.x + b.w - TOUCH && p[1] > b.y + TOUCH && p[1] < b.y + b.h - TOUCH
  );
}

function nodeProblems(name: string, shapes: readonly Shape[]): string[] {
  const out: string[] = [];
  shapes.forEach((a, i) => {
    shapes.slice(i + 1).forEach((b) => {
      if (overlaps(a.box, b.box)) out.push(`${name}: nodes "${a.id}" and "${b.id}" overlap`);
    });
    for (const label of a.labels) {
      const [left, right] = span(label);
      const edgeL = a.box.x + a.pad;
      const edgeR = a.box.x + a.box.w - a.pad;
      if (left < edgeL || right > edgeR) {
        // Centered text has room on both sides of its anchor, left-anchored text only to the right.
        const room =
          label.anchor === 'middle'
            ? 2 * Math.min(label.x - edgeL, edgeR - label.x)
            : edgeR - label.x;
        out.push(
          `${name}: label "${label.text}" in "${a.id}" is clipped: it needs ${Math.round(right - left)} units and the node leaves ${Math.round(room)}`,
        );
      }
      if (
        label.y - label.size * ASCENT < a.box.y ||
        label.y + label.size * DESCENT > a.box.y + a.box.h
      ) {
        out.push(
          `${name}: label "${label.text}" in "${a.id}" runs past the top or bottom of the node`,
        );
      }
    }
  });
  return out;
}

// ---------- Detail diagrams ----------

const DETAIL_PAD = 2;
const DETAIL_LABEL = 17;
const DETAIL_SUB = 14;
const STUB_LABEL = 14;
const CANVAS_MARGIN = 12;

function numbersOf(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

export function detailDiagramProblems(name: string, diagram: Diagram): string[] {
  const layout = layoutDiagram(diagram);
  const shapes: Shape[] = layout.nodes.map((n) => ({
    id: n.id,
    box: { x: n.x, y: n.y, w: NODE_W, h: NODE_H },
    pad: DETAIL_PAD,
    labels: n.lines.map((line) => ({
      text: line.text,
      size: line.role === 'label' ? DETAIL_LABEL : DETAIL_SUB,
      x: line.x,
      anchor: 'start',
      y: line.y,
    })),
  }));
  const out = nodeProblems(name, shapes);

  layout.edges.forEach((edge, i) => {
    const nums = numbersOf(edge.path);
    const start: HomePoint = [nums[0] ?? NaN, nums[1] ?? NaN];
    const end: HomePoint = [nums.at(-2) ?? NaN, nums.at(-1) ?? NaN];
    const from = shapes.find((s) => onBorder(start, s.box));
    if (!from) out.push(`${name}: edge ${i} starts at ${start.join(',')}, which is on no node`);
    if (edge.kind === 'exit') {
      const hit = shapes.find((s) => strictlyInside(end, s.box));
      if (hit) out.push(`${name}: exit edge ${i} ends inside node "${hit.id}"`);
      const right = edge.label.x + textWidth(edge.label.text, STUB_LABEL);
      if (right > layout.width - CANVAS_MARGIN) {
        out.push(`${name}: the "${edge.label.text}" label runs past the canvas`);
      }
    } else {
      const to = shapes.find((s) => onBorder(end, s.box));
      if (!to) out.push(`${name}: edge ${i} ends at ${end.join(',')}, which is on no node`);
      if (from && to && from.id === to.id) {
        out.push(`${name}: edge ${i} starts and ends on "${from.id}"`);
      }
    }
  });
  return out;
}

// ---------- Home diagrams ----------

const HOME_PAD = 2;
const HOME_LABEL = 16;
const HOME_SUB = 15;
const CHIP_PAD = 2;

export function homeDiagramProblems(diagram: HomeDiagram): string[] {
  const name = diagram.key;
  const layout = layoutHomeDiagram(diagram);
  const shapes: Shape[] = layout.nodes.map((n) => ({
    id: n.id,
    box: { x: n.x, y: n.y, w: n.w, h: n.h },
    pad: HOME_PAD,
    labels: n.lines.map((line) => ({
      text: line.text,
      size: line.role === 'label' ? HOME_LABEL : HOME_SUB,
      x: line.x,
      anchor: 'middle',
      y: line.y,
    })),
  }));
  const out = nodeProblems(name, shapes);

  layout.nodes.forEach((node, ni) => {
    const parent = shapes[ni];
    if (!parent) return;
    node.chips.forEach((chip, ci) => {
      const box = { x: chip.x, y: chip.y, w: chip.w, h: chip.h };
      if (!inside(box, parent.box)) {
        out.push(`${name}: chip "${chip.text}" sticks out of "${node.id}"`);
      }
      node.chips.slice(ci + 1).forEach((other) => {
        if (overlaps(box, { x: other.x, y: other.y, w: other.w, h: other.h })) {
          out.push(`${name}: chips "${chip.text}" and "${other.text}" overlap`);
        }
      });
      const need = textWidth(chip.text, HOME_SUB);
      if (need > chip.w - 2 * CHIP_PAD) {
        out.push(
          `${name}: chip text "${chip.text}" is clipped: it needs ${Math.round(need)} units and the chip leaves ${chip.w - 2 * CHIP_PAD}`,
        );
      }
    });
    // Text in a node that holds chips sits above them.
    if (node.chips.length > 0) {
      const chipTop = Math.min(...node.chips.map((c) => c.y));
      for (const line of node.lines) {
        if (line.y + HOME_SUB * DESCENT > chipTop) {
          out.push(`${name}: label "${line.text}" in "${node.id}" runs into the chips`);
        }
      }
    }
  });

  diagram.edges.forEach((edge, i) => {
    const start = edge.points[0];
    const end = edge.points.at(-1);
    const before = edge.points.at(-2);
    if (!start || !end || !before) return;
    const from = shapes.find((s) => onBorder(start, s.box));
    const to = shapes.find((s) => onBorder(end, s.box));
    if (!from) out.push(`${name}: edge ${i} starts at ${start.join(',')}, which is on no node`);
    if (!to) out.push(`${name}: edge ${i} ends at ${end.join(',')}, which is on no node`);
    if (from && to && from.id === to.id) {
      out.push(`${name}: edge ${i} starts and ends on "${from.id}"`);
    }
    if (to && strictlyInside(before, to.box)) {
      out.push(`${name}: edge ${i} reaches "${to.id}" from inside it`);
    }
    edge.points.slice(1).forEach((p, k) => {
      const q = edge.points[k];
      if (q && p[0] !== q[0] && p[1] !== q[1]) {
        out.push(
          `${name}: edge ${i} has a diagonal segment, which the rounded corners cannot draw`,
        );
      }
    });
  });
  return out;
}
