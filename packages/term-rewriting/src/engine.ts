import type { Tree, Rule, StepEvent, Iteration } from './types';
import { isAtom, treeEqual, deepCopy } from './tree';

/**
 * One bottom-up pass: transform children first, then try rules at each node.
 * Records visit/match events for animation.
 */
export function bottomUpPass(tree: Tree, rules: Rule[]): { result: Tree; events: StepEvent[] } {
  const events: StepEvent[] = [];
  let idx = 0;

  function walk(t: Tree): Tree {
    const myIdx = idx++;

    if (isAtom(t)) {
      events.push({ nodeIdx: myIdx, type: 'visit', label: String(t) });
      return t;
    }

    // Children first (bottom-up)
    const rebuilt: Tree[] = [t[0]];
    for (let i = 1; i < t.length; i++) {
      rebuilt.push(walk(t[i]));
    }

    events.push({ nodeIdx: myIdx, type: 'visit', label: String(rebuilt[0]) });

    // Try rules at this node
    for (const rule of rules) {
      if (rule.match(rebuilt)) {
        events.push({ nodeIdx: myIdx, type: 'match', label: rule.name, rule: rule.name });
        return rule.apply(rebuilt);
      }
    }

    return rebuilt;
  }

  const result = walk(tree);
  return { result, events };
}

/**
 * Full rewrite: repeated bottom-up passes until fixed point.
 * Returns all iterations for animation.
 */
export function rewriteAll(tree: Tree, rules: Rule[], maxIter = 50): Iteration[] {
  const iterations: Iteration[] = [];

  for (let i = 0; i < maxIter; i++) {
    const { result, events } = bottomUpPass(tree, rules);
    iterations.push({ before: deepCopy(tree), after: deepCopy(result), events });
    if (treeEqual(result, tree)) break;
    tree = deepCopy(result);
  }

  return iterations;
}
