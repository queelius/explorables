import type { Layout } from './types';
import { SVG_NS } from './types';

/** Remove all children from an SVG element */
function clearSvg(el: SVGElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Render a tree layout into an SVG element */
export function renderTree(svg: SVGElement, layout: Layout): void {
  clearSvg(svg);

  // Edges
  for (const e of layout.edges) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(e.from.x));
    line.setAttribute('y1', String(e.from.y));
    line.setAttribute('x2', String(e.to.x));
    line.setAttribute('y2', String(e.to.y));
    line.setAttribute('class', 'tr-edge');
    svg.appendChild(line);
  }

  // Nodes
  for (const n of layout.nodes) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'tr-node');
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    g.dataset.nid = String(n.id);

    const r = Math.max(16, n.label.length * 5 + 8);
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', String(r));
    g.appendChild(circle);

    const text = document.createElementNS(SVG_NS, 'text');
    text.textContent = n.label;
    g.appendChild(text);

    svg.appendChild(g);
  }

  // Fit SVG height
  const maxY = layout.nodes.reduce((m, n) => Math.max(m, n.y), 0);
  svg.setAttribute('height', String(maxY + 56));
}

/** Set a node's visual state */
export function setNodeState(svg: SVGElement, nodeId: number, state: string): void {
  const g = svg.querySelector(`g[data-nid="${nodeId}"]`);
  if (g) g.setAttribute('class', 'tr-node' + (state ? ' ' + state : ''));
}

/** Clear all node states */
export function clearStates(svg: SVGElement): void {
  svg.querySelectorAll('g.tr-node').forEach(g => g.setAttribute('class', 'tr-node'));
}
