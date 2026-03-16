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

  // --- Forward chaining (Task 4) ---

  private satisfyConditions(conditions: Condition[]): MatchResult[] {
    let current: MatchResult[] = [{ bindings: {}, deg: 1 }];
    for (const cond of conditions) {
      const next: MatchResult[] = [];
      for (const cur of current) {
        for (const m of this.matchCondition(cond, cur.bindings)) {
          next.push({ bindings: m.bindings, deg: Math.min(cur.deg, m.deg) });
        }
      }
      current = next;
      if (current.length === 0) break;
    }
    return current;
  }

  private resolveArg(arg: string, bindings: Record<string, string | number>): string {
    return arg.startsWith('?') && arg in bindings ? String(bindings[arg]) : arg;
  }

  private applyAction(action: Action, bindings: Record<string, string | number>): boolean {
    const args = action.fact.args.map((a) => this.resolveArg(a, bindings));
    const key = factKey(action.fact.pred, args);
    if (action.type === 'remove') {
      return this.facts.delete(key);
    }
    const deg = evalDegree(action.fact.deg, bindings);
    const existing = this.facts.get(key);
    if (existing && existing.deg >= deg) return false;
    this.facts.set(key, { pred: action.fact.pred, args, deg });
    return true;
  }

  runOneIteration(): { changed: boolean; firedRules: string[] } {
    let changed = false;
    const firedThisPass: string[] = [];
    for (const rule of this.rules) {
      const matches = this.satisfyConditions(rule.conditions);
      for (const m of matches) {
        const firedKey = `${rule.name}|${JSON.stringify(m.bindings)}`;
        if (this.fired.has(firedKey)) continue;
        this.fired.add(firedKey);
        firedThisPass.push(rule.name);
        for (const action of rule.actions) {
          if (this.applyAction(action, m.bindings)) changed = true;
        }
      }
    }
    return { changed, firedRules: firedThisPass };
  }

  run(maxIterations = 100): InferenceResult {
    const allFired: string[] = [];
    let iterations = 0;
    for (let i = 0; i < maxIterations; i++) {
      iterations++;
      const { changed, firedRules } = this.runOneIteration();
      allFired.push(...firedRules);
      if (!changed) break;
    }
    return { facts: this.facts, firedRules: allFired, iterations };
  }

  resetFired(): void {
    this.fired.clear();
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

function resolveOperand(
  v: number | string,
  bindings: Record<string, string | number>
): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.startsWith('?') && v in bindings) return Number(bindings[v]);
  return Number(v);
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function evalDegree(
  expr: DegreeExpr | string,
  bindings: Record<string, string | number>
): number {
  if (typeof expr === 'number') return clamp01(expr);
  if (typeof expr === 'string') return clamp01(resolveOperand(expr, bindings));
  const [op, ...operands] = expr;
  const vals = operands.map((o) => resolveOperand(o, bindings));
  switch (op) {
    case '*': return clamp01(vals.reduce((a, b) => a * b, 1));
    case '+': return clamp01(vals.reduce((a, b) => a + b, 0));
    case '-': return clamp01(vals.reduce((a, b) => a - b));
    case '/': return clamp01(vals.reduce((a, b) => a / b));
    case 'min': return clamp01(Math.min(...vals));
    case 'max': return clamp01(Math.max(...vals));
    default: return clamp01(vals[0] ?? 0);
  }
}
