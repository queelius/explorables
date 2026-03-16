import type { Tree, Layout, LayoutNode, LayoutEdge } from './types';
import { isAtom, head } from './tree';

interface MeasuredNode {
  width: number;
  tree: Tree;
  id: number;
  label: string;
  children: MeasuredNode[];
}

/**
 * Lay out a tree for SVG rendering.
 * Assigns (x, y) to each node in pre-order, with proper horizontal spacing.
 */
export function layoutTree(tree: Tree, width: number, _height: number): Layout {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let nextId = 0;

  function measure(t: Tree): MeasuredNode {
    const id = nextId++;
    if (isAtom(t)) {
      return { width: 1, tree: t, id, label: String(t), children: [] };
    }
    const kids: MeasuredNode[] = [];
    for (let i = 1; i < t.length; i++) kids.push(measure(t[i]));
    const w = kids.reduce((s, k) => s + k.width, 0);
    return { width: Math.max(w, 1), tree: t, id, label: String(head(t)), children: kids };
  }

  function position(node: MeasuredNode, x: number, availW: number, y: number): LayoutNode {
    const cx = x + availW / 2;
    const nObj: LayoutNode = { id: node.id, x: cx, y, label: node.label };
    nodes.push(nObj);

    if (node.children.length > 0) {
      const totalW = node.children.reduce((s, c) => s + c.width, 0);
      let ox = x;
      for (const child of node.children) {
        const cw = (child.width / totalW) * availW;
        const cNode = position(child, ox, cw, y + 60);
        edges.push({ from: nObj, to: cNode });
        ox += cw;
      }
    }

    return nObj;
  }

  const m = measure(tree);
  const padX = 40;
  position(m, padX, width - padX * 2, 36);

  return { nodes, edges };
}
