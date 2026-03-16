---
title: "How to Teach a Computer Calculus with Pattern Matching"
date: '2022-10-15'
draft: false
description: "Define patterns, define replacements, repeat until done. Watch a 90-line rewrite engine learn to differentiate."
tags:
- term-rewriting
- pattern-matching
- symbolic-computation
- python
- interactive
- calculus
categories:
- Computer Science
- Mathematics
series:
- explorables
math: true
---

Every expression is a tree. `(2 + 3) * x` looks like this:

```
    *            In Python: ('*', ('+', 2, 3), 'x')
   / \
  +   x          First element = operator.
 / \             Rest = children.
2   3            Tuples all the way down.
```

A **rewrite rule** says: *when you see this pattern, replace it with that.* A handful of them, applied until nothing changes, can simplify or differentiate arbitrary expressions.

Here's the whole thing. 90 lines of Python. A complete symbolic differentiator:

```python
class _W:
    def __repr__(self): return '_'
_ = _W()

def rewrite(t, *rules):
    while True:
        for r in rules:
            n = r(t)
            if n != t: t = n; break
        else: return t

def bottom_up(rule):
    def go(t):
        if isinstance(t, tuple) and t:
            t = (t[0],) + tuple(go(c) for c in t[1:])
        return rule(t)
    return go

class when:
    def __init__(self, *pat):
        self.pat, self.fn = pat, None

    def then(self, f):
        self.fn = f if callable(f) else (lambda *_, v=f: v)
        return self

    def __call__(self, t):
        b = self._m(self.pat, t)
        if b is not None and self.fn:
            return self.fn(*b.values())
        return t

    def _m(self, p, t, b=None):
        if b is None: b = {}
        if callable(p) and not isinstance(p, type):
            if not p(t): return None
            b[f'_{len(b)}'] = t; return b
        if p is _:
            b[f'_{len(b)}'] = t; return b
        if isinstance(p, str) and p.startswith('$'):
            if p in b: return b if b[p] == t else None
            b[p] = t; return b
        if p == t: return b
        if isinstance(p, tuple) and isinstance(t, tuple) and len(p) == len(t):
            for pe, te in zip(p, t):
                if self._m(pe, te, b) is None: return None
            return b
        return None

is_lit = lambda x: isinstance(x, (int, float))

def const_wrt(var):
    def check(e):
        if e == var: return False
        if isinstance(e, tuple): return all(check(s) for s in e[1:])
        return True
    return check

simplify = [
    when('+', 0, _).then(lambda x: x),          # 0 + x = x
    when('+', _, 0).then(lambda x: x),          # x + 0 = x
    when('*', 0, _).then(0),                    # 0 * x = 0
    when('*', _, 0).then(0),                    # x * 0 = 0
    when('*', 1, _).then(lambda x: x),          # 1 * x = x
    when('*', _, 1).then(lambda x: x),          # x * 1 = x
    when('^', _, 0).then(1),                    # x^0   = 1
    when('^', _, 1).then(lambda x: x),          # x^1   = x
    when('+', is_lit, is_lit).then(lambda a, b: a + b),
    when('-', is_lit, is_lit).then(lambda a, b: a - b),
    when('*', is_lit, is_lit).then(lambda a, b: a * b),
]

diff = [
    when('d', const_wrt('x'), 'x').then(0),                                                       # constant
    when('d', 'x', 'x').then(1),                                                                   # variable
    when('d', ('+', _, _), '$v').then(lambda u, w, v: ('+', ('d', u, v), ('d', w, v))),            # sum
    when('d', ('-', _, _), '$v').then(lambda u, w, v: ('-', ('d', u, v), ('d', w, v))),            # difference
    when('d', ('*', _, _), '$v').then(                                                              # product
        lambda u, w, v: ('+', ('*', u, ('d', w, v)), ('*', w, ('d', u, v)))),
    when('d', ('^', 'x', is_lit), 'x').then(lambda n: ('*', n, ('^', 'x', n - 1))),              # power
    when('d', ('^', _, is_lit), '$v').then(                                                         # chain+power
        lambda u, n, v: ('*', ('*', n, ('^', u, n - 1)), ('d', u, v))),
    when('d', ('sin', 'x'), 'x').then(('cos', 'x')),                                              # sin
    when('d', ('sin', _), '$v').then(lambda u, v: ('*', ('cos', u), ('d', u, v))),                 # chain+sin
    when('d', ('cos', 'x'), 'x').then(('-', 0, ('sin', 'x'))),                                    # cos
    when('d', ('cos', _), '$v').then(lambda u, v: ('*', ('-', 0, ('sin', u)), ('d', u, v))),       # chain+cos
    when('d', ('exp', 'x'), 'x').then(('exp', 'x')),                                              # exp
    when('d', ('exp', _), '$v').then(lambda u, v: ('*', ('exp', u), ('d', u, v))),                 # chain+exp
    when('d', ('ln', 'x'), 'x').then(('/', 1, 'x')),                                              # ln
    when('d', ('/', _, _), '$v').then(                                                              # quotient
        lambda u, w, v: ('/', ('-', ('*', w, ('d', u, v)), ('*', u, ('d', w, v))), ('^', w, 2))),
]

rules = [bottom_up(r) for r in diff + simplify]

result = rewrite(('d', ('*', ('^', 'x', 2), ('sin', 'x')), 'x'), *rules)
# => ('+', ('*', ('^', 'x', 2), ('cos', 'x')), ('*', ('sin', 'x'), ('*', 2, 'x')))
```

That's it. `rewrite` applies rules until nothing changes. `bottom_up` walks the tree leaves-first. `when` does pattern matching: `_` matches anything, `$x` captures a named variable, callables act as predicates. The rest is just calculus rules written as patterns.

The chain rule is not coded explicitly. When a rule like `d/dx sin(u)` produces `cos(u) * d/dx u`, that new `d` node gets rewritten by the same rules on the next pass. The recursion emerges from the fixed-point loop.

The widgets below run a JS reimplementation of the same logic. Step through each one to watch the engine think.

## Bottom-up traversal

The key mechanism. Rules only match at the root of whatever they're given, so `bottom_up` recurses into children first, then tries the rule at the rebuilt node. Leaves light up first, then the engine works upward.

<div class="tr-demo" id="bu-demo">
  <h3>Bottom-Up Traversal</h3>
  <div class="tr-bar">
    <select id="bu-example">
      <option value="add-zero">(+ 0 (+ 0 x))  with  0+x => x</option>
      <option value="const-fold">(+ (* 2 3) (* 4 5))  with  constant folding</option>
      <option value="nested">(* (+ x 0) (- 5 5))  with  arithmetic rules</option>
    </select>
    <button id="bu-reset">Reset</button>
    <button id="bu-step">Step</button>
    <button id="bu-play">Play</button>
  </div>
  <div class="tr-canvas"><svg id="bu-svg" width="100%" height="260"></svg></div>
  <div class="tr-info" id="bu-info">Press Step or Play.</div>
  <div class="tr-legend">
    <span><span class="tr-legend-dot c-visit"></span>visiting</span>
    <span><span class="tr-legend-dot c-match"></span>rule fired</span>
    <span><span class="tr-legend-dot c-rewrite"></span>rewritten</span>
    <span><span class="tr-legend-dot c-done"></span>fixed point</span>
  </div>
</div>

## Arithmetic simplification

More rules, same engine. Identity elements, absorbing elements, constant folding, cancellation:

<div class="tr-demo" id="ar-demo">
  <h3>Arithmetic Simplifier</h3>
  <div class="tr-pills">
    <span class="tr-pill">0+x &rarr; x</span>
    <span class="tr-pill">x*0 &rarr; 0</span>
    <span class="tr-pill">x*1 &rarr; x</span>
    <span class="tr-pill">x-x &rarr; 0</span>
    <span class="tr-pill">n+m &rarr; compute</span>
  </div>
  <div class="tr-bar">
    <select id="ar-example">
      <option value="ex1">(+ (* 2 3) (* 4 5))</option>
      <option value="ex2">(* (+ x 0) (- 5 5))</option>
      <option value="ex3">(+ (+ 0 x) (- y y))</option>
      <option value="ex4">(/ (* 3 (+ 2 4)) (- 9 3))</option>
    </select>
    <button id="ar-reset">Reset</button>
    <button id="ar-step">Step</button>
    <button id="ar-play">Play</button>
  </div>
  <div class="tr-canvas"><svg id="ar-svg" width="100%" height="280"></svg></div>
  <div class="tr-info" id="ar-info">Press Step or Play.</div>
</div>

## Symbolic differentiation

The same engine with the `diff` rules from above. Watch the product rule split $x^2 \cdot \sin(x)$ into two branches, then the power and chain rules reduce each piece, then simplification cleans up:

<div class="tr-demo" id="df-demo">
  <h3>Symbolic Differentiation</h3>
  <div class="tr-bar">
    <select id="df-example">
      <option value="power">d/dx x^3</option>
      <option value="product">d/dx (x^2 * sin(x))</option>
      <option value="chain">d/dx sin(x^2)</option>
      <option value="exp-chain">d/dx e^(x^2)</option>
      <option value="quotient">d/dx (sin(x) / x)</option>
    </select>
    <button id="df-reset">Reset</button>
    <button id="df-step">Step</button>
    <button id="df-play">Play</button>
  </div>
  <div class="tr-canvas"><svg id="df-svg" width="100%" height="380"></svg></div>
  <div class="tr-info" id="df-info">Press Step or Play.</div>
  <div class="tr-iter" id="df-iter"></div>
</div>


<!-- inject:style -->
<!-- inject:script -->
