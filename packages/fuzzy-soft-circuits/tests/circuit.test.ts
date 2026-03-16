import { describe, it, expect } from 'vitest';
import { FuzzySoftCircuit, sigmoid } from '../src/circuit';

describe('sigmoid', () => {
  it('returns 0.5 at zero', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
  });

  it('approaches 1 for large positive values', () => {
    expect(sigmoid(10)).toBeGreaterThan(0.999);
  });

  it('approaches 0 for large negative values', () => {
    expect(sigmoid(-10)).toBeLessThan(0.001);
  });

  it('handles extreme values without overflow', () => {
    expect(sigmoid(1000)).toBe(1);
    expect(sigmoid(-1000)).toBe(0);
  });
});

describe('FuzzySoftCircuit', () => {
  const config = { nInputs: 2, nOutputs: 1, nMemberships: 3, nRules: 6 };

  describe('initialization', () => {
    it('creates with correct config', () => {
      const circuit = new FuzzySoftCircuit(config);
      expect(circuit.config).toEqual(config);
    });

    it('initializes membership centers evenly spaced in [0, 1]', () => {
      const circuit = new FuzzySoftCircuit(config);
      for (let i = 0; i < config.nInputs; i++) {
        expect(circuit.params.mfCenters[i]).toHaveLength(config.nMemberships);
        expect(circuit.params.mfCenters[i][0]).toBeCloseTo(0);
        expect(circuit.params.mfCenters[i][2]).toBeCloseTo(1);
      }
    });

    it('initializes positive widths (via exp of log-widths)', () => {
      const circuit = new FuzzySoftCircuit(config);
      for (let i = 0; i < config.nInputs; i++) {
        for (let j = 0; j < config.nMemberships; j++) {
          const width = Math.exp(circuit.params.mfLogWidths[i][j]);
          expect(width).toBeGreaterThan(0);
        }
      }
    });

    it('is deterministic for same seed', () => {
      const c1 = new FuzzySoftCircuit(config, 42);
      const c2 = new FuzzySoftCircuit(config, 42);
      expect(c1.flatten()).toEqual(c2.flatten());
    });

    it('is different for different seeds', () => {
      const c1 = new FuzzySoftCircuit(config, 1);
      const c2 = new FuzzySoftCircuit(config, 2);
      // Rule switches and antecedents should differ
      expect(c1.params.ruleSwitches).not.toEqual(c2.params.ruleSwitches);
    });
  });

  describe('forward pass', () => {
    it('produces output in [0, 1] range', () => {
      const circuit = new FuzzySoftCircuit(config);
      const { output } = circuit.forward([0.5, 0.5]);
      expect(output).toHaveLength(config.nOutputs);
      expect(output[0]).toBeGreaterThanOrEqual(0);
      expect(output[0]).toBeLessThanOrEqual(1);
    });

    it('produces correct number of fuzzy values', () => {
      const circuit = new FuzzySoftCircuit(config);
      const { fuzzyValues } = circuit.forward([0.3, 0.7]);
      expect(fuzzyValues).toHaveLength(config.nInputs * config.nMemberships);
    });

    it('produces correct number of rule activations', () => {
      const circuit = new FuzzySoftCircuit(config);
      const { ruleActivations, switchValues, ruleStrengths } = circuit.forward([0.5, 0.5]);
      expect(ruleActivations).toHaveLength(config.nRules);
      expect(switchValues).toHaveLength(config.nRules);
      expect(ruleStrengths).toHaveLength(config.nRules);
    });

    it('fuzzy values are between 0 and 1 (Gaussian output)', () => {
      const circuit = new FuzzySoftCircuit(config);
      const { fuzzyValues } = circuit.forward([0.5, 0.5]);
      for (const v of fuzzyValues) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it('membership at center has value 1', () => {
      const circuit = new FuzzySoftCircuit(config);
      // Center of first membership for input 0 is at 0.0
      const { fuzzyValues } = circuit.forward([0.0, 0.0]);
      // First membership (center=0) with input=0 should give exp(0)=1
      expect(fuzzyValues[0]).toBeCloseTo(1.0);
    });

    it('switch values are between 0 and 1 (sigmoid output)', () => {
      const circuit = new FuzzySoftCircuit(config);
      const { switchValues } = circuit.forward([0.5, 0.5]);
      for (const v of switchValues) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it('handles edge inputs (0 and 1)', () => {
      const circuit = new FuzzySoftCircuit(config);
      expect(() => circuit.forward([0, 0])).not.toThrow();
      expect(() => circuit.forward([1, 1])).not.toThrow();

      const { output: out0 } = circuit.forward([0, 0]);
      const { output: out1 } = circuit.forward([1, 1]);
      expect(out0[0]).not.toBeNaN();
      expect(out1[0]).not.toBeNaN();
    });
  });

  describe('flatten / unflatten', () => {
    it('produces correct number of parameters', () => {
      const circuit = new FuzzySoftCircuit(config);
      const flat = circuit.flatten();
      expect(flat.length).toBe(circuit.paramCount());
    });

    it('roundtrips correctly', () => {
      const circuit = new FuzzySoftCircuit(config);
      const flat = circuit.flatten();
      const restored = circuit.unflatten(flat);

      expect(restored.mfCenters).toEqual(circuit.params.mfCenters);
      expect(restored.mfLogWidths).toEqual(circuit.params.mfLogWidths);
      expect(restored.ruleAntecedents).toEqual(circuit.params.ruleAntecedents);
      expect(restored.ruleSwitches).toEqual(circuit.params.ruleSwitches);
      expect(restored.ruleConsequents).toEqual(circuit.params.ruleConsequents);
      expect(restored.outputWeights).toEqual(circuit.params.outputWeights);
    });

    it('forward pass produces same output with unflattened params', () => {
      const circuit = new FuzzySoftCircuit(config);
      const input = [0.4, 0.6];

      const { output: original } = circuit.forward(input);
      const flat = circuit.flatten();
      const restored = circuit.unflatten(flat);
      const { output: roundtripped } = circuit.forward(input, restored);

      expect(roundtripped[0]).toBeCloseTo(original[0]);
    });
  });

  describe('extractRules', () => {
    it('returns rules with correct shape', () => {
      const circuit = new FuzzySoftCircuit(config);
      const rules = circuit.extractRules();
      for (const rule of rules) {
        expect(rule.index).toBeGreaterThanOrEqual(0);
        expect(rule.index).toBeLessThan(config.nRules);
        expect(rule.strength).toBeGreaterThan(0);
        expect(rule.strength).toBeLessThanOrEqual(1);
        expect(rule.consequents).toHaveLength(config.nOutputs);
      }
    });

    it('respects threshold', () => {
      const circuit = new FuzzySoftCircuit(config);
      const lowThreshold = circuit.extractRules(undefined, 0.01);
      const highThreshold = circuit.extractRules(undefined, 0.99);
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it('returns rules sorted by strength (descending)', () => {
      const circuit = new FuzzySoftCircuit(config);
      const rules = circuit.extractRules(undefined, 0.1);
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i - 1].strength).toBeGreaterThanOrEqual(rules[i].strength);
      }
    });
  });

  describe('paramCount', () => {
    it('matches expected formula', () => {
      const circuit = new FuzzySoftCircuit(config);
      const { nInputs: n, nOutputs: p, nMemberships: k, nRules: m } = config;
      const expected =
        n * k +       // centers
        n * k +       // log-widths
        m * (n * k) + // antecedents
        m +           // switches
        m * p +       // consequents
        p * m;        // output weights
      expect(circuit.paramCount()).toBe(expected);
    });
  });

  describe('multi-output', () => {
    it('works with multiple outputs', () => {
      const multiConfig = { nInputs: 2, nOutputs: 3, nMemberships: 2, nRules: 4 };
      const circuit = new FuzzySoftCircuit(multiConfig);
      const { output } = circuit.forward([0.5, 0.5]);
      expect(output).toHaveLength(3);
      for (const v of output) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });
});
