import type { Fact, Rule, NodePosition, EdgePosition, TreeLayout } from '../types';
import { TreeRenderer } from '../renderer';

/**
 * Single-fact explorer widget.
 *
 * Displays a single fact node on a canvas ("has-hair(rex)") with a degree slider.
 * Dragging the slider animates the node's fill color and degree label.
 * Static rendering — no animation loop, just redraws on slider change.
 */
export function mountFactExplorer(container: HTMLElement): void {
  // --- Build DOM (safe: no innerHTML) ---
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '200px';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'fuzzy-slider-wrap';

  const label = document.createElement('span');
  label.className = 'fuzzy-slider-label';
  label.textContent = 'Degree: 0.80';
  sliderWrap.appendChild(label);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'fuzzy-slider';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = '0.80';
  sliderWrap.appendChild(slider);

  container.appendChild(sliderWrap);

  // --- Renderer setup ---
  const renderer = new TreeRenderer(canvas);

  let currentDeg = 0.8;

  function buildLayout(): TreeLayout {
    const w = canvas.getBoundingClientRect().width || 400;
    const h = 200;
    const cx = w / 2;
    const cy = h / 2;

    const node: NodePosition = {
      id: 'fact:has-hair',
      x: cx,
      y: cy,
      layer: 0,
      type: 'fact',
      label: 'has-hair(rex)',
      deg: currentDeg,
      active: currentDeg > 0,
    };

    return {
      nodes: [node],
      edges: [],
      width: w,
      height: h,
    };
  }

  function redraw(): void {
    renderer.resize();
    renderer.setLayout(buildLayout());
    renderer.draw();
  }

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    if (!isFinite(val)) return;
    currentDeg = val;
    label.textContent = `Degree: ${val.toFixed(2)}`;
    redraw();
  });

  // Initial render
  redraw();

  // Handle window resize
  const onResize = (): void => redraw();
  window.addEventListener('resize', onResize);
}
