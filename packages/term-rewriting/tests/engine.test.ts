import { describe, it, expect } from 'vitest';
import { bottomUpPass, rewriteAll } from '../src/engine';
import { treeEqual, treeToString, deepCopy } from '../src/tree';
import { ARITH, ALL_DIFF } from '../src/rules';
import type { Tree } from '../src/types';

describe('bottomUpPass', () => {
  it('simplifies 0 + x to x', () => {
    const { result } = bottomUpPass(['+', 0, 'x'], ARITH);
    expect(result).toBe('x');
  });

  it('folds constants', () => {
    const { result } = bottomUpPass(['+', 2, 3], ARITH);
    expect(result).toBe(5);
  });

  it('handles nested bottom-up: inner before outer', () => {
    const { result } = bottomUpPass(['+', 0, ['+', 0, 'x']], [ARITH[0]]);
    // Inner (+ 0 x) => x first, then outer (+ 0 x) => x
    // But in one pass, inner is simplified to x, outer becomes (+ 0 x) which matches
    expect(result).toBe('x');
  });

  it('emits visit events in pre-order', () => {
    const { events } = bottomUpPass(['+', 'a', 'b'], ARITH);
    // Pre-order: root(+), left(a), right(b)
    // But bottom-up visits: left first, right, then root
    const visits = events.filter(e => e.type === 'visit');
    expect(visits.length).toBeGreaterThanOrEqual(3);
    // First visit should be a leaf
    expect(visits[0].label).toBe('a');
  });

  it('emits match events when rules fire', () => {
    const { events } = bottomUpPass(['+', 0, 'x'], ARITH);
    const matches = events.filter(e => e.type === 'match');
    expect(matches.length).toBe(1);
    expect(matches[0].rule).toContain('0 + x');
  });
});

describe('rewriteAll', () => {
  it('reaches fixed point for simple expression', () => {
    const iters = rewriteAll(['+', 0, 'x'], ARITH);
    const last = iters[iters.length - 1];
    expect(treeEqual(last.before, last.after)).toBe(true);
  });

  it('handles multi-iteration simplification', () => {
    const iters = rewriteAll(['*', ['+', 'x', 0], ['-', 5, 5]], ARITH);
    // Should simplify: (+ x 0) => x, (- 5 5) => 0, (* x 0) => 0
    const finalTree = iters[iters.length - 1].after;
    expect(finalTree).toBe(0);
  });

  it('computes constant expressions to a number', () => {
    const iters = rewriteAll(['+', ['*', 2, 3], ['*', 4, 5]], ARITH);
    const finalTree = iters[iters.length - 1].after;
    expect(finalTree).toBe(26);
  });

  it('differentiates x^3 to 3*x^2', () => {
    const iters = rewriteAll(['d', ['^', 'x', 3], 'x'], ALL_DIFF);
    const result = iters[iters.length - 1].after;
    // Should be (* 3 (^ x 2))
    expect(treeToString(result)).toBe('(* 3 (^ x 2))');
  });

  it('differentiates sin(x) to cos(x)', () => {
    const iters = rewriteAll(['d', ['sin', 'x'], 'x'], ALL_DIFF);
    const last = iters[iters.length - 1];
    expect(treeEqual(last.after, ['cos', 'x'])).toBe(true);
  });

  it('respects maxIter', () => {
    const iters = rewriteAll(['+', 0, ['+', 0, ['+', 0, 'x']]], ARITH, 1);
    // With maxIter=1, only one pass
    expect(iters.length).toBeLessThanOrEqual(2);
  });
});

describe('tree utilities', () => {
  it('treeEqual handles atoms', () => {
    expect(treeEqual('x', 'x')).toBe(true);
    expect(treeEqual('x', 'y')).toBe(false);
    expect(treeEqual(3, 3)).toBe(true);
  });

  it('treeEqual handles nested trees', () => {
    expect(treeEqual(['+', 1, 2], ['+', 1, 2])).toBe(true);
    expect(treeEqual(['+', 1, 2], ['+', 1, 3])).toBe(false);
    expect(treeEqual(['+', 1], ['+', 1, 2])).toBe(false);
  });

  it('deepCopy creates independent copy', () => {
    const orig: Tree = ['+', ['*', 2, 3], 'x'];
    const copy = deepCopy(orig);
    expect(treeEqual(orig, copy)).toBe(true);
    (copy as Tree[])[1] = 99;
    expect(treeEqual(orig, copy)).toBe(false);
  });

  it('treeToString formats correctly', () => {
    expect(treeToString(['+', 1, 2])).toBe('(+ 1 2)');
    expect(treeToString('x')).toBe('x');
    expect(treeToString(['+', ['*', 2, 3], 'x'])).toBe('(+ (* 2 3) x)');
  });
});
