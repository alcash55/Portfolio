import { DETAIL_SLUGS, DETAILS } from '../src/content/projects';
import { expect, test } from './fixtures';

// The unit run checks the diagram data with an estimate of text width. This runs
// in the browser, on the drawing a visitor sees, and measures the real text.

/**
 * Units of air a label must keep from the border of its node. The widest sub line,
 * "Scans PR commits for secrets", leaves 3, so 2 flags text that touches the border
 * and not copy that is merely snug.
 */
const BREATHING_ROOM = 2;
const TOUCH = 0.5;

interface Measured {
  readonly nodes: number;
  readonly edges: number;
  readonly problems: string[];
}

function pageUrl(slug: (typeof DETAIL_SLUGS)[number]): string {
  return `/${DETAILS[slug].kind === 'project' ? 'projects' : 'experience'}/${slug}`;
}

/** Runs in the page. Reads each svg, and returns a sentence for everything wrong with it. */
function measure(args: { svgSelector: string; room: number; touch: number }): Measured {
  const { svgSelector, room, touch } = args;
  const problems: string[] = [];
  let nodes = 0;
  let edges = 0;
  type Box = { x: number; y: number; w: number; h: number };
  const boxOf = (rect: Element): Box => ({
    x: Number(rect.getAttribute('x')),
    y: Number(rect.getAttribute('y')),
    w: Number(rect.getAttribute('width')),
    h: Number(rect.getAttribute('height')),
  });
  const onBorder = (x: number, y: number, b: Box): boolean => {
    const withinX = x >= b.x - touch && x <= b.x + b.w + touch;
    const withinY = y >= b.y - touch && y <= b.y + b.h + touch;
    const near = (edge: number, v: number) => Math.abs(v - edge) <= touch;
    return (
      (withinY && (near(b.x, x) || near(b.x + b.w, x))) ||
      (withinX && (near(b.y, y) || near(b.y + b.h, y)))
    );
  };

  for (const svg of document.querySelectorAll(svgSelector)) {
    const name = svg.closest('section')?.id || location.pathname;
    const boxes: { id: string; box: Box }[] = [];
    // The drawing is groups with no names. A node is a group with its own rect, an edge is a group
    // with a path and no rect. Top-level nodes only: a chip is a node inside a node, and is
    // checked on its own.
    const groups = [...svg.querySelectorAll(':scope > g')];
    const nodeGroups = groups.filter((g) => g.querySelector(':scope > rect'));
    const edgeGroups = groups.filter(
      (g) => !g.querySelector(':scope > rect') && g.querySelector(':scope > path'),
    );
    for (const g of nodeGroups) {
      nodes += 1;
      const rect = g.querySelector(':scope > rect');
      if (!rect) continue;
      const box = boxOf(rect);
      const label = g.querySelector(':scope > text')?.textContent ?? `node ${nodes}`;
      boxes.push({ id: label, box });
      for (const text of g.querySelectorAll(':scope > text')) {
        const t = (text as SVGTextElement).getBBox();
        if (
          t.x < box.x + room ||
          t.x + t.width > box.x + box.w - room ||
          t.y < box.y ||
          t.y + t.height > box.y + box.h
        ) {
          problems.push(
            `${name}: "${text.textContent}" is clipped by "${label}" (text ${Math.round(t.x)} to ${Math.round(t.x + t.width)}, node ${box.x} to ${box.x + box.w})`,
          );
        }
      }
      for (const chip of g.querySelectorAll(':scope > g')) {
        const chipRect = chip.querySelector(':scope > rect');
        if (!chipRect) continue;
        const c = boxOf(chipRect);
        if (c.x < box.x || c.y < box.y || c.x + c.w > box.x + box.w || c.y + c.h > box.y + box.h) {
          problems.push(`${name}: a chip sticks out of "${label}"`);
        }
        const t = chip.querySelector('text') as SVGTextElement | null;
        const tb = t?.getBBox();
        if (t && tb && (tb.x < c.x + room || tb.x + tb.width > c.x + c.w - room)) {
          problems.push(`${name}: chip text "${t.textContent}" is clipped by its chip`);
        }
      }
    }
    boxes.forEach((a, i) => {
      boxes.slice(i + 1).forEach((b) => {
        if (
          a.box.x < b.box.x + b.box.w &&
          b.box.x < a.box.x + a.box.w &&
          a.box.y < b.box.y + b.box.h &&
          b.box.y < a.box.y + a.box.h
        ) {
          problems.push(`${name}: "${a.id}" overlaps "${b.id}"`);
        }
      });
    });
    // The line of each edge is the first path in its group. A stub that leaves the diagram has no end node.
    for (const g of edgeGroups) {
      edges += 1;
      const d = g.querySelector('path')?.getAttribute('d') ?? '';
      const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const sx = n[0] ?? NaN;
      const sy = n[1] ?? NaN;
      const ex = n.at(-2) ?? NaN;
      const ey = n.at(-1) ?? NaN;
      if (!boxes.some((b) => onBorder(sx, sy, b.box))) {
        problems.push(`${name}: an edge starts at ${sx},${sy}, which is on no node`);
      }
      const leaves = g.querySelector(':scope > text') !== null;
      if (!leaves && !boxes.some((b) => onBorder(ex, ey, b.box))) {
        problems.push(`${name}: an edge ends at ${ex},${ey}, which is on no node`);
      }
    }
  }
  return { nodes, edges, problems };
}

test.describe('diagrams as drawn', () => {
  test('the three home diagrams fit their nodes and chips, and every edge meets a node', async ({
    page,
  }) => {
    await page.goto('/');
    const result = await page.evaluate(measure, {
      svgSelector: 'svg[role="img"]',
      room: BREATHING_ROOM,
      touch: TOUCH,
    });
    expect(result.nodes, 'nodes found').toBeGreaterThan(10);
    expect(result.edges, 'edges found').toBeGreaterThan(10);
    expect(result.problems).toEqual([]);
  });

  test.describe('on a wide screen', () => {
    // The detail diagram is hidden below 960px, where the numbered list stands in for it.
    test.use({ viewport: { width: 1280, height: 900 } });
    for (const slug of DETAIL_SLUGS) {
      test(`${slug} fits its nodes, and every edge meets a node`, async ({ page }) => {
        await page.goto(pageUrl(slug));
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(measure, {
          svgSelector: 'svg[role="img"]',
          room: BREATHING_ROOM,
          touch: TOUCH,
        });
        expect(result.nodes, 'nodes found').toBe(DETAILS[slug].diagram.nodes.length);
        expect(result.edges, 'edges found').toBe(DETAILS[slug].diagram.edges.length);
        expect(result.problems).toEqual([]);
      });
    }
  });
});
