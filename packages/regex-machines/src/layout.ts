import { Automaton, Position } from './types';

export function layoutGraph(automaton: Automaton): Record<string, Position> {
  const layer: Record<string, number> = {};
  const visited = new Set<string>();
  const queue = [automaton.initial];
  layer[automaton.initial] = 0;
  visited.add(automaton.initial);

  while (queue.length) {
    const s = queue.shift()!;
    const tr = automaton.transitions[s];
    if (tr) {
      for (const sym in tr) {
        for (const tgt of tr[sym]) {
          if (!visited.has(tgt)) {
            visited.add(tgt);
            layer[tgt] = layer[s] + 1;
            queue.push(tgt);
          }
        }
      }
    }
  }

  // Handle unreachable states
  let maxL = Math.max(0, ...Object.values(layer));
  for (const s of automaton.states) {
    if (!(s in layer)) { maxL++; layer[s] = maxL; }
  }

  // Group by layer, sort within each by state number
  const layers: Record<number, string[]> = {};
  for (const [st, l] of Object.entries(layer)) {
    if (!layers[l]) layers[l] = [];
    layers[l].push(st);
  }
  for (const l in layers) {
    layers[l].sort((a, b) =>
      (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0)
    );
  }

  const xSpacing = 100, ySpacing = 70;
  const positions: Record<string, Position> = {};
  for (const [li, sts] of Object.entries(layers)) {
    const ln = parseInt(li);
    const totalH = (sts.length - 1) * ySpacing;
    sts.forEach((s, i) => {
      positions[s] = { x: 60 + ln * xSpacing, y: 120 - totalH / 2 + i * ySpacing };
    });
  }
  return positions;
}

export function getEdges(automaton: Automaton) {
  const grouped: Record<string, { from: string; to: string; symbols: string[] }> = {};
  const tr = automaton.transitions;
  for (const from in tr) {
    for (const sym in tr[from]) {
      for (const to of tr[from][sym]) {
        const key = from + '>' + to;
        if (!grouped[key]) grouped[key] = { from, to, symbols: [] };
        if (!grouped[key].symbols.includes(sym)) grouped[key].symbols.push(sym);
      }
    }
  }

  return Object.values(grouped).map(e => ({
    ...e,
    bidir: !!(grouped[e.to + '>' + e.from]) && e.from !== e.to,
  }));
}
