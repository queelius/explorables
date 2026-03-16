import type { TraceNode } from './trace-data';

interface NodeEntry {
  x: number;
  y: number;
  data: TraceNode;
  element: SVGGElement;
}

interface NodePosition {
  x: number;
  y: number;
  data: TraceNode;
}

interface UpdateProps {
  stroke?: string;
  fill?: string;
  value?: number;
  visits?: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export class TreeRenderer {
  svg: SVGSVGElement;
  nodeRadius: number;
  levelHeight: number;
  siblingSpacing: number;
  nodes: Map<string, NodeEntry>;
  currentTree: TraceNode | null;
  private _nextLeafX: number;
  private _tooltip: HTMLElement | null;
  private _nodeDetail: HTMLElement | null;

  constructor(
    svgElement: SVGSVGElement,
    options: { nodeRadius?: number; levelHeight?: number; siblingSpacing?: number } = {},
  ) {
    this.svg = svgElement;
    this.nodeRadius = options.nodeRadius || 18;
    this.levelHeight = options.levelHeight || 90;
    this.siblingSpacing = options.siblingSpacing || 50;
    this.nodes = new Map();
    this.currentTree = null;
    this._nextLeafX = 0;
    this._tooltip = document.getElementById('ucb1-tooltip');
    this._nodeDetail = document.getElementById('node-detail');
  }

  /**
   * Compute x,y positions for all nodes using post-order traversal.
   */
  layout(tree: TraceNode): Map<string, NodePosition> {
    this._nextLeafX = 0;
    const positions = new Map<string, NodePosition>();
    this._assignPositions(tree, 0, positions);
    this._separateSubtrees(tree, positions);

    // Shift all x values so minimum x is at nodeRadius + 10.
    const padding = this.nodeRadius + 10;
    let minX = Infinity;
    for (const pos of positions.values()) {
      if (pos.x < minX) minX = pos.x;
    }
    const shift = padding - minX;
    if (shift !== 0) {
      for (const pos of positions.values()) {
        pos.x += shift;
      }
    }

    return positions;
  }

  private _assignPositions(
    node: TraceNode,
    depth: number,
    positions: Map<string, NodePosition>,
  ): void {
    const y = depth * this.levelHeight + this.nodeRadius + 10;

    if (!node.children || node.children.length === 0) {
      const x = this._nextLeafX;
      this._nextLeafX += this.siblingSpacing;
      positions.set(node.id, { x, y, data: node });
      return;
    }

    for (const child of node.children) {
      this._assignPositions(child, depth + 1, positions);
    }

    let sumX = 0;
    for (const child of node.children) {
      sumX += positions.get(child.id)!.x;
    }
    const x = sumX / node.children.length;
    positions.set(node.id, { x, y, data: node });
  }

  private _separateSubtrees(
    node: TraceNode,
    positions: Map<string, NodePosition>,
  ): void {
    if (!node.children || node.children.length <= 1) {
      if (node.children && node.children.length === 1) {
        this._separateSubtrees(node.children[0], positions);
      }
      return;
    }

    for (const child of node.children) {
      this._separateSubtrees(child, positions);
    }

    for (let i = 1; i < node.children.length; i++) {
      const leftSubtree = node.children[i - 1];
      const rightSubtree = node.children[i];

      const rightmostOfLeft = this._getRightmostX(leftSubtree, positions);
      const leftmostOfRight = this._getLeftmostX(rightSubtree, positions);

      const gap = leftmostOfRight - rightmostOfLeft;
      if (gap < this.siblingSpacing) {
        const shiftAmount = this.siblingSpacing - gap;
        this._shiftSubtree(rightSubtree, shiftAmount, positions);
      }
    }

    let sumX = 0;
    for (const child of node.children) {
      sumX += positions.get(child.id)!.x;
    }
    positions.get(node.id)!.x = sumX / node.children.length;
  }

  private _getRightmostX(
    node: TraceNode,
    positions: Map<string, NodePosition>,
  ): number {
    let maxX = positions.get(node.id)!.x;
    if (node.children) {
      for (const child of node.children) {
        const childMax = this._getRightmostX(child, positions);
        if (childMax > maxX) maxX = childMax;
      }
    }
    return maxX;
  }

  private _getLeftmostX(
    node: TraceNode,
    positions: Map<string, NodePosition>,
  ): number {
    let minX = positions.get(node.id)!.x;
    if (node.children) {
      for (const child of node.children) {
        const childMin = this._getLeftmostX(child, positions);
        if (childMin < minX) minX = childMin;
      }
    }
    return minX;
  }

  private _shiftSubtree(
    node: TraceNode,
    amount: number,
    positions: Map<string, NodePosition>,
  ): void {
    positions.get(node.id)!.x += amount;
    if (node.children) {
      for (const child of node.children) {
        this._shiftSubtree(child, amount, positions);
      }
    }
  }

  /**
   * Render the tree as SVG. Clears existing content.
   */
  render(tree: TraceNode, highlights: Record<string, string> = {}): void {
    this.currentTree = tree;

    // Clear SVG
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
    this.nodes.clear();

    const positions = this.layout(tree);

    // Create groups for layering: edges behind nodes
    const edgeGroup = document.createElementNS(SVG_NS, 'g');
    edgeGroup.setAttribute('data-layer', 'edges');
    this.svg.appendChild(edgeGroup);

    const nodeGroup = document.createElementNS(SVG_NS, 'g');
    nodeGroup.setAttribute('data-layer', 'nodes');
    this.svg.appendChild(nodeGroup);

    this._renderEdges(tree, positions, edgeGroup);
    this._renderNodes(tree, positions, highlights, nodeGroup);

    this.autoFit();
  }

  private _renderEdges(
    node: TraceNode,
    positions: Map<string, NodePosition>,
    edgeGroup: SVGGElement,
  ): void {
    if (!node.children) return;
    const parentPos = positions.get(node.id)!;

    for (const child of node.children) {
      const childPos = positions.get(child.id)!;

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(parentPos.x));
      line.setAttribute('y1', String(parentPos.y + this.nodeRadius));
      line.setAttribute('x2', String(childPos.x));
      line.setAttribute('y2', String(childPos.y - this.nodeRadius));
      line.setAttribute('stroke', '#ffffff15');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('data-from', node.id);
      line.setAttribute('data-to', child.id);
      line.classList.add('edge');
      edgeGroup.appendChild(line);

      this._renderEdges(child, positions, edgeGroup);
    }
  }

  private _renderNodes(
    node: TraceNode,
    positions: Map<string, NodePosition>,
    highlights: Record<string, string>,
    nodeGroup: SVGGElement,
  ): void {
    const pos = positions.get(node.id)!;
    const isHighlighted = highlights[node.id];

    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.setAttribute('data-node-id', node.id);
    g.classList.add('node-group');
    g.style.cursor = 'pointer';
    g.style.transformOrigin = 'center';

    // Accessibility
    g.setAttribute('role', 'button');
    const truncatedState = (node.state || '').slice(0, 50);
    g.setAttribute(
      'aria-label',
      'Node: ' + truncatedState + '. Value ' + (node.value || 0).toFixed(2) + ', ' + (node.visits || 0) + ' visits',
    );
    g.setAttribute('tabindex', '0');

    // Circle
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', String(this.nodeRadius));
    circle.setAttribute('stroke-width', '2');

    if (node.is_terminal) {
      circle.setAttribute('stroke', 'var(--accent)');
      circle.setAttribute('fill', 'rgba(233,69,96,0.15)');
    } else {
      circle.setAttribute('stroke', isHighlighted || '#ffffff30');
      circle.setAttribute('fill', 'transparent');
    }

    if (isHighlighted) {
      circle.setAttribute('stroke', isHighlighted);
    }

    g.appendChild(circle);

    // Value text
    const valueText = document.createElementNS(SVG_NS, 'text');
    valueText.setAttribute('x', '0');
    valueText.setAttribute('y', String(this.nodeRadius + 14));
    valueText.setAttribute('text-anchor', 'middle');
    valueText.setAttribute('font-family', 'monospace');
    valueText.setAttribute('font-size', '10');
    valueText.setAttribute('fill', 'var(--text-dim)');
    valueText.textContent = `v=${(node.value || 0).toFixed(2)}`;
    g.appendChild(valueText);

    // Visits text
    const visitsText = document.createElementNS(SVG_NS, 'text');
    visitsText.setAttribute('x', '0');
    visitsText.setAttribute('y', String(this.nodeRadius + 26));
    visitsText.setAttribute('text-anchor', 'middle');
    visitsText.setAttribute('font-family', 'monospace');
    visitsText.setAttribute('font-size', '10');
    visitsText.setAttribute('fill', 'var(--text-dim)');
    visitsText.textContent = `n=${node.visits || 0}`;
    g.appendChild(visitsText);

    // Answer label (above node, if present)
    if (node.answer) {
      const answerText = document.createElementNS(SVG_NS, 'text');
      answerText.setAttribute('x', '0');
      answerText.setAttribute('y', String(-this.nodeRadius - 8));
      answerText.setAttribute('text-anchor', 'middle');
      answerText.setAttribute('font-family', 'monospace');
      answerText.setAttribute('font-size', '9');
      answerText.setAttribute('fill', 'var(--accent)');
      answerText.textContent = node.answer;
      g.appendChild(answerText);
    }

    // Click handler: inspect node
    g.addEventListener('click', () => {
      if (this._nodeDetail) {
        this._nodeDetail.textContent = node.state || '(no state)';
      }
    });

    // Keyboard handler: Enter or Space triggers click
    g.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this._nodeDetail) {
          this._nodeDetail.textContent = node.state || '(no state)';
        }
      }
    });

    // Hover: UCB1 tooltip
    g.addEventListener('mouseenter', (e: MouseEvent) => {
      this._showTooltip(e, node);
    });

    g.addEventListener('mousemove', (e: MouseEvent) => {
      if (this._tooltip && this._tooltip.style.display === 'block') {
        this._positionTooltip(e);
      }
    });

    g.addEventListener('mouseleave', () => {
      this._hideTooltip();
    });

    nodeGroup.appendChild(g);

    this.nodes.set(node.id, { x: pos.x, y: pos.y, data: node, element: g });

    if (node.children) {
      for (const child of node.children) {
        this._renderNodes(child, positions, highlights, nodeGroup);
      }
    }
  }

  private _showTooltip(event: MouseEvent, node: TraceNode): void {
    if (!this._tooltip) return;

    const c = 1.414;
    let content: string;

    if (!node.visits || node.visits === 0) {
      content = 'not yet visited';
    } else {
      const parentVisits = this._findParentVisits(node.id);
      if (parentVisits === null) {
        const exploitation = node.value || 0;
        content = `exploitation: ${exploitation.toFixed(3)}\n(root node)`;
      } else {
        const exploitation = node.value || 0;
        const exploration = c * Math.sqrt(Math.log(parentVisits) / node.visits);
        const ucb1 = exploitation + exploration;
        content = `exploitation: ${exploitation.toFixed(3)}\nexploration:  ${exploration.toFixed(3)}\nUCB1:         ${ucb1.toFixed(3)}`;
      }
    }

    this._tooltip.textContent = content;
    this._tooltip.style.display = 'block';
    this._positionTooltip(event);
  }

  private _positionTooltip(event: MouseEvent): void {
    if (!this._tooltip) return;
    const offset = 12;
    this._tooltip.style.left = event.clientX + offset + 'px';
    this._tooltip.style.top = event.clientY + offset + 'px';
  }

  private _hideTooltip(): void {
    if (this._tooltip) {
      this._tooltip.style.display = 'none';
    }
  }

  private _findParentVisits(nodeId: string): number | null {
    for (const [, entry] of this.nodes) {
      if (entry.data.children) {
        for (const child of entry.data.children) {
          if (child.id === nodeId) {
            return entry.data.visits || 0;
          }
        }
      }
    }
    return null;
  }

  /**
   * Scale viewBox to fit all nodes.
   */
  autoFit(): void {
    const padding = 40;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const entry of this.nodes.values()) {
      const left = entry.x - this.nodeRadius;
      const right = entry.x + this.nodeRadius;
      const top = entry.y - this.nodeRadius - 20;
      const bottom = entry.y + this.nodeRadius + 30;

      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    }

    if (minX === Infinity) return;

    const vbX = minX - padding;
    const vbY = minY - padding;
    const vbW = maxX - minX + 2 * padding;
    const vbH = maxY - minY + 2 * padding;

    this.svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  }

  /**
   * Update a single node's appearance.
   */
  updateNode(nodeId: string, props: UpdateProps): void {
    const entry = this.nodes.get(nodeId);
    if (!entry) return;

    const g = entry.element;
    const circle = g.querySelector('circle');
    const texts = g.querySelectorAll('text');

    if (props.stroke && circle) {
      circle.setAttribute('stroke', props.stroke);
    }

    if (props.fill && circle) {
      circle.setAttribute('fill', props.fill);
    }

    if (props.value !== undefined && texts.length > 0) {
      texts[0].textContent = `v=${props.value.toFixed(2)}`;
    }

    if (props.visits !== undefined && texts.length > 1) {
      texts[1].textContent = `n=${props.visits}`;
    }
  }

  /**
   * Highlight a path through the tree.
   */
  highlightPath(nodeIds: string[], color: string): void {
    const nodeIdSet = new Set(nodeIds);

    // Dim everything first
    for (const entry of this.nodes.values()) {
      entry.element.style.opacity = '0.3';
    }

    const edges = this.svg.querySelectorAll('line');
    for (const edge of edges) {
      (edge as SVGLineElement).style.opacity = '0.3';
    }

    // Brighten path nodes and apply glow-pulse animation
    for (const id of nodeIds) {
      const entry = this.nodes.get(id);
      if (entry) {
        entry.element.style.opacity = '1';
        entry.element.classList.add('highlighted');
        const circle = entry.element.querySelector('circle');
        if (circle) {
          circle.setAttribute('stroke', color);
        }
      }
    }

    // Brighten edges on the path
    for (const edge of edges) {
      const from = edge.getAttribute('data-from');
      const to = edge.getAttribute('data-to');
      if (from && to && nodeIdSet.has(from) && nodeIdSet.has(to)) {
        (edge as SVGLineElement).style.opacity = '1';
        edge.setAttribute('stroke', color);
      }
    }
  }

  /**
   * Animate a node appearing: fade + scale in from zero.
   */
  addNodeAnimated(nodeId: string): void {
    const entry = this.nodes.get(nodeId);
    if (!entry) return;
    const g = entry.element;
    const { x, y } = entry;

    g.style.opacity = '0';
    g.style.transform = `translate(${x}px, ${y}px) scale(0)`;

    requestAnimationFrame(() => {
      g.style.opacity = '1';
      g.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    });
  }

  /**
   * Pulse a node to indicate a value update.
   */
  pulseNode(nodeId: string): void {
    const entry = this.nodes.get(nodeId);
    if (!entry) return;
    const g = entry.element;

    g.classList.remove('pulsing');
    void (g as unknown as HTMLElement).offsetWidth; // Force reflow to restart animation

    g.style.animation = 'pulse 400ms ease';
    g.classList.add('pulsing');

    const cleanup = () => {
      g.style.animation = '';
      g.classList.remove('pulsing');
      g.removeEventListener('animationend', cleanup);
    };
    g.addEventListener('animationend', cleanup);
  }

  /**
   * Pulse an edge briefly to highlight backpropagation or selection.
   */
  pulseEdge(fromId: string, toId: string): void {
    const edge = this.svg.querySelector(
      `line[data-from="${fromId}"][data-to="${toId}"]`,
    );
    if (!edge) return;

    edge.classList.add('pulsing');

    setTimeout(() => {
      edge.classList.remove('pulsing');
    }, 400);
  }

  /**
   * Clear all highlights and restore default appearance.
   */
  clearHighlights(): void {
    for (const entry of this.nodes.values()) {
      entry.element.style.opacity = '1';
      entry.element.classList.remove('highlighted');
      const circle = entry.element.querySelector('circle');
      if (circle) {
        if (entry.data.is_terminal) {
          circle.setAttribute('stroke', 'var(--accent)');
        } else {
          circle.setAttribute('stroke', '#ffffff30');
        }
      }
    }

    const edges = this.svg.querySelectorAll('line');
    for (const edge of edges) {
      (edge as SVGLineElement).style.opacity = '1';
      edge.setAttribute('stroke', '#ffffff15');
    }
  }
}
