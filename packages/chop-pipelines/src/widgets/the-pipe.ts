import { OP_META } from '../engine/operations';
import type { PipelineState } from '../engine/types';
import { createPipeline, addOp, removeOp, materialize, toJSON } from '../engine/pipeline';
import { renderPipeline } from '../renderer/pipeline-view';
import { createOpButton, createJsonDisplay } from './shared';
import { DEFAULT_IMAGES } from '../images';

export function mountThePipe(container: HTMLElement): void {
  // Generate default image
  const defaultImg = DEFAULT_IMAGES[0].generate();

  // All transforms
  const transforms = OP_META.filter(m => m.category === 'transform');

  // --- Operation palette ---
  const palette = document.createElement('div');
  palette.className = 'chop-palette';

  // --- Pipeline area ---
  const pipelineArea = document.createElement('div');
  pipelineArea.className = 'chop-pipeline-area';

  // --- JSON display ---
  const { container: jsonContainer, update: updateJson, toggle: jsonToggle } =
    createJsonDisplay('ops-only', false);

  // --- State ---
  let pipeline: PipelineState = createPipeline();

  function render(): void {
    const images = new Map([['input', defaultImg]]);
    const { snapshots } = materialize(pipeline, images);

    renderPipeline(pipelineArea, snapshots, {
      onNodeClick: (index) => {
        // index 0 = load (initial snapshot, opIndex = -1); skip it
        if (index === 0) return;
        // snapshots[index].opIndex gives position in pipeline.ops
        const opIndex = snapshots[index].opIndex;
        if (opIndex < 0) return;
        pipeline = removeOp(pipeline, opIndex);
        render();
      },
    });

    updateJson(JSON.stringify({ ops: pipeline.ops }, null, 2));
  }

  // Build palette buttons
  for (const meta of transforms) {
    const btn = createOpButton(meta, (m) => {
      const args = m.param !== null ? [m.param.defaultVal] : [];
      pipeline = addOp(pipeline, m.name, args, {});
      render();
    });
    palette.appendChild(btn);
  }

  container.appendChild(palette);
  container.appendChild(pipelineArea);

  // JSON toggle button + display
  if (jsonToggle) {
    container.appendChild(jsonToggle);
  }
  container.appendChild(jsonContainer);

  // Initial render
  render();
}
