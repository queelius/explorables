import { createPixelBuffer, PixelBuffer } from './engine/types';

// ---------------------------------------------------------------------------
// Gradient / pattern generators
// ---------------------------------------------------------------------------

/**
 * Vertical gradient from dark blue (top) to orange (bottom).
 */
export function generateSunset(w = 150, h = 100): PixelBuffer {
  const buf = createPixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    // t goes from 0 (top = dark blue) to 1 (bottom = orange)
    const t = y / (h - 1);
    const r = Math.round(10 + t * 235);   // 10 → 245
    const g = Math.round(10 + t * 120);   // 10 → 130
    const b = Math.round(80 - t * 70);    // 80 → 10
    for (let x = 0; x < w; x++) {
      const base = (y * w + x) * 4;
      buf.data[base + 0] = r;
      buf.data[base + 1] = g;
      buf.data[base + 2] = b;
      buf.data[base + 3] = 255;
    }
  }
  return buf;
}

/**
 * Alternating light/dark tiles.
 */
export function generateCheckerboard(w = 150, h = 100, tileSize = 15): PixelBuffer {
  const buf = createPixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tx = Math.floor(x / tileSize);
      const ty = Math.floor(y / tileSize);
      const light = (tx + ty) % 2 === 0;
      const val = light ? 220 : 40;
      const base = (y * w + x) * 4;
      buf.data[base + 0] = val;
      buf.data[base + 1] = val;
      buf.data[base + 2] = val;
      buf.data[base + 3] = 255;
    }
  }
  return buf;
}

/**
 * Warm (yellow-orange) center fading to cool (dark blue) edges.
 */
export function generateRadial(w = 150, h = 100): PixelBuffer {
  const buf = createPixelBuffer(w, h);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  // Normalise by the half-diagonal so corners are t=1.
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxDist); // 0 = center, 1 = edge
      // center: warm orange-yellow (240, 180, 40)
      // edge:   cool dark blue     (10,  20,  80)
      const r = Math.round(240 - t * 230);
      const g = Math.round(180 - t * 160);
      const b = Math.round(40  + t * 40);
      const base = (y * w + x) * 4;
      buf.data[base + 0] = r;
      buf.data[base + 1] = g;
      buf.data[base + 2] = b;
      buf.data[base + 3] = 255;
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const DEFAULT_IMAGES: { name: string; generate: () => PixelBuffer }[] = [
  { name: 'sunset',       generate: generateSunset },
  { name: 'checkerboard', generate: generateCheckerboard },
  { name: 'radial',       generate: generateRadial },
];
