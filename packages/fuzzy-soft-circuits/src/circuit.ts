/**
 * Fuzzy Soft Circuits — core implementation.
 *
 * A fuzzy logic system where membership functions, rules, and rule existence
 * are all learnable parameters. No expert knowledge required.
 *
 * Key ideas:
 *   - Variables are indices (0, 1, 2, ...), not "temperature" or "pressure"
 *   - Membership functions are Gaussian curves with learnable center + width
 *   - Each rule has a soft switch: sigmoid(s) ∈ (0,1) controls whether it exists
 *   - Antecedent relevance is learned: which features matter for each rule
 *   - Everything is differentiable — trained end-to-end via gradient descent
 */

import type { CircuitConfig, CircuitParams, ForwardTrace, ExtractedRule } from './types';

// ── Math helpers ──────────────────────────────────────────────────────────────

export function sigmoid(x: number): number {
  if (x > 500) return 1;
  if (x < -500) return 0;
  return 1 / (1 + Math.exp(-x));
}

function gaussian(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-(d * d));
}

// ── Deterministic seeded RNG (xoshiro128**) ──────────────────────────────────

function splitmix32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return (t >>> 0) / 4294967296;
  };
}

// ── FuzzySoftCircuit ─────────────────────────────────────────────────────────

export class FuzzySoftCircuit {
  readonly config: CircuitConfig;
  params: CircuitParams;

  constructor(config: CircuitConfig, seed = 42) {
    this.config = config;
    this.params = FuzzySoftCircuit.initParams(config, seed);
  }

  /**
   * Initialize parameters with sensible defaults.
   * Centers spread evenly across [0,1]; widths start moderate;
   * everything else is small random.
   */
  static initParams(config: CircuitConfig, seed = 42): CircuitParams {
    const { nInputs, nOutputs, nMemberships, nRules } = config;
    const nFeatures = nInputs * nMemberships;
    const rng = splitmix32(seed);
    const randn = () => {
      // Box-Muller transform
      const u1 = rng();
      const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    };

    // Centers evenly spaced in [0, 1]
    const mfCenters: number[][] = [];
    const mfLogWidths: number[][] = [];
    for (let i = 0; i < nInputs; i++) {
      const centers: number[] = [];
      const logWidths: number[] = [];
      for (let j = 0; j < nMemberships; j++) {
        centers.push(nMemberships > 1 ? j / (nMemberships - 1) : 0.5);
        logWidths.push(Math.log(0.3)); // initial width ≈ 0.3
      }
      mfCenters.push(centers);
      mfLogWidths.push(logWidths);
    }

    // Antecedents: larger init so some features start clearly relevant/irrelevant
    // (breaks the "everything at 0.5 relevance" symmetry that kills gradients)
    const ruleAntecedents = Array.from({ length: nRules }, () =>
      Array.from({ length: nFeatures }, () => randn() * 1.5)
    );
    const ruleSwitches = Array.from({ length: nRules }, () => randn() * 0.5);
    const ruleConsequents = Array.from({ length: nRules }, () =>
      Array.from({ length: nOutputs }, () => randn() * 1.0)
    );
    const outputWeights = Array.from({ length: nOutputs }, () =>
      Array.from({ length: nRules }, () => randn() * 0.5)
    );

    return { mfCenters, mfLogWidths, ruleAntecedents, ruleSwitches, ruleConsequents, outputWeights };
  }

  /** Full forward pass with optional intermediate trace for visualization. */
  forward(inputs: number[], params?: CircuitParams, trace?: boolean): ForwardTrace {
    const p = params ?? this.params;
    const { nInputs, nOutputs, nMemberships, nRules } = this.config;

    // ── Step 1: Fuzzification ──
    // Each input is mapped through nMemberships Gaussian curves.
    const fuzzyValues: number[] = [];
    for (let i = 0; i < nInputs; i++) {
      for (let j = 0; j < nMemberships; j++) {
        const center = p.mfCenters[i][j];
        const width = Math.exp(p.mfLogWidths[i][j]); // exp ensures width > 0
        fuzzyValues.push(gaussian(inputs[i], center, width));
      }
    }

    // ── Step 2: Rule Evaluation ──
    // For each rule, compute how strongly its antecedent fires,
    // then gate it by the rule's existence switch.
    const ruleActivations: number[] = [];
    const switchValues: number[] = [];
    const ruleStrengths: number[] = [];

    for (let r = 0; r < nRules; r++) {
      // Gated product: each feature is included proportional to its relevance.
      //   relevance → 1: term becomes fuzzyValue (feature matters)
      //   relevance → 0: term becomes 1 (feature ignored)
      let activation = 1;
      for (let f = 0; f < fuzzyValues.length; f++) {
        const relevance = sigmoid(p.ruleAntecedents[r][f]);
        activation *= fuzzyValues[f] * relevance + (1 - relevance);
      }

      const sw = sigmoid(p.ruleSwitches[r]);
      ruleActivations.push(activation);
      switchValues.push(sw);
      ruleStrengths.push(activation * sw);
    }

    // ── Step 3: Defuzzification ──
    // Weighted average of rule consequents, gated by rule strength.
    const output: number[] = [];
    for (let o = 0; o < nOutputs; o++) {
      let numerator = 0;
      let denominator = 1e-10; // epsilon prevents division by zero
      for (let r = 0; r < nRules; r++) {
        const w = sigmoid(p.outputWeights[o][r]);
        const c = sigmoid(p.ruleConsequents[r][o]);
        numerator += ruleStrengths[r] * w * c;
        denominator += ruleStrengths[r] * w;
      }
      output.push(numerator / denominator);
    }

    return { output, fuzzyValues, ruleActivations, switchValues, ruleStrengths };
  }

  // ── Parameter flattening (for gradient computation) ────────────────────────

  /** Flatten all params into a single array for optimization. */
  flatten(params?: CircuitParams): number[] {
    const p = params ?? this.params;
    const flat: number[] = [];
    for (const row of p.mfCenters) flat.push(...row);
    for (const row of p.mfLogWidths) flat.push(...row);
    for (const row of p.ruleAntecedents) flat.push(...row);
    flat.push(...p.ruleSwitches);
    for (const row of p.ruleConsequents) flat.push(...row);
    for (const row of p.outputWeights) flat.push(...row);
    return flat;
  }

  /** Reconstruct CircuitParams from a flat array. */
  unflatten(flat: number[]): CircuitParams {
    const { nInputs, nOutputs, nMemberships, nRules } = this.config;
    const nFeatures = nInputs * nMemberships;
    let idx = 0;

    const take = (n: number) => { const s = flat.slice(idx, idx + n); idx += n; return s; };
    const take2d = (rows: number, cols: number) =>
      Array.from({ length: rows }, () => take(cols));

    return {
      mfCenters: take2d(nInputs, nMemberships),
      mfLogWidths: take2d(nInputs, nMemberships),
      ruleAntecedents: take2d(nRules, nFeatures),
      ruleSwitches: take(nRules),
      ruleConsequents: take2d(nRules, nOutputs),
      outputWeights: take2d(nOutputs, nRules),
    };
  }

  /** Total number of learnable parameters. */
  paramCount(): number {
    const { nInputs, nOutputs, nMemberships, nRules } = this.config;
    const nFeatures = nInputs * nMemberships;
    return (
      nInputs * nMemberships +      // centers
      nInputs * nMemberships +      // log-widths
      nRules * nFeatures +          // antecedents
      nRules +                      // switches
      nRules * nOutputs +           // consequents
      nOutputs * nRules             // output weights
    );
  }

  // ── Rule extraction ────────────────────────────────────────────────────────

  /** Extract active rules as human-interpretable objects. */
  extractRules(params?: CircuitParams, threshold = 0.3): ExtractedRule[] {
    const p = params ?? this.params;
    const { nInputs, nOutputs, nMemberships, nRules } = this.config;
    const rules: ExtractedRule[] = [];

    for (let r = 0; r < nRules; r++) {
      const strength = sigmoid(p.ruleSwitches[r]);
      if (strength < threshold) continue;

      const antecedents: ExtractedRule['antecedents'] = [];
      for (let i = 0; i < nInputs; i++) {
        for (let j = 0; j < nMemberships; j++) {
          const idx = i * nMemberships + j;
          const relevance = sigmoid(p.ruleAntecedents[r][idx]);
          if (relevance > threshold) {
            antecedents.push({ input: i, membership: j, relevance });
          }
        }
      }

      const consequents: number[] = [];
      for (let o = 0; o < nOutputs; o++) {
        consequents.push(sigmoid(p.ruleConsequents[r][o]));
      }

      if (antecedents.length > 0) {
        rules.push({ index: r, strength, antecedents, consequents });
      }
    }

    return rules.sort((a, b) => b.strength - a.strength);
  }
}
