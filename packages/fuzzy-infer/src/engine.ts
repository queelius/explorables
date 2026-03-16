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
}
