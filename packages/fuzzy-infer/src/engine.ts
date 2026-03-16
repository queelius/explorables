import type { Fact, Rule, Condition, Action, DegreeExpr, InferenceResult } from './types';

export interface MatchResult {
  bindings: Record<string, string | number>;
  deg: number;
}

function factKey(pred: string, args: string[]): string {
  return `${pred}|${args.join(',')}`;
}

export class FuzzyEngine {
  private facts: Map<string, Fact> = new Map();
  private rules: Rule[] = [];
  private fired: Set<string> = new Set();

  // --- Fact storage (Task 2) ---

  addFact(fact: Fact): void {
    const key = factKey(fact.pred, fact.args);
    const existing = this.facts.get(key);
    if (existing && existing.deg >= fact.deg) return; // fuzzy-OR: keep max
    this.facts.set(key, { ...fact });
  }

  getFacts(): Map<string, Fact> {
    return this.facts;
  }

  addRule(rule: Rule): void {
    this.rules.push({ ...rule });
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  getRules(): Rule[] {
    return this.rules;
  }

  clear(): void {
    this.facts.clear();
    this.rules = [];
    this.fired.clear();
  }

  clearFacts(): void {
    this.facts.clear();
    this.fired.clear();
  }

  // --- Pattern matching (Task 3) ---

  matchCondition(
    cond: Condition,
    bindings: Record<string, string | number>
  ): MatchResult[] {
    const results: MatchResult[] = [];
    for (const fact of this.facts.values()) {
      if (fact.pred !== cond.pred || fact.args.length !== cond.args.length) continue;
      const b: Record<string, string | number> = { ...bindings };
      let match = true;
      for (let i = 0; i < cond.args.length; i++) {
        const pat = cond.args[i];
        const val = fact.args[i];
        if (pat.startsWith('?')) {
          if (pat in b) {
            if (b[pat] !== val) { match = false; break; }
          } else {
            b[pat] = val;
          }
        } else if (pat !== val) {
          match = false;
          break;
        }
      }
      if (!match) continue;
      if (cond.degVar) b[cond.degVar] = fact.deg;
      if (cond.degConstraint && !evalConstraint(cond.degConstraint, fact.deg)) continue;
      results.push({ bindings: b, deg: fact.deg });
    }
    return results;
  }
}

function evalConstraint(dc: [string, string, number], deg: number): boolean {
  const [op, , threshold] = dc;
  switch (op) {
    case '>': return deg > threshold;
    case '<': return deg < threshold;
    case '>=': return deg >= threshold;
    case '<=': return deg <= threshold;
    case '==': return deg === threshold;
    case '!=': return deg !== threshold;
    default: return true;
  }
}
