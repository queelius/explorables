import type { Fact, Rule } from '../types';
import { TreeRenderer } from '../renderer';
import { FuzzyEngine } from '../engine';
import { layoutTree } from '../layout';

/**
 * Chain demo widget.
 *
 * Shows 3 rules forming a chain: mammal-rule, carnivore-rule, tiger-rule.
 * Initial facts: has-hair(rex, 0.9), eats-meat(rex, 0.8),
 *                has-claws(rex, 0.85), has-stripes(rex, 0.7).
 *
 * Controls: Reset, Step, Play buttons.
 * Step calls engine.runOneIteration().
 * Play auto-steps at 800ms intervals.
 * A fact-list sidebar shows the growing KB after each step.
 */

const CHAIN_RULES: Rule[] = [
  {
    name: 'mammal-rule',
    conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
    actions: [
      { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
    ],
    priority: 60,
  },
  {
    name: 'carnivore-rule',
    conditions: [
      { pred: 'eats-meat', args: ['?x'], degVar: '?d1' },
      { pred: 'has-claws', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-carnivore', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },
  {
    name: 'tiger-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-stripes', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'tiger'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
];

const INITIAL_FACTS: Fact[] = [
  { pred: 'has-hair', args: ['rex'], deg: 0.9 },
  { pred: 'eats-meat', args: ['rex'], deg: 0.8 },
  { pred: 'has-claws', args: ['rex'], deg: 0.85 },
  { pred: 'has-stripes', args: ['rex'], deg: 0.7 },
];

export function mountChainDemo(container: HTMLElement): void {
  // --- State ---
  let engine = new FuzzyEngine();
  let iterationCount = 0;
  let playTimer: ReturnType<typeof setInterval> | null = null;

  function resetEngine(): void {
    engine = new FuzzyEngine();
    for (const fact of INITIAL_FACTS) {
      engine.addFact(fact);
    }
    for (const rule of CHAIN_RULES) {
      engine.addRule(rule);
    }
    iterationCount = 0;
  }

  resetEngine();

  // --- Build DOM ---

  // Step controls
  const controlsWrap = document.createElement('div');
  controlsWrap.className = 'fuzzy-step-controls';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'fuzzy-btn';
  resetBtn.textContent = 'Reset';
  controlsWrap.appendChild(resetBtn);

  const stepBtn = document.createElement('button');
  stepBtn.className = 'fuzzy-btn';
  stepBtn.textContent = 'Step';
  controlsWrap.appendChild(stepBtn);

  const playBtn = document.createElement('button');
  playBtn.className = 'fuzzy-btn fuzzy-btn-primary';
  playBtn.textContent = 'Play';
  controlsWrap.appendChild(playBtn);

  const iterLabel = document.createElement('span');
  iterLabel.className = 'fuzzy-iter-label';
  iterLabel.textContent = 'Iteration: 0';
  controlsWrap.appendChild(iterLabel);

  container.appendChild(controlsWrap);

  // Main content: canvas + sidebar
  const contentWrap = document.createElement('div');
  contentWrap.style.display = 'flex';
  contentWrap.style.gap = '12px';

  const canvas = document.createElement('canvas');
  canvas.style.flex = '1';
  canvas.style.minWidth = '0';
  canvas.style.height = '320px';
  canvas.style.display = 'block';
  contentWrap.appendChild(canvas);

  const sidebar = document.createElement('div');
  sidebar.className = 'fuzzy-fact-sidebar';
  contentWrap.appendChild(sidebar);

  container.appendChild(contentWrap);

  // --- Renderer ---
  const renderer = new TreeRenderer(canvas);

  function collectFacts(): Fact[] {
    const facts: Fact[] = [];
    for (const f of engine.getFacts().values()) {
      facts.push(f);
    }
    return facts;
  }

  function updateSidebar(facts: Fact[]): void {
    // Clear sidebar safely
    while (sidebar.firstChild) sidebar.removeChild(sidebar.firstChild);

    const title = document.createElement('strong');
    title.textContent = 'Knowledge Base';
    sidebar.appendChild(title);

    for (const fact of facts) {
      const row = document.createElement('div');
      row.textContent = `${fact.pred}(${fact.args.join(', ')}) [${fact.deg.toFixed(2)}]`;
      sidebar.appendChild(row);
    }
  }

  function updateView(firedRules?: string[]): void {
    const facts = collectFacts();

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 400;
    const layout = layoutTree(facts, CHAIN_RULES, w);

    // Mark fired rules as active
    const firedSet = new Set(firedRules ?? []);
    for (const node of layout.nodes) {
      if (node.type === 'rule') {
        node.active = firedSet.has(node.label);
      }
    }

    // Mark edges as active when source node is active
    for (const edge of layout.edges) {
      const fromNode = layout.nodes.find((n) => n.id === edge.from);
      const toNode = layout.nodes.find((n) => n.id === edge.to);
      if (fromNode && toNode) {
        edge.active = fromNode.active || (fromNode.type !== 'rule' && toNode.active);
      }
    }

    renderer.resize();
    renderer.setLayout(layout);
    renderer.draw();

    updateSidebar(facts);
    iterLabel.textContent = `Iteration: ${iterationCount}`;
  }

  function doStep(): void {
    const { changed, firedRules } = engine.runOneIteration();
    iterationCount++;
    updateView(firedRules);
    if (!changed) {
      stopPlay();
    }
  }

  function stopPlay(): void {
    if (playTimer !== null) {
      clearInterval(playTimer);
      playTimer = null;
      playBtn.textContent = 'Play';
    }
  }

  // --- Event handlers ---
  resetBtn.addEventListener('click', () => {
    stopPlay();
    resetEngine();
    updateView();
  });

  stepBtn.addEventListener('click', () => {
    stopPlay();
    doStep();
  });

  playBtn.addEventListener('click', () => {
    if (playTimer !== null) {
      stopPlay();
    } else {
      playBtn.textContent = 'Pause';
      playTimer = setInterval(doStep, 800);
    }
  });

  // Initial render
  updateView();

  window.addEventListener('resize', () => updateView());
}
