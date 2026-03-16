import type { Fact, Rule, NodePosition, EdgePosition, TreeLayout } from '../types';
import { TreeRenderer } from '../renderer';
import { FuzzyEngine } from '../engine';
import { layoutTree } from '../layout';

/**
 * Rule demo widget.
 *
 * Shows one input fact → one rule diamond → one output fact.
 * Controls: toggle input fact on/off, adjust degree with slider.
 * Runs FuzzyEngine on each change to compute output.
 *
 * Rule: has-hair(?x) [deg > 0] -> is-mammal(?x) [deg = 0.95 * ?d]
 */

const DEMO_RULE: Rule = {
  name: 'mammal-rule',
  conditions: [
    { pred: 'has-hair', args: ['?x'], degVar: '?d', degConstraint: ['>', '?d', 0] },
  ],
  actions: [
    { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
  ],
  priority: 60,
};

export function mountRuleDemo(container: HTMLElement): void {
  // --- State ---
  let factActive = true;
  let factDeg = 0.8;

  // --- Build DOM ---
  const controlsWrap = document.createElement('div');
  controlsWrap.className = 'fuzzy-controls';

  // Toggle row
  const toggleRow = document.createElement('div');
  toggleRow.className = 'fuzzy-toggle';

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = factActive;
  check.className = 'fuzzy-toggle-check';
  toggleRow.appendChild(check);

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'fuzzy-toggle-label';
  toggleLabel.textContent = 'has-hair(rex)';
  toggleRow.appendChild(toggleLabel);

  const toggleDeg = document.createElement('span');
  toggleDeg.className = 'fuzzy-toggle-deg';
  toggleDeg.textContent = factDeg.toFixed(2);
  toggleRow.appendChild(toggleDeg);

  controlsWrap.appendChild(toggleRow);

  // Degree slider
  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'fuzzy-slider-wrap';

  const sliderLabel = document.createElement('span');
  sliderLabel.className = 'fuzzy-slider-label';
  sliderLabel.textContent = `Degree: ${factDeg.toFixed(2)}`;
  sliderWrap.appendChild(sliderLabel);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'fuzzy-slider';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = String(factDeg);
  sliderWrap.appendChild(slider);

  controlsWrap.appendChild(sliderWrap);
  container.appendChild(controlsWrap);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '280px';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  // --- Renderer ---
  const renderer = new TreeRenderer(canvas);

  function runAndUpdate(): void {
    // Build fresh engine each time
    const engine = new FuzzyEngine();
    if (factActive) {
      engine.addFact({ pred: 'has-hair', args: ['rex'], deg: factDeg });
    }
    engine.addRule(DEMO_RULE);
    const result = engine.run();

    // Build layout from rules and current facts
    const facts: Fact[] = [];
    for (const f of result.facts.values()) {
      facts.push(f);
    }

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 400;
    const h = 280;
    const layout = layoutTree(facts, [DEMO_RULE], w, h);

    // Mark fired rules as active
    const firedSet = new Set(result.firedRules);
    for (const node of layout.nodes) {
      if (node.type === 'rule') {
        node.active = firedSet.has(node.label);
      }
    }

    // Mark edges as active when both endpoints are active
    for (const edge of layout.edges) {
      const fromNode = layout.nodes.find((n) => n.id === edge.from);
      const toNode = layout.nodes.find((n) => n.id === edge.to);
      edge.active = !!(fromNode?.active && toNode?.active);
    }

    renderer.resize();
    renderer.setLayout(layout);
    renderer.draw();
  }

  // --- Event handlers ---
  check.addEventListener('change', () => {
    factActive = check.checked;
    toggleDeg.textContent = factActive ? factDeg.toFixed(2) : '\u2014';
    runAndUpdate();
  });

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    if (!isFinite(val)) return;
    factDeg = val;
    sliderLabel.textContent = `Degree: ${val.toFixed(2)}`;
    toggleDeg.textContent = factActive ? val.toFixed(2) : '\u2014';
    runAndUpdate();
  });

  // Initial render
  runAndUpdate();

  window.addEventListener('resize', () => runAndUpdate());
}
