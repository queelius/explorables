import type { TreeRenderer } from './tree-renderer';
import type { TraceData, TraceNode } from './trace-data';

/* =========================================================
   UCB1 SLIDER
   ========================================================= */

function computeUCB1Selection(
  tree: TraceNode,
  c: number,
): { path: string[]; scores: Record<string, { chosen: string; siblings: { id: string; score: string }[] }> } {
  const path = [tree.id];
  const scores: Record<string, { chosen: string; siblings: { id: string; score: string }[] }> = {};
  let node = tree;
  while (node.children && node.children.length > 0) {
    let bestChild: TraceNode | null = null;
    let bestScore = -Infinity;
    const siblingScores: { id: string; score: string }[] = [];
    for (const child of node.children) {
      let score: number;
      if (child.visits === 0) {
        score = Infinity;
      } else {
        const exploit = child.value;
        const explore = c * Math.sqrt(Math.log(node.visits) / child.visits);
        score = exploit + explore;
      }
      siblingScores.push({
        id: child.id,
        score: score === Infinity ? '\u221E' : score.toFixed(2),
      });
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }
    if (!bestChild) break;
    scores[bestChild.id] = {
      chosen: bestScore === Infinity ? '\u221E' : bestScore.toFixed(2),
      siblings: siblingScores,
    };
    path.push(bestChild.id);
    node = bestChild;
  }
  return { path, scores };
}

export function initUCB1Slider(renderer: TreeRenderer): void {
  const slider = document.getElementById('ucb1-c') as HTMLInputElement | null;
  const valueDisplay = document.getElementById('ucb1-value');
  if (!slider) return;

  slider.addEventListener('input', () => {
    const c = parseFloat(slider.value);
    if (valueDisplay) valueDisplay.textContent = c.toFixed(1);

    if (!renderer.currentTree) return;
    const { path } = computeUCB1Selection(renderer.currentTree, c);
    renderer.highlightPath(path, '#e94560');
  });
}

/* =========================================================
   ROLLOUT ANIMATOR
   ========================================================= */

class RolloutAnimator {
  renderer: TreeRenderer;
  path: string[];
  baseDelay: number;
  speed: number;
  currentStep: number;
  playing: boolean;
  timer: ReturnType<typeof setTimeout> | null;

  constructor(renderer: TreeRenderer, rolloutPath: string[]) {
    this.renderer = renderer;
    this.path = rolloutPath;
    this.baseDelay = 1500;
    this.speed = 1;
    this.currentStep = 0;
    this.playing = false;
    this.timer = null;
  }

  play(): void {
    if (this.currentStep >= this.path.length) {
      this.currentStep = 0;
    }
    this.playing = true;
    const playBtn = document.getElementById('rollout-play');
    if (playBtn) playBtn.textContent = '\u23F8 Pause';
    this._tick();
  }

  pause(): void {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    const playBtn = document.getElementById('rollout-play');
    if (playBtn) playBtn.textContent = '\u25B6 Play';
  }

  private _tick(): void {
    if (!this.playing || this.currentStep >= this.path.length) {
      this.pause();
      return;
    }
    const nodeId = this.path[this.currentStep];
    this.renderer.pulseNode(nodeId);
    this.renderer.highlightPath(
      this.path.slice(0, this.currentStep + 1),
      '#e94560',
    );
    this.currentStep++;
    this.timer = setTimeout(
      () => this._tick(),
      this.baseDelay / this.speed,
    );
  }

  setSpeed(s: number): void {
    this.speed = s;
    document.querySelectorAll('.speed-btn').forEach((b) => {
      const el = b as HTMLElement;
      el.classList.toggle(
        'active',
        parseInt(el.dataset.speed || '1', 10) === s,
      );
    });
  }
}

export function initRolloutControls(
  renderer: TreeRenderer,
  traceData: TraceData,
): void {
  const playBtn = document.getElementById('rollout-play');
  if (!playBtn) return;

  const rolloutPhase = traceData.simulations.find(
    (s) => s.step === 7 && s.phase === 'rollout',
  );
  const rolloutPath = rolloutPhase?.rollout_path ?? [];

  let animator: RolloutAnimator | null = null;

  playBtn.addEventListener('click', () => {
    if (!animator) {
      animator = new RolloutAnimator(renderer, rolloutPath);
    }
    if (animator.playing) {
      animator.pause();
    } else {
      animator.play();
    }
  });

  document.querySelectorAll('.speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (animator) {
        animator.setSpeed(parseInt((btn as HTMLElement).dataset.speed || '1', 10));
      }
    });
  });
}

/* =========================================================
   BACKPROP STEPPER
   ========================================================= */

class BackpropStepper {
  renderer: TreeRenderer;
  path: string[];
  score: number;
  tree: TraceNode;
  currentStep: number;
  mathDisplay: HTMLElement | null;

  constructor(
    renderer: TreeRenderer,
    backpropPath: string[],
    score: number,
    treeData: TraceNode,
  ) {
    this.renderer = renderer;
    this.path = backpropPath;
    this.score = score;
    this.tree = treeData;
    this.currentStep = -1;
    this.mathDisplay = document.getElementById('backprop-math');
  }

  step(): void {
    this.currentStep++;
    if (this.currentStep >= this.path.length) {
      if (this.mathDisplay) {
        this._setMathComplete();
      }
      return;
    }

    const nodeId = this.path[this.currentStep];
    const node = this._findNode(this.tree, nodeId);

    this.renderer.highlightPath(
      this.path.slice(0, this.currentStep + 1),
      '#4a9eff',
    );
    this.renderer.pulseNode(nodeId);

    if (this.currentStep > 0) {
      const prevId = this.path[this.currentStep - 1];
      this.renderer.pulseEdge(prevId, nodeId);
    }

    if (node && this.mathDisplay) {
      this._setMathStep(nodeId, node);
    }
  }

  /** Render the "complete" state into mathDisplay using safe DOM methods. */
  private _setMathComplete(): void {
    if (!this.mathDisplay) return;
    this.mathDisplay.textContent = '';
    const span = document.createElement('span');
    span.style.color = 'var(--accent)';
    span.textContent = 'Backpropagation complete.';
    this.mathDisplay.appendChild(span);
  }

  /** Render a backprop step into mathDisplay using safe DOM methods. */
  private _setMathStep(nodeId: string, node: TraceNode): void {
    if (!this.mathDisplay) return;
    this.mathDisplay.textContent = '';

    const strong = document.createElement('strong');
    strong.textContent = `Node ${nodeId}`;
    this.mathDisplay.appendChild(strong);
    this.mathDisplay.appendChild(document.createElement('br'));

    const statsText = document.createTextNode(
      `visits: ${node.visits} | value: ${node.value.toFixed(2)}`,
    );
    this.mathDisplay.appendChild(statsText);
    this.mathDisplay.appendChild(document.createElement('br'));

    const scoreSpan = document.createElement('span');
    scoreSpan.style.color = 'var(--text-dim)';
    scoreSpan.textContent = `Score ${this.score.toFixed(1)} propagated upward`;
    this.mathDisplay.appendChild(scoreSpan);
  }

  reset(): void {
    this.currentStep = -1;
    this.renderer.clearHighlights();
    if (this.mathDisplay) this.mathDisplay.textContent = '';
  }

  private _findNode(tree: TraceNode, id: string): TraceNode | null {
    if (tree.id === id) return tree;
    for (const child of tree.children || []) {
      const found = this._findNode(child, id);
      if (found) return found;
    }
    return null;
  }
}

export function initBackpropControls(
  renderer: TreeRenderer,
  traceData: TraceData,
): void {
  const stepBtn = document.getElementById('backprop-step');
  const resetBtn = document.getElementById('backprop-reset');
  if (!stepBtn) return;

  const backpropPhase = traceData.simulations.find(
    (s) => s.step === 7 && s.phase === 'backprop',
  );
  if (!backpropPhase) return;

  let stepper: BackpropStepper | null = null;

  stepBtn.addEventListener('click', () => {
    if (!stepper) {
      stepper = new BackpropStepper(
        renderer,
        backpropPhase.backprop_path!,
        backpropPhase.score!,
        backpropPhase.tree,
      );
    }
    stepper.step();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (stepper) stepper.reset();
    });
  }
}

/* =========================================================
   SAMPLING CONTROLS
   ========================================================= */

function findTerminals(node: TraceNode): TraceNode[] {
  const result: TraceNode[] = [];
  if (node.is_terminal) result.push(node);
  for (const child of node.children || []) {
    result.push(...findTerminals(child));
  }
  return result;
}

function getPathToNode(tree: TraceNode, targetId: string): string[] {
  function search(node: TraceNode, path: string[]): string[] | null {
    path.push(node.id);
    if (node.id === targetId) return [...path];
    for (const child of node.children || []) {
      const found = search(child, path);
      if (found) return found;
    }
    path.pop();
    return null;
  }
  return search(tree, []) || [];
}

function samplePaths(
  tree: TraceNode,
  strategy: string,
  k = 5,
): TraceNode[] {
  const terminals = findTerminals(tree);
  if (terminals.length === 0) return [];
  switch (strategy) {
    case 'value':
      return terminals.sort((a, b) => b.value - a.value).slice(0, k);
    case 'visits':
      return terminals.sort((a, b) => b.visits - a.visits).slice(0, k);
    case 'diverse': {
      const groups: Record<string, TraceNode[]> = {};
      terminals.forEach((t) => {
        const ans = t.answer || 'unknown';
        if (!groups[ans]) groups[ans] = [];
        groups[ans].push(t);
      });
      const result: TraceNode[] = [];
      for (const ans of Object.keys(groups)) {
        groups[ans].sort((a, b) => b.value - a.value);
        if (groups[ans].length > 0) result.push(groups[ans][0]);
      }
      const used = new Set(result.map((t) => t.id));
      const remaining = terminals
        .sort((a, b) => b.value - a.value)
        .filter((t) => !used.has(t.id));
      return result.concat(remaining).slice(0, k);
    }
    case 'topk':
      return terminals.sort((a, b) => b.value - a.value).slice(0, k);
    default:
      return terminals.slice(0, k);
  }
}

const strategyDescriptions: Record<string, string> = {
  value: 'Showing paths with the highest average values.',
  visits: 'Showing the most-explored paths (highest visit counts).',
  diverse: 'Showing one path per unique answer, prioritizing variety.',
  topk: 'Showing the top-k terminal nodes by score.',
};

/** Render the answer histogram using safe DOM methods. */
function renderHistogram(
  tree: TraceNode,
  container: HTMLElement,
): { counts: Record<string, number>; weightedScores: Record<string, number> } {
  const terminals = findTerminals(tree);
  const counts: Record<string, number> = {};
  const weightedScores: Record<string, number> = {};
  terminals.forEach((t) => {
    const ans = t.answer || 'unknown';
    counts[ans] = (counts[ans] || 0) + 1;
    weightedScores[ans] = (weightedScores[ans] || 0) + t.value;
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  const maxCount = Math.max(...Object.values(counts), 1);
  const answers = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const colors: Record<string, string> = {
    'A is a knight': '#4ade80',
    'A is a knave': '#f87171',
  };

  // Clear and build SVG using DOM methods
  container.textContent = '';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '80');
  svg.setAttribute('viewBox', '0 0 300 80');

  const barWidth = Math.min(120, 280 / answers.length);
  answers.forEach((ans, i) => {
    const x = 10 + i * (barWidth + 10);
    const barHeight = (counts[ans] / maxCount) * 50;
    const color = colors[ans] || '#888';

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(60 - barHeight));
    rect.setAttribute('width', String(barWidth - 5));
    rect.setAttribute('height', String(barHeight));
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', '0.7');
    rect.setAttribute('rx', '2');
    svg.appendChild(rect);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(x + (barWidth - 5) / 2));
    label.setAttribute('y', '74');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', color);
    label.setAttribute('font-size', '9');
    label.setAttribute('font-family', 'monospace');
    label.textContent = ans.replace('A is a ', '');
    svg.appendChild(label);

    const countLabel = document.createElementNS(svgNS, 'text');
    countLabel.setAttribute('x', String(x + (barWidth - 5) / 2));
    countLabel.setAttribute('y', String(56 - barHeight));
    countLabel.setAttribute('text-anchor', 'middle');
    countLabel.setAttribute('fill', color);
    countLabel.setAttribute('font-size', '10');
    countLabel.setAttribute('font-family', 'monospace');
    countLabel.textContent = String(counts[ans]);
    svg.appendChild(countLabel);
  });

  container.appendChild(svg);

  return { counts, weightedScores };
}

/** Update the voting display using safe DOM methods. */
function updateVotingDisplay(
  counts: Record<string, number>,
  weightedScores: Record<string, number>,
  method: string,
): void {
  const display = document.getElementById('confidence-display');
  if (!display) return;

  let winner: string;
  let confidence: string;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (method === 'majority') {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    winner = sorted[0]?.[0] ?? 'unknown';
    confidence = sorted[0]
      ? ((sorted[0][1] / total) * 100).toFixed(0)
      : '0';
  } else {
    const sorted = Object.entries(weightedScores).sort((a, b) => b[1] - a[1]);
    const totalWeight = Object.values(weightedScores).reduce(
      (a, b) => a + b,
      0,
    );
    winner = sorted[0]?.[0] ?? 'unknown';
    confidence = sorted[0]
      ? ((sorted[0][1] / totalWeight) * 100).toFixed(0)
      : '0';
  }

  display.textContent = '';
  const strong = document.createElement('strong');
  strong.textContent = 'Answer: ';
  const winnerSpan = document.createElement('span');
  winnerSpan.style.color = 'var(--accent)';
  winnerSpan.textContent = winner;
  strong.appendChild(winnerSpan);
  display.appendChild(strong);
  display.appendChild(
    document.createTextNode(` (${confidence}% confidence, ${method} vote)`),
  );
}

export function initSamplingControls(
  renderer: TreeRenderer,
  traceData: TraceData,
): void {
  const strategyBtns = document.querySelectorAll(
    '.strategy-btn[data-strategy]',
  );
  const voteBtns = document.querySelectorAll('.strategy-btn[data-vote]');
  const histContainer = document.getElementById('answer-histogram');
  const descEl = document.getElementById('strategy-description');

  if (strategyBtns.length === 0) return;

  let currentStrategy = 'value';
  let currentVote = 'majority';
  let votingData: {
    counts: Record<string, number>;
    weightedScores: Record<string, number>;
  } | null = null;

  function update() {
    const tree = renderer.currentTree;
    if (!tree) return;

    const sampled = samplePaths(tree, currentStrategy, 5);
    renderer.clearHighlights();
    if (sampled.length > 0) {
      const allPathNodes = new Set<string>();
      sampled.forEach((t) =>
        getPathToNode(tree, t.id).forEach((id) => allPathNodes.add(id)),
      );
      renderer.highlightPath([...allPathNodes], '#e94560');
    }

    if (descEl)
      descEl.textContent = strategyDescriptions[currentStrategy] || '';

    if (histContainer) {
      votingData = renderHistogram(tree, histContainer);
    }

    if (votingData) {
      updateVotingDisplay(
        votingData.counts,
        votingData.weightedScores,
        currentVote,
      );
    }
  }

  strategyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      strategyBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStrategy = (btn as HTMLElement).dataset.strategy || 'value';
      update();
    });
  });

  voteBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      voteBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentVote = (btn as HTMLElement).dataset.vote || 'majority';
      if (votingData) {
        updateVotingDisplay(
          votingData.counts,
          votingData.weightedScores,
          currentVote,
        );
      }
    });
  });
}

/* =========================================================
   ROLLOUT COMPARISON ASIDE
   ========================================================= */

/** Build the mini comparison trees using safe DOM methods. */
function buildMiniTree(svg: Element, fadeRollout: boolean): void {
  const svgNS = 'http://www.w3.org/2000/svg';
  const nodes = [
    { x: 100, y: 15, r: 10, permanent: true },
    { x: 60, y: 55, r: 8, permanent: true },
    { x: 140, y: 55, r: 8, permanent: true },
  ];
  const rolloutNodes = [{ x: 140, y: 95, r: 7, permanent: false }];

  // Clear
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const drawEdge = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cls?: string,
  ): void => {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1 + 10));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2 - 7));
    line.setAttribute('stroke', '#ffffff30');
    line.setAttribute('stroke-width', '1.5');
    if (cls) line.setAttribute('class', cls);
    svg.appendChild(line);
  };

  drawEdge(100, 15, 60, 55);
  drawEdge(100, 15, 140, 55);
  drawEdge(140, 55, 140, 95, 'rollout-edge');

  [...nodes, ...rolloutNodes].forEach((n) => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(n.x));
    circle.setAttribute('cy', String(n.y));
    circle.setAttribute('r', String(n.r));
    circle.setAttribute(
      'fill',
      n.permanent ? 'transparent' : 'rgba(233,69,96,0.15)',
    );
    circle.setAttribute('stroke', n.permanent ? '#ffffff40' : '#e94560');
    circle.setAttribute('stroke-width', '1.5');
    if (!n.permanent) circle.setAttribute('class', 'rollout-node');
    svg.appendChild(circle);
  });

  if (fadeRollout) {
    setTimeout(() => {
      svg.querySelectorAll('.rollout-node').forEach((el) => {
        (el as SVGElement).style.transition = 'opacity 1s ease';
        (el as SVGElement).style.opacity = '0.2';
        el.setAttribute('stroke-dasharray', '3,3');
      });
      svg.querySelectorAll('.rollout-edge').forEach((el) => {
        (el as SVGElement).style.transition = 'opacity 1s ease';
        (el as SVGElement).style.opacity = '0.2';
        el.setAttribute('stroke-dasharray', '3,3');
      });
    }, 800);
  }
}

export function initRolloutComparison(): void {
  const details = document.querySelector('.aside') as HTMLDetailsElement | null;
  if (!details) return;

  details.addEventListener('toggle', () => {
    if (!details.open) return;
    const container = document.getElementById('rollout-comparison');
    if (!container || container.dataset.rendered) return;
    container.dataset.rendered = 'true';

    // Build comparison panels using safe DOM methods
    const svgNS = 'http://www.w3.org/2000/svg';

    const makePanel = (
      title: string,
      svgId: string,
      caption: string,
    ): HTMLDivElement => {
      const panel = document.createElement('div');
      panel.className = 'comparison-panel';

      const h4 = document.createElement('h4');
      h4.textContent = title;
      panel.appendChild(h4);

      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('id', svgId);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '120');
      svg.setAttribute('viewBox', '0 0 200 120');
      panel.appendChild(svg);

      const p = document.createElement('p');
      p.style.fontSize = '0.75rem';
      p.style.color = 'var(--text-dim)';
      p.style.marginTop = '8px';
      p.textContent = caption;
      panel.appendChild(p);

      return panel;
    };

    container.appendChild(
      makePanel('Classical MCTS', 'classical-tree', 'Rollout nodes fade away'),
    );
    container.appendChild(
      makePanel(
        'Tree-Building (this implementation)',
        'treebuild-tree',
        'Rollout nodes stay in the tree',
      ),
    );

    const classicalSvg = document.getElementById('classical-tree');
    const treebuildSvg = document.getElementById('treebuild-tree');
    if (classicalSvg) buildMiniTree(classicalSvg, true);
    if (treebuildSvg) buildMiniTree(treebuildSvg, false);
  });
}
