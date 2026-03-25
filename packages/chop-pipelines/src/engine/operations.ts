import { PixelBuffer, OpMeta, createPixelBuffer, getPixel } from './types';

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function cloneBuffer(buf: PixelBuffer): PixelBuffer {
  return {
    data: new Uint8ClampedArray(buf.data),
    width: buf.width,
    height: buf.height,
  };
}

// ---------------------------------------------------------------------------
// Part 1: Color operations
// ---------------------------------------------------------------------------

/**
 * Convert to grayscale using the luminance formula:
 *   L = 0.299R + 0.587G + 0.114B
 * Alpha is preserved.
 */
export function grayscale(buf: PixelBuffer): PixelBuffer {
  const out = cloneBuffer(buf);
  for (let i = 0; i < out.width * out.height; i++) {
    const base = i * 4;
    const r = out.data[base + 0];
    const g = out.data[base + 1];
    const b = out.data[base + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    out.data[base + 0] = lum;
    out.data[base + 1] = lum;
    out.data[base + 2] = lum;
    // alpha unchanged
  }
  return out;
}

/**
 * Scale RGB channels by `factor`, clamping to 0-255. Alpha preserved.
 */
export function brightness(buf: PixelBuffer, factor: number): PixelBuffer {
  const out = cloneBuffer(buf);
  for (let i = 0; i < out.width * out.height; i++) {
    const base = i * 4;
    out.data[base + 0] = Math.round(out.data[base + 0] * factor);
    out.data[base + 1] = Math.round(out.data[base + 1] * factor);
    out.data[base + 2] = Math.round(out.data[base + 2] * factor);
    // Uint8ClampedArray already clamps; alpha unchanged
  }
  return out;
}

/**
 * Adjust contrast by scaling each RGB channel's distance from midpoint 128.
 * factor 0 → flat gray (128), factor 1 → no change, factor 2 → doubled contrast.
 * Clamps to 0-255. Alpha preserved.
 */
export function contrast(buf: PixelBuffer, factor: number): PixelBuffer {
  const out = cloneBuffer(buf);
  for (let i = 0; i < out.width * out.height; i++) {
    const base = i * 4;
    out.data[base + 0] = Math.round((out.data[base + 0] - 128) * factor + 128);
    out.data[base + 1] = Math.round((out.data[base + 1] - 128) * factor + 128);
    out.data[base + 2] = Math.round((out.data[base + 2] - 128) * factor + 128);
    // Uint8ClampedArray clamps; alpha unchanged
  }
  return out;
}

/**
 * Scale alpha channel by `factor`, clamping to 0-255. RGB preserved.
 */
export function opacity(buf: PixelBuffer, factor: number): PixelBuffer {
  const out = cloneBuffer(buf);
  for (let i = 0; i < out.width * out.height; i++) {
    const base = i * 4;
    out.data[base + 3] = Math.round(out.data[base + 3] * factor);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Part 2: Geometry operations
// ---------------------------------------------------------------------------

/**
 * Nearest-neighbor resize to `newWidth` × `newHeight`.
 */
export function resize(buf: PixelBuffer, newWidth: number, newHeight: number): PixelBuffer {
  const out = createPixelBuffer(newWidth, newHeight);
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor((x * buf.width) / newWidth);
      const srcY = Math.floor((y * buf.height) / newHeight);
      const [r, g, b, a] = getPixel(buf, srcX, srcY);
      const base = (y * newWidth + x) * 4;
      out.data[base + 0] = r;
      out.data[base + 1] = g;
      out.data[base + 2] = b;
      out.data[base + 3] = a;
    }
  }
  return out;
}

/**
 * Extract a rectangular region starting at (x, y) with dimensions w × h.
 */
export function crop(buf: PixelBuffer, x: number, y: number, w: number, h: number): PixelBuffer {
  const out = createPixelBuffer(w, h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const [r, g, b, a] = getPixel(buf, x + col, y + row);
      const base = (row * w + col) * 4;
      out.data[base + 0] = r;
      out.data[base + 1] = g;
      out.data[base + 2] = b;
      out.data[base + 3] = a;
    }
  }
  return out;
}

/**
 * Add `amount` pixels of padding on all four sides, filled with (r,g,b,a).
 * Original content is copied into the interior at offset (amount, amount).
 */
export function pad(
  buf: PixelBuffer,
  amount: number,
  r: number,
  g: number,
  b: number,
  a: number,
): PixelBuffer {
  const newWidth = buf.width + amount * 2;
  const newHeight = buf.height + amount * 2;
  const out = createPixelBuffer(newWidth, newHeight, r, g, b, a);
  for (let row = 0; row < buf.height; row++) {
    for (let col = 0; col < buf.width; col++) {
      const [pr, pg, pb, pa] = getPixel(buf, col, row);
      const base = ((row + amount) * newWidth + (col + amount)) * 4;
      out.data[base + 0] = pr;
      out.data[base + 1] = pg;
      out.data[base + 2] = pb;
      out.data[base + 3] = pa;
    }
  }
  return out;
}

/**
 * Add a solid-color border of `width` pixels on all sides.
 * This is an alias for `pad` with explicit color.
 */
export function border(
  buf: PixelBuffer,
  width: number,
  r: number,
  g: number,
  b: number,
  a: number,
): PixelBuffer {
  return pad(buf, width, r, g, b, a);
}

// ---------------------------------------------------------------------------
// Part 3: Blur + Composition
// ---------------------------------------------------------------------------

/**
 * Box blur with given radius. Uses edge clamping for out-of-bounds samples.
 * Alpha channel is blurred independently.
 */
export function blur(buf: PixelBuffer, radius: number): PixelBuffer {
  const out = createPixelBuffer(buf.width, buf.height);
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.max(0, Math.min(buf.width - 1, x + dx));
          const sy = Math.max(0, Math.min(buf.height - 1, y + dy));
          const [r, g, b, a] = getPixel(buf, sx, sy);
          sumR += r; sumG += g; sumB += b; sumA += a;
          count++;
        }
      }
      const base = (y * buf.width + x) * 4;
      out.data[base + 0] = Math.round(sumR / count);
      out.data[base + 1] = Math.round(sumG / count);
      out.data[base + 2] = Math.round(sumB / count);
      out.data[base + 3] = Math.round(sumA / count);
    }
  }
  return out;
}

/**
 * Place buffers `a` and `b` side-by-side. Height is max of the two.
 * Unfilled regions (where the shorter buffer doesn't reach) are transparent black.
 */
export function hstack(a: PixelBuffer, b: PixelBuffer): PixelBuffer {
  const width = a.width + b.width;
  const height = Math.max(a.height, b.height);
  // createPixelBuffer fills with (0,0,0,255) by default; we want transparent for gaps.
  // So allocate raw and fill ourselves.
  const out: PixelBuffer = {
    data: new Uint8ClampedArray(width * height * 4), // all zeros = transparent black
    width,
    height,
  };

  const copyRegion = (src: PixelBuffer, offsetX: number) => {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const [r, g, b, av] = getPixel(src, x, y);
        const base = (y * width + offsetX + x) * 4;
        out.data[base + 0] = r;
        out.data[base + 1] = g;
        out.data[base + 2] = b;
        out.data[base + 3] = av;
      }
    }
  };

  copyRegion(a, 0);
  copyRegion(b, a.width);
  return out;
}

/**
 * Stack buffers `a` (top) and `b` (bottom). Width is max of the two.
 * Unfilled regions are transparent black.
 */
export function vstack(a: PixelBuffer, b: PixelBuffer): PixelBuffer {
  const width = Math.max(a.width, b.width);
  const height = a.height + b.height;
  const out: PixelBuffer = {
    data: new Uint8ClampedArray(width * height * 4), // all zeros = transparent black
    width,
    height,
  };

  const copyRegion = (src: PixelBuffer, offsetY: number) => {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const [r, g, b, av] = getPixel(src, x, y);
        const base = ((offsetY + y) * width + x) * 4;
        out.data[base + 0] = r;
        out.data[base + 1] = g;
        out.data[base + 2] = b;
        out.data[base + 3] = av;
      }
    }
  };

  copyRegion(a, 0);
  copyRegion(b, a.height);
  return out;
}

/**
 * Composite `fg` over `bg` at position (offsetX, offsetY) using Porter-Duff "over".
 * `alpha` (0-255) is an additional global opacity multiplier for the fg layer.
 * Returns a new buffer with the same dimensions as `bg`.
 */
export function overlay(
  bg: PixelBuffer,
  fg: PixelBuffer,
  offsetX: number,
  offsetY: number,
  alpha: number,
): PixelBuffer {
  const out = cloneBuffer(bg);
  const fgAlpha = alpha / 255; // global fg opacity [0,1]

  for (let y = 0; y < fg.height; y++) {
    for (let x = 0; x < fg.width; x++) {
      const dstX = offsetX + x;
      const dstY = offsetY + y;
      if (dstX < 0 || dstX >= bg.width || dstY < 0 || dstY >= bg.height) continue;

      const [fr, fg2, fb, fa] = getPixel(fg, x, y);
      const [br, bg2, bb, ba] = getPixel(out, dstX, dstY);

      // Effective fg alpha: pixel alpha * global opacity
      const alphaFg = (fa / 255) * fgAlpha;
      const alphaBg = ba / 255;

      // Porter-Duff over: dst = fg + bg * (1 - alphaFg)
      const alphaOut = alphaFg + alphaBg * (1 - alphaFg);

      const base = (dstY * out.width + dstX) * 4;
      if (alphaOut === 0) {
        out.data[base + 0] = 0;
        out.data[base + 1] = 0;
        out.data[base + 2] = 0;
        out.data[base + 3] = 0;
      } else {
        out.data[base + 0] = Math.round((fr * alphaFg + br * alphaBg * (1 - alphaFg)) / alphaOut);
        out.data[base + 1] = Math.round((fg2 * alphaFg + bg2 * alphaBg * (1 - alphaFg)) / alphaOut);
        out.data[base + 2] = Math.round((fb * alphaFg + bb * alphaBg * (1 - alphaFg)) / alphaOut);
        out.data[base + 3] = Math.round(alphaOut * 255);
      }
    }
  }
  return out;
}

export type MaskShape = 'circle' | 'ellipse' | 'roundrect';

// ---------------------------------------------------------------------------
// Operation Registry
// ---------------------------------------------------------------------------

/**
 * Map from op name to a function that accepts a PixelBuffer plus positional
 * args and keyword args and returns a transformed PixelBuffer.
 *
 * Composition ops (hstack, vstack, overlay) require multiple buffers; they
 * are resolved by pipeline.ts during materialization and their entries here
 * return the buffer unchanged as a fallback placeholder.
 */
export const OPERATIONS = new Map<
  string,
  (buf: PixelBuffer, args: unknown[], kwargs: Record<string, unknown>) => PixelBuffer
>([
  ['grayscale',  (buf)               => grayscale(buf)],
  ['brightness', (buf, args)         => brightness(buf, args[0] as number)],
  ['contrast',   (buf, args)         => contrast(buf, args[0] as number)],
  ['opacity',    (buf, args)         => opacity(buf, args[0] as number)],
  ['resize',     (buf, args)         => resize(buf, args[0] as number, args[1] as number)],
  ['crop',       (buf, args)         => crop(buf, args[0] as number, args[1] as number, args[2] as number, args[3] as number)],
  ['pad',        (buf, args)         => pad(buf, args[0] as number, args[1] as number, args[2] as number, args[3] as number, args[4] as number)],
  ['border',     (buf, args)         => border(buf, args[0] as number, args[1] as number, args[2] as number, args[3] as number, args[4] as number)],
  ['blur',       (buf, args)         => blur(buf, args[0] as number)],
  ['mask',       (buf, args)         => mask(buf, args[0] as MaskShape, args[1] as number | undefined)],
  // Composition ops: handled by pipeline.ts; return buf unchanged here.
  ['hstack',     (buf)               => buf],
  ['vstack',     (buf)               => buf],
  ['overlay',    (buf)               => buf],
]);

/**
 * UI metadata for all 16 ops: 13 transforms + 3 structural (load, save, apply).
 */
export const OP_META: OpMeta[] = [
  // --- color transforms ---
  { name: 'grayscale', label: 'Grayscale',  category: 'transform',    param: null },
  { name: 'brightness', label: 'Brightness', category: 'transform',   param: { label: 'Factor', min: 0, max: 4, step: 0.05, defaultVal: 3 } },
  { name: 'contrast',   label: 'Contrast',   category: 'transform',   param: { label: 'Factor', min: 0, max: 4, step: 0.05, defaultVal: 3 } },
  { name: 'opacity',    label: 'Opacity',    category: 'transform',   param: { label: 'Factor', min: 0, max: 1, step: 0.01, defaultVal: 0.2 } },
  // --- geometry transforms ---
  { name: 'resize', label: 'Resize',    category: 'transform', param: { label: 'Width',  min: 1, max: 1024, step: 1, defaultVal: 32 } },
  { name: 'crop',   label: 'Crop',      category: 'transform', param: { label: 'Width',  min: 1, max: 1024, step: 1, defaultVal: 32 } },
  { name: 'pad',    label: 'Pad',       category: 'transform', param: { label: 'Amount', min: 0, max: 64,   step: 1, defaultVal: 16 } },
  { name: 'border', label: 'Border',    category: 'transform', param: { label: 'Width',  min: 0, max: 64,   step: 1, defaultVal: 8  } },
  // --- filter transforms ---
  { name: 'blur',   label: 'Blur',      category: 'transform', param: { label: 'Radius', min: 0, max: 20,   step: 1, defaultVal: 5  } },
  { name: 'mask',   label: 'Mask',      category: 'transform', param: null },
  // --- composition (multi-image) ---
  { name: 'hstack',  label: 'H-Stack',  category: 'composition', param: null },
  { name: 'vstack',  label: 'V-Stack',  category: 'composition', param: null },
  { name: 'overlay', label: 'Overlay',  category: 'composition', param: { label: 'Alpha', min: 0, max: 255, step: 1, defaultVal: 255 } },
  // --- structural ---
  { name: 'load',  label: 'Load',   category: 'structural', param: null },
  { name: 'save',  label: 'Save',   category: 'structural', param: null },
  { name: 'apply', label: 'Apply',  category: 'structural', param: null },
];

/**
 * Dispatch an operation by name, passing buf + args + kwargs.
 * Throws for unknown op names.
 */
export function applyOp(
  name: string,
  buf: PixelBuffer,
  args: unknown[],
  kwargs: Record<string, unknown>,
): PixelBuffer {
  const fn = OPERATIONS.get(name);
  if (!fn) throw new Error(`Unknown operation: "${name}"`);
  return fn(buf, args, kwargs);
}

/**
 * Apply a shape mask to the buffer by multiplying alpha.
 * Pixels inside the shape remain opaque; outside they become transparent.
 * Uses a soft edge based on distance.
 *
 * `radius` is only used for 'roundrect' (corner radius, default 10% of min dimension).
 */
export function mask(buf: PixelBuffer, shape: MaskShape, radius?: number): PixelBuffer {
  const out = cloneBuffer(buf);
  const w = buf.width;
  const h = buf.height;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let coverage: number; // 0 = fully masked out, 1 = fully inside

      if (shape === 'circle') {
        // Normalize to unit circle: (x-cx)/rx, (y-cy)/ry where rx=ry=half
        const rx = w / 2;
        const ry = h / 2;
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const dist = Math.sqrt(nx * nx + ny * ny);
        coverage = 1 - Math.max(0, Math.min(1, dist));

      } else if (shape === 'ellipse') {
        const rx = w / 2;
        const ry = h / 2;
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const dist = Math.sqrt(nx * nx + ny * ny);
        coverage = 1 - Math.max(0, Math.min(1, dist));

      } else {
        // roundrect
        const r = radius ?? Math.round(Math.min(w, h) * 0.1);
        // Distance from nearest edge of a rounded rectangle
        // Clamp to interior corner region
        const dx = Math.max(0, Math.abs(x - cx) - (w / 2 - r));
        const dy = Math.max(0, Math.abs(y - cy) - (h / 2 - r));
        const dist = Math.sqrt(dx * dx + dy * dy);
        coverage = dist <= r ? 1 : 0;
      }

      const base = (y * w + x) * 4;
      out.data[base + 3] = Math.round(out.data[base + 3] * coverage);
    }
  }
  return out;
}
