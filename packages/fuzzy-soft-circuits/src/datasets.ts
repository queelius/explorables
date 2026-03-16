/**
 * Built-in datasets for the interactive demo.
 * Each dataset determines its own input dimensionality.
 * The surface visualization always shows input_0 vs input_1
 * (other inputs fixed at 0.5).
 */

import type { DataPoint } from './types';

export interface Dataset {
  name: string;
  description: string;
  nInputs: number;
  data: DataPoint[];
}

/** Deterministic seeded RNG for data generation. */
function seededRng(seed: number) {
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

/** Generate points on a 2D grid. */
function grid2d(nx: number, ny: number, fn: (x: number, y: number) => number): DataPoint[] {
  const points: DataPoint[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x = i / (nx - 1);
      const y = j / (ny - 1);
      points.push({ input: [x, y], output: [fn(x, y)] });
    }
  }
  return points;
}

/** Generate random samples in N dimensions. */
function sampleNd(
  nInputs: number,
  nSamples: number,
  fn: (x: number[]) => number,
  seed = 77,
): DataPoint[] {
  const rng = seededRng(seed);
  const points: DataPoint[] = [];
  for (let i = 0; i < nSamples; i++) {
    const input = Array.from({ length: nInputs }, () => rng());
    points.push({ input, output: [fn(input)] });
  }
  return points;
}

export const DATASETS: Dataset[] = [
  // ---- 2-input datasets ----
  {
    name: 'XOR (2D)',
    description: 'Output high when inputs differ',
    nInputs: 2,
    data: grid2d(5, 5, (x, y) => x * (1 - y) + (1 - x) * y),
  },
  {
    name: 'AND (2D)',
    description: 'Output high only when both inputs high',
    nInputs: 2,
    data: grid2d(5, 5, (x, y) => x * y),
  },
  {
    name: 'Saddle (2D)',
    description: 'Smooth saddle surface',
    nInputs: 2,
    data: grid2d(6, 6, (x, y) => 0.5 + 0.5 * Math.sin(Math.PI * x) * Math.cos(Math.PI * y)),
  },
  {
    name: 'Peaks (2D)',
    description: 'Two Gaussian peaks',
    nInputs: 2,
    data: grid2d(7, 7, (x, y) => {
      const p1 = Math.exp(-((x - 0.3) ** 2 + (y - 0.3) ** 2) / 0.05);
      const p2 = Math.exp(-((x - 0.7) ** 2 + (y - 0.7) ** 2) / 0.05);
      return Math.min(1, p1 + p2);
    }),
  },
  {
    name: 'Step (2D)',
    description: 'Diagonal step boundary',
    nInputs: 2,
    data: grid2d(6, 6, (x, y) => (x + y > 1 ? 0.9 : 0.1)),
  },
  // ---- 3-input datasets ----
  {
    name: 'Majority (3D)',
    description: 'Output high when 2+ of 3 inputs are high',
    nInputs: 3,
    data: sampleNd(3, 60, (x) => {
      const votes = x.filter(v => v > 0.5).length;
      return votes >= 2 ? 0.9 : 0.1;
    }),
  },
  {
    name: 'Interaction (3D)',
    description: 'x0*x1 + x2*(1-x0), all inputs matter',
    nInputs: 3,
    data: sampleNd(3, 60, (x) => {
      const raw = x[0] * x[1] + x[2] * (1 - x[0]);
      return Math.max(0, Math.min(1, raw));
    }),
  },
  // ---- 5-input datasets ----
  {
    name: 'Sparse (5D)',
    description: 'Only inputs 0 and 3 matter (tests pruning)',
    nInputs: 5,
    data: sampleNd(5, 80, (x) => {
      return x[0] * (1 - x[3]) + (1 - x[0]) * x[3];
    }),
  },
  {
    name: 'Random (5D)',
    description: 'Complex random function, all 5 inputs contribute',
    nInputs: 5,
    data: sampleNd(5, 80, (x) => {
      const raw = (
        Math.sin(Math.PI * x[0]) * Math.cos(Math.PI * x[1]) * 0.35 +
        Math.sin(2 * Math.PI * x[2]) * 0.25 +
        x[3] * x[4] * 0.3 +
        0.5
      );
      return Math.max(0, Math.min(1, raw));
    }),
  },
];
