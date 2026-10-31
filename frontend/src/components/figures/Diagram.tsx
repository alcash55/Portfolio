import type { Diagram as DiagramData } from '~/content/projects';
import { layoutDiagram, type PlacedEdge, type PlacedNode } from './diagramLayout';
import { cssVars, useSeenInView } from './hooks';
import './figures.css';

const BADGE_R = 11;

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
    <figure ref={ref} className={run ? 'dg run' : 'dg'}>
      {title ? <h2 id={titleId}>{title}</h2> : null}
      <svg
        className="dg-svg"
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
      <ol className="flows">
        {layout.flows.map((flow) => (
          <li key={flow.number} className={flow.planned ? 'plan' : undefined}>
            {flow.text}
          </li>
        ))}
      </ol>
      <figcaption className="alt-t">
        <b>Text version. </b>
        {diagram.alt}
      </figcaption>
    </figure>
  );
}

function Edge({ edge }: { edge: PlacedEdge }) {
  const { badge } = edge;
  return (
    <g className={edge.planned ? 'e plan' : 'e'} style={cssVars({ '--i': edge.order })}>
      <path className="ln" d={edge.path} />
      <path d={edge.head} />
      {edge.kind === 'exit' ? (
        <text className="stub" x={edge.label.x} y={edge.label.y}>
          {edge.label.text}
        </text>
      ) : null}
      {badge && edge.number !== null ? (
        <g className="b">
          <circle cx={badge.x} cy={badge.y} r={BADGE_R} />
          <text x={badge.x} y={badge.y}>
            {edge.number}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function Node({ node }: { node: PlacedNode }) {
  return (
    <g className={node.planned ? 'n plan' : 'n'}>
      <rect x={node.x} y={node.y} width={216} height={72} rx={16} />
      {node.lines.map((line) => (
        <text key={line.text} className={line.role === 'label' ? 'l' : 's'} x={line.x} y={line.y}>
          {line.text}
        </text>
      ))}
    </g>
  );
}
