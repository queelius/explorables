/**
 * Training with Adam optimizer and numerical gradients (central differences).
 *
 * Why Adam? The fuzzy circuit has parameters with wildly different gradient
 * magnitudes: membership centers get strong gradients, but rule antecedents
 * (buried inside a product chain) get tiny ones. Adam's per-parameter
 * adaptive learning rates handle this naturally.
 *
 * Why numerical gradients? For a pedagogical demo with ~100 parameters and
 * ~25 data points, finite differences are fast enough for real-time training
 * in the browser. No autodiff library needed.
 */

import type { CircuitParams, DataPoint } from './types';
import { FuzzySoftCircuit } from './circuit';

/** Compute MSE loss over a dataset. */
export function computeLoss(
  circuit: FuzzySoftCircuit,
  data: DataPoint[],
  params: CircuitParams,
): number {
  let total = 0;
  for (const { input, output } of data) {
    const { output: predicted } = circuit.forward(input, params);
    for (let i = 0; i < output.length; i++) {
      const diff = predicted[i] - output[i];
      total += diff * diff;
    }
  }
  return total / data.length;
}

/**
 * Compute gradient via central differences.
 *   ∂L/∂θᵢ ≈ (L(θᵢ + ε) - L(θᵢ - ε)) / (2ε)
 */
export function computeGradients(
  circuit: FuzzySoftCircuit,
  data: DataPoint[],
  flatParams: number[],
  epsilon = 1e-4,
): number[] {
  const grad = new Array<number>(flatParams.length);

  for (let i = 0; i < flatParams.length; i++) {
    const original = flatParams[i];

    flatParams[i] = original + epsilon;
    const lossPlus = computeLoss(circuit, data, circuit.unflatten(flatParams));

    flatParams[i] = original - epsilon;
    const lossMinus = computeLoss(circuit, data, circuit.unflatten(flatParams));

    flatParams[i] = original; // restore
    grad[i] = (lossPlus - lossMinus) / (2 * epsilon);
  }

  return grad;
}

/** Persistent Adam optimizer state. */
export interface AdamState {
  m: number[];  // first moment (mean of gradients)
  v: number[];  // second moment (mean of squared gradients)
  t: number;    // timestep
}

/** Create a fresh Adam state for a given parameter count. */
export function createAdamState(nParams: number): AdamState {
  return {
    m: new Array(nParams).fill(0),
    v: new Array(nParams).fill(0),
    t: 0,
  };
}

/**
 * Adam optimizer step.
 *
 *   m = β₁·m + (1-β₁)·g
 *   v = β₂·v + (1-β₂)·g²
 *   m̂ = m / (1-β₁ᵗ)      (bias correction)
 *   v̂ = v / (1-β₂ᵗ)      (bias correction)
 *   θ = θ - α · m̂ / (√v̂ + ε)
 */
export function adamStep(
  flatParams: number[],
  grad: number[],
  adamState: AdamState,
  learningRate: number,
  beta1 = 0.9,
  beta2 = 0.999,
  eps = 1e-8,
): number[] {
  adamState.t++;
  const t = adamState.t;

  const updated = new Array<number>(flatParams.length);

  for (let i = 0; i < flatParams.length; i++) {
    // Update biased moments
    adamState.m[i] = beta1 * adamState.m[i] + (1 - beta1) * grad[i];
    adamState.v[i] = beta2 * adamState.v[i] + (1 - beta2) * grad[i] * grad[i];

    // Bias-corrected moments
    const mHat = adamState.m[i] / (1 - Math.pow(beta1, t));
    const vHat = adamState.v[i] / (1 - Math.pow(beta2, t));

    // Update parameter
    updated[i] = flatParams[i] - learningRate * mHat / (Math.sqrt(vHat) + eps);
  }

  return updated;
}

/**
 * Run a single training step with Adam optimizer.
 * Returns the new flat params and the loss BEFORE the update.
 */
export function trainStep(
  circuit: FuzzySoftCircuit,
  data: DataPoint[],
  flatParams: number[],
  learningRate: number,
  adamState?: AdamState,
): { flatParams: number[]; loss: number } {
  const loss = computeLoss(circuit, data, circuit.unflatten(flatParams));
  const grad = computeGradients(circuit, data, flatParams);

  let updated: number[];
  if (adamState) {
    updated = adamStep(flatParams, grad, adamState, learningRate);
  } else {
    // Fallback to vanilla SGD
    updated = flatParams.map((p, i) => p - learningRate * grad[i]);
  }

  return { flatParams: updated, loss };
}
