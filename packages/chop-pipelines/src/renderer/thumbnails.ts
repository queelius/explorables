import { PixelBuffer } from '../engine/types';

/**
 * Render a PixelBuffer to a data URL, scaling to fit within maxWidth × maxHeight.
 *
 * This is the ONLY file in the rendering layer that touches Canvas / DOM APIs.
 */
export function pixelBufferToDataURL(
  buf: PixelBuffer,
  maxWidth = 80,
  maxHeight = 60,
): string {
  if (buf.width === 0 || buf.height === 0) {
    // Return a 1×1 transparent PNG as a fallback.
    const fallback = document.createElement('canvas');
    fallback.width = 1;
    fallback.height = 1;
    return fallback.toDataURL();
  }

  // Step 1: paint the raw pixel data onto a native-size canvas.
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = buf.width;
  srcCanvas.height = buf.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('pixelBufferToDataURL: could not get 2d context');

  const imageData = new ImageData(
    new Uint8ClampedArray(buf.data),
    buf.width,
    buf.height,
  );
  srcCtx.putImageData(imageData, 0, 0);

  // Step 2: compute scale factor to fit within maxWidth × maxHeight.
  const scaleW = maxWidth  / buf.width;
  const scaleH = maxHeight / buf.height;
  const scale  = Math.min(1, scaleW, scaleH); // never upscale beyond native size

  const dstWidth  = Math.max(1, Math.round(buf.width  * scale));
  const dstHeight = Math.max(1, Math.round(buf.height * scale));

  if (dstWidth === buf.width && dstHeight === buf.height) {
    // No scaling needed — return directly.
    return srcCanvas.toDataURL();
  }

  // Step 3: draw the src canvas into a scaled destination canvas.
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width  = dstWidth;
  dstCanvas.height = dstHeight;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('pixelBufferToDataURL: could not get 2d context for dst');

  dstCtx.drawImage(srcCanvas, 0, 0, dstWidth, dstHeight);
  return dstCanvas.toDataURL();
}
