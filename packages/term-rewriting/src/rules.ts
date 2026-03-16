import type { Tree, Rule } from './types';
import { isAtom, treeEqual, isLiteral, isConstWrt } from './tree';

function mk(name: string, match: (t: Tree) => boolean, apply: (t: Tree) => Tree): Rule {
  return { name, match, apply };
}

function isBinOp(t: Tree, op: string): t is Tree[] {
  return Array.isArray(t) && t[0] === op && t.length === 3;
}

// ─── Arithmetic ────────────────────────────────────────

export const ARITH: Rule[] = [
  mk('0 + x \u2192 x',   t => isBinOp(t, '+') && t[1] === 0, t => (t as Tree[])[2]),
  mk('x + 0 \u2192 x',   t => isBinOp(t, '+') && (t as Tree[])[2] === 0, t => (t as Tree[])[1]),
  mk('0 \u00d7 x \u2192 0', t => isBinOp(t, '*') && t[1] === 0, () => 0),
  mk('x \u00d7 0 \u2192 0', t => isBinOp(t, '*') && (t as Tree[])[2] === 0, () => 0),
  mk('1 \u00d7 x \u2192 x', t => isBinOp(t, '*') && t[1] === 1, t => (t as Tree[])[2]),
  mk('x \u00d7 1 \u2192 x', t => isBinOp(t, '*') && (t as Tree[])[2] === 1, t => (t as Tree[])[1]),
  mk('x \u2212 x \u2192 0', t => isBinOp(t, '-') && treeEqual((t as Tree[])[1], (t as Tree[])[2]),
    () => 0),
  mk('n + m',  t => isBinOp(t, '+') && isLiteral((t as Tree[])[1]) && isLiteral((t as Tree[])[2]),
    t => ((t as Tree[])[1] as number) + ((t as Tree[])[2] as number)),
  mk('n \u00d7 m',  t => isBinOp(t, '*') && isLiteral((t as Tree[])[1]) && isLiteral((t as Tree[])[2]),
    t => ((t as Tree[])[1] as number) * ((t as Tree[])[2] as number)),
  mk('n \u2212 m',  t => isBinOp(t, '-') && isLiteral((t as Tree[])[1]) && isLiteral((t as Tree[])[2]),
    t => ((t as Tree[])[1] as number) - ((t as Tree[])[2] as number)),
  mk('n / m',  t => isBinOp(t, '/') && isLiteral((t as Tree[])[1]) && isLiteral((t as Tree[])[2]) && (t as Tree[])[2] !== 0,
    t => { const r = ((t as Tree[])[1] as number) / ((t as Tree[])[2] as number); return Number.isInteger(r) ? r : Math.round(r * 1000) / 1000; }),
];

// ─── Simplification (superset of arithmetic) ──────────

export const SIMPLIFY: Rule[] = [
  ...ARITH,
  mk('x^0 \u2192 1', t => isBinOp(t, '^') && (t as Tree[])[2] === 0, () => 1),
  mk('x^1 \u2192 x', t => isBinOp(t, '^') && (t as Tree[])[2] === 1, t => (t as Tree[])[1]),
  mk('x/1 \u2192 x', t => isBinOp(t, '/') && (t as Tree[])[2] === 1, t => (t as Tree[])[1]),
  mk('0 \u2212 n \u2192 \u2212n',
    t => isBinOp(t, '-') && (t as Tree[])[1] === 0 && isLiteral((t as Tree[])[2]),
    t => -((t as Tree[])[2] as number)),
];

// ─── Differentiation ──────────────────────────────────

function isDiff(t: Tree): t is Tree[] {
  return Array.isArray(t) && t[0] === 'd' && t.length === 3;
}

function isDiffOf(t: Tree, innerOp: string): t is Tree[] {
  return isDiff(t) && Array.isArray(t[1]) && (t[1] as Tree[])[0] === innerOp;
}

function isDiffOfX(t: Tree, innerOp: string): t is Tree[] {
  return isDiffOf(t, innerOp) && (t[1] as Tree[])[1] === 'x' && t[2] === 'x';
}

export const DIFF: Rule[] = [
  mk('d/dx(const) = 0',
    t => isDiff(t) && t[2] === 'x' && isConstWrt(t[1], 'x'),
    () => 0),
  mk('d/dx(x) = 1',
    t => isDiff(t) && t[1] === 'x' && t[2] === 'x',
    () => 1),
  mk('sum rule',
    t => isDiffOf(t, '+'),
    t => { const [, [, u, v] , dv] = t as Tree[][]; return ['+', ['d', u, dv], ['d', v, dv]]; }),
  mk('difference rule',
    t => isDiffOf(t, '-') && ((t as Tree[])[1] as Tree[]).length === 3,
    t => { const [, [, u, v] , dv] = t as Tree[][]; return ['-', ['d', u, dv], ['d', v, dv]]; }),
  mk('product rule',
    t => isDiffOf(t, '*'),
    t => { const [, [, u, v] , dv] = t as Tree[][]; return ['+', ['*', u, ['d', v, dv]], ['*', v, ['d', u, dv]]]; }),
  mk('power rule',
    t => isDiffOf(t, '^') && ((t as Tree[])[1] as Tree[])[1] === 'x' && isLiteral(((t as Tree[])[1] as Tree[])[2]) && (t as Tree[])[2] === 'x',
    t => { const n = ((t as Tree[])[1] as Tree[])[2] as number; return ['*', n, ['^', 'x', n - 1]]; }),
  mk('chain (power)',
    t => isDiffOf(t, '^') && isLiteral(((t as Tree[])[1] as Tree[])[2]),
    t => { const [, [, u, n], dv] = t as Tree[][]; return ['*', ['*', n, ['^', u, (n as unknown as number) - 1]], ['d', u, dv]]; }),
  mk('d/dx sin(x) = cos(x)',
    t => isDiffOfX(t, 'sin'),
    () => ['cos', 'x']),
  mk('chain (sin)',
    t => isDiffOf(t, 'sin'),
    t => { const [, [, u], dv] = t as Tree[][]; return ['*', ['cos', u], ['d', u, dv]]; }),
  mk('d/dx cos(x) = \u2212sin(x)',
    t => isDiffOfX(t, 'cos'),
    () => ['-', 0, ['sin', 'x']]),
  mk('chain (cos)',
    t => isDiffOf(t, 'cos'),
    t => { const [, [, u], dv] = t as Tree[][]; return ['*', ['-', 0, ['sin', u]], ['d', u, dv]]; }),
  mk('d/dx e^x = e^x',
    t => isDiffOfX(t, 'exp'),
    () => ['exp', 'x']),
  mk('chain (exp)',
    t => isDiffOf(t, 'exp'),
    t => { const [, [, u], dv] = t as Tree[][]; return ['*', ['exp', u], ['d', u, dv]]; }),
  mk('d/dx ln(x) = 1/x',
    t => isDiffOfX(t, 'ln'),
    () => ['/', 1, 'x']),
  mk('quotient rule',
    t => isDiffOf(t, '/'),
    t => { const [, [, u, v], dv] = t as Tree[][]; return ['/', ['-', ['*', v, ['d', u, dv]], ['*', u, ['d', v, dv]]], ['^', v, 2]]; }),
];

export const ALL_DIFF: Rule[] = [...DIFF, ...SIMPLIFY];
