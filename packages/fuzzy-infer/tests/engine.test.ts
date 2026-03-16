import { describe, it, expect, beforeEach } from 'vitest';
import { FuzzyEngine } from '../src/engine';

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
