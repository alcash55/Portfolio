import type { Diagram as DiagramData } from '~/content/projects';
import { layoutDiagram, type PlacedEdge, type PlacedNode } from './diagramLayout';
import { cssVars, useSeenInView } from './hooks';

const BADGE_R = 11;

// The drawing shows from 960px. Under that the numbered list stands in for it.
const DRAWING =
  'mx-auto hidden h-auto max-h-[70svh] w-full max-w-[1100px] overflow-visible min-[960px]:block';

// A planned node or edge sits in a group with data-planned, and the shapes inside read that.
const NODE_BOX = [
  'fill-surface stroke-line-strong stroke-[1.5]',
  'in-data-planned:fill-paper in-data-planned:[stroke-dasharray:7_5]',
].join(' ');
const NODE_LABEL = 'fill-ink text-[17px] font-medium';
const SMALL_TEXT = 'fill-ink-2 text-[14px]';
const EDGE_LINE = 'stroke-ink-3 stroke-2';
const PLANNED_EDGE_LINE = 'in-data-planned:[stroke-dasharray:7_6]';
const EDGE_PLAYS_IN = 'motion-safe:in-data-run:animate-dg-edge';
const BADGE_DISC = 'fill-ink';
const BADGE_NUMBER = 'fill-paper text-[12px] font-semibold';

const FLOW = [
  'relative pl-[40px] leading-[1.45] text-ink-2 data-planned:italic',
  'before:absolute before:top-[1px] before:left-0 before:grid before:size-[26px]',
  'before:place-items-center before:rounded-[50%] before:bg-ink',
  'before:text-[0.8125rem] before:font-semibold before:text-paper',
  'before:content-[counter(list-item)]',
].join(' ');

interface DiagramProps {
  /** The page name, used in the image's accessible name. */
  name: string;
  diagram: DiagramData;
  /** A heading drawn inside the figure, above the drawing. Leave it out where the page supplies one. */
  title?: string;
  titleId?: string;
}

/**
 * A system diagram drawn as SVG, with the same flows written out as a numbered
 * list for narrow screens and a text version for everyone. The HTML is the
 * finished figure. In the browser the edges fade in once, in order, the first
 * time the figure is mostly in view.
 */
export function Diagram({ name, diagram, title, titleId }: DiagramProps) {
  const layout = layoutDiagram(diagram);
  const [ref, run] = useSeenInView<HTMLElement>(0.35);
  return (
    <figure ref={ref} className="grid gap-[20px]" data-run={run || undefined}>
      {title ? <h2 id={titleId}>{title}</h2> : null}
      <svg
        className={DRAWING}
        width={layout.width}
        height={layout.height}
        viewBox={layout.viewBox}
        role="img"
        aria-label={`Architecture diagram of ${name}. A text version follows.`}
      >
        {layout.edges.map((edge, i) => (
          <Edge key={i} edge={edge} />
        ))}
        {layout.nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </svg>
      <ol className="grid gap-[10px] min-[960px]:hidden">
        {layout.flows.map((flow) => (
          <li key={flow.number} className={FLOW} data-planned={flow.planned || undefined}>
            {flow.text}
          </li>
        ))}
      </ol>
      <figcaption className="max-w-[72ch] leading-[1.55] text-ink-2">
        <b className="font-medium text-ink">Text version. </b>
        {diagram.alt}
      </figcaption>
    </figure>
  );
}

function Edge({ edge }: { edge: PlacedEdge }) {
  const { badge } = edge;
  return (
    <g
      className={EDGE_PLAYS_IN}
      data-planned={edge.planned || undefined}
      style={cssVars({ '--i': edge.order })}
    >
      <path
        className={`${EDGE_LINE} ${PLANNED_EDGE_LINE}`}
        d={edge.path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={EDGE_LINE}
        d={edge.head}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {edge.kind === 'exit' ? (
        <text className={SMALL_TEXT} x={edge.label.x} y={edge.label.y}>
          {edge.label.text}
        </text>
      ) : null}
      {badge && edge.number !== null ? (
        <g>
          <circle className={BADGE_DISC} cx={badge.x} cy={badge.y} r={BADGE_R} />
          <text
            className={BADGE_NUMBER}
            x={badge.x}
            y={badge.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {edge.number}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function Node({ node }: { node: PlacedNode }) {
  return (
    <g data-planned={node.planned || undefined}>
      <rect className={NODE_BOX} x={node.x} y={node.y} width={216} height={72} rx={16} />
      {node.lines.map((line) => (
        <text
          key={line.text}
          className={line.role === 'label' ? NODE_LABEL : SMALL_TEXT}
          x={line.x}
          y={line.y}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
}
