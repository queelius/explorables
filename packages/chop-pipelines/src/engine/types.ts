export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type OpEntry = [string, unknown[], Record<string, unknown>];

export interface PipelineState {
  version: 3;
  ops: OpEntry[];
  metadata: Record<string, unknown>;
}

export interface ImageContext {
  images: Map<string, PixelBuffer>;
  cursor: string | null;
}

export interface OpMeta {
  name: string;
  label: string;
  category: 'transform' | 'composition' | 'structural';
  param: { label: string; min: number; max: number; step: number; defaultVal: number } | null;
}

export interface StageSnapshot {
  opIndex: number;   // -1 for initial load
  opName: string;
  image: PixelBuffer; // cursor image at this stage
  context: Map<string, PixelBuffer>; // full context for JSON popover
  error?: string;    // set if the operation failed
}

export function createPixelBuffer(
  width: number,
  height: number,
  r = 0,
  g = 0,
  b = 0,
  a = 255,
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return { data, width, height };
}

export function getPixel(
  buf: PixelBuffer,
  x: number,
  y: number,
): [number, number, number, number] {
  const offset = (y * buf.width + x) * 4;
  return [
    buf.data[offset + 0],
    buf.data[offset + 1],
    buf.data[offset + 2],
    buf.data[offset + 3],
  ];
}
