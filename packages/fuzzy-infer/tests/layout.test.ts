import { describe, it, expect, beforeEach } from 'vitest';
import { layoutTree } from '../src/layout';
import { FuzzyEngine } from '../src/engine';
import { RULES_10 } from '../src/data/rules-10';
import type { Fact, Rule, TreeLayout, NodePosition } from '../src/types';

describe('layoutTree — basic structure', () => {
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
    const layout = layoutTree(facts, rules, 800, 600);
    expect(layout).toHaveProperty('nodes');
    expect(layout).toHaveProperty('edges');
    expect(Array.isArray(layout.nodes)).toBe(true);
    expect(Array.isArray(layout.edges)).toBe(true);
  });

  it('returns width and height matching input', () => {
    const layout = layoutTree(facts, rules, 800, 600);
    expect(layout.width).toBe(800);
    expect(layout.height).toBe(600);
  });

  it('creates nodes for trait predicates at layer 0', () => {
    const layout = layoutTree(facts, rules, 800, 600);
    const traitNodes = layout.nodes.filter((n) => n.layer === 0);
    expect(traitNodes.length).toBeGreaterThan(0);
    const traitLabels = traitNodes.map((n) => n.label);
    expect(traitLabels).toContain('has-hair');
    expect(traitLabels).toContain('has-feathers');
  });

  it('creates rule nodes at layer 1', () => {
    const layout = layoutTree(facts, rules, 800, 600);
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    expect(ruleNodes.length).toBe(2);
    const ruleLabels = ruleNodes.map((n) => n.label);
    expect(ruleLabels).toContain('mammal-rule');
    expect(ruleLabels).toContain('bird-rule');
  });

  it('rule nodes have type "rule"', () => {
    const layout = layoutTree(facts, rules, 800, 600);
    const ruleNodes = layout.nodes.filter((n) => n.layer === 1);
    for (const node of ruleNodes) {
      expect(node.type).toBe('rule');
    }
  });

  it('creates classification nodes at layer 2', () => {
    const layout = layoutTree(facts, rules, 800, 600);
    const classNodes = layout.nodes.filter((n) => n.layer === 2);
    expect(classNodes.length).toBeGreaterThan(0);
    const classLabels = classNodes.map((n) => n.label);
    expect(classLabels).toContain('is-mammal');
    expect(classLabels).toContain('is-bird');
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
    const layout = layoutTree(facts, rules, 800, 600);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(800);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(600);
    }
  });

  it('layer 0 nodes have smaller y than layer 1 nodes', () => {
    const layout = layoutTree(facts, rules, 800, 600);
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
    const layout = layoutTree(facts, rules, 800, 600);
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
    const layout = layoutTree(facts, rules, 800, 600);
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
    const layout = layoutTree(facts, rules, 800, 600);
    const carnivoreRule = layout.nodes.find((n) => n.label === 'carnivore-rule');
    expect(carnivoreRule).toBeDefined();
    const incoming = layout.edges.filter((e) => e.to === carnivoreRule!.id);
    expect(incoming.length).toBe(2);
  });

  it('all edge endpoints reference valid node ids', () => {
    const layout = layoutTree(facts, rules, 800, 600);
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
    const layout = layoutTree(facts, RULES_10, 1000, 800);
    expect(layout.nodes.length).toBeGreaterThan(0);
    expect(layout.edges.length).toBeGreaterThan(0);
  });

  it('creates trait nodes for all condition predicates', () => {
    const layout = layoutTree([], RULES_10, 1000, 800);
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

  it('has species nodes at layer 3', () => {
    const layout = layoutTree([], RULES_10, 1000, 800);
    const speciesNodes = layout.nodes.filter((n) => n.layer === 3);
    expect(speciesNodes.length).toBeGreaterThan(0);
    const speciesLabels = new Set(speciesNodes.map((n) => n.label));
    expect(speciesLabels).toContain('zebra');
    expect(speciesLabels).toContain('penguin');
    expect(speciesLabels).toContain('eagle');
  });

  it('node ids are unique', () => {
    const layout = layoutTree([], RULES_10, 1000, 800);
    const ids = layout.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
