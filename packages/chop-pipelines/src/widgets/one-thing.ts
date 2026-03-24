import { OP_META } from '../engine/operations';
import type { PipelineState } from '../engine/types';
import { createPipeline, addOp, materialize } from '../engine/pipeline';
import { renderPipeline } from '../renderer/pipeline-view';
import { createParamSlider } from './shared';
import { DEFAULT_IMAGES } from '../images';

export function mountOneThing(container: HTMLElement): void {
  // Generate default image
  const defaultImg = DEFAULT_IMAGES[0].generate();

  // Filter transforms that have a param
  const transforms = OP_META.filter(m => m.category === 'transform');

  // --- Controls ---
  const controls = document.createElement('div');
  controls.className = 'chop-controls';

  // Op select dropdown
  const opLabel = document.createElement('label');
  opLabel.textContent = 'Operation: ';
  opLabel.className = 'chop-op-label';

  const opSelect = document.createElement('select');
  opSelect.className = 'chop-op-select';
  for (const meta of transforms) {
    const option = document.createElement('option');
    option.value = meta.name;
    option.textContent = meta.label;
    opSelect.appendChild(option);
  }
  opLabel.appendChild(opSelect);
  controls.appendChild(opLabel);

  // Param slider area (swapped when op changes)
  const sliderArea = document.createElement('div');
  sliderArea.className = 'chop-slider-area';
  controls.appendChild(sliderArea);

  container.appendChild(controls);

  // Pipeline view area
  const pipelineArea = document.createElement('div');
  pipelineArea.className = 'chop-pipeline-area';
  container.appendChild(pipelineArea);

  // --- State ---
  let currentSliderValue = 0;
  let currentSliderGetter: (() => number) | null = null;

  function getSelectedMeta() {
    return transforms.find(m => m.name === opSelect.value) ?? transforms[0];
  }

  function buildAndRender(): void {
    const meta = getSelectedMeta();
    let pipeline: PipelineState = createPipeline();

    if (meta.param !== null) {
      const val = currentSliderGetter ? currentSliderGetter() : meta.param.defaultVal;

      // For resize: convert percentage to pixel dimensions
      if (meta.name === 'resize') {
        const pct = val / 100;
        const newW = Math.max(1, Math.round(defaultImg.width * pct));
        const newH = Math.max(1, Math.round(defaultImg.height * pct));
        pipeline = addOp(pipeline, 'resize', [newW, newH], {});
      } else {
        pipeline = addOp(pipeline, meta.name, [val], {});
      }
    } else {
      pipeline = addOp(pipeline, meta.name, [], {});
    }

    const images = new Map([['input', defaultImg]]);
    const { snapshots } = materialize(pipeline, images);
    renderPipeline(pipelineArea, snapshots);
  }

  function rebuildSlider(): void {
    // Remove existing slider children
    while (sliderArea.firstChild) {
      sliderArea.removeChild(sliderArea.firstChild);
    }
    currentSliderGetter = null;

    const meta = getSelectedMeta();
    if (meta.param !== null) {
      const paramConfig = meta.name === 'resize'
        ? { label: 'Scale %', min: 10, max: 200, step: 1, defaultVal: 100 }
        : meta.param;

      const { container: sliderEl, getValue } = createParamSlider(paramConfig, () => {
        buildAndRender();
      });
      currentSliderGetter = getValue;
      sliderArea.appendChild(sliderEl);
    }

    buildAndRender();
  }

  opSelect.addEventListener('change', () => {
    rebuildSlider();
  });

  // Initial render
  rebuildSlider();
}
