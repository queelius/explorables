import type { Tree, Atom } from './types';

export function isAtom(t: Tree): t is Atom {
  return !Array.isArray(t);
}

export function head(t: Tree): Atom {
  return Array.isArray(t) ? t[0] as Atom : t;
}

export function treeEqual(a: Tree, b: Tree): boolean {
  if (isAtom(a) && isAtom(b)) return a === b;
  if (isAtom(a) || isAtom(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => treeEqual(v, b[i]));
}

export function deepCopy(t: Tree): Tree {
  if (isAtom(t)) return t;
  return t.map(deepCopy);
}

export function treeToString(t: Tree): string {
  if (isAtom(t)) return String(t);
  return '(' + (t as Tree[]).map(treeToString).join(' ') + ')';
}

export function isLiteral(x: Tree): x is number {
  return typeof x === 'number';
}

/** Check if expr contains no occurrence of variable v */
export function isConstWrt(expr: Tree, v: string): boolean {
  if (expr === v) return false;
  if (isAtom(expr)) return true;
  for (let i = 1; i < (expr as Tree[]).length; i++) {
    if (!isConstWrt((expr as Tree[])[i], v)) return false;
  }
  return true;
}
