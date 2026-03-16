/**
 * Widget initialization — finds DOM elements, wires up controls and animation.
 */

import type { DataPoint } from './types';
import type { AdamState } from './training';
import { FuzzySoftCircuit } from './circuit';
import { trainStep, createAdamState } from './training';
import { DATASETS } from './datasets';
import { drawSurface, drawMemberships, drawRules, drawLoss } from './viz';

interface AppState {
  circuit: FuzzySoftCircuit;
  flatParams: number[];
  adam: AdamState;
  data: DataPoint[];
  datasetIndex: number;
  lossHistory: number[];
  epoch: number;
  running: boolean;
  stepsPerFrame: number;
  learningRate: number;
  nMemberships: number;
  nRules: number;
}

export function init() {
  const root = document.getElementById('fsc-demo');
  if (!root) return;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;

  const surfaceCanvas = $<HTMLCanvasElement>('fsc-surface');
  const mf0Canvas = $<HTMLCanvasElement>('fsc-mf0');
  const mf1Canvas = $<HTMLCanvasElement>('fsc-mf1');
  const rulesCanvas = $<HTMLCanvasElement>('fsc-rules');
  const lossCanvas = $<HTMLCanvasElement>('fsc-loss');

  const datasetSelect = $<HTMLSelectElement>('fsc-dataset');
  const mfSlider = $<HTMLInputElement>('fsc-mf-slider');
  const mfValue = $<HTMLSpanElement>('fsc-mf-value');
  const rulesSlider = $<HTMLInputElement>('fsc-rules-slider');
  const rulesValue = $<HTMLSpanElement>('fsc-rules-value');
  const lrSlider = $<HTMLInputElement>('fsc-lr-slider');
  const lrValue = $<HTMLSpanElement>('fsc-lr-value');
  const speedSlider = $<HTMLInputElement>('fsc-speed-slider');
  const speedValue = $<HTMLSpanElement>('fsc-speed-value');
  const trainBtn = $<HTMLButtonElement>('fsc-train');
  const resetBtn = $<HTMLButtonElement>('fsc-reset');
  const epochDisplay = $<HTMLSpanElement>('fsc-epoch');
  const lossDisplay = $<HTMLSpanElement>('fsc-loss-val');
  const paramsDisplay = $<HTMLSpanElement>('fsc-params');
  const inputsDisplay = $<HTMLSpanElement>('fsc-inputs');
  const rulesDisplay = $<HTMLDivElement>('fsc-extracted');

  // Populate dataset dropdown
  DATASETS.forEach((ds, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = ds.name;
    datasetSelect.appendChild(opt);
  });

  // State
  function createState(): AppState {
    const datasetIndex = parseInt(datasetSelect.value) || 0;
    const nMemberships = parseInt(mfSlider.value);
    const nRules = parseInt(rulesSlider.value);
    const learningRate = parseFloat(lrSlider.value);
    const stepsPerFrame = parseInt(speedSlider.value);

    const dataset = DATASETS[datasetIndex];
    const circuit = new FuzzySoftCircuit({
      nInputs: dataset.nInputs, nOutputs: 1, nMemberships, nRules,
    });

    const flatParams = circuit.flatten();
    return {
      circuit, flatParams,
      adam: createAdamState(flatParams.length),
      data: dataset.data, datasetIndex,
      lossHistory: [], epoch: 0,
      running: false, stepsPerFrame, learningRate, nMemberships, nRules,
    };
  }

  let state = createState();

  // Render extracted rules with safe DOM methods
  function renderRules() {
    const params = state.circuit.unflatten(state.flatParams);
    const rules = state.circuit.extractRules(params, 0.3);

    while (rulesDisplay.firstChild) rulesDisplay.removeChild(rulesDisplay.firstChild);

    if (rules.length === 0) {
      const span = document.createElement('span');
      span.className = 'fsc-muted';
      span.textContent = 'No active rules yet (switches below threshold)';
      rulesDisplay.appendChild(span);
      return;
    }

    for (const rule of rules) {
      const item = document.createElement('div');
      item.className = 'fsc-rule';

      const label = document.createElement('span');
      label.className = 'fsc-rule-label';
      label.textContent = `Rule ${rule.index}`;
      item.appendChild(label);

      const strength = document.createElement('span');
      strength.className = 'fsc-rule-strength';
      strength.textContent = rule.strength.toFixed(2);
      item.appendChild(strength);

      const body = document.createElement('div');
      body.className = 'fsc-rule-body';
      let text = 'IF ';
      text += rule.antecedents
        .map(a => `input_${a.input} uses mf_${a.membership}`)
        .join(' AND ');
      text += ` THEN output \u2248 ${rule.consequents.map(c => c.toFixed(2)).join(', ')}`;
      body.textContent = text;
      item.appendChild(body);

      rulesDisplay.appendChild(item);
    }
  }

  function render() {
    const params = state.circuit.unflatten(state.flatParams);
    drawSurface(surfaceCanvas, state.circuit, params, state.data);
    drawMemberships(mf0Canvas, params, 0);
    drawMemberships(mf1Canvas, params, 1);
    drawRules(rulesCanvas, params);
    drawLoss(lossCanvas, state.lossHistory);

    epochDisplay.textContent = String(state.epoch);
    lossDisplay.textContent = state.lossHistory.length > 0
      ? state.lossHistory[state.lossHistory.length - 1].toFixed(6)
      : '\u2014';
    paramsDisplay.textContent = String(state.circuit.paramCount());
    inputsDisplay.textContent = String(state.circuit.config.nInputs);
    renderRules();
  }

  // Animation
  function animate() {
    if (state.running) {
      for (let i = 0; i < state.stepsPerFrame; i++) {
        const result = trainStep(
          state.circuit, state.data, state.flatParams,
          state.learningRate, state.adam,
        );
        state.flatParams = result.flatParams;
        state.lossHistory.push(result.loss);
        state.epoch++;
      }
      render();
    }
    requestAnimationFrame(animate);
  }

  function reset() {
    state.running = false;
    trainBtn.textContent = 'Train';
    trainBtn.classList.remove('fsc-active');
    state = createState();
    render();
  }

  // Events
  trainBtn.addEventListener('click', () => {
    state.running = !state.running;
    trainBtn.textContent = state.running ? 'Pause' : 'Train';
    trainBtn.classList.toggle('fsc-active', state.running);
  });
  resetBtn.addEventListener('click', reset);
  datasetSelect.addEventListener('change', reset);
  mfSlider.addEventListener('input', () => { mfValue.textContent = mfSlider.value; reset(); });
  rulesSlider.addEventListener('input', () => { rulesValue.textContent = rulesSlider.value; reset(); });
  lrSlider.addEventListener('input', () => {
    state.learningRate = parseFloat(lrSlider.value);
    lrValue.textContent = parseFloat(lrSlider.value).toFixed(2);
  });
  speedSlider.addEventListener('input', () => {
    state.stepsPerFrame = parseInt(speedSlider.value);
    speedValue.textContent = speedSlider.value;
  });

  const resizeObserver = new ResizeObserver(() => { if (!state.running) render(); });
  [surfaceCanvas, mf0Canvas, mf1Canvas, rulesCanvas, lossCanvas].forEach(c => resizeObserver.observe(c));

  render();
  animate();
}
