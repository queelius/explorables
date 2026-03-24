import { OP_META } from '../engine/operations';
import type { PipelineState } from '../engine/types';
import { createPipeline, addOp, removeOp, materialize, toJSON } from '../engine/pipeline';
import { renderPipeline } from '../renderer/pipeline-view';
import { createOpButton, createJsonDisplay } from './shared';
import { DEFAULT_IMAGES } from '../images';

export function mountProgramsData(container: HTMLElement): void {
  // Transforms only (no load/save/composition)
  const transforms = OP_META.filter(m => m.category === 'transform');

  // --- State ---
  let recipe: PipelineState = createPipeline();

  // --- Transform palette for recipe building ---
  const palette = document.createElement('div');
  palette.className = 'chop-palette';

  for (const meta of transforms) {
    const btn = createOpButton(meta, (m) => {
      const args = m.param !== null ? [m.param.defaultVal] : [];
      recipe = addOp(recipe, m.name, args, {});
      render();
    });
    palette.appendChild(btn);
  }
  container.appendChild(palette);

  // --- Reset button ---
  const resetBtn = document.createElement('button');
  resetBtn.className = 'chop-reset-btn';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    recipe = createPipeline();
    render();
  });
  container.appendChild(resetBtn);

  // --- JSON display: always visible, full mode ---
  const { container: jsonContainer, update: updateJson } =
    createJsonDisplay('full', true);
  container.appendChild(jsonContainer);

  // --- Apply area: show each default image processed through recipe ---
  const applyArea = document.createElement('div');
  applyArea.className = 'chop-apply-area';
  container.appendChild(applyArea);

  function render(): void {
    // Update JSON display
    updateJson(toJSON(recipe));

    // Clear apply area safely
    while (applyArea.firstChild) {
      applyArea.removeChild(applyArea.firstChild);
    }

    // For each default image, materialize recipe and render a small pipeline
    for (const imgDef of DEFAULT_IMAGES) {
      const img = imgDef.generate();

      const card = document.createElement('div');
      card.className = 'chop-apply-card';

      const cardLabel = document.createElement('div');
      cardLabel.className = 'chop-apply-card-label';
      cardLabel.textContent = imgDef.name;
      card.appendChild(cardLabel);

      const miniPipeline = document.createElement('div');
      miniPipeline.className = 'chop-mini-pipeline';
      card.appendChild(miniPipeline);

      const images = new Map([['input', img]]);
      const { snapshots } = materialize(recipe, images);

      renderPipeline(miniPipeline, snapshots, {
        onNodeClick: (index) => {
          if (index === 0) return;
          const opIndex = snapshots[index].opIndex;
          if (opIndex < 0) return;
          recipe = removeOp(recipe, opIndex);
          render();
        },
      });

      applyArea.appendChild(card);
    }
  }

  render();
}
