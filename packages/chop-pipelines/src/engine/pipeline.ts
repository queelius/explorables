// Reference: github.com/queelius/chop (Python pipeline engine)

import { PipelineState, ImageContext, StageSnapshot, PixelBuffer, OpEntry } from './types';
import { applyOp, hstack, vstack, overlay } from './operations';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPipeline(): PipelineState {
  return { version: 3, ops: [], metadata: {} };
}

// ---------------------------------------------------------------------------
// Immutable ops list manipulation
// ---------------------------------------------------------------------------

export function addOp(
  pipeline: PipelineState,
  name: string,
  args: unknown[],
  kwargs: Record<string, unknown>,
): PipelineState {
  const entry: OpEntry = [name, args, kwargs];
  return { ...pipeline, ops: [...pipeline.ops, entry] };
}

export function removeOp(pipeline: PipelineState, index: number): PipelineState {
  if (index < 0 || index >= pipeline.ops.length) return pipeline;
  const ops = pipeline.ops.filter((_, i) => i !== index);
  return { ...pipeline, ops };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function toJSON(pipeline: PipelineState): string {
  // Map instances are not JSON-serializable; store ops as plain array-of-tuples.
  return JSON.stringify({ version: pipeline.version, ops: pipeline.ops, metadata: pipeline.metadata });
}

export function fromJSON(json: string): PipelineState {
  const raw = JSON.parse(json) as { version: unknown; ops: unknown; metadata: unknown };
  if (raw.version !== 3) {
    throw new Error(`Unsupported pipeline version: ${raw.version}. Only version 3 is supported.`);
  }
  return {
    version: 3,
    ops: raw.ops as OpEntry[],
    metadata: raw.metadata as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

/**
 * Combine all images in the context using the given composition op.
 * Images are folded left-to-right in insertion order.
 */
function applyCompositionOp(
  name: 'hstack' | 'vstack' | 'overlay',
  context: Map<string, PixelBuffer>,
  args: unknown[],
): PixelBuffer {
  const buffers = Array.from(context.values());
  if (buffers.length === 0) {
    throw new Error(`${name} requires at least one image in context`);
  }
  if (buffers.length === 1) return buffers[0];

  if (name === 'hstack') {
    return buffers.reduce((acc, cur) => hstack(acc, cur));
  }
  if (name === 'vstack') {
    return buffers.reduce((acc, cur) => vstack(acc, cur));
  }
  // overlay: use first as bg, second as fg; remaining args for offsetX, offsetY, alpha
  const offsetX = (args[0] as number | undefined) ?? 0;
  const offsetY = (args[1] as number | undefined) ?? 0;
  const alpha   = (args[2] as number | undefined) ?? 255;
  return buffers.reduce((acc, cur) => overlay(acc, cur, offsetX, offsetY, alpha));
}

/**
 * Walk the pipeline ops, maintaining an ImageContext.
 * Returns one StageSnapshot per stage (initial load + each op).
 */
export function materialize(
  pipeline: PipelineState,
  initialImages: Map<string, PixelBuffer>,
): { snapshots: StageSnapshot[]; context: ImageContext } {
  // Deep-copy initial images so we don't mutate the caller's map.
  const images = new Map<string, PixelBuffer>(initialImages);

  // Cursor starts on first image (or null if no images provided).
  let cursor: string | null = images.size > 0 ? images.keys().next().value! : null;

  const snapshots: StageSnapshot[] = [];

  // Initial snapshot (opIndex = -1).
  snapshots.push({
    opIndex: -1,
    opName: 'load',
    image: cursor !== null ? images.get(cursor)! : { data: new Uint8ClampedArray(0), width: 0, height: 0 },
    context: new Map(images),
  });

  for (let i = 0; i < pipeline.ops.length; i++) {
    const [name, args, kwargs] = pipeline.ops[i];

    try {
      if (name === 'load') {
        // `load` registers an image from the provided initial images under kwargs.as.
        const label = (kwargs['as'] as string | undefined) ?? `image${images.size}`;
        const src   = (kwargs['src']  as string | undefined) ?? label;
        const img   = initialImages.get(src) ?? initialImages.get(label);
        if (!img) throw new Error(`load: no initial image found for src "${src}"`);
        images.set(label, img);
        cursor = label;

        snapshots.push({
          opIndex: i,
          opName: name,
          image: images.get(cursor)!,
          context: new Map(images),
        });
        continue;
      }

      if (name === 'save' || name === 'apply') {
        // Handled at the widget layer; skip silently.
        snapshots.push({
          opIndex: i,
          opName: name,
          image: cursor !== null ? images.get(cursor)! : { data: new Uint8ClampedArray(0), width: 0, height: 0 },
          context: new Map(images),
        });
        continue;
      }

      if (name === 'hstack' || name === 'vstack' || name === 'overlay') {
        const result = applyCompositionOp(name, images, args);
        // Store result under cursor label (or 'composed') and advance cursor.
        const label = cursor ?? 'composed';
        images.set(label, result);
        cursor = label;

        snapshots.push({
          opIndex: i,
          opName: name,
          image: result,
          context: new Map(images),
        });
        continue;
      }

      // Regular transform op.
      const target = (kwargs['on'] as string | undefined) ?? cursor;
      if (!target) throw new Error(`No target image for op "${name}"`);
      const buf = images.get(target);
      if (!buf) throw new Error(`No image labeled "${target}" in context`);

      const result = applyOp(name, buf, args, kwargs);
      images.set(target, result);
      cursor = target;

      snapshots.push({
        opIndex: i,
        opName: name,
        image: result,
        context: new Map(images),
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      snapshots.push({
        opIndex: i,
        opName: name,
        image: cursor !== null && images.has(cursor)
          ? images.get(cursor)!
          : { data: new Uint8ClampedArray(0), width: 0, height: 0 },
        context: new Map(images),
        error: errorMsg,
      });
    }
  }

  return {
    snapshots,
    context: { images, cursor },
  };
}
