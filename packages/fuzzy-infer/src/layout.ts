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
 *
 * After inference, only the ACTIVE subgraph is shown:
 *   - All trait toggles (greyed out if inactive, green if active)
 *   - Only rules that actually FIRED
 *   - Only classifications/species that were actually INFERRED
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
export function derivePredicateCategories(rules: Rule[]): {
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

/**
 * Options for layoutTree to filter the graph to the active subgraph.
 * When provided, only fired rules and their connected nodes are shown
 * (plus all trait toggles for completeness).
 */
export interface LayoutOptions {
  /** Names of rules that fired during inference. */
  firedRules?: string[];
}

export function layoutTree(
  facts: Fact[],
  rules: Rule[],
  width: number,
  options?: LayoutOptions
): TreeLayout {
  const nodes: NodePosition[] = [];
  const edges: EdgePosition[] = [];

  // Derive categories from rule structure
  const { traits: traitPreds, classifications: classPreds } = derivePredicateCategories(rules);

  const factDegs = buildFactDegrees(facts);

  // Determine which rules fired (unique set of names)
  const firedRulesProvided = options?.firedRules !== undefined;
  const firedSet = new Set(options?.firedRules ?? []);

  // When firedRules is explicitly provided (even if empty), filter to fired rules only.
  // When not provided, show all rules (backward-compat for simple widgets).
  const activeRules = firedRulesProvided
    ? rules.filter((r) => firedSet.has(r.name))
    : rules;

  // Collect classification preds and species names that were ACTUALLY produced
  // by the active rules (not the entire rule set)
  const activeClassPreds = new Set<string>();
  const activeSpeciesNames = new Set<string>();
  for (const rule of activeRules) {
    for (const action of rule.actions) {
      if (action.type !== 'add') continue;
      if (isSpeciesPred(action.fact.pred)) {
        const name = action.fact.args[1];
        if (name && !name.startsWith('?')) {
          activeSpeciesNames.add(name);
        }
      } else if (classPreds.has(action.fact.pred)) {
        activeClassPreds.add(action.fact.pred);
      }
    }
  }

  // Count non-empty layers for dynamic height
  const hasRules = activeRules.length > 0;
  const hasClassifications = activeClassPreds.size > 0;
  const hasSpecies = activeSpeciesNames.size > 0;
  // Layer 0 (traits) always present; count additional layers
  let layerCount = 1;
  if (hasRules) layerCount++;
  if (hasClassifications) layerCount++;
  if (hasSpecies) layerCount++;

  // Layout constants
  const padding = width * 0.05;
  const layerSpacing = 100;
  const height = padding * 2 + layerCount * layerSpacing;

  // Assign y-positions sequentially based on which layers exist
  let nextLayerIdx = 0;
  const layerY = (layerIdx: number): number => padding + layerIdx * layerSpacing + layerSpacing / 2;

  const traitY = layerY(nextLayerIdx++);
  const ruleY = hasRules ? layerY(nextLayerIdx++) : 0;
  const classY = hasClassifications ? layerY(nextLayerIdx++) : 0;
  const speciesY = hasSpecies ? layerY(nextLayerIdx++) : 0;

  // --- Layer 0: trait nodes (always show all) ---
  const traitList = [...traitPreds].sort();
  const traitPositions = distributeHorizontally(traitList.length, traitY, width, padding);
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

  // --- Layer 1: rule nodes (only fired rules) ---
  const ruleList = [...activeRules].sort((a, b) => a.name.localeCompare(b.name));
  const rulePositions = distributeHorizontally(ruleList.length, ruleY, width, padding);
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
      active: firedSet.has(rule.name),
    });
  }

  // --- Layer 2: classification nodes (only inferred) ---
  const classList = [...activeClassPreds].sort();
  const classPositions = distributeHorizontally(classList.length, classY, width, padding);
  const classNodeIds = new Map<string, string>();
  for (let i = 0; i < classList.length; i++) {
    const pred = classList[i];
    const id = `class:${pred}`;
    classNodeIds.set(pred, id);
    const deg = factDegs.get(pred) ?? 0;
    nodes.push({
      id,
      x: classPositions[i].x,
      y: classPositions[i].y,
      layer: 2,
      type: 'result',
      label: pred,
      deg,
      active: deg > 0,
    });
  }

  // --- Layer 3: species nodes (only inferred) ---
  const speciesList = [...activeSpeciesNames].sort();
  const speciesPositions = distributeHorizontally(speciesList.length, speciesY, width, padding);
  for (let i = 0; i < speciesList.length; i++) {
    const name = speciesList[i];
    const id = `species:${name}`;
    // Look for a species fact with this name
    const specDeg = findSpeciesDegree(facts, name);
    nodes.push({
      id,
      x: speciesPositions[i].x,
      y: speciesPositions[i].y,
      layer: 3,
      type: 'result',
      label: name,
      deg: specDeg,
      active: specDeg > 0,
    });
  }

  // --- Build edges (only for rules in the active set) ---
  for (const rule of activeRules) {
    const ruleId = ruleNodeIds.get(rule.name);
    if (!ruleId) continue;

    // Edges from conditions to rule
    for (const cond of rule.conditions) {
      // Condition might reference a trait (layer 0) or a classification (layer 2)
      const sourceId = traitNodeIds.get(cond.pred) ?? classNodeIds.get(cond.pred);
      if (sourceId) {
        const fromNode = nodes.find((n) => n.id === sourceId);
        edges.push({ from: sourceId, to: ruleId, active: !!(fromNode && fromNode.active) });
      }
    }

    // Edges from rule to action results
    for (const action of rule.actions) {
      if (action.type !== 'add') continue;
      const pred = action.fact.pred;
      if (activeClassPreds.has(pred)) {
        const targetId = classNodeIds.get(pred);
        if (targetId) {
          edges.push({ from: ruleId, to: targetId, active: firedSet.has(rule.name) });
        }
      } else if (isSpeciesPred(pred)) {
        const speciesName = action.fact.args[1];
        if (speciesName && !speciesName.startsWith('?') && activeSpeciesNames.has(speciesName)) {
          const targetId = `species:${speciesName}`;
          edges.push({ from: ruleId, to: targetId, active: firedSet.has(rule.name) });
        }
      }
    }
  }

  return { nodes, edges, width, height };
}

/** Find the degree of a species fact by species name. */
function findSpeciesDegree(facts: Fact[], speciesName: string): number {
  let maxDeg = 0;
  for (const f of facts) {
    if (f.pred === 'species' && f.args.includes(speciesName)) {
      if (f.deg > maxDeg) maxDeg = f.deg;
    }
  }
  return maxDeg;
}
