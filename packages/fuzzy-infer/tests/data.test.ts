import { describe, it, expect, beforeEach } from 'vitest';
import { FuzzyEngine } from '../src/engine';
import { RULES_10 } from '../src/data/rules-10';
import { RULES_25 } from '../src/data/rules-25';
import { RULES_100 } from '../src/data/rules-100';
import { RULES_500 } from '../src/data/rules-500';
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

// =====================================================================
// Tier 2 (RULES_100) coherence
// =====================================================================

describe('Tier coherence — RULES_100 is a superset of RULES_25', () => {
  const names25 = new Set(RULES_25.map((r) => r.name));
  const names100 = new Set(RULES_100.map((r) => r.name));

  it('every RULES_25 name exists in RULES_100', () => {
    for (const name of names25) {
      expect(names100.has(name), `missing rule: ${name}`).toBe(true);
    }
  });

  it('RULES_100 has strictly more rules than RULES_25', () => {
    expect(RULES_100.length).toBeGreaterThan(RULES_25.length);
  });

  it('RULES_100 has at least 90 rules', () => {
    expect(RULES_100.length).toBeGreaterThanOrEqual(90);
  });

  it('RULES_100 rule names are unique', () => {
    const names = RULES_100.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every RULES_100 rule has valid structure', () => {
    for (const rule of RULES_100) {
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
      expect(rule.actions.length).toBeGreaterThan(0);
      expect(typeof rule.priority).toBe('number');
    }
  });
});

// =====================================================================
// Tier 3 (RULES_500) coherence
// =====================================================================

describe('Tier coherence — RULES_500 is a superset of RULES_100', () => {
  const names100 = new Set(RULES_100.map((r) => r.name));
  const names500 = new Set(RULES_500.map((r) => r.name));

  it('every RULES_100 name exists in RULES_500', () => {
    for (const name of names100) {
      expect(names500.has(name), `missing rule: ${name}`).toBe(true);
    }
  });

  it('RULES_500 has strictly more rules than RULES_100', () => {
    expect(RULES_500.length).toBeGreaterThan(RULES_100.length);
  });

  it('RULES_500 has at least 400 rules', () => {
    expect(RULES_500.length).toBeGreaterThanOrEqual(400);
  });

  it('RULES_500 rule names are unique', () => {
    const names = RULES_500.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every RULES_500 rule has valid structure', () => {
    for (const rule of RULES_500) {
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
      expect(rule.actions.length).toBeGreaterThan(0);
      expect(typeof rule.priority).toBe('number');
    }
  });
});

// =====================================================================
// Cross-tier classification: zebra, tiger, penguin, eagle at ALL 4 tiers
// =====================================================================

describe('Cross-tier classification — zebra at all 4 tiers', () => {
  const zebraFacts = [
    { pred: 'has-hair', args: ['zara'], deg: 1.0 },
    { pred: 'has-hooves', args: ['zara'], deg: 0.9 },
    { pred: 'has-stripes', args: ['zara'], deg: 0.95 },
  ];

  const tiers: [string, Rule[]][] = [
    ['RULES_10', RULES_10],
    ['RULES_25', RULES_25],
    ['RULES_100', RULES_100],
    ['RULES_500', RULES_500],
  ];

  for (const [label, rules] of tiers) {
    it(`classifies zebra at ${label}`, () => {
      const result = runClassification(rules, zebraFacts);
      expect(result.facts.get('species|zara,zebra')).toBeDefined();
      expect(result.facts.get('species|zara,zebra')!.deg).toBeGreaterThan(0);
    });
  }
});

describe('Cross-tier classification — tiger at all 4 tiers', () => {
  const tigerFacts = [
    { pred: 'has-hair', args: ['tony'], deg: 1.0 },
    { pred: 'eats-meat', args: ['tony'], deg: 0.9 },
    { pred: 'has-claws', args: ['tony'], deg: 0.85 },
    { pred: 'has-stripes', args: ['tony'], deg: 0.95 },
  ];

  const tiers: [string, Rule[]][] = [
    ['RULES_10', RULES_10],
    ['RULES_25', RULES_25],
    ['RULES_100', RULES_100],
    ['RULES_500', RULES_500],
  ];

  for (const [label, rules] of tiers) {
    it(`classifies tiger at ${label}`, () => {
      const result = runClassification(rules, tigerFacts);
      expect(result.facts.get('species|tony,tiger')).toBeDefined();
      expect(result.facts.get('species|tony,tiger')!.deg).toBeGreaterThan(0);
    });
  }
});

describe('Cross-tier classification — penguin at all 4 tiers', () => {
  const penguinFacts = [
    { pred: 'has-feathers', args: ['penny'], deg: 1.0 },
    { pred: 'cannot-fly', args: ['penny'], deg: 0.95 },
  ];

  const tiers: [string, Rule[]][] = [
    ['RULES_10', RULES_10],
    ['RULES_25', RULES_25],
    ['RULES_100', RULES_100],
    ['RULES_500', RULES_500],
  ];

  for (const [label, rules] of tiers) {
    it(`classifies penguin at ${label}`, () => {
      const result = runClassification(rules, penguinFacts);
      expect(result.facts.get('species|penny,penguin')).toBeDefined();
      expect(result.facts.get('species|penny,penguin')!.deg).toBeGreaterThan(0);
    });
  }
});

describe('Cross-tier classification — eagle at all 4 tiers', () => {
  const eagleFacts = [
    { pred: 'has-feathers', args: ['eddie'], deg: 1.0 },
    { pred: 'eats-meat', args: ['eddie'], deg: 0.9 },
    { pred: 'has-claws', args: ['eddie'], deg: 0.85 },
  ];

  const tiers: [string, Rule[]][] = [
    ['RULES_10', RULES_10],
    ['RULES_25', RULES_25],
    ['RULES_100', RULES_100],
    ['RULES_500', RULES_500],
  ];

  for (const [label, rules] of tiers) {
    it(`classifies eagle at ${label}`, () => {
      const result = runClassification(rules, eagleFacts);
      expect(result.facts.get('species|eddie,eagle')).toBeDefined();
      expect(result.facts.get('species|eddie,eagle')!.deg).toBeGreaterThan(0);
    });
  }
});

// =====================================================================
// Each higher tier identifies more species than the previous
// =====================================================================

describe('Tier progression — higher tiers identify more species', () => {
  // Run many traits through each tier and count unique species identified
  const manyTraits = [
    { pred: 'has-hair', args: ['x'], deg: 0.9 },
    { pred: 'has-feathers', args: ['x'], deg: 0.9 },
    { pred: 'eats-meat', args: ['x'], deg: 0.9 },
    { pred: 'has-claws', args: ['x'], deg: 0.9 },
    { pred: 'has-hooves', args: ['x'], deg: 0.9 },
    { pred: 'has-stripes', args: ['x'], deg: 0.9 },
    { pred: 'has-long-neck', args: ['x'], deg: 0.9 },
    { pred: 'cannot-fly', args: ['x'], deg: 0.9 },
    { pred: 'is-aquatic', args: ['x'], deg: 0.9 },
    { pred: 'has-scales', args: ['x'], deg: 0.9 },
    { pred: 'has-no-legs', args: ['x'], deg: 0.9 },
    { pred: 'is-large', args: ['x'], deg: 0.9 },
    { pred: 'can-fly', args: ['x'], deg: 0.9 },
    { pred: 'is-nocturnal', args: ['x'], deg: 0.9 },
    { pred: 'eats-plants', args: ['x'], deg: 0.9 },
    { pred: 'is-fast', args: ['x'], deg: 0.9 },
    { pred: 'can-jump', args: ['x'], deg: 0.9 },
    { pred: 'has-spots', args: ['x'], deg: 0.9 },
    { pred: 'has-shell', args: ['x'], deg: 0.9 },
    { pred: 'has-exoskeleton', args: ['x'], deg: 0.9 },
    { pred: 'has-six-legs', args: ['x'], deg: 0.9 },
    { pred: 'has-eight-legs', args: ['x'], deg: 0.9 },
    { pred: 'has-gills', args: ['x'], deg: 0.9 },
    { pred: 'has-fins', args: ['x'], deg: 0.9 },
    { pred: 'has-tentacles', args: ['x'], deg: 0.9 },
    { pred: 'has-soft-body', args: ['x'], deg: 0.9 },
    { pred: 'has-wings', args: ['x'], deg: 0.9 },
    { pred: 'has-bright-colors', args: ['x'], deg: 0.9 },
  ];

  function countSpecies(rules: Rule[]): number {
    const result = runClassification(rules, manyTraits);
    let count = 0;
    for (const key of result.facts.keys()) {
      if (key.startsWith('species|')) count++;
    }
    return count;
  }

  it('RULES_25 identifies more species than RULES_10', () => {
    expect(countSpecies(RULES_25)).toBeGreaterThan(countSpecies(RULES_10));
  });

  it('RULES_100 identifies more species than RULES_25', () => {
    expect(countSpecies(RULES_100)).toBeGreaterThan(countSpecies(RULES_25));
  });

  it('RULES_500 identifies more species than RULES_100', () => {
    expect(countSpecies(RULES_500)).toBeGreaterThan(countSpecies(RULES_100));
  });
});

// =====================================================================
// Tier 2-only species
// =====================================================================

describe('Tier coherence — tier 2 classifies species that tier 1 cannot', () => {
  it('kangaroo classifies at tier 2 but not tier 1', () => {
    const facts = [
      { pred: 'has-hair', args: ['kanga'], deg: 0.9 },
      { pred: 'has-pouch', args: ['kanga'], deg: 0.95 },
      { pred: 'can-jump', args: ['kanga'], deg: 1.0 },
    ];
    const r25 = runClassification(RULES_25, facts);
    const r100 = runClassification(RULES_100, facts);
    expect(r25.facts.get('species|kanga,kangaroo')).toBeUndefined();
    expect(r100.facts.get('species|kanga,kangaroo')).toBeDefined();
    expect(r100.facts.get('species|kanga,kangaroo')!.deg).toBeGreaterThan(0);
  });

  it('elephant classifies at tier 2 but not tier 1', () => {
    const facts = [
      { pred: 'has-hair', args: ['ellie'], deg: 0.9 },
      { pred: 'has-trunk', args: ['ellie'], deg: 1.0 },
      { pred: 'is-large', args: ['ellie'], deg: 1.0 },
    ];
    const r25 = runClassification(RULES_25, facts);
    const r100 = runClassification(RULES_100, facts);
    expect(r25.facts.get('species|ellie,elephant')).toBeUndefined();
    expect(r100.facts.get('species|ellie,elephant')).toBeDefined();
  });

  it('spider classifies at tier 2 but not tier 1', () => {
    const facts = [
      { pred: 'has-exoskeleton', args: ['spidey'], deg: 0.9 },
      { pred: 'has-eight-legs', args: ['spidey'], deg: 1.0 },
      { pred: 'spins-webs', args: ['spidey'], deg: 0.95 },
    ];
    const r25 = runClassification(RULES_25, facts);
    const r100 = runClassification(RULES_100, facts);
    expect(r25.facts.get('species|spidey,spider')).toBeUndefined();
    expect(r100.facts.get('species|spidey,spider')).toBeDefined();
  });
});

// =====================================================================
// Tier 3-only species
// =====================================================================

describe('Tier coherence — tier 3 classifies species that tier 2 cannot', () => {
  it('platypus classifies at tier 3 but not tier 2', () => {
    const facts = [
      { pred: 'has-hair', args: ['plato'], deg: 0.9 },
      { pred: 'lays-eggs', args: ['plato'], deg: 1.0 },
      { pred: 'has-bill', args: ['plato'], deg: 0.95 },
      { pred: 'is-aquatic', args: ['plato'], deg: 0.9 },
    ];
    const r100 = runClassification(RULES_100, facts);
    const r500 = runClassification(RULES_500, facts);
    expect(r100.facts.get('species|plato,platypus')).toBeUndefined();
    expect(r500.facts.get('species|plato,platypus')).toBeDefined();
    expect(r500.facts.get('species|plato,platypus')!.deg).toBeGreaterThan(0);
  });

  it('axolotl classifies at tier 3 but not tier 2', () => {
    const facts = [
      { pred: 'lives-in-water', args: ['axel'], deg: 0.9 },
      { pred: 'lives-on-land', args: ['axel'], deg: 0.8 },
      { pred: 'has-moist-skin', args: ['axel'], deg: 0.9 },
      { pred: 'has-gills', args: ['axel'], deg: 1.0 },
      { pred: 'has-external-gills', args: ['axel'], deg: 0.95 },
    ];
    const r100 = runClassification(RULES_100, facts);
    const r500 = runClassification(RULES_500, facts);
    expect(r100.facts.get('species|axel,axolotl')).toBeUndefined();
    expect(r500.facts.get('species|axel,axolotl')).toBeDefined();
  });

  it('octopus classifies at tier 3 but not tier 2', () => {
    const facts = [
      { pred: 'has-soft-body', args: ['otto'], deg: 0.9 },
      { pred: 'is-aquatic', args: ['otto'], deg: 1.0 },
      { pred: 'has-tentacles', args: ['otto'], deg: 0.95 },
      { pred: 'has-eight-legs', args: ['otto'], deg: 1.0 },
    ];
    const r100 = runClassification(RULES_100, facts);
    const r500 = runClassification(RULES_500, facts);
    expect(r100.facts.get('species|otto,octopus')).toBeUndefined();
    expect(r500.facts.get('species|otto,octopus')).toBeDefined();
  });

  it('narwhal classifies at tier 3 but not tier 2', () => {
    const facts = [
      { pred: 'has-hair', args: ['nari'], deg: 0.9 },
      { pred: 'is-aquatic', args: ['nari'], deg: 1.0 },
      { pred: 'has-blowhole', args: ['nari'], deg: 0.95 },
      { pred: 'has-tusk', args: ['nari'], deg: 1.0 },
      { pred: 'lives-in-arctic', args: ['nari'], deg: 0.9 },
    ];
    const r100 = runClassification(RULES_100, facts);
    const r500 = runClassification(RULES_500, facts);
    expect(r100.facts.get('species|nari,narwhal')).toBeUndefined();
    expect(r500.facts.get('species|nari,narwhal')).toBeDefined();
  });

  it('cassowary classifies at tier 3 but not tier 2', () => {
    const facts = [
      { pred: 'has-feathers', args: ['cassy'], deg: 1.0 },
      { pred: 'cannot-fly', args: ['cassy'], deg: 1.0 },
      { pred: 'is-large', args: ['cassy'], deg: 0.9 },
      { pred: 'has-casque', args: ['cassy'], deg: 0.95 },
      { pred: 'lives-in-jungle', args: ['cassy'], deg: 0.9 },
    ];
    const r100 = runClassification(RULES_100, facts);
    const r500 = runClassification(RULES_500, facts);
    expect(r100.facts.get('species|cassy,cassowary')).toBeUndefined();
    expect(r500.facts.get('species|cassy,cassowary')).toBeDefined();
  });
});
