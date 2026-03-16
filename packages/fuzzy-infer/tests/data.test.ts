import { describe, it, expect, beforeEach } from 'vitest';
import { FuzzyEngine } from '../src/engine';
import { RULES_10 } from '../src/data/rules-10';
import { RULES_25 } from '../src/data/rules-25';
import type { Rule } from '../src/types';

// --- Tier coherence: structural properties ---

describe('Tier coherence — RULES_25 is a superset of RULES_10', () => {
  const names10 = new Set(RULES_10.map((r) => r.name));
  const names25 = new Set(RULES_25.map((r) => r.name));

  it('every RULES_10 name exists in RULES_25', () => {
    for (const name of names10) {
      expect(names25.has(name), `missing rule: ${name}`).toBe(true);
    }
  });

  it('RULES_25 has strictly more rules than RULES_10', () => {
    expect(RULES_25.length).toBeGreaterThan(RULES_10.length);
  });

  it('RULES_25 has at least 20 rules', () => {
    expect(RULES_25.length).toBeGreaterThanOrEqual(20);
  });

  it('RULES_25 rule names are unique', () => {
    const names = RULES_25.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every RULES_25 rule has valid structure', () => {
    for (const rule of RULES_25) {
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
      expect(rule.actions.length).toBeGreaterThan(0);
      expect(typeof rule.priority).toBe('number');
    }
  });
});

// --- Tier coherence: classification at both tiers ---

function runClassification(rules: Rule[], facts: { pred: string; args: string[]; deg: number }[]) {
  const engine = new FuzzyEngine();
  for (const rule of rules) engine.addRule(rule);
  for (const fact of facts) engine.addFact(fact);
  return engine.run();
}

describe('Tier coherence — zebra classifies at both tiers', () => {
  const zebraFacts = [
    { pred: 'has-hair', args: ['zara'], deg: 1.0 },
    { pred: 'has-hooves', args: ['zara'], deg: 0.9 },
    { pred: 'has-stripes', args: ['zara'], deg: 0.95 },
  ];

  it('classifies zebra at tier 0 (RULES_10)', () => {
    const result = runClassification(RULES_10, zebraFacts);
    expect(result.facts.get('species|zara,zebra')).toBeDefined();
    expect(result.facts.get('species|zara,zebra')!.deg).toBeGreaterThan(0);
  });

  it('classifies zebra at tier 1 (RULES_25)', () => {
    const result = runClassification(RULES_25, zebraFacts);
    expect(result.facts.get('species|zara,zebra')).toBeDefined();
    expect(result.facts.get('species|zara,zebra')!.deg).toBeGreaterThan(0);
  });

  it('zebra degree is consistent across tiers', () => {
    const r10 = runClassification(RULES_10, zebraFacts);
    const r25 = runClassification(RULES_25, zebraFacts);
    const deg10 = r10.facts.get('species|zara,zebra')!.deg;
    const deg25 = r25.facts.get('species|zara,zebra')!.deg;
    // Same rules fire for zebra, so degree should be identical
    expect(deg25).toBeCloseTo(deg10);
  });
});

describe('Tier coherence — tiger classifies at both tiers', () => {
  const tigerFacts = [
    { pred: 'has-hair', args: ['tony'], deg: 1.0 },
    { pred: 'eats-meat', args: ['tony'], deg: 0.9 },
    { pred: 'has-claws', args: ['tony'], deg: 0.85 },
    { pred: 'has-stripes', args: ['tony'], deg: 0.95 },
  ];

  it('classifies tiger at tier 0 (RULES_10)', () => {
    const result = runClassification(RULES_10, tigerFacts);
    expect(result.facts.get('species|tony,tiger')).toBeDefined();
    expect(result.facts.get('species|tony,tiger')!.deg).toBeGreaterThan(0);
  });

  it('classifies tiger at tier 1 (RULES_25)', () => {
    const result = runClassification(RULES_25, tigerFacts);
    expect(result.facts.get('species|tony,tiger')).toBeDefined();
    expect(result.facts.get('species|tony,tiger')!.deg).toBeGreaterThan(0);
  });

  it('tiger degree is consistent across tiers', () => {
    const r10 = runClassification(RULES_10, tigerFacts);
    const r25 = runClassification(RULES_25, tigerFacts);
    const deg10 = r10.facts.get('species|tony,tiger')!.deg;
    const deg25 = r25.facts.get('species|tony,tiger')!.deg;
    expect(deg25).toBeCloseTo(deg10);
  });
});

// --- Tier 1-only species ---

describe('Tier coherence — tier 1 classifies species that tier 0 cannot', () => {
  it('bat classifies only at tier 1', () => {
    const batFacts = [
      { pred: 'has-hair', args: ['bruce'], deg: 0.9 },
      { pred: 'can-fly', args: ['bruce'], deg: 0.95 },
    ];
    const r10 = runClassification(RULES_10, batFacts);
    const r25 = runClassification(RULES_25, batFacts);
    expect(r10.facts.get('species|bruce,bat')).toBeUndefined();
    expect(r25.facts.get('species|bruce,bat')).toBeDefined();
    expect(r25.facts.get('species|bruce,bat')!.deg).toBeGreaterThan(0);
  });

  it('owl classifies only at tier 1', () => {
    const owlFacts = [
      { pred: 'has-feathers', args: ['ollie'], deg: 0.95 },
      { pred: 'is-nocturnal', args: ['ollie'], deg: 0.9 },
    ];
    const r10 = runClassification(RULES_10, owlFacts);
    const r25 = runClassification(RULES_25, owlFacts);
    expect(r10.facts.get('species|ollie,owl')).toBeUndefined();
    expect(r25.facts.get('species|ollie,owl')).toBeDefined();
  });

  it('snake classifies only at tier 1', () => {
    const snakeFacts = [
      { pred: 'has-scales', args: ['sly'], deg: 0.95 },
      { pred: 'has-no-legs', args: ['sly'], deg: 1.0 },
    ];
    const r10 = runClassification(RULES_10, snakeFacts);
    const r25 = runClassification(RULES_25, snakeFacts);
    expect(r10.facts.get('species|sly,snake')).toBeUndefined();
    expect(r25.facts.get('species|sly,snake')).toBeDefined();
    expect(r25.facts.get('species|sly,snake')!.deg).toBeGreaterThan(0);
  });

  it('frog classifies only at tier 1', () => {
    const frogFacts = [
      { pred: 'lives-in-water', args: ['freddy'], deg: 0.85 },
      { pred: 'lives-on-land', args: ['freddy'], deg: 0.9 },
      { pred: 'has-moist-skin', args: ['freddy'], deg: 0.95 },
      { pred: 'can-jump', args: ['freddy'], deg: 1.0 },
    ];
    const r10 = runClassification(RULES_10, frogFacts);
    const r25 = runClassification(RULES_25, frogFacts);
    expect(r10.facts.get('species|freddy,frog')).toBeUndefined();
    expect(r25.facts.get('species|freddy,frog')).toBeDefined();
  });

  it('bear classifies only at tier 1', () => {
    const bearFacts = [
      { pred: 'has-hair', args: ['baloo'], deg: 0.9 },
      { pred: 'eats-meat', args: ['baloo'], deg: 0.8 },
      { pred: 'eats-plants', args: ['baloo'], deg: 0.85 },
    ];
    const r10 = runClassification(RULES_10, bearFacts);
    const r25 = runClassification(RULES_25, bearFacts);
    expect(r10.facts.get('species|baloo,bear')).toBeUndefined();
    expect(r25.facts.get('species|baloo,bear')).toBeDefined();
    expect(r25.facts.get('species|baloo,bear')!.deg).toBeGreaterThan(0);
  });
});

// --- Degree propagation through tier 1 chains ---

describe('Tier 1 — degree propagation', () => {
  it('whale degree attenuates through mammal -> species chain', () => {
    const facts = [
      { pred: 'has-hair', args: ['willy'], deg: 0.9 },
      { pred: 'is-aquatic', args: ['willy'], deg: 0.95 },
      { pred: 'is-large', args: ['willy'], deg: 1.0 },
    ];
    const result = runClassification(RULES_25, facts);
    const whale = result.facts.get('species|willy,whale');
    expect(whale).toBeDefined();
    // Chain: hair(0.9) -> mammal(0.855) -> whale(min(0.855,0.95,1.0)*0.9 = 0.7695)
    expect(whale!.deg).toBeLessThan(0.9);
    expect(whale!.deg).toBeGreaterThan(0.5);
  });

  it('cheetah degree attenuates through carnivore -> species chain', () => {
    const facts = [
      { pred: 'eats-meat', args: ['flash'], deg: 0.9 },
      { pred: 'has-claws', args: ['flash'], deg: 0.85 },
      { pred: 'is-fast', args: ['flash'], deg: 1.0 },
    ];
    const result = runClassification(RULES_25, facts);
    const cheetah = result.facts.get('species|flash,cheetah');
    expect(cheetah).toBeDefined();
    expect(cheetah!.deg).toBeLessThan(0.9);
    expect(cheetah!.deg).toBeGreaterThan(0.5);
  });

  it('warm-blooded is inferred for mammals at tier 1', () => {
    const facts = [{ pred: 'has-hair', args: ['rex'], deg: 0.9 }];
    const result = runClassification(RULES_25, facts);
    expect(result.facts.get('is-warm-blooded|rex')).toBeDefined();
  });

  it('cold-blooded is inferred from scales at tier 1', () => {
    const facts = [{ pred: 'has-scales', args: ['sly'], deg: 0.9 }];
    const result = runClassification(RULES_25, facts);
    expect(result.facts.get('is-cold-blooded|sly')).toBeDefined();
  });
});
