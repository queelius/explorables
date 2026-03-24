# Chop Pipelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive explorable that teaches Unix pipeline philosophy through visual image manipulation, deployed as a Hugo blog post on metafunctor.com.

**Architecture:** Three-layer TypeScript package: pure `PixelBuffer`-based engine (no DOM), DOM-based horizontal pipeline renderer, and per-section widget controllers. Five progressive sections teach single transforms, chaining, multi-image contexts, recipes, and freeplay.

**Tech Stack:** TypeScript, esbuild (IIFE bundle), vitest, Canvas 2D (renderer only), Hugo markdown post template.

**Spec:** `docs/superpowers/specs/2026-03-24-chop-pipelines-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/chop-pipelines/package.json` | Package metadata, deploy slug |
| `src/index.ts` | Entry point: mount widgets on DOMContentLoaded |
| `src/engine/types.ts` | `PixelBuffer`, `PipelineState`, `ImageContext`, `OpEntry` types |
| `src/engine/operations.ts` | Operation registry + 13 pure pixel transform functions |
| `src/engine/pipeline.ts` | `createPipeline`, `addOp`, `materialize`, `toJSON`/`fromJSON` |
| `src/renderer/thumbnails.ts` | `pixelBufferToDataURL`: PixelBuffer to canvas to img src |
| `src/renderer/pipeline-view.ts` | DOM-based horizontal flow diagram with pipe nodes |
| `src/widgets/shared.ts` | `OperationButton`, `ParameterSlider`, `ImageSlot` components |
| `src/widgets/one-thing.ts` | Section 1: single transform before/after |
| `src/widgets/the-pipe.ts` | Section 2: pipeline builder with add/remove |
| `src/widgets/more-than-one.ts` | Section 3: multi-image with --as/--on |
| `src/widgets/programs-data.ts` | Section 4: recipe builder and apply |
| `src/widgets/sandbox.ts` | Section 5: full sandbox |
| `src/images.ts` | Procedurally generated default images |
| `src/styles.css` | All CSS scoped under `#chop-pipelines` |
| `post/index.md` | Hugo blog post template with prose + widget containers |
| `tests/operations.test.ts` | Pixel-level operation tests |
| `tests/pipeline.test.ts` | Pipeline state, serialization, materialization tests |

---

### Task 1: Package Scaffold

**Files:**
- Create: `packages/chop-pipelines/package.json`
- Create: `packages/chop-pipelines/src/index.ts`
- Create: `packages/chop-pipelines/src/engine/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@explorables/chop-pipelines",
  "version": "1.0.0",
  "description": "Interactive explorable: Unix pipeline philosophy through visual image manipulation",
  "deploy": {
    "slug": "2026-03-24-chop-pipelines"
  }
}
```

- [ ] **Step 2: Create stub entry point**

`src/index.ts`:
```typescript
function init(): void {
  // Widgets will be mounted here
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 3: Create core types**

`src/engine/types.ts` with: `PixelBuffer`, `OpEntry`, `PipelineState`, `ImageContext`, `OpMeta`, `StageSnapshot`, `createPixelBuffer`, `getPixel`. See spec for type definitions.

`StageSnapshot` captures the state at each pipeline stage for the renderer:
```typescript
export interface StageSnapshot {
  opIndex: number;   // -1 for initial load
  opName: string;
  image: PixelBuffer; // cursor image at this stage
  context: Map<string, PixelBuffer>; // full context for JSON popover
  error?: string;    // set if the operation failed
}
```

- [ ] **Step 4: Verify build picks up the package**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Output `chop-pipelines -> dist/bundle.js (no post template)`.

- [ ] **Step 5: Commit**

```bash
git add packages/chop-pipelines/
git commit -m "feat(chop-pipelines): scaffold package with core types"
```

---

### Task 2: Pixel Transform Operations (Part 1: Color Ops)

**Files:**
- Create: `packages/chop-pipelines/src/engine/operations.ts`
- Create: `packages/chop-pipelines/tests/operations.test.ts`

- [ ] **Step 1: Write failing tests for grayscale, brightness, contrast, opacity**

Tests should verify:
- `grayscale` on red (255,0,0) produces (76,76,76,255) per luminance formula
- `grayscale` preserves alpha
- `brightness` factor 2.0 doubles values, factor 0 produces black, clamps at 255
- `contrast` factor 0 produces flat gray (128,128,128), factor 1 is identity
- `opacity` factor 0.5 halves alpha, factor 0 produces transparent

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: FAIL (imports not found).

- [ ] **Step 3: Implement grayscale, brightness, contrast, opacity**

All operate on `PixelBuffer.data` (Uint8ClampedArray). Each clones the buffer, iterates pixels in steps of 4, applies the transform, and returns a new `PixelBuffer`. Use a shared `cloneBuffer` helper.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/chop-pipelines/src/engine/operations.ts packages/chop-pipelines/tests/operations.test.ts
git commit -m "feat(chop-pipelines): color operations with tests (grayscale, brightness, contrast, opacity)"
```

---

### Task 3: Pixel Transform Operations (Part 2: Geometry Ops)

**Files:**
- Modify: `packages/chop-pipelines/src/engine/operations.ts`
- Modify: `packages/chop-pipelines/tests/operations.test.ts`

- [ ] **Step 1: Write failing tests for resize, crop, pad, border**

Tests should verify:
- `resize` halves 4x4 to 2x2 with correct pixel sampling (nearest-neighbor)
- `resize` doubles 2x2 to 4x4
- `crop` extracts correct subregion (specific pixel at offset verified)
- `pad` increases dimensions by 2*amount, fills padding with specified color, preserves interior
- `border` delegates to pad (same behavior, semantic alias)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement resize, crop, pad, border**

- `resize`: nearest-neighbor sampling. Iterate output pixels, compute source coordinate via ratio, copy pixel.
- `crop`: row-by-row `subarray` copy from source rectangle.
- `pad`: allocate larger buffer filled with pad color, copy source rows at offset.
- `border`: alias for `pad` with a color argument.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/chop-pipelines/src/engine/operations.ts packages/chop-pipelines/tests/operations.test.ts
git commit -m "feat(chop-pipelines): geometry operations with tests (resize, crop, pad, border)"
```

---

### Task 4: Pixel Transform Operations (Part 3: Blur + Composition)

**Files:**
- Modify: `packages/chop-pipelines/src/engine/operations.ts`
- Modify: `packages/chop-pipelines/tests/operations.test.ts`

- [ ] **Step 1: Write failing tests for blur, hstack, vstack, overlay, mask**

Tests should verify:
- `blur` radius 1 on a 3x3 image with one white center pixel averages to 255/9=28
- `hstack` of two 2x2 images produces 4x2 with correct left/right pixel colors
- `vstack` of two 2x2 images produces 2x4 with correct top/bottom pixel colors
- `overlay` places fg on bg at offset, leaves non-overlapping bg pixels unchanged
- `mask` (circle) reduces corner alpha, keeps center alpha high

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement blur, hstack, vstack, overlay, mask**

- `blur`: box blur convolution with edge clamping. For each pixel, average the (2*radius+1)^2 neighborhood.
- `hstack`/`vstack`: allocate combined buffer, row-by-row copy from each source.
- `overlay`: alpha-compositing blend (Porter-Duff over) at offset position.
- `mask`: compute inside/outside value per pixel based on shape (circle, ellipse, roundrect), multiply alpha.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/chop-pipelines/src/engine/operations.ts packages/chop-pipelines/tests/operations.test.ts
git commit -m "feat(chop-pipelines): blur, composition, and mask operations with tests"
```

---

### Task 5: Operation Registry

**Files:**
- Modify: `packages/chop-pipelines/src/engine/operations.ts`
- Modify: `packages/chop-pipelines/tests/operations.test.ts`

- [ ] **Step 1: Write failing tests for OPERATIONS map, OP_META, and applyOp dispatcher**

Tests should verify:
- `OP_META` has exactly 13 transforms and 3 structural entries
- `OPERATIONS` map has an entry for each transform name
- `applyOp('grayscale', buf, [], {})` dispatches correctly
- `applyOp('resize', buf, [2, 2], {})` dispatches with args
- `applyOp('nonexistent', ...)` throws

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add OPERATIONS map, OP_META array, and applyOp function**

- `OPERATIONS`: `Map<string, (buf, args, kwargs) => PixelBuffer>` mapping op names to their functions.
- `OP_META`: `OpMeta[]` with name, label, category, and param config for each of 16 operations.
- `applyOp`: looks up the operation, throws if not found, calls it.

Note: composition ops (hstack, vstack, overlay) are registered in the map but handled specially by `pipeline.ts` during materialization (they need multiple images, not just the cursor).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/chop-pipelines/tests/operations.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/chop-pipelines/src/engine/operations.ts packages/chop-pipelines/tests/operations.test.ts
git commit -m "feat(chop-pipelines): operation registry with metadata and dispatcher"
```

---

### Task 6: Pipeline Engine (create, serialize, materialize)

**Files:**
- Create: `packages/chop-pipelines/src/engine/pipeline.ts`
- Create: `packages/chop-pipelines/tests/pipeline.test.ts`

- [ ] **Step 1: Write failing tests for pipeline creation, serialization, and materialization**

Tests should verify:
- `createPipeline()` returns `{version: 3, ops: [], metadata: {}}`
- `addOp` appends immutably (original unchanged, new pipeline has op)
- `removeOp` removes by index immutably (original unchanged)
- `removeOp` on out-of-bounds index returns pipeline unchanged
- `toJSON` / `fromJSON` roundtrips correctly
- `fromJSON` rejects non-v3 JSON
- `materialize` applies single transform (grayscale on red produces 76)
- `materialize` chains multiple transforms in order
- `materialize` returns one snapshot per stage (load + N ops)
- `materialize` handles multi-image with `--on` kwargs and composition ops
- `materialize` sets `error` on snapshot when op references nonexistent label
- Integration test: load two images, grayscale on one, brightness on other, hstack, verify final dimensions and sample pixel values

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/chop-pipelines/tests/pipeline.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement pipeline.ts**

Comment at top: `// Reference: github.com/queelius/chop (Python pipeline engine)`

Functions: `createPipeline`, `addOp`, `removeOp`, `toJSON`, `fromJSON`, `materialize`.

`materialize` takes a `PipelineState` and initial `Map<string, PixelBuffer>`, walks ops, builds `ImageContext`, returns `StageSnapshot[]` (one per op including initial load). Composition ops combine all context images. Transform ops apply to `kwargs.on` target or cursor. `load` ops store a provided image in context under the `kwargs.as` label (or auto-label). `save` and `apply` are handled by widget layer.

Error handling: when an op fails (e.g., referencing a nonexistent label), `materialize` catches the error and produces a snapshot with the `error` field set rather than throwing. This allows the renderer to show error state on the failing node while still displaying the pipeline up to that point.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/chop-pipelines/tests/pipeline.test.ts`
Expected: All PASS.

- [ ] **Step 5: Run all tests together**

Run: `npx vitest run packages/chop-pipelines/tests/`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/chop-pipelines/src/engine/pipeline.ts packages/chop-pipelines/tests/pipeline.test.ts
git commit -m "feat(chop-pipelines): pipeline engine with create, serialize, materialize"
```

---

### Task 7: Default Images + Thumbnail Renderer

**Files:**
- Create: `packages/chop-pipelines/src/images.ts`
- Create: `packages/chop-pipelines/src/renderer/thumbnails.ts`

- [ ] **Step 1: Create procedural default images**

`src/images.ts`: Three generator functions returning `PixelBuffer`:
- `generateSunset(w, h)`: vertical gradient from dark blue to orange
- `generateCheckerboard(w, h, tileSize)`: alternating light/dark tiles
- `generateRadial(w, h)`: warm center fading to cool edges

Export `DEFAULT_IMAGES` array with `{name, generate}` entries. Default size 150x100.

- [ ] **Step 2: Create thumbnail renderer**

`src/renderer/thumbnails.ts`: `pixelBufferToDataURL(buf, maxWidth, maxHeight)` that:
1. Computes scale factor to fit within maxWidth/maxHeight
2. Creates a `<canvas>` element
3. Uses `putImageData` + `drawImage` to render (scaling if needed)
4. Returns `canvas.toDataURL()`

This is the **only file** that touches Canvas/DOM APIs in the rendering layer.

- [ ] **Step 3: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/src/images.ts packages/chop-pipelines/src/renderer/thumbnails.ts
git commit -m "feat(chop-pipelines): procedural default images and thumbnail renderer"
```

---

### Task 8: Pipeline View Renderer

**Files:**
- Create: `packages/chop-pipelines/src/renderer/pipeline-view.ts`

- [ ] **Step 1: Implement single-track horizontal flow**

`src/renderer/pipeline-view.ts`: `renderPipeline(container, snapshots, options?)` that:
1. Clears the container using safe DOM methods (remove all child nodes in a loop)
2. Creates a scroll wrapper div (`.chop-pipeline-scroll`)
3. Creates a flex track div (`.chop-pipeline-track`)
4. For each snapshot: creates a node div with op label, thumbnail `<img>`, and param text
5. If snapshot has `error`, adds `.chop-node-error` class (red border)
6. Between nodes: inserts a pipe `|` symbol div
7. Sets `.chop-node-active` class on `options.activeIndex` node

Options: `{ activeIndex?, onNodeClick?, multiTrack? }`

- [ ] **Step 2: Add hover popover for JSON state**

When user hovers a node, show a popover element (`.chop-node-popover`) positioned above the node containing the `PipelineState` JSON up to that stage (the ops array sliced to that index). Create the popover as a `<div>` with a `<pre>` inside, positioned absolutely relative to the node. Show on mouseenter, hide on mouseleave.

- [ ] **Step 3: Add multi-track layout mode**

When `options.multiTrack` is true and snapshots contain a multi-image context:
- Detect images by reading `snapshot.context` keys
- Create vertically stacked tracks (`.chop-pipeline-track--multi`), one per labeled image
- Each track has a label badge (`.chop-track-label`) showing the image name
- Nodes that operate on a specific `--on` target appear on that track
- Composition nodes (hstack, vstack, overlay) span tracks: a `.chop-composition-span` div with connecting lines from input tracks, center-aligned vertically
- After composition, pipeline continues as a single merged track

- [ ] **Step 4: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 5: Commit**

```bash
git add packages/chop-pipelines/src/renderer/pipeline-view.ts
git commit -m "feat(chop-pipelines): horizontal pipeline flow renderer with multi-track and popovers"
```

---

### Task 9: Shared Widget Components

**Files:**
- Create: `packages/chop-pipelines/src/widgets/shared.ts`

- [ ] **Step 1: Implement shared UI primitives**

`src/widgets/shared.ts` exports:
- `createOpButton(meta, onClick)`: returns styled `<button>` with aria-label
- `createParamSlider(config, onChange)`: returns `{container, getValue}` with labeled range input
- `createImageSlot(label, defaultImage, onImageChange)`: returns `{container, getImage}` with thumbnail preview and file upload input. Converts uploaded files to `PixelBuffer` via FileReader + Image + temporary canvas.
- `createJsonDisplay(mode, visible)`: returns `{container, update, toggle}` with `<pre>` display and optional toggle button

All DOM construction uses `createElement`/`appendChild`/`textContent`. No dynamic content in any HTML string assignment.

- [ ] **Step 2: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 3: Commit**

```bash
git add packages/chop-pipelines/src/widgets/shared.ts
git commit -m "feat(chop-pipelines): shared widget components (buttons, sliders, image slots, JSON display)"
```

---

### Task 10: Section 1 Widget ("One Thing Well")

**Files:**
- Create: `packages/chop-pipelines/src/widgets/one-thing.ts`
- Modify: `packages/chop-pipelines/src/index.ts`

- [ ] **Step 1: Implement Section 1 widget**

`src/widgets/one-thing.ts`: `mountOneThing(container)` that:
1. Generates default image from `DEFAULT_IMAGES[0]`
2. Creates operation `<select>` dropdown (transforms with params only)
3. Creates parameter slider (swapped when op changes)
4. On change: builds a single-op pipeline, materializes, renders pipeline view
5. For resize: converts percentage to pixel dimensions before passing to engine

- [ ] **Step 2: Wire into index.ts**

Add `mountOneThing` import and mount to `#chop-one-thing` container in `init()`.

- [ ] **Step 3: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/src/widgets/one-thing.ts packages/chop-pipelines/src/index.ts
git commit -m "feat(chop-pipelines): Section 1 widget (One Thing Well)"
```

---

### Task 11: Section 2 Widget ("The Pipe")

**Files:**
- Create: `packages/chop-pipelines/src/widgets/the-pipe.ts`
- Modify: `packages/chop-pipelines/src/index.ts`

- [ ] **Step 1: Implement Section 2 widget**

`src/widgets/the-pipe.ts`: `mountThePipe(container)` that:
1. Generates default image
2. Creates operation palette (all transforms as buttons)
3. Click adds op to pipeline, click node removes it (index > 0 only, skip load)
4. Materializes and renders pipeline on each change
5. JSON toggle shows `pipeline.ops` array (ops-only mode)

- [ ] **Step 2: Add to index.ts**

Mount to `#chop-the-pipe`.

- [ ] **Step 3: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/src/widgets/the-pipe.ts packages/chop-pipelines/src/index.ts
git commit -m "feat(chop-pipelines): Section 2 widget (The Pipe)"
```

---

### Task 12: Section 3 Widget ("More Than One")

**Files:**
- Create: `packages/chop-pipelines/src/widgets/more-than-one.ts`
- Modify: `packages/chop-pipelines/src/index.ts`

- [ ] **Step 1: Implement Section 3 widget**

`src/widgets/more-than-one.ts`: `mountMoreThanOne(container)` that:
1. Creates two image slots (bg, fg) pre-loaded with defaults
2. Each image slot has an editable text input for its `--as` label (default "bg"/"fg")
3. Creates `--on` target `<select>` populated from current label names
4. Creates transform palette (click adds op with `{on: target}` kwarg)
5. Creates composition palette (hstack, vstack, overlay)
6. Reset button clears pipeline
7. JSON toggle shows ops array with kwargs visible (e.g., `{"as": "bg"}`, `{"on": "fg"}`)
8. Materializes with both images in initial context, keyed by their `--as` labels
9. Uses `multiTrack: true` option on `renderPipeline` to show parallel tracks

- [ ] **Step 2: Add to index.ts**

Mount to `#chop-more-than-one`.

- [ ] **Step 3: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/src/widgets/more-than-one.ts packages/chop-pipelines/src/index.ts
git commit -m "feat(chop-pipelines): Section 3 widget (More Than One)"
```

---

### Task 13: Section 4 Widget ("Programs as Data")

**Files:**
- Create: `packages/chop-pipelines/src/widgets/programs-data.ts`
- Modify: `packages/chop-pipelines/src/index.ts`

- [ ] **Step 1: Implement Section 4 widget**

`src/widgets/programs-data.ts`: `mountProgramsData(container)` that:
1. Creates transform palette for recipe building (no load/save/composition)
2. Reset button clears recipe
3. JSON display always visible, shows full `PipelineState` via `toJSON`
4. Apply area: renders all 3 default images, each materialized with the current recipe
5. Click-to-remove on pipeline nodes within each apply card

- [ ] **Step 2: Add to index.ts**

Mount to `#chop-programs-data`.

- [ ] **Step 3: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/src/widgets/programs-data.ts packages/chop-pipelines/src/index.ts
git commit -m "feat(chop-pipelines): Section 4 widget (Programs as Data)"
```

---

### Task 14: Section 5 Widget ("Putting It Together")

**Files:**
- Create: `packages/chop-pipelines/src/widgets/sandbox.ts`
- Modify: `packages/chop-pipelines/src/index.ts`

- [ ] **Step 1: Implement Section 5 sandbox widget**

`src/widgets/sandbox.ts`: `mountSandbox(container)` that combines all features:
1. Dynamic image slot management (start with 1, "Add Image" button, up to 4)
2. Full operation palette (all transforms + composition)
3. `--on` target select (lists all current image labels)
4. Pipeline view with click-to-remove
5. JSON toggle showing full `PipelineState`
6. "Download" button: materializes final image, converts to data URL via thumbnail renderer (full size), creates temporary `<a>` with download attribute, clicks it programmatically

- [ ] **Step 2: Add to index.ts**

Mount to `#chop-sandbox`.

- [ ] **Step 3: Verify build succeeds**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/src/widgets/sandbox.ts packages/chop-pipelines/src/index.ts
git commit -m "feat(chop-pipelines): Section 5 widget (Putting It Together)"
```

---

### Task 15: CSS Styles

**Files:**
- Create: `packages/chop-pipelines/src/styles.css`

- [ ] **Step 1: Create all CSS styles scoped under #chop-pipelines**

Styles needed:
- Container reset: `#chop-pipelines *, #chop-pipelines *::before, #chop-pipelines *::after { box-sizing: border-box; }`
- Pipeline scroll: `.chop-pipeline-scroll` with `overflow-x: auto`
- Pipeline track: `.chop-pipeline-track` with `display: flex; align-items: center`
- Pipeline nodes: `.chop-pipeline-node` with `width: 120px`, rounded border, dark bg
- Node states: `.chop-node-active` accent border, `.chop-node-error` red border, hover lighter bg, cursor pointer
- Node popover: `.chop-node-popover` absolute positioned above node, dark bg, monospace, z-index above siblings
- Pipe symbol: `.chop-pipe-symbol` accent color, bold, centered vertically
- Node thumbnail: `.chop-node-thumb` max 80x60, block display
- Node label: `.chop-node-label` small caps, accent color
- Multi-track: `.chop-pipeline-track--multi` for vertically stacked parallel tracks
- Track label: `.chop-track-label` small badge showing image name
- Composition span: `.chop-composition-span` spanning tracks with connecting lines
- Controls: `.chop-controls` flex wrap row
- Op buttons: `.chop-op-btn` styled with hover/active
- Slider: `.chop-param-slider`, `.chop-slider` styled range input
- Image slots: `.chop-image-slot`, `.chop-slot-preview`
- Slots row: `.chop-slots-row` flex with gap
- JSON display: `.chop-json-display`, `.chop-json-pre` monospace, dark bg, overflow-x auto
- Apply area: `.chop-apply-area` flex wrap, `.chop-apply-card` with border
- Responsive: `@media (max-width: 640px)` stack controls/slots vertically
- Dark theme: dark backgrounds, accent colors for interactive elements, monospace for code

- [ ] **Step 2: Verify build injects CSS**

Run: `node scripts/build.mjs chop-pipelines`
Expected: Builds successfully.

- [ ] **Step 3: Commit**

```bash
git add packages/chop-pipelines/src/styles.css
git commit -m "feat(chop-pipelines): CSS styles scoped under #chop-pipelines"
```

---

### Task 16: Hugo Post Template

**Files:**
- Create: `packages/chop-pipelines/post/index.md`

- [ ] **Step 1: Create the blog post template**

`post/index.md` structure:
- Hugo frontmatter: title "Pipes All the Way Down", date, description, tags (unix-philosophy, image-processing, interactive)
- Outer container: `<div id="chop-pipelines">`
- Section 1: prose about "one thing well" + `<div id="chop-one-thing"></div>`
- Section 2: prose about piping + `<div id="chop-the-pipe"></div>`
- Section 3: prose about multi-image + `<div id="chop-more-than-one"></div>`
- Section 4: prose about programs as data + `<div id="chop-programs-data"></div>`
- Section 5: prose about sandbox + `<div id="chop-sandbox"></div>`
- Closing `</div>`
- `<!-- inject:style -->` and `<!-- inject:script -->` markers

- [ ] **Step 2: Build the full package**

Run: `node scripts/build.mjs chop-pipelines`
Expected: `dist/index.md` generated with CSS and JS inlined.

- [ ] **Step 3: Verify output file exists**

Run: `wc -l packages/chop-pipelines/dist/index.md`
Expected: Non-trivial line count.

- [ ] **Step 4: Commit**

```bash
git add packages/chop-pipelines/post/index.md
git commit -m "feat(chop-pipelines): Hugo post template with prose and widget containers"
```

---

### Task 17: Build Verification + All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass across all packages.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Build all packages**

Run: `npm run build`
Expected: All packages build, including chop-pipelines producing `dist/index.md`.

- [ ] **Step 4: Verify bundle size**

Run: `wc -c packages/chop-pipelines/dist/bundle.js`
Expected: Reasonable size (procedural images keep it well under budget).
