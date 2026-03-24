import { StageSnapshot } from '../engine/types';
import { pixelBufferToDataURL } from './thumbnails';

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface PipelineViewOptions {
  activeIndex?: number;
  onNodeClick?: (index: number) => void;
  multiTrack?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build the JSON text shown in the popover for a given stage index.
 * Shows the slice of ops up to and including that stage.
 */
function buildPopoverJson(snapshots: StageSnapshot[], index: number): string {
  const ops = snapshots
    .slice(0, index + 1)
    .filter(s => s.opIndex >= 0)
    .map(s => ({ op: s.opName }));
  return JSON.stringify(ops, null, 2);
}

/**
 * Create a single node div representing one pipeline stage.
 */
function createNodeDiv(
  snapshot: StageSnapshot,
  index: number,
  options: PipelineViewOptions,
  snapshots: StageSnapshot[],
): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'chop-node';
  if (snapshot.error) node.classList.add('chop-node-error');
  if (options.activeIndex !== undefined && options.activeIndex === index) {
    node.classList.add('chop-node-active');
  }
  // Needed for the absolute-positioned popover.
  node.style.position = 'relative';

  // Op label
  const label = document.createElement('div');
  label.className = 'chop-node-label';
  label.textContent = snapshot.opName;
  node.appendChild(label);

  // Thumbnail
  const img = document.createElement('img');
  img.className = 'chop-node-thumb';
  img.alt = snapshot.opName;
  try {
    img.src = pixelBufferToDataURL(snapshot.image);
  } catch {
    // If thumbnail generation fails (e.g. in test environment), leave src empty.
  }
  node.appendChild(img);

  // Param / error text
  const info = document.createElement('div');
  info.className = 'chop-node-info';
  if (snapshot.error) {
    info.textContent = snapshot.error;
  }
  node.appendChild(info);

  // Hover popover
  const popover = document.createElement('div');
  popover.className = 'chop-node-popover';
  popover.style.position = 'absolute';
  popover.style.bottom = '100%';
  popover.style.left = '50%';
  popover.style.transform = 'translateX(-50%)';
  popover.style.display = 'none';
  popover.style.zIndex = '10';

  const pre = document.createElement('pre');
  pre.textContent = buildPopoverJson(snapshots, index);
  popover.appendChild(pre);
  node.appendChild(popover);

  node.addEventListener('mouseenter', () => {
    popover.style.display = 'block';
  });
  node.addEventListener('mouseleave', () => {
    popover.style.display = 'none';
  });

  // Click handler
  if (options.onNodeClick) {
    const handler = options.onNodeClick;
    node.addEventListener('click', () => handler(index));
    node.style.cursor = 'pointer';
  }

  return node;
}

/**
 * Build a pipe separator symbol between nodes.
 */
function createPipeSymbol(): HTMLDivElement {
  const pipe = document.createElement('div');
  pipe.className = 'chop-pipe-symbol';
  pipe.textContent = '|';
  return pipe;
}

// ---------------------------------------------------------------------------
// Single-track layout
// ---------------------------------------------------------------------------

function renderSingleTrack(
  track: HTMLDivElement,
  snapshots: StageSnapshot[],
  options: PipelineViewOptions,
): void {
  for (let i = 0; i < snapshots.length; i++) {
    if (i > 0) {
      track.appendChild(createPipeSymbol());
    }
    track.appendChild(createNodeDiv(snapshots[i], i, options, snapshots));
  }
}

// ---------------------------------------------------------------------------
// Multi-track layout
// ---------------------------------------------------------------------------

/**
 * Detect distinct image labels present across all snapshot contexts.
 * The "on" kwarg is encoded in the op name string as `name--on--<label>` by
 * convention in this widget; however the snapshot itself doesn't carry kwargs.
 * We derive tracks from the context Map keys observed in order.
 */
function detectTrackLabels(snapshots: StageSnapshot[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const s of snapshots) {
    for (const key of s.context.keys()) {
      if (!seen.has(key)) {
        seen.add(key);
        labels.push(key);
      }
    }
  }
  return labels;
}

/**
 * Determine whether a snapshot is a composition op that merges all tracks.
 */
function isCompositionOp(opName: string): boolean {
  return opName === 'hstack' || opName === 'vstack' || opName === 'overlay';
}

function renderMultiTrack(
  wrapper: HTMLDivElement,
  snapshots: StageSnapshot[],
  options: PipelineViewOptions,
): void {
  const trackLabels = detectTrackLabels(snapshots);

  if (trackLabels.length <= 1) {
    // Fall back to single-track if there's only one image in play.
    const track = document.createElement('div');
    track.className = 'chop-pipeline-track';
    renderSingleTrack(track, snapshots, options);
    wrapper.appendChild(track);
    return;
  }

  // Create one track element per label.
  const trackMap = new Map<string, HTMLDivElement>();
  for (const label of trackLabels) {
    const trackEl = document.createElement('div');
    trackEl.className = 'chop-pipeline-track chop-pipeline-track--multi';

    const badge = document.createElement('span');
    badge.className = 'chop-track-label';
    badge.textContent = label;
    trackEl.appendChild(badge);

    trackMap.set(label, trackEl);
    wrapper.appendChild(trackEl);
  }

  // We also need a single merged track for after a composition op.
  let mergedTrack: HTMLDivElement | null = null;
  let merged = false;

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const node = createNodeDiv(snapshot, i, options, snapshots);

    if (merged) {
      // After composition: everything goes on the merged track.
      if (i > 0) mergedTrack!.appendChild(createPipeSymbol());
      mergedTrack!.appendChild(node);
      continue;
    }

    if (isCompositionOp(snapshot.opName)) {
      // Composition node spans tracks; add it to every track.
      node.classList.add('chop-composition-span');
      for (const trackEl of trackMap.values()) {
        trackEl.appendChild(createPipeSymbol());
        // Clone the node for each track (except the last which gets the real one).
        const clone = node.cloneNode(true) as HTMLDivElement;
        trackEl.appendChild(clone);
      }

      // After this point, switch to merged single-track mode.
      mergedTrack = document.createElement('div');
      mergedTrack.className = 'chop-pipeline-track';
      wrapper.appendChild(mergedTrack);
      merged = true;
      continue;
    }

    // Regular op: determine which track it belongs to.
    // Heuristic: the last context key that changed relative to the previous snapshot.
    // We look at which label appears in the current context but not the previous one,
    // or (if all labels present) we use the cursor label, which we approximate by
    // checking which context value changed.
    let targetLabel = trackLabels[0]; // default

    if (i > 0) {
      const prev = snapshots[i - 1];
      for (const label of trackLabels) {
        const prevBuf = prev.context.get(label);
        const currBuf = snapshot.context.get(label);
        if (currBuf !== prevBuf) {
          targetLabel = label;
          break;
        }
      }
    }

    const trackEl = trackMap.get(targetLabel);
    if (trackEl) {
      trackEl.appendChild(createPipeSymbol());
      trackEl.appendChild(node);
    } else {
      // Fallback: put on first track.
      const firstTrack = trackMap.values().next().value as HTMLDivElement;
      firstTrack.appendChild(createPipeSymbol());
      firstTrack.appendChild(node);
    }
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Render a pipeline as a visual flow of stage nodes inside `container`.
 *
 * Clears the container's existing children, then builds:
 *   - a scrollable wrapper (.chop-pipeline-scroll)
 *   - one or more flex tracks (.chop-pipeline-track)
 *   - node divs with thumbnail, label, and hover popover
 *   - pipe symbols between nodes
 */
export function renderPipeline(
  container: HTMLElement,
  snapshots: StageSnapshot[],
  options: PipelineViewOptions = {},
): void {
  // Step 1: clear container using safe DOM API (no innerHTML).
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (snapshots.length === 0) return;

  // Step 2: scroll wrapper.
  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'chop-pipeline-scroll';

  // Step 3: track(s).
  if (options.multiTrack) {
    renderMultiTrack(scrollWrapper, snapshots, options);
  } else {
    const track = document.createElement('div');
    track.className = 'chop-pipeline-track';
    renderSingleTrack(track, snapshots, options);
    scrollWrapper.appendChild(track);
  }

  container.appendChild(scrollWrapper);
}
