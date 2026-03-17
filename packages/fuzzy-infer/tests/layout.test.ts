import { describe, it, expect, beforeEach } from 'vitest';
import { layoutTree, derivePredicateCategories } from '../src/layout';
import { FuzzyEngine } from '../src/engine';
import { RULES_10 } from '../src/data/rules-10';
import type { Fact, Rule, TreeLayout, NodePosition } from '../src/types';

describe('layoutTree — basic structure (no inference data)', () => {
  const rules: Rule[] = [
    {
      name: 'mammal-rule',
      conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
      actions: [
        { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
      ],
      priority: 60,
    },
    {
      name: 'bird-rule',
      conditions: [{ pred: 'has-feathers', args: ['?x'], degVar: '?d' }],
      actions: [{ type: 'add', fact: { pred: 'is-bird', args: ['?x'], deg: ['*', 0.95, '?d'] } }],
      priority: 60,
    },
  ];

  const facts: Fact[] = [{ pred: 'has-hair', args: ['max'], deg: 0.9 }];

  it('returns nodes and edges arrays', () => {
    const layout = layoutTree(facts, rules, 800);
    expect(layout).toHaveProperty('nodes');
    expect(layout).toHaveProperty('edges');
    expect(Array.isArray(layout.nodes)).toBe(true);
    expect(Array.isArray(layout.edges)).toBe(true);
  });

  it('returns width matching input and computes height dynamically', () => {
    const layout = layoutTree(facts, rules, 800);
    expect(layout.width).toBe(800);
    expect(layout.height).toBeGreaterThan(0);
  });

  it('creates nodes for trait predicates at layer 0', () => {
    const layout = layoutTree(facts, rules, 800);
    const traitNodes = layout.nodes.filter((n) => n.layer === 0);
    expect(traitNodes.length).toBeGreaterThan(0);
    const traitLabels = traitNodes.map((n) => n.label);
    expect(traitLabels).toContain('has-hair');
    expect(traitLabels).toContain('has-feathers');
  });

  it('creates rule nodes at layer 1 (all shown when no firedRules)', () => {
    const layout = layoutTree(facts, rules, 800);
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    expect(ruleNodes.length).toBe(2);
    const ruleLabels = ruleNodes.map((n) => n.label);
    expect(ruleLabels).toContain('mammal-rule');
    expect(ruleLabels).toContain('bird-rule');
  });

  it('rule nodes have type "rule"', () => {
    const layout = layoutTree(facts, rules, 800);
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    for (const node of ruleNodes) {
      expect(node.type).toBe('rule');
    }
  });

  it('creates classification nodes at layer 2', () => {
    const layout = layoutTree(facts, rules, 800);
    const classNodes = layout.nodes.filter((n) => n.layer === 2);
    expect(classNodes.length).toBeGreaterThan(0);
    const classLabels = classNodes.map((n) => n.label);
    expect(classLabels).toContain('is-mammal');
    expect(classLabels).toContain('is-bird');
  });
});

describe('layoutTree — active subgraph filtering', () => {
  const rules: Rule[] = [
    {
      name: 'mammal-rule',
      conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
      actions: [
        { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
      ],
      priority: 60,
    },
    {
      name: 'bird-rule',
      conditions: [{ pred: 'has-feathers', args: ['?x'], degVar: '?d' }],
      actions: [{ type: 'add', fact: { pred: 'is-bird', args: ['?x'], deg: ['*', 0.95, '?d'] } }],
      priority: 60,
    },
    {
      name: 'zebra-rule',
      conditions: [
        { pred: 'is-mammal', args: ['?x'] },
        { pred: 'has-stripes', args: ['?x'] },
      ],
      actions: [
        { type: 'add', fact: { pred: 'species', args: ['?x', 'zebra'], deg: 0.9 } },
      ],
      priority: 50,
    },
  ];

  it('only shows fired rules when firedRules is provided', () => {
    const facts: Fact[] = [{ pred: 'has-hair', args: ['max'], deg: 0.9 }];
    const layout = layoutTree(facts, rules, 800, { firedRules: ['mammal-rule'] });
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    expect(ruleNodes.length).toBe(1);
    expect(ruleNodes[0].label).toBe('mammal-rule');
  });

  it('marks fired rules as active', () => {
    const facts: Fact[] = [{ pred: 'has-hair', args: ['max'], deg: 0.9 }];
    const layout = layoutTree(facts, rules, 800, { firedRules: ['mammal-rule'] });
    const ruleNode = layout.nodes.find((n) => n.label === 'mammal-rule');
    expect(ruleNode).toBeDefined();
    expect(ruleNode!.active).toBe(true);
  });

  it('only shows classifications produced by fired rules', () => {
    const facts: Fact[] = [
      { pred: 'has-hair', args: ['max'], deg: 0.9 },
      { pred: 'is-mammal', args: ['max'], deg: 0.855 },
    ];
    const layout = layoutTree(facts, rules, 800, { firedRules: ['mammal-rule'] });
    const classNodes = layout.nodes.filter((n) => n.layer === 2);
    expect(classNodes.length).toBe(1);
    expect(classNodes[0].label).toBe('is-mammal');
    // is-bird should NOT be present since bird-rule did not fire
    expect(classNodes.find((n) => n.label === 'is-bird')).toBeUndefined();
  });

  it('only shows species produced by fired rules', () => {
    const facts: Fact[] = [
      { pred: 'has-hair', args: ['max'], deg: 0.9 },
      { pred: 'has-stripes', args: ['max'], deg: 0.95 },
      { pred: 'is-mammal', args: ['max'], deg: 0.855 },
      { pred: 'species', args: ['max', 'zebra'], deg: 0.9 },
    ];
    const layout = layoutTree(facts, rules, 800, {
      firedRules: ['mammal-rule', 'zebra-rule'],
    });
    const speciesNodes = layout.nodes.filter((n) => n.layer === 3);
    expect(speciesNodes.length).toBe(1);
    expect(speciesNodes[0].label).toBe('zebra');
    expect(speciesNodes[0].active).toBe(true);
  });

  it('shows all trait nodes regardless of firing', () => {
    const facts: Fact[] = [{ pred: 'has-hair', args: ['max'], deg: 0.9 }];
    const layout = layoutTree(facts, rules, 800, { firedRules: ['mammal-rule'] });
    const traitNodes = layout.nodes.filter((n) => n.layer === 0);
    // All trait predicates from rules should still appear
    const labels = traitNodes.map((n) => n.label);
    expect(labels).toContain('has-hair');
    expect(labels).toContain('has-feathers');
    expect(labels).toContain('has-stripes');
  });

  it('edge endpoints all reference valid node ids', () => {
    const facts: Fact[] = [{ pred: 'has-hair', args: ['max'], deg: 0.9 }];
    const layout = layoutTree(facts, rules, 800, { firedRules: ['mammal-rule'] });
    const nodeIds = new Set(layout.nodes.map((n) => n.id));
    for (const edge of layout.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it('empty firedRules produces only trait nodes', () => {
    const facts: Fact[] = [];
    const layout = layoutTree(facts, rules, 800, { firedRules: [] });
    // No rules fired -> no rule/class/species nodes
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    const classNodes = layout.nodes.filter((n) => n.layer === 2);
    const speciesNodes = layout.nodes.filter((n) => n.layer === 3);
    expect(ruleNodes.length).toBe(0);
    expect(classNodes.length).toBe(0);
    expect(speciesNodes.length).toBe(0);
    // But traits are always present
    const traitNodes = layout.nodes.filter((n) => n.layer === 0);
    expect(traitNodes.length).toBeGreaterThan(0);
  });
});

describe('layoutTree — dynamic height', () => {
  const rules: Rule[] = [
    {
      name: 'mammal-rule',
      conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
      actions: [
        { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
      ],
      priority: 60,
    },
  ];

  it('height is smaller when only traits are visible (no fired rules)', () => {
    const layoutEmpty = layoutTree([], rules, 800, { firedRules: [] });
    const layoutFull = layoutTree([], rules, 800);
    expect(layoutEmpty.height).toBeLessThan(layoutFull.height);
  });

  it('height grows with more active layers', () => {
    const facts: Fact[] = [
      { pred: 'has-hair', args: ['max'], deg: 0.9 },
      { pred: 'is-mammal', args: ['max'], deg: 0.855 },
    ];
    const layoutTraitsOnly = layoutTree([], rules, 800, { firedRules: [] });
    const layoutWithRules = layoutTree(facts, rules, 800, { firedRules: ['mammal-rule'] });
    expect(layoutWithRules.height).toBeGreaterThan(layoutTraitsOnly.height);
  });
});

describe('layoutTree — node positioning', () => {
  const rules: Rule[] = [
    {
      name: 'mammal-rule',
      conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
      actions: [
        { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
      ],
      priority: 60,
    },
  ];
  const facts: Fact[] = [];

  it('all nodes are within bounds', () => {
    const layout = layoutTree(facts, rules, 800);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(800);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(layout.height);
    }
  });

  it('layer 0 nodes have smaller y than layer 1 nodes', () => {
    const layout = layoutTree(facts, rules, 800);
    const layer0 = layout.nodes.filter((n) => n.layer === 0);
    const layer1 = layout.nodes.filter((n) => n.layer === 1);
    if (layer0.length > 0 && layer1.length > 0) {
      const maxY0 = Math.max(...layer0.map((n) => n.y));
      const minY1 = Math.min(...layer1.map((n) => n.y));
      expect(maxY0).toBeLessThan(minY1);
    }
  });
});

describe('layoutTree — edges', () => {
  const rules: Rule[] = [
    {
      name: 'mammal-rule',
      conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
      actions: [
        { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
      ],
      priority: 60,
    },
    {
      name: 'carnivore-rule',
      conditions: [
        { pred: 'eats-meat', args: ['?x'], degVar: '?d1' },
        { pred: 'has-claws', args: ['?x'], degVar: '?d2' },
      ],
      actions: [
        {
          type: 'add',
          fact: {
            pred: 'is-carnivore',
            args: ['?x'],
            deg: ['*', 0.9, ['min', '?d1', '?d2']],
          },
        },
      ],
      priority: 60,
    },
  ];
  const facts: Fact[] = [];

  it('creates edges from condition traits to rules', () => {
    const layout = layoutTree(facts, rules, 800);
    const mammalRule = layout.nodes.find((n) => n.label === 'mammal-rule');
    const hairTrait = layout.nodes.find((n) => n.label === 'has-hair');
    expect(mammalRule).toBeDefined();
    expect(hairTrait).toBeDefined();
    const edge = layout.edges.find(
      (e) => e.from === hairTrait!.id && e.to === mammalRule!.id
    );
    expect(edge).toBeDefined();
  });

  it('creates edges from rules to action results', () => {
    const layout = layoutTree(facts, rules, 800);
    const mammalRule = layout.nodes.find((n) => n.label === 'mammal-rule');
    const mammalClass = layout.nodes.find((n) => n.label === 'is-mammal');
    expect(mammalRule).toBeDefined();
    expect(mammalClass).toBeDefined();
    const edge = layout.edges.find(
      (e) => e.from === mammalRule!.id && e.to === mammalClass!.id
    );
    expect(edge).toBeDefined();
  });

  it('multi-condition rules have multiple incoming edges', () => {
    const layout = layoutTree(facts, rules, 800);
    const carnivoreRule = layout.nodes.find((n) => n.label === 'carnivore-rule');
    expect(carnivoreRule).toBeDefined();
    const incoming = layout.edges.filter((e) => e.to === carnivoreRule!.id);
    expect(incoming.length).toBe(2);
  });

  it('all edge endpoints reference valid node ids', () => {
    const layout = layoutTree(facts, rules, 800);
    const nodeIds = new Set(layout.nodes.map((n) => n.id));
    for (const edge of layout.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });
});

describe('layoutTree — RULES_10 integration', () => {
  it('handles full RULES_10 ruleset without errors', () => {
    const facts: Fact[] = [
      { pred: 'has-hair', args: ['zara'], deg: 1.0 },
      { pred: 'has-hooves', args: ['zara'], deg: 0.9 },
      { pred: 'has-stripes', args: ['zara'], deg: 0.95 },
    ];
    const layout = layoutTree(facts, RULES_10, 1000);
    expect(layout.nodes.length).toBeGreaterThan(0);
    expect(layout.edges.length).toBeGreaterThan(0);
  });

  it('creates trait nodes for all condition predicates', () => {
    const layout = layoutTree([], RULES_10, 1000);
    const traitNodes = layout.nodes.filter((n) => n.layer === 0);
    const traitLabels = new Set(traitNodes.map((n) => n.label));
    // All trait predicates from RULES_10 conditions
    expect(traitLabels).toContain('has-hair');
    expect(traitLabels).toContain('has-feathers');
    expect(traitLabels).toContain('eats-meat');
    expect(traitLabels).toContain('has-claws');
    expect(traitLabels).toContain('has-hooves');
    expect(traitLabels).toContain('has-stripes');
    expect(traitLabels).toContain('cannot-fly');
    expect(traitLabels).toContain('has-long-neck');
    expect(traitLabels).toContain('is-aquatic');
  });

  it('shows species nodes at layer 3 when rules fire', () => {
    // Run inference to get fired rules
    const engine = new FuzzyEngine();
    for (const rule of RULES_10) engine.addRule(rule);
    engine.addFact({ pred: 'has-feathers', args: ['penny'], deg: 1.0 });
    engine.addFact({ pred: 'cannot-fly', args: ['penny'], deg: 0.95 });
    const result = engine.run();
    const facts: Fact[] = [...result.facts.values()];
    const layout = layoutTree(facts, RULES_10, 1000, { firedRules: result.firedRules });
    const speciesNodes = layout.nodes.filter((n) => n.layer === 3);
    expect(speciesNodes.length).toBeGreaterThan(0);
    const speciesLabels = new Set(speciesNodes.map((n) => n.label));
    expect(speciesLabels).toContain('penguin');
  });

  it('node ids are unique', () => {
    const layout = layoutTree([], RULES_10, 1000);
    const ids = layout.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('layoutTree — full inference integration', () => {
  it('zebra inference shows only relevant subgraph', () => {
    const engine = new FuzzyEngine();
    for (const rule of RULES_10) engine.addRule(rule);
    engine.addFact({ pred: 'has-hair', args: ['zara'], deg: 1.0 });
    engine.addFact({ pred: 'has-hooves', args: ['zara'], deg: 0.9 });
    engine.addFact({ pred: 'has-stripes', args: ['zara'], deg: 0.95 });
    const result = engine.run();
    const facts: Fact[] = [...result.facts.values()];

    const layout = layoutTree(facts, RULES_10, 1000, { firedRules: result.firedRules });

    // Only fired rules should appear
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    const firedSet = new Set(result.firedRules);
    for (const rn of ruleNodes) {
      expect(firedSet.has(rn.label)).toBe(true);
    }

    // Zebra should be in species
    const speciesNodes = layout.nodes.filter((n) => n.layer === 3);
    const speciesLabels = speciesNodes.map((n) => n.label);
    expect(speciesLabels).toContain('zebra');

    // All edges should reference valid nodes
    const nodeIds = new Set(layout.nodes.map((n) => n.id));
    for (const edge of layout.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });
});

describe('derivePredicateCategories', () => {
  it('identifies traits as condition-only predicates', () => {
    const rules: Rule[] = [
      {
        name: 'r1',
        conditions: [{ pred: 'has-hair', args: ['?x'] }],
        actions: [{ type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: 0.9 } }],
        priority: 50,
      },
    ];
    const { traits, classifications } = derivePredicateCategories(rules);
    expect(traits.has('has-hair')).toBe(true);
    expect(traits.has('is-mammal')).toBe(false);
    expect(classifications.has('is-mammal')).toBe(true);
  });

  it('handles predicates that appear in both conditions and actions', () => {
    const rules: Rule[] = [
      {
        name: 'r1',
        conditions: [{ pred: 'A', args: [] }],
        actions: [{ type: 'add', fact: { pred: 'B', args: [], deg: 0.9 } }],
        priority: 50,
      },
      {
        name: 'r2',
        conditions: [{ pred: 'B', args: [] }],
        actions: [{ type: 'add', fact: { pred: 'C', args: [], deg: 0.9 } }],
        priority: 50,
      },
    ];
    const { traits, classifications } = derivePredicateCategories(rules);
    // A is a trait (condition-only), B is a classification (produced by r1)
    expect(traits.has('A')).toBe(true);
    expect(traits.has('B')).toBe(false);
    expect(classifications.has('B')).toBe(true);
    expect(classifications.has('C')).toBe(true);
  });
});
