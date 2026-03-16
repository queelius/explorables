import type { Fact, Rule, TreeLayout, NodePosition, EdgePosition } from './types';

/**
 * Layered tree layout for the fuzzy inference visualization.
 *
 * Assigns nodes to 4 layers:
 *   Layer 0 — traits: raw observable predicates (has-hair, eats-meat, etc.)
 *   Layer 1 — rules: inference rules (diamond nodes)
 *   Layer 2 — classifications: intermediate results (is-mammal, is-carnivore, etc.)
 *   Layer 3 — species: final species identifications
 *
 * The layer assignment is derived from rule structure, not hardcoded per predicate.
 */

/** Predicates produced by rule actions that are species identifications. */
function isSpeciesPred(pred: string): boolean {
  return pred === 'species';
}

/**
 * Derive trait, classification, and species sets from rule structure.
 *
 * - Action predicates (non-species, non-trait): classifications (layer 2)
 * - Condition predicates that are NOT action results: traits (layer 0)
 * - Species come from actions with pred === 'species'
 *
 * This avoids hardcoding: a predicate like `is-aquatic` that appears only as
 * a condition (never produced by a rule) is correctly classified as a trait.
 */
function derivePredicateCategories(rules: Rule[]): {
  traits: Set<string>;
  classifications: Set<string>;
} {
  // Collect all predicates produced by rule actions (excluding species)
  const actionPreds = new Set<string>();
  for (const rule of rules) {
    for (const action of rule.actions) {
      if (action.type === 'add' && !isSpeciesPred(action.fact.pred)) {
        actionPreds.add(action.fact.pred);
      }
    }
  }

  // Collect all condition predicates
  const condPreds = new Set<string>();
  for (const rule of rules) {
    for (const cond of rule.conditions) {
      condPreds.add(cond.pred);
    }
  }

  // Traits: condition predicates that are never produced by any rule action
  const traits = new Set<string>();
  for (const pred of condPreds) {
    if (!actionPreds.has(pred)) {
      traits.add(pred);
    }
  }

  // Classifications: action predicates that are not species
  const classifications = actionPreds;

  return { traits, classifications };
}

/**
 * Collect all species names from rule actions with pred === 'species'.
 * The species name is the second arg (args[1]) in the action fact.
 */
function collectSpeciesNames(rules: Rule[]): Set<string> {
  const species = new Set<string>();
  for (const rule of rules) {
    for (const action of rule.actions) {
      if (action.type === 'add' && isSpeciesPred(action.fact.pred)) {
        // args[1] is the species name (args[0] is the variable ?x)
        const name = action.fact.args[1];
        if (name && !name.startsWith('?')) {
          species.add(name);
        }
      }
    }
  }
  return species;
}

/** Build a lookup from predicate -> fact degree for active traits. */
function buildFactDegrees(facts: Fact[]): Map<string, number> {
  const degs = new Map<string, number>();
  for (const fact of facts) {
    const key = fact.pred;
    const existing = degs.get(key) ?? 0;
    if (fact.deg > existing) degs.set(key, fact.deg);
  }
  return degs;
}

/**
 * Space a set of nodes evenly across the horizontal axis at a given y position.
 */
function distributeHorizontally(
  count: number,
  y: number,
  width: number,
  padding: number
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  if (count === 1) return [{ x: width / 2, y }];
  const usable = width - 2 * padding;
  const step = usable / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    x: padding + i * step,
    y,
  }));
}

export function layoutTree(
  facts: Fact[],
  rules: Rule[],
  width: number,
  height: number
): TreeLayout {
  const nodes: NodePosition[] = [];
  const edges: EdgePosition[] = [];

  // Derive categories from rule structure
  const { traits: traitPreds, classifications: classPreds } = derivePredicateCategories(rules);
  const speciesNames = collectSpeciesNames(rules);

  const factDegs = buildFactDegrees(facts);

  // Layout constants
  const padding = width * 0.05;
  const layerCount = 4;
  const layerSpacing = height / (layerCount + 1);

  // --- Layer 0: trait nodes ---
  const traitList = [...traitPreds].sort();
  const traitPositions = distributeHorizontally(traitList.length, layerSpacing, width, padding);
  const traitNodeIds = new Map<string, string>();
  for (let i = 0; i < traitList.length; i++) {
    const pred = traitList[i];
    const id = `trait:${pred}`;
    traitNodeIds.set(pred, id);
    nodes.push({
      id,
      x: traitPositions[i].x,
      y: traitPositions[i].y,
      layer: 0,
      type: 'fact',
      label: pred,
      deg: factDegs.get(pred) ?? 0,
      active: factDegs.has(pred),
    });
  }

  // --- Layer 1: rule nodes ---
  const ruleList = [...rules].sort((a, b) => a.name.localeCompare(b.name));
  const rulePositions = distributeHorizontally(ruleList.length, layerSpacing * 2, width, padding);
  const ruleNodeIds = new Map<string, string>();
  for (let i = 0; i < ruleList.length; i++) {
    const rule = ruleList[i];
    const id = `rule:${rule.name}`;
    ruleNodeIds.set(rule.name, id);
    nodes.push({
      id,
      x: rulePositions[i].x,
      y: rulePositions[i].y,
      layer: 1,
      type: 'rule',
      label: rule.name,
      deg: 0,
      active: false,
    });
  }

  // --- Layer 2: classification nodes ---
  const classList = [...classPreds].sort();
  const classPositions = distributeHorizontally(
    classList.length,
    layerSpacing * 3,
    width,
    padding
  );
  const classNodeIds = new Map<string, string>();
  for (let i = 0; i < classList.length; i++) {
    const pred = classList[i];
    const id = `class:${pred}`;
    classNodeIds.set(pred, id);
    nodes.push({
      id,
      x: classPositions[i].x,
      y: classPositions[i].y,
      layer: 2,
      type: 'result',
      label: pred,
      deg: 0,
      active: false,
    });
  }

  // --- Layer 3: species nodes ---
  const speciesList = [...speciesNames].sort();
  const speciesPositions = distributeHorizontally(
    speciesList.length,
    layerSpacing * 4,
    width,
    padding
  );
  for (let i = 0; i < speciesList.length; i++) {
    const name = speciesList[i];
    const id = `species:${name}`;
    nodes.push({
      id,
      x: speciesPositions[i].x,
      y: speciesPositions[i].y,
      layer: 3,
      type: 'result',
      label: name,
      deg: 0,
      active: false,
    });
  }

  // --- Build edges ---
  for (const rule of rules) {
    const ruleId = ruleNodeIds.get(rule.name)!;

    // Edges from conditions to rule
    for (const cond of rule.conditions) {
      // Condition might reference a trait (layer 0) or a classification (layer 2)
      const sourceId = traitNodeIds.get(cond.pred) ?? classNodeIds.get(cond.pred);
      if (sourceId) {
        edges.push({ from: sourceId, to: ruleId, active: false });
      }
    }

    // Edges from rule to action results
    for (const action of rule.actions) {
      if (action.type !== 'add') continue;
      const pred = action.fact.pred;
      if (classPreds.has(pred)) {
        const targetId = classNodeIds.get(pred);
        if (targetId) {
          edges.push({ from: ruleId, to: targetId, active: false });
        }
      } else if (isSpeciesPred(pred)) {
        const speciesName = action.fact.args[1];
        if (speciesName && !speciesName.startsWith('?')) {
          const targetId = `species:${speciesName}`;
          edges.push({ from: ruleId, to: targetId, active: false });
        }
      }
    }
  }

  return { nodes, edges, width, height };
}
