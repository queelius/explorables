import { describe, it, expect } from 'vitest';
import {
  grayscale,
  brightness,
  contrast,
  opacity,
  resize,
  crop,
  pad,
  border,
  blur,
  hstack,
  vstack,
  overlay,
  mask,
  OPERATIONS,
  OP_META,
  applyOp,
} from '../src/engine/operations';
import { createPixelBuffer, getPixel } from '../src/engine/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a 1×1 buffer with a single RGBA pixel. */
function pixel(r: number, g: number, b: number, a = 255) {
  return createPixelBuffer(1, 1, r, g, b, a);
}

/** Build a 2×2 buffer where each pixel is a given color. */
function solid2x2(r: number, g: number, b: number, a = 255) {
  return createPixelBuffer(2, 2, r, g, b, a);
}

// ---------------------------------------------------------------------------
// Part 1: Color ops
// ---------------------------------------------------------------------------

describe('grayscale', () => {
  it('converts pure red to correct luminance', () => {
    // 0.299*255 + 0.587*0 + 0.114*0 = 76.245 → 76
    const out = grayscale(pixel(255, 0, 0));
    const [r, g, b, a] = getPixel(out, 0, 0);
    expect(r).toBe(76);
    expect(g).toBe(76);
    expect(b).toBe(76);
    expect(a).toBe(255);
  });

  it('converts pure green to correct luminance', () => {
    // 0.299*0 + 0.587*255 + 0.114*0 = 149.685 → 150
    const out = grayscale(pixel(0, 255, 0));
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(150);
    expect(g).toBe(150);
    expect(b).toBe(150);
  });

  it('converts pure blue to correct luminance', () => {
    // 0.299*0 + 0.587*0 + 0.114*255 = 29.07 → 29
    const out = grayscale(pixel(0, 0, 255));
    const [r] = getPixel(out, 0, 0);
    expect(r).toBe(29);
  });

  it('leaves white as white', () => {
    const out = grayscale(pixel(255, 255, 255));
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('leaves black as black', () => {
    const out = grayscale(pixel(0, 0, 0));
    const [r] = getPixel(out, 0, 0);
    expect(r).toBe(0);
  });

  it('preserves alpha', () => {
    const out = grayscale(pixel(255, 0, 0, 100));
    const [, , , a] = getPixel(out, 0, 0);
    expect(a).toBe(100);
  });

  it('does not mutate the input buffer', () => {
    const buf = pixel(255, 0, 0);
    grayscale(buf);
    const [r, g, b] = getPixel(buf, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });
});

describe('brightness', () => {
  it('doubles RGB values with factor 2', () => {
    const out = brightness(pixel(100, 50, 25), 2);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(200);
    expect(g).toBe(100);
    expect(b).toBe(50);
  });

  it('clamps at 255', () => {
    const out = brightness(pixel(200, 200, 200), 2);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('halves with factor 0.5', () => {
    const out = brightness(pixel(200, 100, 50), 0.5);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(100);
    expect(g).toBe(50);
    expect(b).toBe(25);
  });

  it('factor 0 produces black', () => {
    const out = brightness(pixel(200, 150, 100), 0);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('preserves alpha', () => {
    const out = brightness(pixel(100, 100, 100, 128), 2);
    const [, , , a] = getPixel(out, 0, 0);
    expect(a).toBe(128);
  });

  it('does not mutate the input buffer', () => {
    const buf = pixel(100, 100, 100);
    brightness(buf, 2);
    expect(getPixel(buf, 0, 0)[0]).toBe(100);
  });
});

describe('contrast', () => {
  it('factor 0 produces flat gray (128)', () => {
    const out = contrast(pixel(200, 100, 50), 0);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(128);
    expect(g).toBe(128);
    expect(b).toBe(128);
  });

  it('factor 1 preserves values', () => {
    const out = contrast(pixel(200, 128, 50), 1);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(200);
    expect(g).toBe(128);
    expect(b).toBe(50);
  });

  it('factor 2 amplifies distance from 128', () => {
    // (180 - 128) * 2 + 128 = 104 + 128 = 232
    // (100 - 128) * 2 + 128 = -56 + 128 = 72
    const out = contrast(pixel(180, 100, 128), 2);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(232);
    expect(g).toBe(72);
    expect(b).toBe(128);
  });

  it('clamps to 0-255', () => {
    const out = contrast(pixel(250, 10, 128), 10);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(128);
  });

  it('preserves alpha', () => {
    const out = contrast(pixel(200, 100, 50, 77), 1);
    expect(getPixel(out, 0, 0)[3]).toBe(77);
  });
});

describe('opacity', () => {
  it('halves alpha with factor 0.5', () => {
    const out = opacity(pixel(255, 0, 0, 200), 0.5);
    expect(getPixel(out, 0, 0)[3]).toBe(100);
  });

  it('factor 0 produces fully transparent', () => {
    const out = opacity(pixel(255, 0, 0, 200), 0);
    expect(getPixel(out, 0, 0)[3]).toBe(0);
  });

  it('factor 1 preserves alpha', () => {
    const out = opacity(pixel(255, 0, 0, 200), 1);
    expect(getPixel(out, 0, 0)[3]).toBe(200);
  });

  it('does not affect RGB', () => {
    const out = opacity(pixel(100, 150, 200, 255), 0.5);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(100);
    expect(g).toBe(150);
    expect(b).toBe(200);
  });

  it('clamps at 255', () => {
    const out = opacity(pixel(255, 0, 0, 200), 2);
    expect(getPixel(out, 0, 0)[3]).toBe(255);
  });
});

// ---------------------------------------------------------------------------
// Part 2: Geometry ops
// ---------------------------------------------------------------------------

describe('resize', () => {
  it('resizes 4×4 solid to 2×2 preserving color', () => {
    const buf = createPixelBuffer(4, 4, 255, 0, 0);
    const out = resize(buf, 2, 2);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    const [r, g, b, a] = getPixel(out, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
    expect(a).toBe(255);
  });

  it('resizes 1×1 to 3×3', () => {
    const buf = createPixelBuffer(1, 1, 10, 20, 30);
    const out = resize(buf, 3, 3);
    expect(out.width).toBe(3);
    expect(out.height).toBe(3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const [r, g, b] = getPixel(out, x, y);
        expect(r).toBe(10);
        expect(g).toBe(20);
        expect(b).toBe(30);
      }
    }
  });

  it('nearest-neighbor sampling picks correct source pixel', () => {
    // 2x1 buffer: left=red, right=blue
    const buf = createPixelBuffer(2, 1, 0, 0, 0);
    buf.data[0] = 255; buf.data[1] = 0;   buf.data[2] = 0;   buf.data[3] = 255; // left pixel red
    buf.data[4] = 0;   buf.data[5] = 0;   buf.data[6] = 255; buf.data[7] = 255; // right pixel blue
    const out = resize(buf, 4, 1);
    // src x for out x=0: floor(0 * 2/4) = 0 → red
    // src x for out x=2: floor(2 * 2/4) = 1 → blue
    const [r0] = getPixel(out, 0, 0);
    const [, , b2] = getPixel(out, 2, 0);
    expect(r0).toBe(255);
    expect(b2).toBe(255);
  });

  it('does not mutate input', () => {
    const buf = createPixelBuffer(2, 2, 100, 100, 100);
    resize(buf, 4, 4);
    expect(buf.width).toBe(2);
    expect(buf.height).toBe(2);
  });
});

describe('crop', () => {
  it('extracts top-left 2×2 from 4×4', () => {
    // 4×4 buffer: top-left quadrant red, rest blue
    const buf = createPixelBuffer(4, 4, 0, 0, 255);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const off = (y * 4 + x) * 4;
        buf.data[off] = 255; buf.data[off + 1] = 0; buf.data[off + 2] = 0;
      }
    }
    const out = crop(buf, 0, 0, 2, 2);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
    // bottom-right pixel of crop should still be red
    const [r2, , b2] = getPixel(out, 1, 1);
    expect(r2).toBe(255);
    expect(b2).toBe(0);
  });

  it('extracts bottom-right 2×2 from 4×4', () => {
    const buf = createPixelBuffer(4, 4, 0, 255, 0); // all green
    // set bottom-right 2x2 to red
    for (let y = 2; y < 4; y++) {
      for (let x = 2; x < 4; x++) {
        const off = (y * 4 + x) * 4;
        buf.data[off] = 255; buf.data[off + 1] = 0; buf.data[off + 2] = 0;
      }
    }
    const out = crop(buf, 2, 2, 2, 2);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const [r, g] = getPixel(out, x, y);
        expect(r).toBe(255);
        expect(g).toBe(0);
      }
    }
  });

  it('does not mutate input', () => {
    const buf = createPixelBuffer(4, 4, 100, 100, 100);
    crop(buf, 0, 0, 2, 2);
    expect(buf.width).toBe(4);
  });
});

describe('pad', () => {
  it('increases dimensions by 2*amount on each axis', () => {
    const buf = createPixelBuffer(4, 4, 255, 0, 0);
    const out = pad(buf, 2, 0, 0, 0, 255);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
  });

  it('fills border region with given color', () => {
    const buf = createPixelBuffer(2, 2, 255, 0, 0);
    const out = pad(buf, 1, 0, 255, 0, 255); // green border
    // corner pixels are padding
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(0);
    expect(g).toBe(255);
    expect(b).toBe(0);
  });

  it('preserves original content in the interior', () => {
    const buf = createPixelBuffer(2, 2, 255, 0, 0);
    const out = pad(buf, 1, 0, 0, 0, 255);
    // original pixels start at (1,1)
    const [r, g, b] = getPixel(out, 1, 1);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });
});

describe('border', () => {
  it('is equivalent to pad in dimensions', () => {
    const buf = createPixelBuffer(4, 4, 255, 0, 0);
    const out = border(buf, 3, 0, 0, 255, 255);
    expect(out.width).toBe(10);
    expect(out.height).toBe(10);
  });

  it('fills corners with border color', () => {
    const buf = createPixelBuffer(2, 2, 255, 0, 0);
    const out = border(buf, 1, 0, 0, 255, 255); // blue border
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(255);
  });
});

// ---------------------------------------------------------------------------
// Part 3: Blur + Composition
// ---------------------------------------------------------------------------

describe('blur', () => {
  it('returns correct dimensions', () => {
    const buf = createPixelBuffer(4, 4, 128, 128, 128);
    const out = blur(buf, 1);
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);
  });

  it('averages neighborhood correctly (uniform color unchanged)', () => {
    const buf = createPixelBuffer(4, 4, 100, 150, 200);
    const out = blur(buf, 1);
    const [r, g, b] = getPixel(out, 1, 1);
    expect(r).toBe(100);
    expect(g).toBe(150);
    expect(b).toBe(200);
  });

  it('averages neighborhood across color boundary', () => {
    // 3×1 buffer: left=red(255,0,0), center=black(0,0,0), right=blue(0,0,255)
    const buf = createPixelBuffer(3, 1, 0, 0, 0);
    buf.data[0] = 255; buf.data[3] = 255; // pixel 0: red, alpha 255
    // pixel 1: all zeros (black), alpha 255
    buf.data[7] = 255;
    buf.data[8] = 0;   buf.data[10] = 255; buf.data[11] = 255; // pixel 2: blue

    const out = blur(buf, 1);
    // center pixel (x=1) has neighbors x=0(red) + x=1(black) + x=2(blue), clamped
    // R: (255 + 0 + 0) / 3 = 85
    // G: 0
    // B: (0 + 0 + 255) / 3 = 85
    const [r, g, b] = getPixel(out, 1, 0);
    expect(r).toBe(85);
    expect(g).toBe(0);
    expect(b).toBe(85);
  });

  it('radius 0 leaves image unchanged', () => {
    const buf = createPixelBuffer(3, 3, 100, 150, 200);
    const out = blur(buf, 0);
    const [r, g, b] = getPixel(out, 1, 1);
    expect(r).toBe(100);
    expect(g).toBe(150);
    expect(b).toBe(200);
  });

  it('does not mutate input', () => {
    const buf = createPixelBuffer(3, 3, 200, 100, 50);
    blur(buf, 1);
    expect(getPixel(buf, 0, 0)[0]).toBe(200);
  });
});

describe('hstack', () => {
  it('produces correct width (sum)', () => {
    const a = createPixelBuffer(3, 4, 255, 0, 0);
    const b = createPixelBuffer(5, 4, 0, 0, 255);
    const out = hstack(a, b);
    expect(out.width).toBe(8);
  });

  it('produces correct height (max)', () => {
    const a = createPixelBuffer(3, 2, 255, 0, 0);
    const b = createPixelBuffer(3, 5, 0, 0, 255);
    const out = hstack(a, b);
    expect(out.height).toBe(5);
  });

  it('left region contains pixels from a', () => {
    const a = createPixelBuffer(2, 2, 255, 0, 0);
    const b = createPixelBuffer(2, 2, 0, 0, 255);
    const out = hstack(a, b);
    const [r, g, bb] = getPixel(out, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(bb).toBe(0);
  });

  it('right region contains pixels from b', () => {
    const a = createPixelBuffer(2, 2, 255, 0, 0);
    const b = createPixelBuffer(2, 2, 0, 0, 255);
    const out = hstack(a, b);
    const [r, g, bb] = getPixel(out, 2, 0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(bb).toBe(255);
  });

  it('fills extra height rows with transparent black', () => {
    const a = createPixelBuffer(2, 3, 255, 0, 0);
    const b = createPixelBuffer(2, 1, 0, 0, 255);
    const out = hstack(a, b);
    // b only has 1 row; row 2 in b's column should be transparent (alpha=0)
    const [r, g, bb, alpha] = getPixel(out, 2, 2);
    expect(alpha).toBe(0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(bb).toBe(0);
  });
});

describe('vstack', () => {
  it('produces correct height (sum)', () => {
    const a = createPixelBuffer(4, 3, 255, 0, 0);
    const b = createPixelBuffer(4, 5, 0, 0, 255);
    const out = vstack(a, b);
    expect(out.height).toBe(8);
  });

  it('produces correct width (max)', () => {
    const a = createPixelBuffer(2, 3, 255, 0, 0);
    const b = createPixelBuffer(5, 3, 0, 0, 255);
    const out = vstack(a, b);
    expect(out.width).toBe(5);
  });

  it('top region contains pixels from a', () => {
    const a = createPixelBuffer(2, 2, 255, 0, 0);
    const b = createPixelBuffer(2, 2, 0, 0, 255);
    const out = vstack(a, b);
    const [r] = getPixel(out, 0, 0);
    expect(r).toBe(255);
  });

  it('bottom region contains pixels from b', () => {
    const a = createPixelBuffer(2, 2, 255, 0, 0);
    const b = createPixelBuffer(2, 2, 0, 0, 255);
    const out = vstack(a, b);
    const [, , bb] = getPixel(out, 0, 2);
    expect(bb).toBe(255);
  });

  it('fills extra width columns with transparent black', () => {
    const a = createPixelBuffer(3, 2, 255, 0, 0);
    const b = createPixelBuffer(1, 2, 0, 0, 255);
    const out = vstack(a, b);
    // b only 1 wide; columns 1 and 2 in b's rows should be transparent
    const [, , , alpha] = getPixel(out, 2, 2);
    expect(alpha).toBe(0);
  });
});

describe('overlay', () => {
  it('places fg fully over bg at (0,0) when alpha=255', () => {
    const bg = createPixelBuffer(4, 4, 100, 100, 100);
    const fg = createPixelBuffer(2, 2, 200, 50, 0);
    const out = overlay(bg, fg, 0, 0, 255);
    const [r, g, b] = getPixel(out, 0, 0);
    expect(r).toBe(200);
    expect(g).toBe(50);
    expect(b).toBe(0);
  });

  it('bg remains unchanged outside fg region', () => {
    const bg = createPixelBuffer(4, 4, 100, 100, 100);
    const fg = createPixelBuffer(2, 2, 200, 50, 0);
    const out = overlay(bg, fg, 0, 0, 255);
    const [r, g, b] = getPixel(out, 3, 3);
    expect(r).toBe(100);
    expect(g).toBe(100);
    expect(b).toBe(100);
  });

  it('respects offset', () => {
    const bg = createPixelBuffer(4, 4, 100, 100, 100);
    const fg = createPixelBuffer(2, 2, 200, 50, 0);
    const out = overlay(bg, fg, 2, 2, 255);
    // (0,0) in bg should still be bg color
    const [r0] = getPixel(out, 0, 0);
    expect(r0).toBe(100);
    // (2,2) should be fg color
    const [r2] = getPixel(out, 2, 2);
    expect(r2).toBe(200);
  });

  it('blends when alpha < 255', () => {
    const bg = createPixelBuffer(2, 2, 0, 0, 0);
    const fg = createPixelBuffer(2, 2, 200, 200, 200);
    const out = overlay(bg, fg, 0, 0, 128); // ~50% opacity
    const [r] = getPixel(out, 0, 0);
    // roughly 200 * (128/255) ≈ 100
    expect(r).toBeGreaterThan(90);
    expect(r).toBeLessThan(110);
  });

  it('does not mutate bg or fg', () => {
    const bg = createPixelBuffer(4, 4, 100, 100, 100);
    const fg = createPixelBuffer(2, 2, 200, 50, 0);
    overlay(bg, fg, 0, 0, 255);
    expect(getPixel(bg, 0, 0)[0]).toBe(100);
    expect(getPixel(fg, 0, 0)[0]).toBe(200);
  });
});

describe('mask', () => {
  it('circle mask: center pixel fully opaque', () => {
    const buf = createPixelBuffer(5, 5, 255, 0, 0, 255);
    const out = mask(buf, 'circle');
    const [, , , a] = getPixel(out, 2, 2);
    expect(a).toBe(255);
  });

  it('circle mask: corner pixel has reduced alpha', () => {
    const buf = createPixelBuffer(10, 10, 255, 0, 0, 255);
    const out = mask(buf, 'circle');
    const [, , , a] = getPixel(out, 0, 0);
    expect(a).toBeLessThan(255);
  });

  it('ellipse mask: center pixel fully opaque', () => {
    // Use odd dimensions so the true center falls exactly on an integer pixel
    const buf = createPixelBuffer(7, 5, 255, 0, 0, 255);
    const out = mask(buf, 'ellipse');
    // Center is at (3, 2): cx=(7-1)/2=3, cy=(5-1)/2=2 → nx=0, ny=0 → dist=0 → coverage=1
    const [, , , a] = getPixel(out, 3, 2);
    expect(a).toBe(255);
  });

  it('ellipse mask: corner pixel has reduced alpha', () => {
    const buf = createPixelBuffer(10, 10, 255, 0, 0, 255);
    const out = mask(buf, 'ellipse');
    const [, , , a] = getPixel(out, 0, 0);
    expect(a).toBeLessThan(255);
  });

  it('roundrect mask: center pixel fully opaque', () => {
    const buf = createPixelBuffer(10, 10, 255, 0, 0, 255);
    const out = mask(buf, 'roundrect', 2);
    const [, , , a] = getPixel(out, 5, 5);
    expect(a).toBe(255);
  });

  it('roundrect mask: corner pixel has reduced alpha', () => {
    const buf = createPixelBuffer(10, 10, 255, 0, 0, 255);
    const out = mask(buf, 'roundrect', 3);
    const [, , , a] = getPixel(out, 0, 0);
    expect(a).toBeLessThan(255);
  });

  it('does not mutate input', () => {
    const buf = createPixelBuffer(4, 4, 255, 0, 0, 255);
    mask(buf, 'circle');
    expect(getPixel(buf, 0, 0)[3]).toBe(255);
  });
});

// ---------------------------------------------------------------------------
// Operation Registry (Task 5)
// ---------------------------------------------------------------------------

describe('OP_META', () => {
  it('has 16 total entries (13 non-structural + 3 structural)', () => {
    expect(OP_META).toHaveLength(16);
  });

  it('has 13 non-structural entries (transform + composition)', () => {
    const nonStructural = OP_META.filter(m => m.category !== 'structural');
    expect(nonStructural).toHaveLength(13);
  });

  it('has 3 structural entries (load, save, apply)', () => {
    const structural = OP_META.filter(m => m.category === 'structural');
    expect(structural).toHaveLength(3);
    expect(structural.map(m => m.name)).toEqual(expect.arrayContaining(['load', 'save', 'apply']));
  });

  it('includes composition ops (hstack, vstack, overlay)', () => {
    const composition = OP_META.filter(m => m.category === 'composition');
    expect(composition.map(m => m.name)).toEqual(
      expect.arrayContaining(['hstack', 'vstack', 'overlay']),
    );
  });

  it('each entry has required fields: name, label, category', () => {
    for (const meta of OP_META) {
      expect(typeof meta.name).toBe('string');
      expect(typeof meta.label).toBe('string');
      expect(['transform', 'composition', 'structural']).toContain(meta.category);
    }
  });
});

describe('OPERATIONS map', () => {
  const transformNames = OP_META
    .filter(m => m.category === 'transform' || m.category === 'composition')
    .map(m => m.name);

  it('has an entry for each transform and composition op name', () => {
    for (const name of transformNames) {
      expect(OPERATIONS.has(name)).toBe(true);
    }
  });

  it('does not have entries for structural ops (load, save, apply)', () => {
    // structural ops are handled at the widget layer, not in the pixel-fn map
    // They are NOT present in OPERATIONS
    expect(OPERATIONS.has('load')).toBe(false);
    expect(OPERATIONS.has('save')).toBe(false);
    expect(OPERATIONS.has('apply')).toBe(false);
  });
});

describe('applyOp', () => {
  it('dispatches grayscale correctly: pure red → luminance 76', () => {
    const buf = createPixelBuffer(1, 1, 255, 0, 0);
    const out = applyOp('grayscale', buf, [], {});
    const [r] = getPixel(out, 0, 0);
    expect(r).toBe(76);
  });

  it('dispatches brightness with factor arg', () => {
    const buf = createPixelBuffer(1, 1, 100, 100, 100);
    const out = applyOp('brightness', buf, [2], {});
    const [r] = getPixel(out, 0, 0);
    expect(r).toBe(200);
  });

  it('dispatches resize with width/height args', () => {
    const buf = createPixelBuffer(4, 4, 255, 0, 0);
    const out = applyOp('resize', buf, [2, 2], {});
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
  });

  it('throws for unknown op name', () => {
    const buf = createPixelBuffer(1, 1, 0, 0, 0);
    expect(() => applyOp('nonexistent', buf, [], {})).toThrow(/nonexistent/);
  });

  it('kwargs are accepted without error (passed through)', () => {
    const buf = createPixelBuffer(1, 1, 255, 0, 0);
    // grayscale doesn't use kwargs; this should still work
    expect(() => applyOp('grayscale', buf, [], { on: 'main' })).not.toThrow();
  });
});
