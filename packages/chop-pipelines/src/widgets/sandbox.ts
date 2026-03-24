import { OP_META } from '../engine/operations';
import type { PipelineState, PixelBuffer } from '../engine/types';
import { createPipeline, addOp, removeOp, materialize, toJSON } from '../engine/pipeline';
import { renderPipeline } from '../renderer/pipeline-view';
import { pixelBufferToDataURL } from '../renderer/thumbnails';
import { createOpButton, createImageSlot, createJsonDisplay } from './shared';
import { DEFAULT_IMAGES } from '../images';

const MAX_IMAGES = 4;

export function mountSandbox(container: HTMLElement): void {
  const transforms = OP_META.filter(m => m.category === 'transform');
  const compositions = OP_META.filter(m => m.category === 'composition');

  // --- State ---
  let pipeline: PipelineState = createPipeline();

  interface ImageSlotState {
    label: string;
    getImage: () => PixelBuffer;
    labelInput: HTMLInputElement;
  }

  const imageSlots: ImageSlotState[] = [];

  // --- Image slots section ---
  const slotsSection = document.createElement('div');
  slotsSection.className = 'chop-slots-section';
  container.appendChild(slotsSection);

  const slotsRow = document.createElement('div');
  slotsRow.className = 'chop-slots-row';
  slotsSection.appendChild(slotsRow);

  function addImageSlot(defaultImgIndex: number): void {
    const imgDef = DEFAULT_IMAGES[defaultImgIndex % DEFAULT_IMAGES.length];
    const defaultImg = imgDef.generate();
    const defaultLabel = imgDef.name;

    const slotWrapper = document.createElement('div');
    slotWrapper.className = 'chop-slot-wrapper';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'chop-as-input';
    labelInput.value = defaultLabel;
    labelInput.setAttribute('aria-label', '--as label');

    const { container: slotEl, getImage } = createImageSlot(defaultLabel, defaultImg, () => {
      render();
    });

    labelInput.addEventListener('input', () => {
      refreshTargetOptions();
      render();
    });

    slotWrapper.appendChild(slotEl);
    slotWrapper.appendChild(labelInput);
    slotsRow.appendChild(slotWrapper);

    const slotState: ImageSlotState = {
      label: defaultLabel,
      getImage,
      labelInput,
    };
    imageSlots.push(slotState);

    refreshTargetOptions();
    render();
  }

  // "Add Image" button
  const addImgBtn = document.createElement('button');
  addImgBtn.className = 'chop-add-image-btn';
  addImgBtn.textContent = 'Add Image';
  addImgBtn.addEventListener('click', () => {
    if (imageSlots.length < MAX_IMAGES) {
      addImageSlot(imageSlots.length);
      if (imageSlots.length >= MAX_IMAGES) {
        addImgBtn.disabled = true;
      }
    }
  });
  slotsSection.appendChild(addImgBtn);

  // --- --on target select ---
  const targetRow = document.createElement('div');
  targetRow.className = 'chop-target-row';

  const targetLabel = document.createElement('label');
  targetLabel.textContent = '--on: ';
  targetLabel.className = 'chop-target-label';

  const targetSelect = document.createElement('select');
  targetSelect.className = 'chop-target-select';
  targetLabel.appendChild(targetSelect);
  targetRow.appendChild(targetLabel);
  container.appendChild(targetRow);

  function refreshTargetOptions(): void {
    const prevValue = targetSelect.value;
    while (targetSelect.firstChild) {
      targetSelect.removeChild(targetSelect.firstChild);
    }
    for (const slot of imageSlots) {
      const lbl = slot.labelInput.value || slot.label;
      const opt = document.createElement('option');
      opt.value = lbl;
      opt.textContent = lbl;
      if (lbl === prevValue) opt.selected = true;
      targetSelect.appendChild(opt);
    }
  }

  // --- Full operation palette (transforms + compositions) ---
  const paletteSection = document.createElement('div');
  paletteSection.className = 'chop-palette-section';

  const transformPalette = document.createElement('div');
  transformPalette.className = 'chop-palette';

  const tHeading = document.createElement('span');
  tHeading.className = 'chop-palette-heading';
  tHeading.textContent = 'Transforms: ';
  transformPalette.appendChild(tHeading);

  for (const meta of transforms) {
    const btn = createOpButton(meta, (m) => {
      const args = m.param !== null ? [m.param.defaultVal] : [];
      const kwargs: Record<string, unknown> = { on: targetSelect.value };
      pipeline = addOp(pipeline, m.name, args, kwargs);
      render();
    });
    transformPalette.appendChild(btn);
  }

  const compPalette = document.createElement('div');
  compPalette.className = 'chop-palette';

  const cHeading = document.createElement('span');
  cHeading.className = 'chop-palette-heading';
  cHeading.textContent = 'Compose: ';
  compPalette.appendChild(cHeading);

  for (const meta of compositions) {
    const btn = createOpButton(meta, (m) => {
      const args = m.param !== null ? [m.param.defaultVal] : [];
      pipeline = addOp(pipeline, m.name, args, {});
      render();
    });
    compPalette.appendChild(btn);
  }

  paletteSection.appendChild(transformPalette);
  paletteSection.appendChild(compPalette);
  container.appendChild(paletteSection);

  // --- Pipeline view ---
  const pipelineArea = document.createElement('div');
  pipelineArea.className = 'chop-pipeline-area';
  container.appendChild(pipelineArea);

  // --- JSON display ---
  const { container: jsonContainer, update: updateJson, toggle: jsonToggle } =
    createJsonDisplay('full', false);

  if (jsonToggle) {
    container.appendChild(jsonToggle);
  }
  container.appendChild(jsonContainer);

  // --- Download button ---
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'chop-download-btn';
  downloadBtn.textContent = 'Download';
  downloadBtn.addEventListener('click', () => {
    const images = buildImageMap();
    const { context } = materialize(pipeline, images);
    const cursorLabel = context.cursor;
    if (!cursorLabel) return;
    const buf = context.images.get(cursorLabel);
    if (!buf) return;

    try {
      const dataUrl = pixelBufferToDataURL(buf, buf.width, buf.height);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'chop-result.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Non-DOM environments — silently skip
    }
  });
  container.appendChild(downloadBtn);

  function buildImageMap(): Map<string, PixelBuffer> {
    const images = new Map<string, PixelBuffer>();
    for (const slot of imageSlots) {
      const lbl = slot.labelInput.value || slot.label;
      images.set(lbl, slot.getImage());
    }
    return images;
  }

  function render(): void {
    const images = buildImageMap();
    if (images.size === 0) return;

    const { snapshots } = materialize(pipeline, images);

    renderPipeline(pipelineArea, snapshots, {
      multiTrack: imageSlots.length > 1,
      onNodeClick: (index) => {
        if (index === 0) return;
        const opIndex = snapshots[index].opIndex;
        if (opIndex < 0) return;
        pipeline = removeOp(pipeline, opIndex);
        render();
      },
    });

    updateJson(toJSON(pipeline));
  }

  // Start with one image slot
  addImageSlot(0);
}
