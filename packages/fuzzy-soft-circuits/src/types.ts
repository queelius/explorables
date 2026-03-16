/** Configuration for creating a FuzzySoftCircuit. */
export interface CircuitConfig {
  nInputs: number;
  nOutputs: number;
  nMemberships: number;
  nRules: number;
}

/**
 * All learnable parameters of a fuzzy soft circuit.
 *
 * Every field is a flat or 2D array of raw (unconstrained) values.
 * Activations like sigmoid or exp are applied during the forward pass,
 * so gradients flow through them naturally.
 */
export interface CircuitParams {
  /** Gaussian centers: [nInputs][nMemberships] */
  mfCenters: number[][];
  /** Log-widths (exp gives positive width): [nInputs][nMemberships] */
  mfLogWidths: number[][];
  /** Antecedent relevance weights: [nRules][nInputs * nMemberships] */
  ruleAntecedents: number[][];
  /** Rule on/off switches: [nRules] */
  ruleSwitches: number[];
  /** Consequent values: [nRules][nOutputs] */
  ruleConsequents: number[][];
  /** Output mixing weights: [nOutputs][nRules] */
  outputWeights: number[][];
}

/** A single training example. */
export interface DataPoint {
  input: number[];
  output: number[];
}

/** Intermediate values from a forward pass, useful for visualization. */
export interface ForwardTrace {
  output: number[];
  fuzzyValues: number[];
  ruleActivations: number[];
  switchValues: number[];
  ruleStrengths: number[];
}

/** A discovered rule in human-readable form. */
export interface ExtractedRule {
  index: number;
  strength: number;
  antecedents: { input: number; membership: number; relevance: number }[];
  consequents: number[];
}

/** Snapshot of training progress. */
export interface TrainStep {
  epoch: number;
  loss: number;
}
