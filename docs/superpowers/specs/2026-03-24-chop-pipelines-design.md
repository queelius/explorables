# Chop Pipelines Explorable: Design Spec

**Date:** 2026-03-24
**Package:** `packages/chop-pipelines/`
**Deploy slug:** `2026-03-24-chop-pipelines`

## Purpose

An interactive explorable explanation that teaches the Unix pipeline philosophy through visual image manipulation. Users build `chop` pipelines (chains of composable image operations connected by pipes) and watch images transform step-by-step through a horizontal flow diagram.

The explorable progressively introduces concepts: single transforms, chaining, multi-image contexts, lazy evaluation, and recipes. By the end, the reader understands why the Unix philosophy works, not just what it is.

## Audience

General. From beginners who've heard "Unix philosophy" but never felt it, to intermediate users who can `grep | sort | uniq` but haven't seen how the philosophy scales to complex multi-input programs.

## Architecture

Three layers, following the monorepo conventions:

### Layer 1: Pipeline Engine (pure logic, no DOM)

TypeScript port of chop's core pipeline architecture.

**Core types:**

```typescript
// Pixel buffer: the engine's image representation.
// No Canvas or DOM dependency. Just raw pixel data + dimensions.
interface PixelBuffer {
  data: Uint8ClampedArray; // RGBA bytes
  width: number;
  height: number;
}

interface PipelineState {
  version: 3;
  ops: [string, unknown[], Record<string, unknown>][];
  metadata: Record<string, unknown>;
}

interface ImageContext {
  images: Map<string, PixelBuffer>;
  cursor: string | null;
}
```

The engine uses `PixelBuffer` (a plain data object) rather than `ImageData` or `OffscreenCanvas`. This keeps the engine free of browser APIs and fully testable in Node.js with vitest. The renderer layer handles conversion between `PixelBuffer` and Canvas when displaying thumbnails.

**Materialization flow:**

1. Walk the ops list sequentially.
2. `load` / user-provided images populate the context map as `PixelBuffer` values.
3. Transform ops read from cursor or `--on` target, write result back.
4. Composition ops read multiple labeled images, produce a new one.
5. Each stage's result is cached for visualization thumbnails.

**Operation taxonomy (16 total):**

13 image transform operations:

| Operation | Implementation |
|-----------|---------------|
| `resize` | Nearest-neighbor or bilinear resampling on raw pixels |
| `grayscale` | Luminance formula (0.299R + 0.587G + 0.114B) on RGBA bytes |
| `brightness` | Scale RGB values, clamp to 0-255 |
| `contrast` | Adjust RGB distance from 128 midpoint, clamp |
| `blur` | Box blur convolution on pixel array (simple, testable) |
| `pad` | Allocate larger buffer, copy pixels with offset |
| `border` | Allocate larger buffer with fill color, copy pixels inset |
| `crop` | Copy rectangular region into new buffer |
| `overlay` | Blend two buffers with alpha compositing |
| `hstack` | Allocate wide buffer, copy images side by side |
| `vstack` | Allocate tall buffer, copy images vertically |
| `mask` | Generate shape mask (circle, roundrect, ellipse), multiply alpha channel |
| `opacity` | Scale alpha bytes |

3 structural operations:

| Operation | Implementation |
|-----------|---------------|
| `load` | Receives a `PixelBuffer` from the widget layer, stores in context with optional `--as` label |
| `save` | Terminal: triggers materialization, produces downloadable result |
| `apply` | Merges a recipe (ops-only JSON) into the current ops list |

Excluded from full chop (not needed for the story): `tile`, `grid`, `fill`, `fit`, `flip`, `rotate`, `sharpen`, `saturation`, `invert`, `colorize`, `trim`, `dup`, `select`, `canvas`.

**Image loading:**

- 2-3 small default images (~150x100px). Budget: total base64 image data under 50 KB. At this size, three JPEGs at moderate quality are roughly 5-10 KB each before base64, well within budget.
- Alternatively, defaults could be generated programmatically (gradient fills, color blocks) to avoid shipping any JPEG data at all. Decide during implementation based on whether real photos meaningfully improve the pedagogical experience.
- User uploads via `FileReader` in the widget layer. The widget converts to `PixelBuffer` before passing to the engine.

**Testability:** All operations are pure functions from `PixelBuffer` to `PixelBuffer`. No Canvas, no DOM, no browser APIs. Tests create small pixel arrays (e.g., 4x4), run an operation, and assert pixel values. This matches the monorepo's convention of pure-logic-only tests (see `regex-machines` and `fuzzy-infer`).

### Layer 2: Pipeline Renderer (visualization)

DOM-based horizontal flow diagram. Not Canvas or SVG. We want CSS transitions for highlighting and hover states.

**PixelBuffer to display:** The renderer converts `PixelBuffer` to visible thumbnails by creating a small `<canvas>`, calling `putImageData()`, then `toDataURL()` to get an `<img>` src. This is the only layer that touches Canvas APIs.

**Node anatomy:**

- Rounded rectangle container
- Operation name label at top (styled)
- Thumbnail preview (~80x60px) of the image at that stage
- Parameter text below (e.g., "50%", "cat.jpg")
- Pipe `|` symbol between nodes in accent color

**Multi-image layout:**

- Each labeled image gets its own horizontal track
- Tracks stacked vertically, each with a label badge (e.g., "bg", "fg")
- Fixed node width (120px). Minimum gap between nodes (12px). Pipe symbol centered in gap.
- Composition nodes are center-aligned vertically across tracks, spanning the full height of participating tracks with connecting lines from each input track
- After composition, pipeline continues as a single track at the vertical center
- Layout is recomputed on each pipeline change (ops added/removed/reordered)

**Interactive states:**

- **Hover** a node: popover showing JSON state at that point
- **Active** node: highlighted border when stepping through (guided sections)
- **Error** node: red border if operation fails (e.g., missing label)

**Scrolling:** Horizontal scroll container for long pipelines with subtle scroll indicators at edges.

### Layer 3: Section Widgets (interactive controls)

Each blog post section mounts a widget to a named `<div>` container. All widgets share the engine and renderer. They configure different pipelines.

Shared component primitives (internal to package): `OperationButton`, `ParameterSlider`, `ImageSlot`, `PipelineView`.

## Narrative Structure (5 Sections)

### Section 1: "One Thing Well"

- **Concept:** A single command transforms an image.
- **Controls:** Operation dropdown + parameter slider + before/after display.
- **Pipeline view:** Two nodes: `load` then `[op]`.
- **JSON display:** None (too early in the story).
- **Teaches:** Each operation is a pure function. Image in, image out.

### Section 2: "The Pipe"

- **Concept:** Chain operations together.
- **Controls:** Operation palette (row of buttons). Click to append, click node to remove. Reordering is a stretch goal (see below).
- **Pipeline view:** Full horizontal flow with `|` symbols, 3-5 stages, live thumbnails.
- **JSON display:** "Show JSON" toggle reveals just the `ops` array, growing with each stage added. Keeps focus on "each pipe stage is one entry."
- **Teaches:** Order matters. `grayscale | blur` is not the same as `blur | grayscale`.

### Section 3: "More Than One"

- **Concept:** Multi-image pipelines with labeled contexts.
- **Controls:** Two image slots (defaults pre-loaded, click to swap/upload). Label inputs for `--as`. Operation list with `--on` target dropdown. Composition op selector.
- **Pipeline view:** Parallel tracks merging at the composition node.
- **JSON display:** Toggle shows `ops` array, now with `kwargs` visible (e.g., `{"as": "bg"}`, `{"on": "fg"}`).
- **Teaches:** `--as` names, `--on` targets. The pipe carries a context of named images.

### Section 4: "Programs as Data"

- **Concept:** Pipeline JSON is a recipe you can save and reuse.
- **Controls:** Recipe builder (transforms only, no `load`). Live JSON display (always visible, not toggled). "Apply" area with 3 default images. Click to run the recipe on each.
- **Pipeline view:** Recipe shown as a template, then instantiated per image.
- **JSON display:** Full `PipelineState` object (`{version: 3, ops: [...], metadata: {}}`). Always visible. This is the payoff: the JSON IS the program.
- **Teaches:** Lazy evaluation. The JSON is just a list of instructions, a program. Store it, share it, inspect it with `jq`.

### Section 5: "Putting It Together"

- **Concept:** Full creative sandbox.
- **Controls:** All 16 operations. Multi-image support (add/remove slots). JSON view toggle. "Download result" button.
- **Pipeline view:** Full features: labels, branches, composition.
- **JSON display:** Toggle shows full `PipelineState`.
- **Teaches:** Recap + freeplay.

## Stretch Goals

These are not required for v1 but noted for potential future work:

- **Drag-to-reorder** in Section 2: pointer events with manual hit-testing for inline reorder of pipeline nodes. V1 uses click-to-add / click-to-remove only.
- **Additional operations:** `rotate`, `flip`, `invert` could be added later without architectural changes.

## File Structure

```
packages/chop-pipelines/
├── src/
│   ├── index.ts              # Entry point: import init, call on DOMContentLoaded
│   ├── engine/
│   │   ├── types.ts          # PixelBuffer, PipelineState, ImageContext, Op types
│   │   ├── pipeline.ts       # PipelineState creation, serialization, materialization
│   │   └── operations.ts     # Operation registry + pure pixel implementations
│   ├── renderer/
│   │   ├── pipeline-view.ts  # Horizontal flow diagram (DOM-based)
│   │   └── thumbnails.ts     # PixelBuffer to canvas to toDataURL thumbnail generation
│   ├── widgets/
│   │   ├── shared.ts         # OperationButton, ParameterSlider, ImageSlot components
│   │   ├── one-thing.ts      # Section 1 widget
│   │   ├── the-pipe.ts       # Section 2 widget
│   │   ├── more-than-one.ts  # Section 3 widget
│   │   ├── programs-data.ts  # Section 4 widget
│   │   └── sandbox.ts        # Section 5 widget
│   ├── images.ts             # Base64-encoded default images (or procedural generators)
│   └── styles.css            # All widget CSS, scoped via #chop-pipelines container
├── post/
│   └── index.md              # Hugo blog post with prose + widget divs + inject markers
├── tests/
│   ├── pipeline.test.ts      # PipelineState creation, serialization, JSON roundtrip
│   └── operations.test.ts    # Individual operation correctness (pixel-level assertions)
└── package.json              # @explorables/chop-pipelines, deploy.slug
```

The chop Python source is not included in the package. The upstream repo (github.com/queelius/chop) serves as reference. A comment at the top of `engine/pipeline.ts` links to it.

## CSS Scoping

All styles scoped under `#chop-pipelines` container ID, consistent with the `regex-machines` pattern (`#nfa-sim`). Only one instance per page, so ID scoping is appropriate. Sub-widgets within sections use class prefixes (e.g., `.chop-palette`, `.chop-slider`) under the container ID.

## Responsive Behavior

- The pipeline view uses a horizontal scroll container. On narrow viewports, users scroll horizontally through the pipeline. Subtle fade indicators at the scroll edges signal more content.
- Control panels (operation palette, image slots, sliders) stack vertically below 640px via a `@media` breakpoint, following the `fuzzy-infer` pattern.

## Accessibility

- Thumbnail images get alt text derived from operation and parameters (e.g., "Image after resize 50%").
- Operation palette buttons have descriptive labels.
- Keyboard navigation: Tab through palette buttons and controls, Enter/Space to activate.
- Full screen-reader support is a stretch goal, but basic ARIA labels on interactive elements are included in v1.

## Build & Deploy

Standard monorepo pipeline:
- `npm run build` bundles `src/index.ts` via esbuild into an IIFE, injects CSS + JS into `post/index.md`, outputs `dist/index.md`
- `node scripts/deploy.mjs chop-pipelines` copies to metafunctor blog

## Testing Strategy

- **Engine tests:** Pipeline state creation, op recording, JSON serialization/deserialization roundtrip, materialization order. All pure TypeScript, no browser APIs.
- **Operation tests:** Create small `PixelBuffer` values (e.g., 4x4 solid red), apply an operation, assert output pixel values. Example: `grayscale` on a red pixel should produce `(76, 76, 76, 255)` per the luminance formula. No Canvas needed.
- **Pipeline integration tests:** Build a multi-step pipeline, materialize, verify final pixel output matches expected.
- **No DOM tests for renderer/widgets.** Logic lives in the engine; the UI is thin.

## What This Is NOT

- Not a full port of all 25 chop operations. Curated subset of 16.
- Not a terminal emulator. No shell command typing. Interaction is through visual controls.
- Not pixel-perfect with chop Python output. Pure-TypeScript pixel math may differ slightly from Pillow. That's fine; the teaching goal is the pipeline concept.
