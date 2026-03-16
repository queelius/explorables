---
title: "Watch an LLM Think"
date: 2026-03-16
draft: false
description: "An interactive explorable explanation of Monte Carlo Tree Search for LLM reasoning. Watch reasoning paths branch, dead-end, and backtrack."
tags:
  - mcts
  - llm-reasoning
  - explorable
  - interactive
categories:
  - Computer Science
series:
  - explorables
featured: true
toc: false
---

How Monte Carlo Tree Search turns single-pass reasoning into a branching exploration of ideas.

<!-- inject:style -->

<div id="mcts-explorable">

  <header id="hero">
    <p class="subtitle">An Explorable Explanation</p>
    <h1>Watch an LLM Think</h1>
    <p class="description">
      How Monte Carlo Tree Search turns single-pass reasoning into a
      branching exploration of ideas
    </p>
    <div class="scroll-indicator">&#x25BC;</div>
  </header>

  <div id="scrollytelling">

    <div id="narrative">

      <section data-section="1">
        <h2>One Shot, One Chance</h2>
        <p>Here is a classic logic puzzle:</p>
        <div class="puzzle-box">
          <p><strong>A</strong> says: "B is a knave."</p>
          <p><strong>B</strong> says: "We are the same type."</p>
          <p>Is A a knight or a knave?</p>
          <p class="puzzle-hint">(Knights always tell the truth. Knaves always lie.)</p>
        </div>
        <p>Let's ask an LLM to solve it:</p>
        <div class="llm-output" id="single-pass-output"></div>
        <p class="flaw-annotation">The LLM assumed A is a knave and never tested the alternative. It reached a confident answer without checking all the constraints.</p>
        <p class="transition-text">What if the LLM could explore both assumptions simultaneously, and backtrack from the one that leads to contradiction?</p>
      </section>

      <section data-section="2">
        <h2>The Tree Appears</h2>
        <p>Instead of committing to a single reasoning path, MCTS explores multiple paths simultaneously. It builds a <strong>tree</strong> where each branch represents a different line of reasoning.</p>
        <p>But how does it decide which branch to explore next? It uses a formula called <strong>UCB1</strong>:</p>
        <div class="formula-box">
          UCB1 = value + c &middot; &radic;(ln(parent_visits) / visits)
        </div>
        <p>The first term (<span class="accent">value</span>) measures how promising a path has been so far. The second term (<span class="accent2">exploration</span>) favors paths that haven't been tried much.</p>
        <p>The constant <strong>c</strong> controls the balance. Try adjusting it:</p>
        <div class="ucb1-slider">
          <label>exploration constant (c)</label>
          <input type="range" id="ucb1-c" min="0" max="4" step="0.1" value="1.414">
          <div class="slider-labels">
            <span>0 (greedy)</span>
            <span class="current-value" id="ucb1-value">&radic;2</span>
            <span>4 (explore)</span>
          </div>
        </div>
      </section>

      <section data-section="3">
        <h2>Branching Thoughts</h2>
        <p>Once UCB1 selects a node, the LLM generates a new reasoning step from that point. The tree grows.</p>
        <div class="branch-comparison">
          <div class="branch-example">
            <span class="branch-label">Branch A:</span>
            "Let's assume A is a knight..."
          </div>
          <div class="branch-example">
            <span class="branch-label">Branch B:</span>
            "Let's assume A is a knave..."
          </div>
        </div>
        <p>Each branch represents a different assumption the LLM is testing. This is structured exploration, not random guessing.</p>
        <p class="hint-text">Click any node in the tree to see its full reasoning.</p>
      </section>

      <section data-section="4">
        <h2>Following the Thread</h2>
        <p>From the expanded node, the LLM keeps reasoning until it reaches an answer or hits a maximum depth. This is called a <strong>rollout</strong>.</p>
        <div class="rollout-controls">
          <button id="rollout-play" class="control-btn">&#9654; Play</button>
          <div class="speed-buttons">
            <button data-speed="1" class="speed-btn active">1x</button>
            <button data-speed="2" class="speed-btn">2x</button>
            <button data-speed="4" class="speed-btn">4x</button>
          </div>
        </div>
        <p>Watch the nodes appear one by one as the LLM follows its reasoning to a conclusion.</p>
        <details class="aside">
          <summary>How is this different from regular MCTS?</summary>
          <div class="aside-content">
            <p>In classical MCTS, rollout nodes are simulated but <strong>discarded</strong>. Only the evaluation score is kept. Here, every reasoning step is <strong>preserved</strong> in the tree.</p>
            <div class="split-comparison" id="rollout-comparison"></div>
            <p class="hint-text">This means we keep a complete record of every reasoning trace the LLM explored.</p>
          </div>
        </details>
      </section>

      <section data-section="4.5">
        <h2>What's a Good Answer?</h2>
        <p>The rollout reaches an answer, but how do we score it? The evaluator checks whether the reasoning is logically consistent with the puzzle's constraints.</p>
        <p>A correct derivation with no contradictions scores <span class="score-high">1.0</span>. A derivation that hits a contradiction scores <span class="score-low">0.0</span>. Weak reasoning that reaches the right answer by luck scores somewhere in between.</p>
      </section>

      <section data-section="5">
        <h2>Scores Flow Upward</h2>
        <p>When a reasoning path reaches a conclusion and gets scored, the result propagates back up the tree. Each ancestor node updates its average value and visit count.</p>
        <div class="backprop-controls">
          <button id="backprop-step" class="control-btn">Step &#8593;</button>
          <button id="backprop-reset" class="control-btn" style="border-color: #ffffff30; color: var(--text-dim);">Reset</button>
        </div>
        <div id="backprop-math" class="math-display"></div>
        <p>Good answers make nearby paths more attractive for future exploration. The tree <em>learns</em> where to search next.</p>
      </section>

      <section data-section="6">
        <h2>Many Paths, One Answer</h2>
        <h3>Which paths should we look at?</h3>
        <p>After 20 simulations, the tree has explored many reasoning paths. But which ones matter? Different <strong>sampling strategies</strong> highlight different aspects:</p>
        <div class="sampling-controls">
          <div class="strategy-toggles">
            <button data-strategy="value" class="strategy-btn active">value</button>
            <button data-strategy="visits" class="strategy-btn">visits</button>
            <button data-strategy="diverse" class="strategy-btn">diverse</button>
            <button data-strategy="topk" class="strategy-btn">top-k</button>
          </div>
        </div>
        <p id="strategy-description" class="hint-text">Showing paths with the highest average values.</p>

        <h3>How do we pick the final answer?</h3>
        <p>With multiple paths reaching conclusions, we can use <strong>voting</strong> to decide:</p>
        <div id="answer-histogram"></div>
        <div class="voting-controls">
          <button data-vote="majority" class="strategy-btn active">majority vote</button>
          <button data-vote="weighted" class="strategy-btn">weighted vote</button>
        </div>
        <div id="confidence-display" class="math-display"></div>
        <p>When multiple independent reasoning paths agree, we can be more confident in the answer.</p>
      </section>

      <section data-section="7">
        <h2>Try It Yourself</h2>
        <p>This section requires a local <a href="https://ollama.ai" style="color: var(--accent)">Ollama</a> instance to run live MCTS searches.</p>
        <p class="hint-text">Connect Ollama at localhost:11434 to try this.</p>
      </section>

    </div>

    <div id="tree-panel">
      <svg id="tree-svg"></svg>
      <div id="node-detail">Click a node to inspect it.</div>
    </div>

  </div>

  <div id="ucb1-tooltip"></div>

</div>

<!-- inject:script -->
