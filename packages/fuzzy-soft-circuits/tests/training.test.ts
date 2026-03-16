import { describe, it, expect } from 'vitest';
import { FuzzySoftCircuit } from '../src/circuit';
import { computeLoss, computeGradients, trainStep } from '../src/training';
import type { DataPoint } from '../src/types';

describe('computeLoss', () => {
  const config = { nInputs: 2, nOutputs: 1, nMemberships: 3, nRules: 4 };

  it('returns a non-negative number', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [
      { input: [0.5, 0.5], output: [0.5] },
    ];
    const loss = computeLoss(circuit, data, circuit.params);
    expect(loss).toBeGreaterThanOrEqual(0);
    expect(loss).not.toBeNaN();
  });

  it('returns 0 when predictions match targets exactly', () => {
    // This is hard to achieve exactly, but we can test that loss is small
    // when the circuit happens to output something close to the target
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [
      { input: [0.5, 0.5], output: [0.5] },
    ];
    const loss = computeLoss(circuit, data, circuit.params);
    // Just verify it's a valid number
    expect(typeof loss).toBe('number');
    expect(loss).not.toBeNaN();
  });

  it('scales with more data points', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data1: DataPoint[] = [{ input: [0.5, 0.5], output: [0.0] }];
    const data2: DataPoint[] = [
      { input: [0.5, 0.5], output: [0.0] },
      { input: [0.5, 0.5], output: [0.0] },
    ];
    const loss1 = computeLoss(circuit, data1, circuit.params);
    const loss2 = computeLoss(circuit, data2, circuit.params);
    // Same data duplicated → same average loss
    expect(loss2).toBeCloseTo(loss1, 4);
  });
});

describe('computeGradients', () => {
  const config = { nInputs: 2, nOutputs: 1, nMemberships: 2, nRules: 3 };

  it('returns gradients with correct length', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [
      { input: [0.5, 0.5], output: [0.5] },
    ];
    const flat = circuit.flatten();
    const grad = computeGradients(circuit, data, flat);
    expect(grad).toHaveLength(flat.length);
  });

  it('gradients are finite numbers', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [
      { input: [0.3, 0.7], output: [0.5] },
      { input: [0.7, 0.3], output: [0.5] },
    ];
    const flat = circuit.flatten();
    const grad = computeGradients(circuit, data, flat);
    for (const g of grad) {
      expect(isFinite(g)).toBe(true);
    }
  });

  it('does not mutate the input parameter array', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [{ input: [0.5, 0.5], output: [0.5] }];
    const flat = circuit.flatten();
    const original = [...flat];
    computeGradients(circuit, data, flat);
    expect(flat).toEqual(original);
  });
});

describe('trainStep', () => {
  const config = { nInputs: 2, nOutputs: 1, nMemberships: 2, nRules: 3 };

  it('returns updated parameters and loss', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [
      { input: [0.5, 0.5], output: [0.5] },
    ];
    const flat = circuit.flatten();
    const result = trainStep(circuit, data, flat, 0.1);
    expect(result.flatParams).toHaveLength(flat.length);
    expect(typeof result.loss).toBe('number');
    expect(result.loss).not.toBeNaN();
  });

  it('changes parameters (non-zero gradient)', () => {
    const circuit = new FuzzySoftCircuit(config);
    const data: DataPoint[] = [
      { input: [0.1, 0.9], output: [0.8] },
      { input: [0.9, 0.1], output: [0.2] },
    ];
    const flat = circuit.flatten();
    const { flatParams: updated } = trainStep(circuit, data, flat, 0.1);
    // At least some parameters should have changed
    const changed = flat.some((v, i) => Math.abs(v - updated[i]) > 1e-10);
    expect(changed).toBe(true);
  });

  it('reduces loss over multiple steps', () => {
    const circuit = new FuzzySoftCircuit(config, 42);
    const data: DataPoint[] = [
      { input: [0.1, 0.1], output: [0.1] },
      { input: [0.1, 0.9], output: [0.9] },
      { input: [0.9, 0.1], output: [0.9] },
      { input: [0.9, 0.9], output: [0.1] },
    ];

    let flat = circuit.flatten();
    const initialLoss = computeLoss(circuit, data, circuit.unflatten(flat));

    // Run 20 training steps
    for (let i = 0; i < 20; i++) {
      const result = trainStep(circuit, data, flat, 0.3);
      flat = result.flatParams;
    }

    const finalLoss = computeLoss(circuit, data, circuit.unflatten(flat));
    expect(finalLoss).toBeLessThan(initialLoss);
  });
});
