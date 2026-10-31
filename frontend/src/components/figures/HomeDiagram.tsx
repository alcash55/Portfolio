import type { HomeDiagram as HomeDiagramData } from '~/content/projects';
import { cssVars, useSeenInView } from './hooks';
import { layoutHomeDiagram, type HomePlacedEdge, type HomePlacedNode } from './homeDiagramLayout';
import './figures.css';

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
    <div ref={ref} className={run ? 'hd run' : 'hd'}>
      <svg
        className="hd-svg"
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
      <div id={textId} className="hd-sr">
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
    <g className="e" style={cssVars({ '--i': edge.order })}>
      <path className="ln" pathLength={1} d={edge.path} />
      <path d={edge.head} />
    </g>
  );
}

function Node({ node }: { node: HomePlacedNode }) {
  return (
    <g className="n">
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={14} />
      {node.lines.map((line) => (
        <text
          key={line.text}
          className={line.role === 'label' ? 'l' : 's'}
          x={line.x}
          y={line.y}
          textAnchor="middle"
        >
          {line.text}
        </text>
      ))}
      {node.chips.map((chip) => (
        <g key={chip.text} className="n in">
          <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={10} />
          <text className="s" x={chip.tx} y={chip.ty} textAnchor="middle">
            {chip.text}
          </text>
        </g>
      ))}
      {node.chipArrow ? <path d={node.chipArrow} fill="none" /> : null}
    </g>
  );
}
