---
title: "Fuzzy Soft Circuits: Learning Fuzzy Rules from Data"
date: 2024-10-01
draft: false
tags: ['machine-learning', 'fuzzy-logic', 'differentiable-programming', 'interactive']
categories: ['research']
description: "What if fuzzy logic systems could discover their own rules? An interactive demo of differentiable fuzzy circuits that learn membership functions, rule structure, and rule existence, all via gradient descent."
linked_project: [fuzzy-soft-circuit]
---

Traditional fuzzy logic systems are powerful. They encode expert knowledge as interpretable rules like "IF temperature IS HIGH AND humidity IS LOW THEN fan speed IS FAST." The problem is someone has to *write those rules*.

What if the rules could discover themselves?

## The Expert Knowledge Bottleneck

Every classical fuzzy system needs three things from a human expert:

1. **Membership functions**:Where does "HIGH" start? Where does "LOW" end?
2. **Rule structure**:Which combinations of inputs matter?
3. **Rule existence**:How many rules are there? Which ones are relevant?

This is expensive. Experts are hard to find, struggle to articulate their reasoning precisely, and can't easily update systems as conditions change. In emerging domains, relevant expertise might not even exist.

Previous approaches have chipped away at parts of this problem. ANFIS [^jang1993] learns membership function parameters but needs a predefined rule structure. Genetic fuzzy systems [^cordon2001] can evolve rule bases but lose gradient information. The Wang-Mendel method [^wang1992] generates rules from data but still needs hand-designed membership functions.

None of them make the *entire* system learnable end-to-end.

## The Key Insight: Make "IF" Differentiable

The core idea is simple: treat a fuzzy rule's **existence** as a continuous parameter.

In a traditional system, a rule either exists or it doesn't:it's a binary choice. We replace this with a *soft switch*: a sigmoid gate \(\gamma_r = \sigma(s_r)\) that smoothly interpolates between "this rule exists" (\(\gamma_r \to 1\)) and "this rule doesn't exist" (\(\gamma_r \to 0\)).

This transforms rule discovery from a discrete search problem into a differentiable optimization problem. Gradient descent can now tell the system not just how to tune a rule, but whether the rule should exist at all.

## Architecture

A fuzzy soft circuit has three differentiable stages:

### 1. Fuzzification

Each input \(x_i\) is mapped through \(k\) learnable Gaussian membership functions:

\[
\mu_{i,j}(x_i) = \exp\!\left(-\frac{(x_i - c_{i,j})^2}{w_{i,j}^2}\right)
\]

The centers \(c_{i,j}\) and widths \(w_{i,j}\) are learnable. We parameterize widths as \(w = e^{\hat{w}}\) to ensure positivity. No one decides where "HIGH" starts:the system figures it out.

### 2. Soft Rule Evaluation

For each potential rule \(r\), two things are learned:

**Antecedent relevance**:a weight vector determines which fuzzy features matter for this rule. We use a gated product that smoothly interpolates between "this feature participates" and "this feature is ignored":

\[
a_r = \prod_{i} \bigl(\mu_i^{\rho_{r,i}} + (1 - \rho_{r,i})\bigr)
\]

where \(\rho_{r,i} = \sigma(w_{r,i})\). When \(\rho \to 1\), the term becomes \(\mu_i\) (feature matters). When \(\rho \to 0\), the term becomes 1 (neutral element of multiplication:feature ignored).

**Rule switch**:the soft gate:

\[
R_r = a_r \cdot \sigma(s_r)
\]

During training, unnecessary rules naturally have their switches driven toward zero.

### 3. Defuzzification

Outputs are a normalized weighted combination of rule consequents:

\[
y_j = \frac{\sum_r R_r \cdot \sigma(v_{j,r}) \cdot \sigma(q_{r,j})}{\sum_r R_r \cdot \sigma(v_{j,r}) + \epsilon}
\]

The entire pipeline is differentiable. We minimize MSE over training data:

\[
\mathcal{L} = \frac{1}{N}\sum_{i=1}^{N} \|\mathbf{y}^{(i)} - \hat{\mathbf{y}}^{(i)}\|^2
\]

## Semantic-Free Representation

A philosophical point that matters in practice: during training, nothing has a name. Variables are \(x_0, x_1, \ldots\), membership functions are \(\mu_{i,0}, \mu_{i,1}, \ldots\), rules are \(R_0, R_1, \ldots\).

The system discovers pure numerical patterns. Semantic interpretation:labeling a membership function as "HIGH" because its center is at 0.85:is a *post-hoc* human activity, not a training requirement.

This is important because it means the system isn't constrained by human preconceptions about what the categories should be. It can discover non-obvious partitions of the input space.

## Interactive Demo

Select a target function, configure the circuit, and watch it discover rules from data in real time.

<!-- inject:style -->

<div id="fsc-demo">
<div class="fsc-layout">
<div class="fsc-controls">
  <div class="fsc-ctrl">
    <label for="fsc-dataset">Dataset</label>
    <select id="fsc-dataset"></select>
  </div>
  <div class="fsc-ctrl">
    <label>Memberships / input <span id="fsc-mf-value" class="fsc-val">3</span></label>
    <input id="fsc-mf-slider" type="range" min="2" max="5" value="3" step="1" />
  </div>
  <div class="fsc-ctrl">
    <label>Potential rules <span id="fsc-rules-value" class="fsc-val">6</span></label>
    <input id="fsc-rules-slider" type="range" min="2" max="15" value="6" step="1" />
  </div>
  <div class="fsc-ctrl">
    <label>Learning rate <span id="fsc-lr-value" class="fsc-val">0.30</span></label>
    <input id="fsc-lr-slider" type="range" min="0.01" max="1.0" value="0.30" step="0.01" />
  </div>
  <div class="fsc-ctrl">
    <label>Steps / frame <span id="fsc-speed-value" class="fsc-val">3</span></label>
    <input id="fsc-speed-slider" type="range" min="1" max="20" value="3" step="1" />
  </div>
  <div class="fsc-btns">
    <button id="fsc-train">Train</button>
    <button id="fsc-reset">Reset</button>
  </div>
  <div class="fsc-stats">
    <div>Epoch: <span id="fsc-epoch">0</span></div>
    <div>Loss: <span id="fsc-loss-val">&mdash;</span></div>
    <div>Inputs: <span id="fsc-inputs">2</span></div>
    <div>Params: <span id="fsc-params">0</span></div>
  </div>
</div>
<div class="fsc-viz">
  <div class="fsc-panel fsc-surface"><canvas id="fsc-surface"></canvas></div>
  <div class="fsc-row">
    <div class="fsc-panel"><canvas id="fsc-mf0"></canvas></div>
    <div class="fsc-panel"><canvas id="fsc-mf1"></canvas></div>
  </div>
  <div class="fsc-row">
    <div class="fsc-panel"><canvas id="fsc-rules"></canvas></div>
    <div class="fsc-panel"><canvas id="fsc-loss"></canvas></div>
  </div>
  <div class="fsc-rules-panel">
    <h4>Discovered Rules</h4>
    <div id="fsc-extracted"><span class="fsc-muted">Configure and press Train</span></div>
  </div>
</div>
</div>
</div>

<!-- inject:script -->

### Reading the panels

The demo has six panels. Here's what each one shows.

**Learned Surface** (top right). This is the function the circuit has learned so far. The two axes are `input_0` (horizontal) and `input_1` (vertical), both ranging from 0 to 1. Color encodes the output value: dark purple is near 0, bright yellow is near 1. The small circles are training data points, colored by their *target* value. Before training the surface is a flat wash (the circuit outputs roughly 0.5 everywhere). As training progresses, the colors should shift to match the dots.

**Membership functions** (middle row, two panels). Each panel shows the Gaussian curves for one input variable (always inputs 0 and 1). These are the "categories" the system is learning. At initialization, the curves are evenly spaced across [0, 1]. During training they slide, stretch, and compress as the system discovers which partitions of the input space are useful. The key thing to notice: nobody told the system where to put these curves. It figured out the boundaries on its own.

**Rule Switches** (bottom left). Each horizontal bar represents one potential rule. The fill shows the switch value, from 0 (rule is off) to 1 (rule is fully active). Before training, switches start at random values near 0.5. During training, *useful* rules get pushed toward 1.0, and *unnecessary* rules get pushed toward 0.0. This is the automatic pruning in action: the system is deciding which rules should exist.

**Training Loss** (bottom right). The loss curve on a log scale. This shows how well the circuit's output matches the training data over time. A steep initial drop followed by a plateau is normal. If the loss stalls at a high value, try increasing the learning rate or adding more rules.

**Discovered Rules** (below the panels). A text readout of the active rules (those with switch > 0.3). Each rule shows which input membership functions it uses and what output it produces. Early in training these will be messy (many antecedents per rule). As training converges, rules simplify: irrelevant antecedents get pruned and consequents sharpen toward 0 or 1.

### What to try

Start with the **XOR** dataset. It needs at least 4 rules to capture (output is high when exactly one input is high). Press Train and watch:

1. The surface starts as a uniform wash
2. Within ~100 epochs, color contrast appears in the corners
3. Rule switches diverge: some go to ~1.0, others drop toward 0
4. By ~500 epochs, the surface matches the XOR pattern and 2 rules have been pruned

Then try **Step** (a sharp diagonal boundary, tests whether the system can learn a discontinuity) or **Peaks** (two localized bumps, tests whether the membership functions move to the right places).

For higher-dimensional problems, try **Sparse (5D)**. The target function only depends on inputs 0 and 3, but the circuit doesn't know that. It has to discover which of the 5 inputs matter and which to ignore. Watch the discovered rules: the surviving ones should only reference inputs 0 and 3. The surface plot shows a 2D slice (inputs 0 vs 1, others fixed at 0.5), so it won't look like the full picture, but the loss will still drop.

**Random (5D)** is the hardest. All 5 inputs contribute to a complex nonlinear function. The parameter count jumps significantly (the stats readout updates when you switch datasets), and training is slower per step because each gradient computation requires more forward passes. Crank the steps/frame slider up and give it time.

## What the System Discovers

On the XOR dataset (\(f(x_0, x_1) = x_0(1-x_1) + (1-x_0)x_1\)), the system typically converges to 4 active rules with 2 pruned:

| Rule | Switch | Pattern | Output |
|------|--------|---------|--------|
| R₀ | 0.97 | \(x_0\) low, \(x_1\) high | ≈ 1.00 |
| R₃ | 1.00 | \(x_0\) low, \(x_1\) low | ≈ 0.00 |
| R₄ | 0.91 | Both high | ≈ 0.00 |
| R₅ | 0.85 | \(x_0\) high, \(x_1\) low | ≈ 1.00 |

That's the XOR truth table, discovered from 25 data points with zero prior knowledge.

Rules R₁ and R₂ have their switches driven to near zero:the system decided they weren't needed and effectively deleted them. This is automatic model selection happening inside gradient descent.

## Implementation Notes

The implementation is pure TypeScript with zero runtime dependencies. A few design choices worth noting:

**Adam optimizer** instead of vanilla SGD. The gated product in the antecedent evaluation creates vastly different gradient magnitudes across parameter groups:membership centers get strong gradients while antecedent weights (buried in a product chain) get tiny ones. Adam's per-parameter adaptive learning rates handle this naturally.

**Numerical gradients** via central finite differences. For \(\sim\!100\) parameters and \(\sim\!25\) data points, this is fast enough for real-time browser training. No autodiff library needed:

```typescript
for (let i = 0; i < params.length; i++) {
  params[i] += epsilon;
  const lossPlus = computeLoss(params);
  params[i] -= 2 * epsilon;
  const lossMinus = computeLoss(params);
  params[i] += epsilon; // restore
  grad[i] = (lossPlus - lossMinus) / (2 * epsilon);
}
```

**Log-parameterized widths.** Membership function widths must be positive, but gradient descent can push them negative. Storing \(\hat{w}\) and computing \(w = e^{\hat{w}}\) ensures positivity without clamping or constraints.

## Comparison with Related Approaches

| Approach | Learns MFs | Learns Rules | Learns Rule Existence | Differentiable |
|----------|-----------|-------------|---------------------|----------------|
| Classical Fuzzy | No | No | No | No |
| ANFIS | Yes | No | No | Yes |
| Genetic Fuzzy | Yes | Yes | Yes | No |
| Wang-Mendel | No | Yes | Yes | No |
| **Fuzzy Soft Circuits** | **Yes** | **Yes** | **Yes** | **Yes** |

The key differentiator is the last column. Making everything differentiable means we can use the same optimizer for all three learning tasks simultaneously, and the components can co-adapt during training.

## Limitations

This is a research demo, not a production system:

- **Scalability**:the gated product over all features creates vanishing gradients for high-dimensional inputs (>10 variables). A sum-based aggregation or attention mechanism would scale better.
- **Rule count**:the number of potential rules is fixed at initialization. L1 regularization on the switch parameters could automate this.
- **Local optima**:different random seeds find different (sometimes worse) rule sets. Ensemble methods or better initialization could help.
- **No theoretical guarantees**:convergence depends on initialization, learning rate, and problem structure.

[^jang1993]: Jang, J.-S. R. (1993). ANFIS: Adaptive-network-based fuzzy inference system. *IEEE Transactions on Systems, Man, and Cybernetics*, 23(3), 665–685.
[^cordon2001]: Cordón, O., Herrera, F., Hoffmann, F., & Magdalena, L. (2001). *Genetic Fuzzy Systems: Evolutionary Tuning and Learning of Fuzzy Knowledge Bases*. World Scientific.
[^wang1992]: Wang, L.-X. & Mendel, J. M. (1992). Generating fuzzy rules by learning from examples. *IEEE Transactions on Systems, Man, and Cybernetics*, 22(6), 1414–1427.
