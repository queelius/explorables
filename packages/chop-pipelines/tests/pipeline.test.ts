import { describe, it, expect } from 'vitest';
import {
  createPipeline,
  addOp,
  removeOp,
  toJSON,
  fromJSON,
  materialize,
} from '../src/engine/pipeline';
import { createPixelBuffer, getPixel } from '../src/engine/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redBuf(w = 2, h = 2) {
  return createPixelBuffer(w, h, 255, 0, 0);
}

function blueBuf(w = 2, h = 2) {
  return createPixelBuffer(w, h, 0, 0, 255);
}

// ---------------------------------------------------------------------------
// createPipeline
// ---------------------------------------------------------------------------

describe('createPipeline', () => {
  it('returns version 3', () => {
    expect(createPipeline().version).toBe(3);
  });

  it('returns empty ops array', () => {
    expect(createPipeline().ops).toEqual([]);
  });

  it('returns empty metadata object', () => {
    expect(createPipeline().metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// addOp
// ---------------------------------------------------------------------------

describe('addOp', () => {
  it('appends op to empty pipeline', () => {
    const p = addOp(createPipeline(), 'grayscale', [], {});
    expect(p.ops).toHaveLength(1);
    expect(p.ops[0][0]).toBe('grayscale');
  });

  it('appends immutably (original unchanged)', () => {
    const original = createPipeline();
    addOp(original, 'grayscale', [], {});
    expect(original.ops).toHaveLength(0);
  });

  it('preserves args and kwargs in the entry', () => {
    const p = addOp(createPipeline(), 'brightness', [1.5], { on: 'main' });
    expect(p.ops[0]).toEqual(['brightness', [1.5], { on: 'main' }]);
  });

  it('chains multiple ops in order', () => {
    const p = addOp(addOp(createPipeline(), 'grayscale', [], {}), 'blur', [2], {});
    expect(p.ops[0][0]).toBe('grayscale');
    expect(p.ops[1][0]).toBe('blur');
  });
});

// ---------------------------------------------------------------------------
// removeOp
// ---------------------------------------------------------------------------

describe('removeOp', () => {
  const base = addOp(addOp(createPipeline(), 'grayscale', [], {}), 'blur', [1], {});

  it('removes op at given index', () => {
    const p = removeOp(base, 0);
    expect(p.ops).toHaveLength(1);
    expect(p.ops[0][0]).toBe('blur');
  });

  it('removes op at last index', () => {
    const p = removeOp(base, 1);
    expect(p.ops).toHaveLength(1);
    expect(p.ops[0][0]).toBe('grayscale');
  });

  it('is immutable (original unchanged)', () => {
    removeOp(base, 0);
    expect(base.ops).toHaveLength(2);
  });

  it('returns pipeline unchanged for out-of-bounds negative index', () => {
    const p = removeOp(base, -1);
    expect(p.ops).toHaveLength(2);
  });

  it('returns pipeline unchanged for out-of-bounds positive index', () => {
    const p = removeOp(base, 99);
    expect(p.ops).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// toJSON / fromJSON
// ---------------------------------------------------------------------------

describe('toJSON / fromJSON roundtrip', () => {
  it('roundtrips an empty pipeline', () => {
    const p = createPipeline();
    const restored = fromJSON(toJSON(p));
    expect(restored.version).toBe(3);
    expect(restored.ops).toEqual([]);
    expect(restored.metadata).toEqual({});
  });

  it('roundtrips a pipeline with ops', () => {
    const p = addOp(addOp(createPipeline(), 'grayscale', [], {}), 'brightness', [2], { on: 'main' });
    const restored = fromJSON(toJSON(p));
    expect(restored.ops).toHaveLength(2);
    expect(restored.ops[0][0]).toBe('grayscale');
    expect(restored.ops[1]).toEqual(['brightness', [2], { on: 'main' }]);
  });

  it('produces valid JSON string', () => {
    const json = toJSON(createPipeline());
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('fromJSON', () => {
  it('rejects non-v3 (version 2)', () => {
    const json = JSON.stringify({ version: 2, ops: [], metadata: {} });
    expect(() => fromJSON(json)).toThrow(/version/i);
  });

  it('rejects missing version', () => {
    const json = JSON.stringify({ ops: [], metadata: {} });
    expect(() => fromJSON(json)).toThrow(/version/i);
  });

  it('rejects version 4', () => {
    const json = JSON.stringify({ version: 4, ops: [], metadata: {} });
    expect(() => fromJSON(json)).toThrow(/version/i);
  });
});

// ---------------------------------------------------------------------------
// materialize
// ---------------------------------------------------------------------------

describe('materialize — basic', () => {
  it('returns initial snapshot at opIndex -1 even with no ops', () => {
    const p = createPipeline();
    const images = new Map([['main', redBuf()]]);
    const { snapshots } = materialize(p, images);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].opIndex).toBe(-1);
    expect(snapshots[0].opName).toBe('load');
  });

  it('snapshot count equals 1 (initial) + number of ops', () => {
    const p = addOp(addOp(createPipeline(), 'grayscale', [], {}), 'blur', [1], {});
    const images = new Map([['main', redBuf()]]);
    const { snapshots } = materialize(p, images);
    expect(snapshots).toHaveLength(3);
  });

  it('single grayscale transform: pure red → luminance 76', () => {
    const p = addOp(createPipeline(), 'grayscale', [], {});
    const images = new Map([['main', createPixelBuffer(1, 1, 255, 0, 0)]]);
    const { snapshots, context } = materialize(p, images);
    // snapshot at index 1 is after grayscale
    const snap = snapshots[1];
    const [r] = getPixel(snap.image, 0, 0);
    expect(r).toBe(76);
    // context cursor should also reflect the change
    const cursorBuf = context.images.get(context.cursor!);
    expect(getPixel(cursorBuf!, 0, 0)[0]).toBe(76);
  });

  it('chains multiple transforms in order', () => {
    // grayscale then brightness×2: 76 * 2 = 152
    const p = addOp(addOp(createPipeline(), 'grayscale', [], {}), 'brightness', [2], {});
    const images = new Map([['main', createPixelBuffer(1, 1, 255, 0, 0)]]);
    const { snapshots } = materialize(p, images);
    const last = snapshots[snapshots.length - 1];
    const [r] = getPixel(last.image, 0, 0);
    expect(r).toBe(152);
  });

  it('each snapshot has its own context map (immutable history)', () => {
    const p = addOp(createPipeline(), 'brightness', [0], {}); // darken to black
    const images = new Map([['main', createPixelBuffer(1, 1, 200, 200, 200)]]);
    const { snapshots } = materialize(p, images);
    // initial snapshot should still show original pixel
    const [r0] = getPixel(snapshots[0].image, 0, 0);
    expect(r0).toBe(200);
    // after-op snapshot should show black
    const [r1] = getPixel(snapshots[1].image, 0, 0);
    expect(r1).toBe(0);
  });
});

describe('materialize — kwargs.on targeting', () => {
  it('applies op to the named image with --on', () => {
    // Two images: main=red, alt=blue. Apply grayscale only on "main".
    const p = addOp(createPipeline(), 'grayscale', [], { on: 'main' });
    const images = new Map<string, ReturnType<typeof createPixelBuffer>>([
      ['main', createPixelBuffer(1, 1, 255, 0, 0)],
      ['alt',  createPixelBuffer(1, 1, 0, 0, 255)],
    ]);
    const { context } = materialize(p, images);
    // main should be grayscale
    const [r] = getPixel(context.images.get('main')!, 0, 0);
    expect(r).toBe(76);
    // alt should be unchanged
    const [, , b] = getPixel(context.images.get('alt')!, 0, 0);
    expect(b).toBe(255);
  });
});

describe('materialize — error handling', () => {
  it('sets error field on snapshot when op references nonexistent label', () => {
    const p = addOp(createPipeline(), 'grayscale', [], { on: 'ghost' });
    const images = new Map([['main', redBuf()]]);
    const { snapshots } = materialize(p, images);
    const errSnap = snapshots[snapshots.length - 1];
    expect(errSnap.error).toBeDefined();
    expect(errSnap.error).toMatch(/ghost/);
  });

  it('does not throw when op fails — returns snapshot with error instead', () => {
    const p = addOp(createPipeline(), 'nonexistent_op', [], {});
    const images = new Map([['main', redBuf()]]);
    expect(() => materialize(p, images)).not.toThrow();
    const { snapshots } = materialize(p, images);
    const errSnap = snapshots[snapshots.length - 1];
    expect(errSnap.error).toBeDefined();
  });

  it('continues producing snapshots after a failed op', () => {
    // op 0: fail, op 1: should still produce a snapshot
    const p = addOp(
      addOp(createPipeline(), 'grayscale', [], { on: 'ghost' }),
      'grayscale', [], {},
    );
    const images = new Map([['main', createPixelBuffer(1, 1, 255, 0, 0)]]);
    const { snapshots } = materialize(p, images);
    expect(snapshots).toHaveLength(3); // initial + 2 ops
  });
});

describe('materialize — composition ops', () => {
  it('hstack combines context images side-by-side', () => {
    // Two 2×2 images side-by-side → 4×2
    const p = addOp(createPipeline(), 'hstack', [], {});
    const images = new Map<string, ReturnType<typeof createPixelBuffer>>([
      ['a', createPixelBuffer(2, 2, 255, 0, 0)],
      ['b', createPixelBuffer(2, 2, 0, 0, 255)],
    ]);
    const { snapshots } = materialize(p, images);
    const last = snapshots[snapshots.length - 1];
    expect(last.image.width).toBe(4);
    expect(last.image.height).toBe(2);
  });

  it('vstack combines context images top-to-bottom', () => {
    const p = addOp(createPipeline(), 'vstack', [], {});
    const images = new Map<string, ReturnType<typeof createPixelBuffer>>([
      ['a', createPixelBuffer(2, 2, 255, 0, 0)],
      ['b', createPixelBuffer(2, 2, 0, 0, 255)],
    ]);
    const { snapshots } = materialize(p, images);
    const last = snapshots[snapshots.length - 1];
    expect(last.image.height).toBe(4);
    expect(last.image.width).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Integration test
// ---------------------------------------------------------------------------

describe('materialize — integration', () => {
  it('load two images, grayscale on one, brightness on other, hstack → correct dimensions and pixels', () => {
    // red 2×2 and blue 2×2
    const red  = createPixelBuffer(2, 2, 255, 0, 0);
    const blue = createPixelBuffer(2, 2, 0, 0, 200);

    let p = createPipeline();
    // grayscale on "red" → 76,76,76
    p = addOp(p, 'grayscale', [], { on: 'red' });
    // brightness×2 on "blue" → 0, 0, 255 (clamped)
    p = addOp(p, 'brightness', [2], { on: 'blue' });
    // hstack combines all images (red grayscaled | blue brightened) → 4×2
    p = addOp(p, 'hstack', [], {});

    const images = new Map<string, ReturnType<typeof createPixelBuffer>>([
      ['red',  red],
      ['blue', blue],
    ]);

    const { snapshots, context } = materialize(p, images);

    // Should have initial + 3 ops = 4 snapshots
    expect(snapshots).toHaveLength(4);

    const final = snapshots[snapshots.length - 1];
    // hstack: 2 images each 2 wide → 4 wide, 2 high
    expect(final.image.width).toBe(4);
    expect(final.image.height).toBe(2);

    // Left half should be the grayscaled red (76,76,76)
    const [r0, g0, b0] = getPixel(final.image, 0, 0);
    expect(r0).toBe(76);
    expect(g0).toBe(76);
    expect(b0).toBe(76);

    // Right half (x=2) should be the brightened blue (0, 0, 255 clamped)
    const [r2, g2, b2] = getPixel(final.image, 2, 0);
    expect(r2).toBe(0);
    expect(g2).toBe(0);
    expect(b2).toBe(255);

    // Context cursor should point to a valid image
    expect(context.cursor).not.toBeNull();
    expect(context.images.has(context.cursor!)).toBe(true);
  });
});
