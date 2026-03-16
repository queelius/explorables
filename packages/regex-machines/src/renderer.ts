import { Automaton, Position, EPSILON, R, SVG_NS } from './types';
import { getEdges } from './layout';

function el(tag: string, attrs?: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function mkMarker(id: string, color: string): SVGElement {
  const m = el('marker', {
    id, viewBox: '0 0 10 10', refX: 10, refY: 5,
    markerWidth: 6, markerHeight: 6, orient: 'auto',
  });
  m.appendChild(el('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: color }));
  return m;
}

export function renderGraph(
  svg: SVGElement,
  automaton: Automaton,
  positions: Record<string, Position>,
  active: Set<string>,
): void {
  svg.textContent = '';
  if (!positions || Object.keys(positions).length === 0) return;

  // Compute viewBox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of Object.values(positions)) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  const pad = 55;
  const vx = minX - pad - 30, vy = minY - pad - 15;
  const vw = maxX - minX + 2 * pad + 30;
  let vh = maxY - minY + 2 * pad + 15;
  if (vh < 120) { vh = 120; }
  svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  (svg as unknown as HTMLElement).style.height = Math.min(Math.max(vh, 140), 360) + 'px';

  // Defs
  const defs = el('defs');
  defs.appendChild(mkMarker('ah', '#999'));
  defs.appendChild(mkMarker('ah-act', '#e67e22'));
  defs.appendChild(mkMarker('ah-eps', '#bbb'));
  svg.appendChild(defs);

  const edgeG = el('g');
  svg.appendChild(edgeG);

  // Edges
  for (const e of getEdges(automaton)) {
    const fp = positions[e.from], tp = positions[e.to];
    if (!fp || !tp) continue;
    const isSelf = e.from === e.to;
    const allEps = e.symbols.length === 1 && e.symbols[0] === EPSILON;
    const isActive = active.has(e.from) && active.has(e.to);
    const label = e.symbols.join(', ');
    let pathD: string, lx: number, ly: number;

    if (isSelf) {
      pathD = `M ${fp.x - 8} ${fp.y - R} C ${fp.x - 28} ${fp.y - R - 42} ${fp.x + 28} ${fp.y - R - 42} ${fp.x + 8} ${fp.y - R}`;
      lx = fp.x; ly = fp.y - R - 36;
    } else {
      const dx = tp.x - fp.x, dy = tp.y - fp.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist, uy = dy / dist;

      if (e.bidir) {
        const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2;
        const px = -uy, py = ux;
        const sign = e.from < e.to ? 1 : -1;
        const off = 22 * sign;
        const cpx = mx + px * off, cpy = my + py * off;

        const sdx = cpx - fp.x, sdy = cpy - fp.y;
        const slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
        const sx = fp.x + (sdx / slen) * R, sy = fp.y + (sdy / slen) * R;

        const tdx = cpx - tp.x, tdy = cpy - tp.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const tx = tp.x + (tdx / tlen) * R, ty = tp.y + (tdy / tlen) * R;

        pathD = `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`;
        lx = (fp.x + 2 * cpx + tp.x) / 4;
        ly = (fp.y + 2 * cpy + tp.y) / 4;
      } else {
        const sx = fp.x + ux * R, sy = fp.y + uy * R;
        const tx = tp.x - ux * R, ty = tp.y - uy * R;
        pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
        lx = (sx + tx) / 2 - uy * 10;
        ly = (sy + ty) / 2 + ux * 10;
      }
    }

    const mType = isActive ? 'ah-act' : (allEps ? 'ah-eps' : 'ah');
    edgeG.appendChild(el('path', {
      d: pathD,
      stroke: isActive ? '#e67e22' : (allEps ? '#ccc' : '#999'),
      'stroke-width': isActive ? 2.5 : 1.5,
      'stroke-dasharray': allEps ? '4 3' : 'none',
      fill: 'none',
      'marker-end': `url(#${mType})`,
    }));

    const lt = el('text', {
      x: lx, y: ly,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 11,
      fill: isActive ? '#d35400' : '#555',
      'font-weight': isActive ? 700 : 400,
      'paint-order': 'stroke', stroke: '#fff',
      'stroke-width': 3.5, 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter',
    });
    lt.textContent = label;
    edgeG.appendChild(lt);
  }

  // Start arrow
  const ip = positions[automaton.initial];
  if (ip) {
    edgeG.appendChild(el('path', {
      d: `M ${ip.x - R - 28} ${ip.y} L ${ip.x - R} ${ip.y}`,
      stroke: '#999', 'stroke-width': 1.5, fill: 'none', 'marker-end': 'url(#ah)',
    }));
  }

  // Nodes (on top of edges)
  const nodeG = el('g');
  svg.appendChild(nodeG);

  for (const st of automaton.states) {
    const pos = positions[st];
    if (!pos) continue;
    const isAcc = automaton.accepting.has(st);
    const isAct = active.has(st);

    let fill: string, stroke: string;
    if (isAct && isAcc) { fill = '#27ae60'; stroke = '#1e8449'; }
    else if (isAct) { fill = '#e67e22'; stroke = '#d35400'; }
    else { fill = '#4a90d9'; stroke = '#357abd'; }

    nodeG.appendChild(el('circle', { cx: pos.x, cy: pos.y, r: R, fill, stroke, 'stroke-width': 2 }));

    if (isAcc) {
      nodeG.appendChild(el('circle', {
        cx: pos.x, cy: pos.y, r: R - 4, fill: 'none', stroke: '#fff', 'stroke-width': 1.5,
      }));
    }

    const fontSize = st.length > 3 ? 9 : (st.length > 2 ? 10 : 11);
    const lbl = el('text', {
      x: pos.x, y: pos.y,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': fontSize, 'font-weight': 600, fill: '#fff',
    });
    lbl.textContent = st;
    nodeG.appendChild(lbl);
  }
}
