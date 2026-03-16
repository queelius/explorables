/**
 * Canvas-based visualizations for the fuzzy soft circuit demo.
 *
 * Four panels:
 *   1. Surface heatmap — the learned function vs. training data
 *   2. Membership functions — Gaussian curves per input variable
 *   3. Rule switches — which rules are active
 *   4. Loss curve — training progress
 */

import type { CircuitParams, DataPoint } from './types';
import { FuzzySoftCircuit, sigmoid } from './circuit';

// ── Color utilities ──────────────────────────────────────────────────────────

/** Viridis-inspired colormap: value ∈ [0,1] → [r, g, b] each ∈ [0,255]. */
function viridis(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  // Simplified 5-stop viridis approximation
  const stops: [number, number, number][] = [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ];
  const s = t * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  return [
    Math.round(stops[i][0] + f * (stops[i + 1][0] - stops[i][0])),
    Math.round(stops[i][1] + f * (stops[i + 1][1] - stops[i][1])),
    Math.round(stops[i][2] + f * (stops[i + 1][2] - stops[i][2])),
  ];
}

function rgbString(r: number, g: number, b: number, a = 1): string {
  return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}

// Categorical palette for membership functions
const MF_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7'];

// ── Canvas helpers ───────────────────────────────────────────────────────────

function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

function clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
}

// ── Surface heatmap ──────────────────────────────────────────────────────────

export function drawSurface(
  canvas: HTMLCanvasElement,
  circuit: FuzzySoftCircuit,
  params: CircuitParams,
  data: DataPoint[],
  resolution = 40,
) {
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  clearCanvas(ctx, canvas);

  // Padding for axis labels
  const pad = { top: 24, right: 8, bottom: 28, left: 32 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const cellW = plotW / resolution;
  const cellH = plotH / resolution;

  // Build input template: vary input_0 and input_1, fix rest at 0.5
  const nInputs = circuit.config.nInputs;
  const baseInput = new Array(nInputs).fill(0.5);

  // Draw heatmap cells
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const inp = [...baseInput];
      inp[0] = i / (resolution - 1);
      inp[1] = 1 - j / (resolution - 1); // y-axis: top = 1
      const { output } = circuit.forward(inp, params);
      const [r, g, b] = viridis(output[0]);
      ctx.fillStyle = rgbString(r, g, b);
      ctx.fillRect(pad.left + i * cellW, pad.top + j * cellH, cellW + 0.5, cellH + 0.5);
    }
  }

  // Overlay training data points
  for (const { input, output } of data) {
    const px = pad.left + input[0] * plotW;
    const py = pad.top + (1 - input[1]) * plotH;
    const [r, g, b] = viridis(output[0]);

    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = rgbString(r, g, b);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('input 0', pad.left + plotW / 2, h - 4);
  ctx.save();
  ctx.translate(12, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('input 1', 0, 0);
  ctx.restore();

  // Title
  ctx.fillStyle = '#d0d0e0';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const title = nInputs > 2
    ? `Learned Surface (slice: inputs 2..${nInputs - 1} = 0.5)`
    : 'Learned Surface';
  ctx.fillText(title, w / 2, 16);
}

// ── Membership functions ─────────────────────────────────────────────────────

export function drawMemberships(
  canvas: HTMLCanvasElement,
  params: CircuitParams,
  inputIndex: number,
) {
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  clearCanvas(ctx, canvas);

  const pad = { top: 24, right: 8, bottom: 24, left: 32 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const nMemberships = params.mfCenters[inputIndex].length;
  const nSamples = 100;

  // Draw each membership function
  for (let j = 0; j < nMemberships; j++) {
    const center = params.mfCenters[inputIndex][j];
    const width = Math.exp(params.mfLogWidths[inputIndex][j]);
    const color = MF_COLORS[j % MF_COLORS.length];

    // Filled area
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    for (let s = 0; s <= nSamples; s++) {
      const x = s / nSamples;
      const d = (x - center) / width;
      const y = Math.exp(-(d * d));
      ctx.lineTo(pad.left + x * plotW, pad.top + (1 - y) * plotH);
    }
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = color + '20'; // very transparent fill
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let s = 0; s <= nSamples; s++) {
      const x = s / nSamples;
      const d = (x - center) / width;
      const y = Math.exp(-(d * d));
      const px = pad.left + x * plotW;
      const py = pad.top + (1 - y) * plotH;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label at center
    ctx.fillStyle = color;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelX = pad.left + Math.max(0, Math.min(1, center)) * plotW;
    ctx.fillText(`mf_${j}`, labelX, pad.top - 2);
  }

  // Axes
  ctx.strokeStyle = '#404060';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`input ${inputIndex}`, pad.left + plotW / 2, h - 4);

  // Tick marks
  ctx.font = '9px system-ui, sans-serif';
  for (const tick of [0, 0.5, 1]) {
    const tx = pad.left + tick * plotW;
    ctx.fillText(tick.toFixed(1), tx, pad.top + plotH + 14);
  }
}

// ── Rule switches ────────────────────────────────────────────────────────────

export function drawRules(
  canvas: HTMLCanvasElement,
  params: CircuitParams,
) {
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  clearCanvas(ctx, canvas);

  const pad = { top: 24, right: 8, bottom: 8, left: 46 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const nRules = params.ruleSwitches.length;
  const barH = Math.min(20, (plotH - (nRules - 1) * 2) / nRules);
  const gap = 2;

  for (let r = 0; r < nRules; r++) {
    const strength = sigmoid(params.ruleSwitches[r]);
    const y = pad.top + r * (barH + gap);

    // Background bar
    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(pad.left, y, plotW, barH);

    // Filled portion
    const [cr, cg, cb] = viridis(strength);
    ctx.fillStyle = rgbString(cr, cg, cb, 0.8);
    ctx.fillRect(pad.left, y, plotW * strength, barH);

    // Border
    ctx.strokeStyle = '#404060';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(pad.left, y, plotW, barH);

    // Label
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`rule ${r}`, pad.left - 4, y + barH * 0.75);

    // Value
    ctx.fillStyle = '#d0d0e0';
    ctx.textAlign = 'left';
    ctx.fillText(strength.toFixed(2), pad.left + plotW * strength + 4, y + barH * 0.75);
  }

  // Title
  ctx.fillStyle = '#d0d0e0';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Rule Switches', w / 2, 16);
}

// ── Loss curve ───────────────────────────────────────────────────────────────

export function drawLoss(
  canvas: HTMLCanvasElement,
  lossHistory: number[],
) {
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  clearCanvas(ctx, canvas);

  const pad = { top: 24, right: 12, bottom: 28, left: 44 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (lossHistory.length < 2) {
    ctx.fillStyle = '#606080';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press Train to begin', w / 2, h / 2);
    return;
  }

  // Use log scale for better visibility
  const logLoss = lossHistory.map(l => Math.log10(Math.max(l, 1e-8)));
  const minLog = Math.min(...logLoss);
  const maxLog = Math.max(...logLoss);
  const range = maxLog - minLog || 1;

  // Draw grid lines
  ctx.strokeStyle = '#252545';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
  }

  // Draw loss curve
  ctx.beginPath();
  for (let i = 0; i < logLoss.length; i++) {
    const x = pad.left + (i / (logLoss.length - 1)) * plotW;
    const y = pad.top + (1 - (logLoss[i] - minLog) / range) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Axes
  ctx.strokeStyle = '#404060';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Y-axis ticks (log scale)
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = maxLog - (i / 4) * range;
    const y = pad.top + (i / 4) * plotH;
    ctx.fillText(Math.pow(10, val).toExponential(0), pad.left - 4, y + 3);
  }

  // X-axis label
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('epoch', pad.left + plotW / 2, h - 4);

  // Current loss annotation
  const currentLoss = lossHistory[lossHistory.length - 1];
  ctx.fillStyle = '#d0d0e0';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`loss: ${currentLoss.toFixed(6)}`, w - pad.right, pad.top - 4);

  // Title
  ctx.fillStyle = '#d0d0e0';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Training Loss (log scale)', w / 2, 16);
}
