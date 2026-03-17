import type { TreeLayout, NodePosition, EdgePosition } from './types';

/** Animated pulse traveling along an edge. */
interface Pulse {
  fromId: string;
  toId: string;
  startTime: number;
  duration: number;
}

/** Per-node animation state for fade in/out. */
interface NodeAnim {
  opacity: number;
  targetOpacity: number;
}

const PULSE_DURATION = 300;
const FADE_DURATION = 500;
const NODE_RADIUS = 28;
const RULE_RADIUS = 18;
const RESULT_RADIUS = 34;
const HIT_SLOP = 6;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Interpolate between two hex-ish RGB triples. */
function lerpColor(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  t: number
): string {
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r},${g},${b})`;
}

export class TreeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layout: TreeLayout | null = null;
  private pulses: Pulse[] = [];
  private animFrame: number = 0;
  private running = false;
  private nodeAnims: Map<string, NodeAnim> = new Map();
  private prevNodeIds: Set<string> = new Set();
  private tooltip: HTMLDivElement | null = null;

  /** Set from outside to receive click events on nodes. */
  onClick?: (nodeId: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
    this.setupEvents();
  }

  // --- Public API ---

  setLayout(layout: TreeLayout): void {
    const newIds = new Set(layout.nodes.map((n) => n.id));

    // Detect new nodes: fade in
    for (const node of layout.nodes) {
      const anim = this.nodeAnims.get(node.id);
      if (!anim) {
        // Stagger: delay based on index within its layer peers
        const layerPeers = layout.nodes.filter((n) => n.layer === node.layer);
        const idx = layerPeers.indexOf(node);
        const stagger = idx * 0.05; // small per-node delay via lower starting opacity
        this.nodeAnims.set(node.id, {
          opacity: Math.max(0, -stagger),
          targetOpacity: 1,
        });
      } else {
        anim.targetOpacity = 1;
      }
    }

    // Detect removed nodes: fade out
    for (const oldId of this.prevNodeIds) {
      if (!newIds.has(oldId)) {
        const anim = this.nodeAnims.get(oldId);
        if (anim) {
          anim.targetOpacity = 0;
        }
      }
    }

    this.prevNodeIds = newIds;
    this.layout = layout;

    // Adapt canvas CSS height to match the layout's computed height
    this.canvas.style.height = `${layout.height}px`;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const tick = (): void => {
      if (!this.running) return;
      this.draw();
      this.animFrame = requestAnimationFrame(tick);
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
  }

  firePulse(fromId: string, toId: string): void {
    this.pulses.push({
      fromId,
      toId,
      startTime: performance.now(),
      duration: PULSE_DURATION,
    });
  }

  hitTest(clientX: number, clientY: number): NodePosition | null {
    if (!this.layout) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Search in reverse so topmost (last-drawn) nodes are hit first
    for (let i = this.layout.nodes.length - 1; i >= 0; i--) {
      const node = this.layout.nodes[i];
      const r = nodeHitRadius(node) + HIT_SLOP;
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= r * r) {
        return node;
      }
    }
    return null;
  }

  destroy(): void {
    this.stop();
    this.removeTooltip();
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('click', this.handleClick);
  }

  // --- Drawing ---

  draw(): void {
    const layout = this.layout;
    if (!layout) return;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);
    this.updateAnimations();

    // Draw edges first (below everything)
    for (const edge of layout.edges) {
      this.drawEdge(edge, layout);
    }

    // Draw pulses
    const now = performance.now();
    this.pulses = this.pulses.filter((p) => now - p.startTime < p.duration);
    for (const pulse of this.pulses) {
      this.drawPulse(pulse, layout, now);
    }

    // Draw nodes on top
    for (const node of layout.nodes) {
      this.drawNode(node);
    }

    // Clean up fully faded-out nodes
    for (const [id, anim] of this.nodeAnims) {
      if (anim.targetOpacity === 0 && anim.opacity <= 0.01) {
        this.nodeAnims.delete(id);
      }
    }
  }

  // --- Animation updates ---

  private updateAnimations(): void {
    // dt-based lerp approximation at ~60fps: 16ms frame => t ~ 0.06 for 500ms fade
    const lerpFactor = 1 - Math.pow(0.001, 1 / (FADE_DURATION / 16));
    for (const anim of this.nodeAnims.values()) {
      anim.opacity = lerp(anim.opacity, anim.targetOpacity, lerpFactor);
      anim.opacity = Math.max(0, Math.min(1, anim.opacity));
    }
  }

  private getNodeOpacity(nodeId: string): number {
    return this.nodeAnims.get(nodeId)?.opacity ?? 1;
  }

  // --- Edge drawing ---

  private drawEdge(edge: EdgePosition, layout: TreeLayout): void {
    const from = layout.nodes.find((n) => n.id === edge.from);
    const to = layout.nodes.find((n) => n.id === edge.to);
    if (!from || !to) return;

    const ctx = this.ctx;
    const opacityFrom = this.getNodeOpacity(from.id);
    const opacityTo = this.getNodeOpacity(to.id);
    const opacity = Math.min(opacityFrom, opacityTo);

    ctx.save();
    ctx.globalAlpha = opacity * 0.6;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (edge.active) {
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Pulse drawing ---

  private drawPulse(pulse: Pulse, layout: TreeLayout, now: number): void {
    const from = layout.nodes.find((n) => n.id === pulse.fromId);
    const to = layout.nodes.find((n) => n.id === pulse.toId);
    if (!from || !to) return;

    const elapsed = now - pulse.startTime;
    const t = easeOut(Math.min(1, elapsed / pulse.duration));

    const x = lerp(from.x, to.x, t);
    const y = lerp(from.y, to.y, t);
    const fadeAlpha = t < 0.8 ? 1 : (1 - t) / 0.2;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = fadeAlpha * 0.9;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    // Glow
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  // --- Node drawing ---

  private drawNode(node: NodePosition): void {
    const opacity = this.getNodeOpacity(node.id);
    if (opacity < 0.01) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = opacity;

    switch (node.type) {
      case 'fact':
        this.drawFactNode(node);
        break;
      case 'rule':
        this.drawRuleNode(node);
        break;
      case 'result':
        this.drawResultNode(node);
        break;
    }

    ctx.restore();
  }

  private drawFactNode(node: NodePosition): void {
    const ctx = this.ctx;
    const r = NODE_RADIUS;

    // Fill: grey (inactive) to green (active), interpolated by degree
    const fill = node.active
      ? lerpColor(100, 100, 100, 74, 222, 128, node.deg)
      : 'rgb(70,70,70)';

    // Rounded rect
    this.roundedRect(node.x - r, node.y - r * 0.7, r * 2, r * 1.4, 6);
    ctx.fillStyle = fill;
    ctx.fill();

    // Inner glow when active
    if (node.active) {
      ctx.save();
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
      ctx.lineWidth = 1;
      this.roundedRect(node.x - r, node.y - r * 0.7, r * 2, r * 1.4, 6);
      ctx.stroke();
      ctx.restore();
    }

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = truncateLabel(node.label, 10);
    ctx.fillText(label, node.x, node.y - 4);

    // Degree text
    if (node.active) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillText(node.deg.toFixed(2), node.x, node.y + 8);
    }
  }

  private drawRuleNode(node: NodePosition): void {
    const ctx = this.ctx;
    const r = RULE_RADIUS;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(node.x, node.y - r);
    ctx.lineTo(node.x + r, node.y);
    ctx.lineTo(node.x, node.y + r);
    ctx.lineTo(node.x - r, node.y);
    ctx.closePath();

    ctx.fillStyle = node.active ? '#f59e0b' : 'rgb(80,70,50)';
    ctx.fill();

    // Amber glow when firing
    if (node.active) {
      ctx.save();
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = truncateLabel(node.label, 12);
    ctx.fillText(label, node.x, node.y);
  }

  private drawResultNode(node: NodePosition): void {
    const ctx = this.ctx;
    const r = RESULT_RADIUS;

    // Larger rounded rect
    this.roundedRect(node.x - r, node.y - r * 0.6, r * 2, r * 1.2, 8);
    ctx.fillStyle = node.active
      ? lerpColor(60, 60, 80, 59, 130, 246, node.deg)
      : 'rgb(50,50,65)';
    ctx.fill();

    // Border thickness scales with confidence/degree
    const borderWidth = node.active ? 1 + node.deg * 3 : 1;
    ctx.strokeStyle = node.active ? '#3b82f6' : '#444';
    ctx.lineWidth = borderWidth;
    this.roundedRect(node.x - r, node.y - r * 0.6, r * 2, r * 1.2, 8);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = truncateLabel(node.label, 12);
    ctx.fillText(label, node.x, node.y - 3);

    // Degree text
    if (node.active) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(node.deg.toFixed(2), node.x, node.y + 10);
    }
  }

  // --- Helpers ---

  private roundedRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- Event handling ---

  private setupEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('click', this.handleClick);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const node = this.hitTest(e.clientX, e.clientY);
    if (node) {
      this.showTooltip(node, e.clientX, e.clientY);
      this.canvas.style.cursor = 'pointer';
    } else {
      this.removeTooltip();
      this.canvas.style.cursor = 'default';
    }
  };

  private handleMouseLeave = (): void => {
    this.removeTooltip();
    this.canvas.style.cursor = 'default';
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.onClick) return;
    const node = this.hitTest(e.clientX, e.clientY);
    if (node) {
      this.onClick(node.id);
    }
  };

  // --- Tooltip ---

  private showTooltip(node: NodePosition, clientX: number, clientY: number): void {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.style.position = 'absolute';
      this.tooltip.style.pointerEvents = 'none';
      this.tooltip.style.zIndex = '10000';
      this.tooltip.style.background = 'rgba(0,0,0,0.85)';
      this.tooltip.style.color = '#fff';
      this.tooltip.style.padding = '6px 10px';
      this.tooltip.style.borderRadius = '4px';
      this.tooltip.style.fontSize = '12px';
      this.tooltip.style.fontFamily = 'system-ui, sans-serif';
      this.tooltip.style.maxWidth = '250px';
      this.tooltip.style.whiteSpace = 'pre-wrap';
      document.body.appendChild(this.tooltip);
    }

    // Build tooltip text from node data
    let text: string;
    switch (node.type) {
      case 'fact':
        text = `Trait: ${node.label}\nDegree: ${node.deg.toFixed(2)}\nStatus: ${node.active ? 'active' : 'inactive'}`;
        break;
      case 'rule':
        text = `Rule: ${node.label}\nStatus: ${node.active ? 'fired' : 'idle'}`;
        break;
      case 'result':
        text = `Result: ${node.label}\nDegree: ${node.deg.toFixed(2)}\nStatus: ${node.active ? 'inferred' : 'not inferred'}`;
        break;
    }

    this.tooltip.textContent = text;

    // Position near cursor
    const offset = 12;
    this.tooltip.style.left = `${clientX + offset}px`;
    this.tooltip.style.top = `${clientY + offset}px`;
  }

  private removeTooltip(): void {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}

function nodeHitRadius(node: NodePosition): number {
  switch (node.type) {
    case 'fact':
      return NODE_RADIUS;
    case 'rule':
      return RULE_RADIUS;
    case 'result':
      return RESULT_RADIUS;
    default:
      return NODE_RADIUS;
  }
}

function truncateLabel(label: string, maxLen: number): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + '\u2026' : label;
}
