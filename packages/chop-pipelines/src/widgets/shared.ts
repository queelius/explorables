import { OpMeta, PixelBuffer, createPixelBuffer } from '../engine/types';
import { pixelBufferToDataURL } from '../renderer/thumbnails';

// ---------------------------------------------------------------------------
// 1. Op button
// ---------------------------------------------------------------------------

/**
 * A styled button representing a single op. Clicking it invokes `onClick`.
 */
export function createOpButton(
  meta: OpMeta,
  onClick: (meta: OpMeta) => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'chop-op-btn';
  btn.textContent = meta.label;
  btn.setAttribute('aria-label', meta.label);
  btn.addEventListener('click', () => onClick(meta));
  return btn;
}

// ---------------------------------------------------------------------------
// 2. Param slider
// ---------------------------------------------------------------------------

/**
 * A labeled range input for an op's numeric parameter.
 * Returns the container element and a `getValue()` accessor.
 */
export function createParamSlider(
  config: NonNullable<OpMeta['param']>,
  onChange: (value: number) => void,
): { container: HTMLElement; getValue: () => number } {
  const container = document.createElement('div');
  container.className = 'chop-param-slider';

  const label = document.createElement('span');
  label.className = 'chop-slider-label';
  label.textContent = config.label;
  container.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'chop-slider';
  input.min = String(config.min);
  input.max = String(config.max);
  input.step = String(config.step);
  input.value = String(config.defaultVal);
  container.appendChild(input);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'chop-slider-value';
  valueDisplay.textContent = String(config.defaultVal);
  container.appendChild(valueDisplay);

  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    valueDisplay.textContent = String(val);
    onChange(val);
  });

  return {
    container,
    getValue: () => parseFloat(input.value),
  };
}

// ---------------------------------------------------------------------------
// 3. Image slot
// ---------------------------------------------------------------------------

/**
 * A thumbnail preview with a file upload input.
 * Uploaded files are decoded via FileReader → Image → canvas → PixelBuffer.
 */
export function createImageSlot(
  label: string,
  defaultImage: PixelBuffer,
  onImageChange: (buf: PixelBuffer) => void,
): { container: HTMLElement; getImage: () => PixelBuffer } {
  let currentImage: PixelBuffer = defaultImage;

  const container = document.createElement('div');
  container.className = 'chop-image-slot';

  const labelEl = document.createElement('span');
  labelEl.className = 'chop-slot-label';
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const preview = document.createElement('img');
  preview.className = 'chop-slot-preview';
  preview.alt = label;
  try {
    preview.src = pixelBufferToDataURL(defaultImage);
  } catch {
    // Non-DOM environments (tests) — leave src empty.
  }
  container.appendChild(preview);

  const upload = document.createElement('input');
  upload.type = 'file';
  upload.accept = 'image/*';
  upload.className = 'chop-slot-upload';
  container.appendChild(upload);

  upload.addEventListener('change', () => {
    const file = upload.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvt) => {
      const dataUrl = readerEvt.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Draw to canvas to extract pixel data.
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        const buf = createPixelBuffer(img.width, img.height);
        buf.data.set(imageData.data);

        currentImage = buf;
        preview.src = canvas.toDataURL();
        onImageChange(buf);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  return {
    container,
    getImage: () => currentImage,
  };
}

// ---------------------------------------------------------------------------
// 4. JSON display
// ---------------------------------------------------------------------------

/**
 * A `<pre>` element that displays JSON, with an optional toggle button.
 *
 * When `visible` is false initially, a toggle button is created that shows/hides
 * the display. When `visible` is true, no toggle button is created.
 */
export function createJsonDisplay(
  mode: 'ops-only' | 'full',
  visible: boolean,
): { container: HTMLElement; update: (json: string) => void; toggle: HTMLButtonElement | null } {
  const container = document.createElement('div');
  container.className = 'chop-json-display';

  const pre = document.createElement('pre');
  pre.className = 'chop-json-pre';
  // Store mode as a data attribute for potential styling hooks.
  pre.dataset['mode'] = mode;
  if (!visible) {
    pre.style.display = 'none';
  }
  container.appendChild(pre);

  let toggle: HTMLButtonElement | null = null;
  if (!visible) {
    toggle = document.createElement('button');
    toggle.className = 'chop-json-toggle';
    toggle.textContent = 'Show JSON';
    let shown = false;
    toggle.addEventListener('click', () => {
      shown = !shown;
      pre.style.display = shown ? 'block' : 'none';
      toggle!.textContent = shown ? 'Hide JSON' : 'Show JSON';
    });
    // Insert toggle before the pre so it appears above it.
    container.insertBefore(toggle, pre);
  }

  const update = (json: string) => {
    if (mode === 'ops-only') {
      // Extract just the ops array from the serialised pipeline JSON.
      try {
        const parsed = JSON.parse(json) as { ops?: unknown };
        pre.textContent = JSON.stringify(parsed.ops ?? json, null, 2);
      } catch {
        pre.textContent = json;
      }
    } else {
      pre.textContent = json;
    }
  };

  return { container, update, toggle };
}
