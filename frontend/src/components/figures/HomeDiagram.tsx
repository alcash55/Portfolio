import type { HomeDiagram as HomeDiagramData } from '~/content/projects';
import { cssVars, useSeenInView } from './hooks';
import { layoutHomeDiagram, type HomePlacedEdge, type HomePlacedNode } from './homeDiagramLayout';

// From 900px a chapter fits one screen, so the drawing takes the viewport height minus the header
// and 13rem for the rest of the chapter, up to 34rem.
const DRAWING = [
  'block h-auto w-full overflow-visible',
  'min-[900px]:h-[min(calc(100svh-var(--hdr)-13rem),34rem)]',
].join(' ');
const NODE_BOX = 'fill-surface-2 stroke-line-strong stroke-[1.5]';
const CHIP_BOX = 'fill-surface stroke-line-strong stroke-[1.5]';
const NODE_LABEL = 'fill-ink text-[16px] font-medium';
const NODE_SUB = 'fill-ink-2 text-[15px]';
const LINE = 'stroke-ink-3 stroke-2';
// Each edge draws in accent green, thick, then settles to the normal stroke. The head follows
// the line a little later.
const EDGE_LINE = `${LINE} motion-safe:in-data-run:animate-hd-line`;
const EDGE_HEAD = `${LINE} motion-safe:in-data-run:animate-hd-head`;

interface HomeDiagramProps {
  diagram: HomeDiagramData;
}

/**
 * The tall diagram a home chapter shows at every width. The drawing is one image.
 * Its text version is a list for screen readers, hidden from the frame. In the
 * browser the edges draw in order, once, the first time the figure is mostly in
 * view. The server HTML is the finished diagram, and reduced motion keeps it.
 */
export function HomeDiagram({ diagram }: HomeDiagramProps) {
  const layout = layoutHomeDiagram(diagram);
  const [ref, run] = useSeenInView<HTMLDivElement>(0.35);
  const titleId = `hd-${diagram.key}-t`;
  const textId = `hd-${diagram.key}-d`;
  return (
    <div ref={ref} className="relative px-[18px] pt-[8px] pb-[12px]" data-run={run || undefined}>
      <svg
        className={DRAWING}
        viewBox={layout.viewBox}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={textId}
      >
        <title id={titleId}>{diagram.title}</title>
        {layout.edges.map((edge) => (
          <Edge key={edge.order} edge={edge} />
        ))}
        {layout.nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </svg>
      <div id={textId} className="sr">
        <p>Text version of the diagram.</p>
        <ol>
          {diagram.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Edge({ edge }: { edge: HomePlacedEdge }) {
  return (
    <g style={cssVars({ '--i': edge.order })}>
      <path
        className={EDGE_LINE}
        pathLength={1}
        d={edge.path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={EDGE_HEAD}
        d={edge.head}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Node({ node }: { node: HomePlacedNode }) {
  return (
    <g>
      <rect className={NODE_BOX} x={node.x} y={node.y} width={node.w} height={node.h} rx={14} />
      {node.lines.map((line) => (
        <text
          key={line.text}
          className={line.role === 'label' ? NODE_LABEL : NODE_SUB}
          x={line.x}
          y={line.y}
          textAnchor="middle"
        >
          {line.text}
        </text>
      ))}
      {node.chips.map((chip) => (
        <g key={chip.text}>
          <rect className={CHIP_BOX} x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={10} />
          <text className={NODE_SUB} x={chip.tx} y={chip.ty} textAnchor="middle">
            {chip.text}
          </text>
        </g>
      ))}
      {node.chipArrow ? (
        <path
          className={LINE}
          d={node.chipArrow}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  );
}
