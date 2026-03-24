import { OP_META } from '../engine/operations';
import type { PipelineState } from '../engine/types';
import { createPipeline, addOp, removeOp, materialize, toJSON } from '../engine/pipeline';
import { renderPipeline } from '../renderer/pipeline-view';
import { createOpButton, createImageSlot, createJsonDisplay } from './shared';
import { DEFAULT_IMAGES } from '../images';

export function mountMoreThanOne(container: HTMLElement): void {
  const bgDefault = DEFAULT_IMAGES[0].generate();
  const fgDefault = DEFAULT_IMAGES[1].generate();

  const transforms = OP_META.filter(m => m.category === 'transform');
  const compositions = OP_META.filter(m => m.category === 'composition');

  // --- State ---
  let pipeline: PipelineState = createPipeline();
  let bgImage = bgDefault;
  let fgImage = fgDefault;

  // --- Image slots with --as label inputs ---
  const slotsRow = document.createElement('div');
  slotsRow.className = 'chop-slots-row';

  // BG slot
  const { container: bgSlotEl, getImage: getBgImage } = createImageSlot('Background', bgDefault, (buf) => {
    bgImage = buf;
    render();
  });

  const bgLabelInput = document.createElement('input');
  bgLabelInput.type = 'text';
  bgLabelInput.className = 'chop-as-input';
  bgLabelInput.value = 'bg';
  bgLabelInput.setAttribute('aria-label', '--as label for background');
  bgSlotEl.appendChild(bgLabelInput);

  // FG slot
  const { container: fgSlotEl, getImage: getFgImage } = createImageSlot('Foreground', fgDefault, (buf) => {
    fgImage = buf;
    render();
  });

  const fgLabelInput = document.createElement('input');
  fgLabelInput.type = 'text';
  fgLabelInput.className = 'chop-as-input';
  fgLabelInput.value = 'fg';
  fgLabelInput.setAttribute('aria-label', '--as label for foreground');
  fgSlotEl.appendChild(fgLabelInput);

  slotsRow.appendChild(bgSlotEl);
  slotsRow.appendChild(fgSlotEl);
  container.appendChild(slotsRow);

  // --- --on target select ---
  const targetRow = document.createElement('div');
  targetRow.className = 'chop-target-row';

  const targetLabel = document.createElement('label');
  targetLabel.textContent = '--on: ';
  targetLabel.className = 'chop-target-label';

  const targetSelect = document.createElement('select');
  targetSelect.className = 'chop-target-select';

  function refreshTargetOptions(): void {
    while (targetSelect.firstChild) {
      targetSelect.removeChild(targetSelect.firstChild);
    }
    const labels = [bgLabelInput.value, fgLabelInput.value];
    for (const lbl of labels) {
      const opt = document.createElement('option');
      opt.value = lbl;
      opt.textContent = lbl;
      targetSelect.appendChild(opt);
    }
  }

  refreshTargetOptions();

  bgLabelInput.addEventListener('input', () => {
    refreshTargetOptions();
  });
  fgLabelInput.addEventListener('input', () => {
    refreshTargetOptions();
  });

  targetLabel.appendChild(targetSelect);
  targetRow.appendChild(targetLabel);
  container.appendChild(targetRow);

  // --- Transform palette ---
  const transformPalette = document.createElement('div');
  transformPalette.className = 'chop-palette';

  const transformHeading = document.createElement('span');
  transformHeading.className = 'chop-palette-heading';
  transformHeading.textContent = 'Transforms: ';
  transformPalette.appendChild(transformHeading);

  for (const meta of transforms) {
    const btn = createOpButton(meta, (m) => {
      const args = m.param !== null ? [m.param.defaultVal] : [];
      const kwargs: Record<string, unknown> = { on: targetSelect.value };
      pipeline = addOp(pipeline, m.name, args, kwargs);
      render();
    });
    transformPalette.appendChild(btn);
  }
  container.appendChild(transformPalette);

  // --- Composition palette ---
  const compPalette = document.createElement('div');
  compPalette.className = 'chop-palette';

  const compHeading = document.createElement('span');
  compHeading.className = 'chop-palette-heading';
  compHeading.textContent = 'Compose: ';
  compPalette.appendChild(compHeading);

  for (const meta of compositions) {
    const btn = createOpButton(meta, (m) => {
      const args = m.param !== null ? [m.param.defaultVal] : [];
      pipeline = addOp(pipeline, m.name, args, {});
      render();
    });
    compPalette.appendChild(btn);
  }
  container.appendChild(compPalette);

  // --- Reset button ---
  const resetBtn = document.createElement('button');
  resetBtn.className = 'chop-reset-btn';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    pipeline = createPipeline();
    render();
  });
  container.appendChild(resetBtn);

  // --- Pipeline view ---
  const pipelineArea = document.createElement('div');
  pipelineArea.className = 'chop-pipeline-area';
  container.appendChild(pipelineArea);

  // --- JSON display ---
  const { container: jsonContainer, update: updateJson, toggle: jsonToggle } =
    createJsonDisplay('ops-only', false);

  if (jsonToggle) {
    container.appendChild(jsonToggle);
  }
  container.appendChild(jsonContainer);

  function render(): void {
    bgImage = getBgImage();
    fgImage = getFgImage();

    const bgLabel = bgLabelInput.value || 'bg';
    const fgLabel = fgLabelInput.value || 'fg';

    const images = new Map([
      [bgLabel, bgImage],
      [fgLabel, fgImage],
    ]);

    const { snapshots } = materialize(pipeline, images);

    renderPipeline(pipelineArea, snapshots, {
      multiTrack: true,
      onNodeClick: (index) => {
        if (index === 0) return;
        const opIndex = snapshots[index].opIndex;
        if (opIndex < 0) return;
        pipeline = removeOp(pipeline, opIndex);
        render();
      },
    });

    updateJson(JSON.stringify(pipeline.ops, null, 2));
  }

  render();
}
