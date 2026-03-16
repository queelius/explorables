import { TreeRenderer } from './tree-renderer';
import { ScrollStateManager } from './scroll-manager';
import { TRACE_DATA } from './trace-data';
import {
  initUCB1Slider,
  initRolloutControls,
  initBackpropControls,
  initSamplingControls,
  initRolloutComparison,
} from './controls';

export function init(): void {
  const svg = document.getElementById('tree-svg') as SVGSVGElement | null;
  if (!svg) return;

  const renderer = new TreeRenderer(svg);
  const scrollManager = new ScrollStateManager(renderer, TRACE_DATA);
  scrollManager.init();

  initUCB1Slider(renderer);
  initRolloutControls(renderer, TRACE_DATA);
  initBackpropControls(renderer, TRACE_DATA);
  initSamplingControls(renderer, TRACE_DATA);
  initRolloutComparison();

  // Populate single-pass LLM output from trace data
  const outputEl = document.getElementById('single-pass-output');
  if (outputEl && TRACE_DATA.puzzle.single_pass_wrong) {
    outputEl.textContent = TRACE_DATA.puzzle.single_pass_wrong;
  }
}
