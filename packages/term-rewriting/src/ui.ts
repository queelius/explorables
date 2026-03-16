import type { Tree, Rule, DemoState, Example } from './types';
import { deepCopy, treeEqual, treeToString } from './tree';
import { rewriteAll } from './engine';
import { layoutTree } from './layout';
import { renderTree, setNodeState, clearStates } from './renderer';
import { ARITH, ALL_DIFF } from './rules';

// ─── Example data ──────────────────────────────────────

const BU_EXAMPLES: Record<string, Example> = {
  'add-zero':   { tree: ['+', 0, ['+', 0, 'x']], rules: [ARITH[0]] },
  'const-fold': { tree: ['+', ['*', 2, 3], ['*', 4, 5]] },
  'nested':     { tree: ['*', ['+', 'x', 0], ['-', 5, 5]] },
};

const ARITH_EXAMPLES: Record<string, Example> = {
  'ex1': { tree: ['+', ['*', 2, 3], ['*', 4, 5]] },
  'ex2': { tree: ['*', ['+', 'x', 0], ['-', 5, 5]] },
  'ex3': { tree: ['+', ['+', 0, 'x'], ['-', 'y', 'y']] },
  'ex4': { tree: ['/', ['*', 3, ['+', 2, 4]], ['-', 9, 3]] },
};

const DIFF_EXAMPLES: Record<string, Example> = {
  'power':     { tree: ['d', ['^', 'x', 3], 'x'] },
  'product':   { tree: ['d', ['*', ['^', 'x', 2], ['sin', 'x']], 'x'] },
  'chain':     { tree: ['d', ['sin', ['^', 'x', 2]], 'x'] },
  'exp-chain': { tree: ['d', ['exp', ['^', 'x', 2]], 'x'] },
  'quotient':  { tree: ['d', ['/', ['sin', 'x'], 'x'], 'x'] },
};

// ─── Demo controller ──────────────────────────────────

function $(id: string): HTMLElement | null { return document.getElementById(id); }

function initDemo(
  prefix: string,
  examples: Record<string, Example>,
  defaultRules: Rule[],
): void {
  const svg      = $(prefix + '-svg') as unknown as SVGElement | null;
  const info     = $(prefix + '-info');
  const sel      = $(prefix + '-example') as HTMLSelectElement | null;
  const btnReset = $(prefix + '-reset');
  const btnStep  = $(prefix + '-step');
  const btnPlay  = $(prefix + '-play');
  const iterEl   = $(prefix + '-iter');

  if (!svg || !sel || !info || !btnReset || !btnStep || !btnPlay) return;

  let state: DemoState | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function reset(): void {
    if (timer) { clearInterval(timer); timer = null; }
    const ex = examples[sel!.value];
    const rules = ex.rules ?? defaultRules;
    const tree = deepCopy(ex.tree);
    const iters = rewriteAll(tree, rules);
    const w = (svg!.parentElement?.clientWidth ?? 600);
    const h = parseInt(svg!.getAttribute('height') ?? '300');
    const layout = layoutTree(tree, w, h);

    state = { iterations: iters, iterIdx: 0, evtIdx: 0, tree: deepCopy(tree), layout };
    renderTree(svg!, layout);
    info!.textContent = 'Press Step or Play.';
    if (iterEl) iterEl.textContent = '';
    btnStep!.removeAttribute('disabled');
    btnPlay!.removeAttribute('disabled');
    btnPlay!.textContent = 'Play';
  }

  function step(): void {
    if (!state) return;
    const iter = state.iterations[state.iterIdx];
    if (!iter) { finish(); return; }

    const evts = iter.events;

    if (state.evtIdx < evts.length) {
      const ev = evts[state.evtIdx];
      clearStates(svg!);

      if (ev.nodeIdx < state.layout.nodes.length) {
        setNodeState(svg!, ev.nodeIdx, ev.type === 'match' ? 'matched' : 'visiting');
      }

      info!.textContent = ev.type === 'visit'
        ? `Visiting ${ev.label}`
        : `\u2192 ${ev.rule}`;

      state.evtIdx++;
    } else {
      // Advance to next iteration
      if (!treeEqual(iter.before, iter.after)) {
        state.tree = deepCopy(iter.after);
        state.iterIdx++;
        state.evtIdx = 0;

        const w = (svg!.parentElement?.clientWidth ?? 600);
        const h = parseInt(svg!.getAttribute('height') ?? '300');
        state.layout = layoutTree(state.tree, w, h);
        renderTree(svg!, state.layout);

        for (const n of state.layout.nodes) setNodeState(svg!, n.id, 'rewritten');
        info!.textContent = treeToString(state.tree);
        if (iterEl) iterEl.textContent = `Iteration ${state.iterIdx}`;
      } else {
        finish();
      }
    }
  }

  function finish(): void {
    if (!state) return;
    for (const n of state.layout.nodes) setNodeState(svg!, n.id, 'done');
    info!.textContent = 'Done: ' + treeToString(state.tree);
    if (iterEl) iterEl.textContent = `${state.iterIdx} iteration(s)`;
    btnStep!.setAttribute('disabled', '');
    btnPlay!.setAttribute('disabled', '');
    if (timer) { clearInterval(timer); timer = null; }
  }

  sel.addEventListener('change', reset);
  btnReset.addEventListener('click', reset);
  btnStep.addEventListener('click', step);
  btnPlay.addEventListener('click', () => {
    if (timer) {
      clearInterval(timer); timer = null;
      btnPlay!.textContent = 'Play';
    } else {
      timer = setInterval(step, 450);
      btnPlay!.textContent = 'Pause';
    }
  });

  reset();
}

// ─── Boot ──────────────────────────────────────────────

export function init(): void {
  initDemo('bu', BU_EXAMPLES, ARITH);
  initDemo('ar', ARITH_EXAMPLES, ARITH);
  initDemo('df', DIFF_EXAMPLES, ALL_DIFF);
}
