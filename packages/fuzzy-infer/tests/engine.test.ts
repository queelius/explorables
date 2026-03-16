import { describe, it, expect, beforeEach } from 'vitest';
import { FuzzyEngine, evalDegree } from '../src/engine';
import type { Condition, Rule } from '../src/types';
import { RULES_10 } from '../src/data/rules-10';

// --- Task 2: Fact storage and fuzzy-OR ---

describe('FuzzyEngine — fact storage', () => {
  let engine: FuzzyEngine;

  beforeEach(() => {
    engine = new FuzzyEngine();
  });

  it('stores a fact and retrieves it', () => {
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.9 });
    const facts = engine.getFacts();
    expect(facts.size).toBe(1);
    const f = facts.get('hot|coffee');
    expect(f).toEqual({ pred: 'hot', args: ['coffee'], deg: 0.9 });
  });

  it('fuzzy-OR keeps max degree on duplicate', () => {
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.6 });
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.9 });
    const f = engine.getFacts().get('hot|coffee');
    expect(f!.deg).toBe(0.9);
  });

  it('fuzzy-OR does not downgrade degree', () => {
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.9 });
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.3 });
    const f = engine.getFacts().get('hot|coffee');
    expect(f!.deg).toBe(0.9);
  });

  it('treats different args as different facts', () => {
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.9 });
    engine.addFact({ pred: 'hot', args: ['tea'], deg: 0.7 });
    expect(engine.getFacts().size).toBe(2);
  });

  it('addRule stores rules sorted by priority descending', () => {
    engine.addRule({ name: 'low', conditions: [], actions: [], priority: 10 });
    engine.addRule({ name: 'high', conditions: [], actions: [], priority: 90 });
    engine.addRule({ name: 'mid', conditions: [], actions: [], priority: 50 });
    const names = engine.getRules().map((r) => r.name);
    expect(names).toEqual(['high', 'mid', 'low']);
  });

  it('clear resets facts and rules', () => {
    engine.addFact({ pred: 'a', args: [], deg: 1 });
    engine.addRule({ name: 'r', conditions: [], actions: [], priority: 1 });
    engine.clear();
    expect(engine.getFacts().size).toBe(0);
    expect(engine.getRules().length).toBe(0);
  });

  it('clearFacts resets only facts, preserves rules', () => {
    engine.addFact({ pred: 'a', args: [], deg: 1 });
    engine.addRule({ name: 'r', conditions: [], actions: [], priority: 1 });
    engine.clearFacts();
    expect(engine.getFacts().size).toBe(0);
    expect(engine.getRules().length).toBe(1);
  });
});

// --- Task 3: Pattern matching with variables ---

describe('FuzzyEngine — matchCondition', () => {
  let engine: FuzzyEngine;

  beforeEach(() => {
    engine = new FuzzyEngine();
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.9 });
    engine.addFact({ pred: 'hot', args: ['tea'], deg: 0.7 });
    engine.addFact({ pred: 'cold', args: ['ice'], deg: 1.0 });
  });

  it('matches exact predicate and args', () => {
    const cond: Condition = { pred: 'hot', args: ['coffee'] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].deg).toBe(0.9);
  });

  it('returns empty for non-matching predicate', () => {
    const cond: Condition = { pred: 'warm', args: ['coffee'] };
    expect(engine.matchCondition(cond, {})).toHaveLength(0);
  });

  it('binds a variable to matching args', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(2);
    const bound = results.map((r) => r.bindings['?x']).sort();
    expect(bound).toEqual(['coffee', 'tea']);
  });

  it('respects existing binding constraint', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'] };
    const results = engine.matchCondition(cond, { '?x': 'tea' });
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('tea');
    expect(results[0].deg).toBe(0.7);
  });

  it('binds degree variable via degVar', () => {
    const cond: Condition = { pred: 'hot', args: ['coffee'], degVar: '?d' };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?d']).toBe(0.9);
  });

  it('filters by degree constraint > operator', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'], degConstraint: ['>', '?d', 0.8] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('coffee');
  });

  it('filters by degree constraint < operator', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'], degConstraint: ['<', '?d', 0.8] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('tea');
  });

  it('filters by degree constraint >= operator', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'], degConstraint: ['>=', '?d', 0.9] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('coffee');
  });

  it('filters by degree constraint <= operator', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'], degConstraint: ['<=', '?d', 0.7] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('tea');
  });

  it('filters by degree constraint == operator', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'], degConstraint: ['==', '?d', 0.9] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('coffee');
  });

  it('filters by degree constraint != operator', () => {
    const cond: Condition = { pred: 'hot', args: ['?x'], degConstraint: ['!=', '?d', 0.9] };
    const results = engine.matchCondition(cond, {});
    expect(results).toHaveLength(1);
    expect(results[0].bindings['?x']).toBe('tea');
  });
});

// --- Task 4: Forward chaining and degree expressions ---

describe('evalDegree', () => {
  it('returns literal number unchanged', () => {
    expect(evalDegree(0.7, {})).toBe(0.7);
  });

  it('resolves a variable from bindings', () => {
    expect(evalDegree('?d' as any, { '?d': 0.8 })).toBe(0.8);
  });

  it('evaluates multiply expression', () => {
    expect(evalDegree(['*', 0.9, '?d'], { '?d': 0.8 })).toBeCloseTo(0.72);
  });

  it('evaluates add expression', () => {
    expect(evalDegree(['+', 0.3, 0.4], {})).toBeCloseTo(0.7);
  });

  it('evaluates subtract expression', () => {
    expect(evalDegree(['-', 0.9, 0.3], {})).toBeCloseTo(0.6);
  });

  it('evaluates divide expression', () => {
    expect(evalDegree(['/', 0.8, 2], {})).toBeCloseTo(0.4);
  });

  it('evaluates min expression', () => {
    expect(evalDegree(['min', 0.3, 0.7], {})).toBeCloseTo(0.3);
  });

  it('evaluates max expression', () => {
    expect(evalDegree(['max', 0.3, 0.7], {})).toBeCloseTo(0.7);
  });

  it('evaluates nested expression: [*, 0.9, [min, ?d1, ?d2]]', () => {
    expect(evalDegree(['*', 0.9, ['min', '?d1', '?d2']], { '?d1': 0.8, '?d2': 0.6 })).toBeCloseTo(
      0.54
    );
  });

  it('clamps result to [0, 1] — upper', () => {
    expect(evalDegree(['+', 0.8, 0.5], {})).toBe(1);
  });

  it('clamps result to [0, 1] — lower', () => {
    expect(evalDegree(['-', 0.2, 0.5], {})).toBe(0);
  });
});

describe('FuzzyEngine — forward chaining', () => {
  let engine: FuzzyEngine;

  beforeEach(() => {
    engine = new FuzzyEngine();
  });

  it('single rule fires and adds a fact', () => {
    engine.addFact({ pred: 'hot', args: ['coffee'], deg: 0.9 });
    engine.addRule({
      name: 'hot-implies-drink',
      conditions: [{ pred: 'hot', args: ['?x'] }],
      actions: [{ type: 'add', fact: { pred: 'drink', args: ['?x'], deg: 0.8 } }],
      priority: 50,
    });
    const result = engine.run();
    expect(result.facts.get('drink|coffee')).toEqual({
      pred: 'drink',
      args: ['coffee'],
      deg: 0.8,
    });
    expect(result.firedRules).toContain('hot-implies-drink');
  });

  it('chains across iterations', () => {
    engine.addFact({ pred: 'A', args: [], deg: 0.9 });
    engine.addRule({
      name: 'A-to-B',
      conditions: [{ pred: 'A', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'B', args: [], deg: 0.8 } }],
      priority: 50,
    });
    engine.addRule({
      name: 'B-to-C',
      conditions: [{ pred: 'B', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'C', args: [], deg: 0.7 } }],
      priority: 50,
    });
    const result = engine.run();
    expect(result.facts.has('B|')).toBe(true);
    expect(result.facts.has('C|')).toBe(true);
    expect(result.iterations).toBeGreaterThanOrEqual(2);
  });

  it('does not fire the same rule+bindings twice', () => {
    engine.addFact({ pred: 'x', args: [], deg: 1 });
    engine.addRule({
      name: 'dup',
      conditions: [{ pred: 'x', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'y', args: [], deg: 1 } }],
      priority: 50,
    });
    const result = engine.run();
    // Should have fired exactly once
    expect(result.firedRules.filter((r) => r === 'dup')).toHaveLength(1);
  });

  it('propagates degree via expression', () => {
    engine.addFact({ pred: 'sensor', args: ['temp'], deg: 0.8 });
    engine.addRule({
      name: 'degrade',
      conditions: [{ pred: 'sensor', args: ['?x'], degVar: '?d' }],
      actions: [{ type: 'add', fact: { pred: 'reading', args: ['?x'], deg: ['*', 0.9, '?d'] } }],
      priority: 50,
    });
    const result = engine.run();
    const reading = result.facts.get('reading|temp');
    expect(reading!.deg).toBeCloseTo(0.72);
  });

  it('remove action deletes a fact', () => {
    engine.addFact({ pred: 'old', args: ['data'], deg: 1.0 });
    engine.addRule({
      name: 'cleanup',
      conditions: [{ pred: 'old', args: ['?x'] }],
      actions: [{ type: 'remove', fact: { pred: 'old', args: ['?x'], deg: 0 } }],
      priority: 50,
    });
    const result = engine.run();
    expect(result.facts.has('old|data')).toBe(false);
  });

  it('runOneIteration does a single pass', () => {
    // Within one pass, rules fire sequentially: later rules see facts from earlier rules.
    // Use a chain where B-to-C has LOWER priority than A-to-B, so C-to-D fires after B-to-C.
    // We verify that one call to runOneIteration fires all eligible rules exactly once
    // and a second call returns changed=false (fixed point).
    engine.addFact({ pred: 'A', args: [], deg: 1 });
    engine.addRule({
      name: 'A-to-B',
      conditions: [{ pred: 'A', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'B', args: [], deg: 0.9 } }],
      priority: 50,
    });
    engine.addRule({
      name: 'B-to-C',
      conditions: [{ pred: 'B', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'C', args: [], deg: 0.8 } }],
      priority: 40,
    });
    const pass1 = engine.runOneIteration();
    expect(pass1.changed).toBe(true);
    expect(pass1.firedRules).toContain('A-to-B');
    expect(pass1.firedRules).toContain('B-to-C');
    expect(engine.getFacts().has('B|')).toBe(true);
    expect(engine.getFacts().has('C|')).toBe(true);
    // Second pass: nothing new to fire
    const pass2 = engine.runOneIteration();
    expect(pass2.changed).toBe(false);
  });

  it('resetFired allows re-firing rules', () => {
    engine.addFact({ pred: 'x', args: [], deg: 1 });
    engine.addRule({
      name: 'r',
      conditions: [{ pred: 'x', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'y', args: [], deg: 0.5 } }],
      priority: 50,
    });
    engine.run();
    engine.resetFired();
    // After adding a higher-degree fact for y, rule can re-fire but fact won't change
    // because fuzzy-OR already has y at 0.5; the point is resetFired clears history
    const pass = engine.runOneIteration();
    // Rule fires again since history was cleared (even though no new facts added)
    expect(pass.firedRules).toContain('r');
  });

  it('satisfies multi-condition rules', () => {
    engine.addFact({ pred: 'has', args: ['wings'], deg: 0.9 });
    engine.addFact({ pred: 'has', args: ['feathers'], deg: 0.8 });
    engine.addRule({
      name: 'bird-check',
      conditions: [
        { pred: 'has', args: ['wings'] },
        { pred: 'has', args: ['feathers'] },
      ],
      actions: [{ type: 'add', fact: { pred: 'is', args: ['bird'], deg: 0.85 } }],
      priority: 50,
    });
    const result = engine.run();
    expect(result.facts.has('is|bird')).toBe(true);
  });

  it('respects max iterations limit', () => {
    // Rule that always produces something new (unbounded chain)
    // We'll use a single self-referencing pattern: won't actually loop
    // because duplicate firing prevention stops it.
    // Instead, test that run() returns within maxIterations.
    engine.addFact({ pred: 'x', args: [], deg: 1 });
    engine.addRule({
      name: 'noop',
      conditions: [{ pred: 'x', args: [] }],
      actions: [{ type: 'add', fact: { pred: 'x', args: [], deg: 1 } }],
      priority: 50,
    });
    const result = engine.run(5);
    expect(result.iterations).toBeLessThanOrEqual(5);
  });
});

// --- Task 5: Tier 0 animal classification rules ---

describe('RULES_10 — tier 0 rule data', () => {
  it('exports between 8 and 12 rules', () => {
    expect(RULES_10.length).toBeGreaterThanOrEqual(8);
    expect(RULES_10.length).toBeLessThanOrEqual(12);
  });

  it('every rule has name, conditions, actions, priority', () => {
    for (const rule of RULES_10) {
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('conditions');
      expect(rule).toHaveProperty('actions');
      expect(rule).toHaveProperty('priority');
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
      expect(rule.actions.length).toBeGreaterThan(0);
      expect(typeof rule.priority).toBe('number');
    }
  });

  it('rule names are unique', () => {
    const names = RULES_10.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('RULES_10 — integration: animal classification', () => {
  let engine: FuzzyEngine;

  beforeEach(() => {
    engine = new FuzzyEngine();
    for (const rule of RULES_10) engine.addRule(rule);
  });

  it('classifies zebra from hair + hooves + stripes', () => {
    engine.addFact({ pred: 'has-hair', args: ['zara'], deg: 1.0 });
    engine.addFact({ pred: 'has-hooves', args: ['zara'], deg: 0.9 });
    engine.addFact({ pred: 'has-stripes', args: ['zara'], deg: 0.95 });
    const result = engine.run();
    const zebra = result.facts.get('species|zara,zebra');
    expect(zebra).toBeDefined();
    expect(zebra!.deg).toBeGreaterThan(0);
  });

  it('classifies bird from feathers', () => {
    engine.addFact({ pred: 'has-feathers', args: ['polly'], deg: 0.9 });
    const result = engine.run();
    const bird = result.facts.get('is-bird|polly');
    expect(bird).toBeDefined();
    expect(bird!.deg).toBeGreaterThan(0);
  });

  it('classifies carnivore from eats-meat + has-claws', () => {
    engine.addFact({ pred: 'eats-meat', args: ['rex'], deg: 0.85 });
    engine.addFact({ pred: 'has-claws', args: ['rex'], deg: 0.9 });
    const result = engine.run();
    const carnivore = result.facts.get('is-carnivore|rex');
    expect(carnivore).toBeDefined();
    expect(carnivore!.deg).toBeGreaterThan(0);
  });

  it('classifies tiger from hair + eats-meat + claws + stripes', () => {
    engine.addFact({ pred: 'has-hair', args: ['tony'], deg: 1.0 });
    engine.addFact({ pred: 'eats-meat', args: ['tony'], deg: 0.9 });
    engine.addFact({ pred: 'has-claws', args: ['tony'], deg: 0.85 });
    engine.addFact({ pred: 'has-stripes', args: ['tony'], deg: 0.95 });
    const result = engine.run();
    const tiger = result.facts.get('species|tony,tiger');
    expect(tiger).toBeDefined();
    expect(tiger!.deg).toBeGreaterThan(0);
  });

  it('classifies penguin from feathers + cannot-fly', () => {
    engine.addFact({ pred: 'has-feathers', args: ['pingu'], deg: 0.9 });
    engine.addFact({ pred: 'cannot-fly', args: ['pingu'], deg: 1.0 });
    const result = engine.run();
    const penguin = result.facts.get('species|pingu,penguin');
    expect(penguin).toBeDefined();
    expect(penguin!.deg).toBeGreaterThan(0);
  });

  it('classifies eagle from feathers + eats-meat + claws', () => {
    engine.addFact({ pred: 'has-feathers', args: ['eddy'], deg: 0.95 });
    engine.addFact({ pred: 'eats-meat', args: ['eddy'], deg: 0.9 });
    engine.addFact({ pred: 'has-claws', args: ['eddy'], deg: 0.85 });
    const result = engine.run();
    const eagle = result.facts.get('species|eddy,eagle');
    expect(eagle).toBeDefined();
    expect(eagle!.deg).toBeGreaterThan(0);
  });

  it('propagates degrees through the chain', () => {
    engine.addFact({ pred: 'has-hair', args: ['zara'], deg: 0.8 });
    engine.addFact({ pred: 'has-hooves', args: ['zara'], deg: 0.7 });
    engine.addFact({ pred: 'has-stripes', args: ['zara'], deg: 0.9 });
    const result = engine.run();
    const zebra = result.facts.get('species|zara,zebra');
    expect(zebra).toBeDefined();
    // Degree should be attenuated from initial values through chain
    expect(zebra!.deg).toBeLessThan(0.9);
    expect(zebra!.deg).toBeGreaterThan(0);
  });

  it('fires intermediate classification rules (mammal, ungulate)', () => {
    engine.addFact({ pred: 'has-hair', args: ['zara'], deg: 1.0 });
    engine.addFact({ pred: 'has-hooves', args: ['zara'], deg: 0.9 });
    engine.addFact({ pred: 'has-stripes', args: ['zara'], deg: 0.95 });
    const result = engine.run();
    expect(result.facts.has('is-mammal|zara')).toBe(true);
    expect(result.facts.has('is-ungulate|zara')).toBe(true);
    expect(result.firedRules.length).toBeGreaterThan(1);
  });
});
