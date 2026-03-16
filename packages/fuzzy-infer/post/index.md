---
title: "Fuzzy Inference: Teaching Machines to Think in Shades of Grey"
date: 2026-03-16
draft: false
description: "An interactive introduction to fuzzy logic inference, from single facts to LLM-generated knowledge bases"
tags:
  - fuzzy-logic
  - inference
  - interactive
  - artificial-intelligence
categories:
  - computer-science
linked_project: fuzzy-infer
---

## Facts and Degrees

In classical logic, something is true or false. The cat is on the mat, or it is not. A patient has a fever, or they do not. There is no middle ground.

Fuzzy logic adds a dial.

Instead of true/false, every statement carries a **degree of belief** -- a number between 0 and 1. A degree of 1.0 means certainty. A degree of 0.0 means we have no belief at all. And everything in between is fair game.

Here is the simplest possible fuzzy fact:

```python
# A fuzzy fact: "Rex has hair" with 85% confidence
engine.add_fact("has-hair", ["rex"], 0.85)
```

The predicate is `has-hair`. The argument is `rex`. The degree is `0.85`. Maybe we observed Rex from a distance, or the photo was blurry. We are fairly sure Rex has hair, but not certain.

This is the building block of everything that follows. A fuzzy knowledge base is just a collection of these facts, each with its own degree. Some facts we are sure about (`deg=1.0`). Others are tentative guesses (`deg=0.3`). The engine treats them all the same way -- it just pays attention to the number.

One important detail: when two sources assert the same fact with different degrees, the engine keeps the higher one. This is called **fuzzy-OR**. If one sensor says `has-hair(rex)` at 0.85 and another says it at 0.92, the engine stores 0.92. Optimistic, but reasonable -- the stronger evidence wins.

```python
engine.add_fact("has-hair", ["rex"], 0.85)
engine.add_fact("has-hair", ["rex"], 0.92)  # fuzzy-OR: keeps 0.92
```

In the widget below, you can create fuzzy facts and drag the degree slider to see how the degree changes the visual representation. A fact at 1.0 is solid and bright. A fact at 0.1 is faded, barely there. This is not just decoration -- it is the engine's uncertainty, made visible.

<div id="fuzzy-fact-explorer"></div>

## Rules

Facts alone are inert. To reason, we need **rules** -- if-then statements that produce new facts from existing ones.

A fuzzy rule looks like this: "If X has hair, then X is a mammal." In code:

```python
engine.add_rule(
    name="mammal-rule",
    conditions=[{"pred": "has-hair", "args": ["?x"], "degVar": "?d"}],
    actions=[{
        "type": "add",
        "fact": {"pred": "is-mammal", "args": ["?x"], "deg": ["*", 0.95, "?d"]}
    }],
    priority=60,
)
```

There is a lot going on here, so let us unpack it.

**Pattern variables.** The `?x` in the condition is a variable. It matches any argument. When the engine finds `has-hair(rex, 0.85)`, it binds `?x` to `rex`. The same `?x` then appears in the action, so the engine adds `is-mammal(rex, ...)`.

**Degree variables.** The `?d` captures the degree of the matched fact. If `has-hair(rex)` has degree 0.85, then `?d` binds to 0.85.

**Degree expressions.** The action's degree is `["*", 0.95, "?d"]` -- multiply 0.95 by whatever `?d` is. So if Rex's hair-having is 0.85, his mammal-hood is `0.95 * 0.85 = 0.8075`. The 0.95 factor represents the rule's own confidence. Having hair is strong evidence of being a mammal, but not perfect -- a few non-mammals have hair-like structures.

**Priority.** Rules have priorities. Higher-priority rules fire first. Base classification rules (mammal, bird, carnivore) run at priority 60. Intermediate classes run at 50. Species identification at 40. This lets the engine build up intermediate concepts before trying to identify specific species.

Rules can also require multiple conditions. Here is the carnivore rule:

```python
engine.add_rule(
    name="carnivore-rule",
    conditions=[
        {"pred": "eats-meat", "args": ["?x"], "degVar": "?d1"},
        {"pred": "has-claws", "args": ["?x"], "degVar": "?d2"},
    ],
    actions=[{
        "type": "add",
        "fact": {
            "pred": "is-carnivore",
            "args": ["?x"],
            "deg": ["*", 0.9, ["min", "?d1", "?d2"]],
        },
    }],
    priority=60,
)
```

Two conditions, two degree variables. The degree expression takes the **minimum** of the two input degrees -- the weakest link -- then multiplies by 0.9. If we are 90% sure something eats meat but only 60% sure it has claws, the carnivore degree is `0.9 * min(0.9, 0.6) = 0.54`. The chain is only as strong as its weakest evidence.

Try toggling conditions and adjusting degrees in the widget below to see how rules fire and propagate.

<div id="fuzzy-rule-demo"></div>

## Forward Chaining

Individual rules are useful, but the real power comes from **chaining** them together. The engine runs in a loop:

1. Scan all rules. For each rule, find all variable bindings that satisfy its conditions.
2. For each match, check if this (rule, bindings) pair has fired before. If not, execute the actions.
3. If any new facts were added or changed, go back to step 1.
4. Stop when nothing changes, or when a maximum iteration count is reached.

This is called **forward chaining** -- start from known facts and chain forward through rules until no more conclusions can be drawn. The engine keeps going until nothing new is learned.

Here is the complete engine. It is about 100 lines of Python:

```python
"""Forward-chaining fuzzy inference engine in ~100 lines of Python."""

from __future__ import annotations
import json
from typing import Any


def _clamp01(n: float) -> float:
    return max(0.0, min(1.0, n))


def _eval_degree(expr: Any, bindings: dict[str, Any]) -> float:
    """Evaluate a degree expression and clamp to [0, 1]."""
    if isinstance(expr, (int, float)):
        return _clamp01(expr)
    if isinstance(expr, str) and expr.startswith("?"):
        return _clamp01(float(bindings.get(expr, 0)))
    if isinstance(expr, list):
        op, *operands = expr
        vals = [_eval_degree_raw(o, bindings) for o in operands]
        if op == "*":
            r = 1.0
            for v in vals:
                r *= v
            return _clamp01(r)
        if op == "+":
            return _clamp01(sum(vals))
        if op == "-":
            return _clamp01(vals[0] - sum(vals[1:]))
        if op == "/":
            return _clamp01(vals[0] / vals[1]) if vals[1] != 0 else 0.0
        if op == "min":
            return _clamp01(min(vals))
        if op == "max":
            return _clamp01(max(vals))
    return 0.0


def _eval_degree_raw(expr: Any, bindings: dict[str, Any]) -> float:
    """Evaluate without clamping (for nested intermediate results)."""
    if isinstance(expr, (int, float)):
        return float(expr)
    if isinstance(expr, str) and expr.startswith("?"):
        return float(bindings.get(expr, 0))
    if isinstance(expr, list):
        op, *operands = expr
        vals = [_eval_degree_raw(o, bindings) for o in operands]
        if op == "*":
            r = 1.0
            for v in vals:
                r *= v
            return r
        if op == "+":
            return sum(vals)
        if op == "-":
            return vals[0] - sum(vals[1:])
        if op == "/":
            return vals[0] / vals[1] if vals[1] != 0 else 0.0
        if op == "min":
            return min(vals)
        if op == "max":
            return max(vals)
    return 0.0


class FuzzyEngine:
    """Forward-chaining fuzzy inference engine."""

    def __init__(self):
        self.facts: dict[tuple, float] = {}  # (pred, *args) -> degree
        self.rules: list[dict] = []
        self._fired: set[str] = set()

    def add_fact(self, pred: str, args: list[str], deg: float = 1.0) -> None:
        key = (pred, *args)
        self.facts[key] = max(self.facts.get(key, 0.0), deg)  # fuzzy-OR

    def add_rule(
        self, name: str, conditions: list[dict], actions: list[dict], priority: int = 50
    ) -> None:
        self.rules.append(
            {"name": name, "conditions": conditions, "actions": actions, "priority": priority}
        )
        self.rules.sort(key=lambda r: -r["priority"])

    def query(self, pred: str) -> list[tuple[tuple, float]]:
        return [(k, v) for k, v in self.facts.items() if k[0] == pred]

    def _match_condition(
        self, cond: dict, bindings: dict[str, Any]
    ) -> list[tuple[dict[str, Any], float]]:
        results = []
        cpred, cargs = cond["pred"], cond["args"]
        for (pred, *args), deg in list(self.facts.items()):
            if pred != cpred or len(args) != len(cargs):
                continue
            b = dict(bindings)
            ok = True
            for pat, val in zip(cargs, args):
                if pat.startswith("?"):
                    if pat in b:
                        if b[pat] != val:
                            ok = False
                            break
                    else:
                        b[pat] = val
                elif pat != val:
                    ok = False
                    break
            if not ok:
                continue
            if "degVar" in cond and cond["degVar"]:
                b[cond["degVar"]] = deg
            results.append((b, deg))
        return results

    def _satisfy_all(self, conditions: list[dict]) -> list[tuple[dict[str, Any], float]]:
        current = [({}, 1.0)]
        for cond in conditions:
            nxt = []
            for bindings, cur_deg in current:
                for b, d in self._match_condition(cond, bindings):
                    nxt.append((b, min(cur_deg, d)))
            current = nxt
            if not current:
                break
        return current

    def run(self, max_iter: int = 100) -> list[str]:
        fired_rules = []
        for _ in range(max_iter):
            changed = False
            for rule in self.rules:
                for bindings, _ in self._satisfy_all(rule["conditions"]):
                    fired_key = f"{rule['name']}|{json.dumps(bindings, sort_keys=True)}"
                    if fired_key in self._fired:
                        continue
                    self._fired.add(fired_key)
                    fired_rules.append(rule["name"])
                    for action in rule["actions"]:
                        afact = action["fact"]
                        args = [
                            str(bindings[a]) if a.startswith("?") and a in bindings else a
                            for a in afact["args"]
                        ]
                        deg = _eval_degree(afact["deg"], bindings)
                        key = (afact["pred"], *args)
                        if action["type"] == "add":
                            old = self.facts.get(key, -1.0)
                            if deg > old:
                                self.facts[key] = deg
                                changed = True
                        elif action["type"] == "remove":
                            if key in self.facts:
                                del self.facts[key]
                                changed = True
            if not changed:
                break
        return fired_rules
```

That is the whole thing. No dependencies, no frameworks. The `_match_condition` method does unification-style pattern matching against the fact store. The `_satisfy_all` method chains multiple conditions together, threading variable bindings through. And `run` loops until fixpoint.

Notice the `_fired` set. Each (rule, bindings) pair fires at most once. Without this, a rule like "if mammal then warm-blooded" would fire over and over on the same animal, producing infinite loops. The history set is what makes the loop terminate.

Also notice how degrees propagate. When `_satisfy_all` combines multiple conditions, it takes the **minimum** degree -- the weakest link principle. Then the rule's action can further attenuate that degree through its degree expression. By the time a fact has been derived through three layers of rules, its degree has been multiplied down from the original inputs. Confident inputs produce confident conclusions. Shaky inputs produce tentative ones.

The widget below visualizes this process step by step. You can see each iteration of the loop, which rules fire, which facts are added, and how degrees propagate through the chain.

<div id="fuzzy-chain-demo"></div>

## The Animal Classifier

Let us put it all together with a concrete example: an animal classifier. We define 10 rules in three layers:

**Layer 0 -- Traits.** The raw observations: `has-hair`, `has-feathers`, `eats-meat`, `has-claws`, `has-hooves`, `has-stripes`, `cannot-fly`, `has-long-neck`, `is-aquatic`. These are the facts you assert.

**Layer 1 -- Classes.** Intermediate categories derived from traits: `is-mammal` (from `has-hair`), `is-bird` (from `has-feathers`), `is-carnivore` (from `eats-meat` + `has-claws`), `is-ungulate` (from `is-mammal` + `has-hooves`).

**Layer 2 -- Species.** The final identifications: zebra, penguin, eagle, tiger, giraffe, dolphin.

Here is the complete 10-rule knowledge base in Python:

```python
engine = FuzzyEngine()

# --- Layer 1: Base classification (priority 60) ---
engine.add_rule("mammal-rule",
    conditions=[{"pred": "has-hair", "args": ["?x"], "degVar": "?d"}],
    actions=[{"type": "add", "fact": {"pred": "is-mammal", "args": ["?x"],
              "deg": ["*", 0.95, "?d"]}}],
    priority=60)

engine.add_rule("bird-rule",
    conditions=[{"pred": "has-feathers", "args": ["?x"], "degVar": "?d"}],
    actions=[{"type": "add", "fact": {"pred": "is-bird", "args": ["?x"],
              "deg": ["*", 0.95, "?d"]}}],
    priority=60)

engine.add_rule("carnivore-rule",
    conditions=[
        {"pred": "eats-meat", "args": ["?x"], "degVar": "?d1"},
        {"pred": "has-claws", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "is-carnivore", "args": ["?x"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=60)

# --- Layer 1.5: Intermediate classification (priority 50) ---
engine.add_rule("ungulate-rule",
    conditions=[
        {"pred": "is-mammal", "args": ["?x"], "degVar": "?d1"},
        {"pred": "has-hooves", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "is-ungulate", "args": ["?x"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=50)

# --- Layer 2: Species identification (priority 40) ---
engine.add_rule("zebra-rule",
    conditions=[
        {"pred": "is-ungulate", "args": ["?x"], "degVar": "?d1"},
        {"pred": "has-stripes", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "species", "args": ["?x", "zebra"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=40)

engine.add_rule("penguin-rule",
    conditions=[
        {"pred": "is-bird", "args": ["?x"], "degVar": "?d1"},
        {"pred": "cannot-fly", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "species", "args": ["?x", "penguin"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=40)

engine.add_rule("eagle-rule",
    conditions=[
        {"pred": "is-bird", "args": ["?x"], "degVar": "?d1"},
        {"pred": "is-carnivore", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "species", "args": ["?x", "eagle"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=40)

engine.add_rule("tiger-rule",
    conditions=[
        {"pred": "is-mammal", "args": ["?x"], "degVar": "?d1"},
        {"pred": "is-carnivore", "args": ["?x"], "degVar": "?d2"},
        {"pred": "has-stripes", "args": ["?x"], "degVar": "?d3"}],
    actions=[{"type": "add", "fact": {"pred": "species", "args": ["?x", "tiger"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2", "?d3"]]}}],
    priority=40)

engine.add_rule("giraffe-rule",
    conditions=[
        {"pred": "is-ungulate", "args": ["?x"], "degVar": "?d1"},
        {"pred": "has-long-neck", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "species", "args": ["?x", "giraffe"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=40)

engine.add_rule("dolphin-rule",
    conditions=[
        {"pred": "is-mammal", "args": ["?x"], "degVar": "?d1"},
        {"pred": "is-aquatic", "args": ["?x"], "degVar": "?d2"}],
    actions=[{"type": "add", "fact": {"pred": "species", "args": ["?x", "dolphin"],
              "deg": ["*", 0.9, ["min", "?d1", "?d2"]]}}],
    priority=40)
```

Let us trace through a zebra classification. We start with three facts:

```python
engine.add_fact("has-hair",    ["mystery"], 0.9)
engine.add_fact("has-hooves",  ["mystery"], 0.85)
engine.add_fact("has-stripes", ["mystery"], 0.95)
engine.run()
```

**Iteration 1** (priority 60): `mammal-rule` fires. `has-hair(mystery, 0.9)` matches, so `is-mammal(mystery)` is added with degree `0.95 * 0.9 = 0.855`.

**Iteration 2** (priority 50): `ungulate-rule` fires. It needs `is-mammal` (now present at 0.855) and `has-hooves` (0.85). Degree: `0.9 * min(0.855, 0.85) = 0.765`.

**Iteration 3** (priority 40): `zebra-rule` fires. It needs `is-ungulate` (0.765) and `has-stripes` (0.95). Degree: `0.9 * min(0.765, 0.95) = 0.689`.

The engine concludes `species(mystery, zebra)` with degree 0.689. Not certain, but fairly confident. The degree has been attenuated through three layers of rules, each multiplying by its confidence factor and taking the weakest-link minimum. The final number reflects the accumulated uncertainty of the entire chain.

In the creature builder below, toggle traits on and off to build your own animal. Watch the inference tree grow as the engine chains through rules to identify species.

<div id="fuzzy-creature"></div>

## Scaling with LLMs

There is an elephant in the room, and our 10-rule knowledge base cannot classify it.

This is the fundamental critique of classical AI -- what the field calls the **knowledge acquisition bottleneck**. Hand-crafted expert systems do not scale. Our little animal classifier handles zebras, penguins, and eagles, but ask it about a pangolin and it shrugs. An armadillo? No idea. A platypus, the edge case that breaks every neat classification? Not a chance.

The GOFAI (Good Old-Fashioned AI) community spent decades running into this wall. Knowledge representation works beautifully in toy domains. It falls apart in the real world, where the number of rules needed to cover edge cases grows faster than any expert team can write them. This is why neural networks won -- they do not need hand-crafted rules. They learn directly from data.

So why are we building a fuzzy inference engine in 2026?

Because something has changed. We have LLMs now.

An LLM is, among other things, a remarkably effective knowledge compiler. It has ingested a significant fraction of human knowledge and can emit it in any structured format you ask for. Including fuzzy inference rules.

Here is the prompt that generated our expanded knowledge base:

```text
Generate fuzzy inference rules for animal classification.

Each rule has: name, conditions (pred/args with ?variables and degVar),
actions (type: "add", fact with pred/args/deg expression).

Degree expressions: ["*", factor, "?d"] for single conditions,
["*", factor, ["min", "?d1", "?d2"]] for multiple conditions.

Priority bands: 60 (base class), 50 (intermediate), 40 (species).

Cover: insects, arachnids, primates, canines, felines, habitat-based
reasoning, behavioral traits, edge cases (pangolin vs armadillo,
crow vs raven, seal vs sea lion). Target: ~100 rules, ~30 species.
```

Feed that to an LLM, and you get back a structured rule set that covers insects (`has-exoskeleton` + `has-six-legs`), arachnids (`has-eight-legs` + `has-exoskeleton`), primates (`is-mammal` + `has-opposable-thumbs`), habitat-based reasoning (desert, arctic, jungle, savanna), behavioral traits (burrows, climbs trees, hunts at night), and the disambiguation rules that handle the hard cases.

The 10-rule knowledge base becomes 25. Then 100. Then 500.

At 25 rules, the system adds reptiles, amphibians, and a few more species -- snakes, crocodiles, whales, bats. At 100 rules, it handles insects, arachnids, primates, canines, felines, and about 30 species total. It can tell a pangolin from an armadillo (pangolins have scales but are mammals; armadillos have bony armor). At 500 rules, it covers the long tail: axolotls, platypuses, narwhals, cassowaries, okapis. Over 100 species identifiable from trait combinations.

The structure of the rules stays the same at every scale. Same format, same engine, same degree expressions. The only thing that changes is the number of rules. The engine does not care whether a human or an LLM wrote them.

This reframes fuzzy inference. It is not a relic of 1980s AI. It is an **interpretable reasoning layer** that LLMs can populate. The LLM handles the knowledge acquisition problem -- the part that killed classical expert systems -- and the fuzzy engine handles the reasoning. Each does what it is good at.

Use the slider below to scale the rule count from 10 to 500. Watch the inference tree grow denser as the system gains the ability to handle edge cases and disambiguation. At 10 rules, toggling "has scales" does nothing interesting. At 500 rules, it opens up an entire branch of reptilian classification.

<div id="fuzzy-creature-scaled"></div>

## Reflection

We have built, from scratch, a fuzzy inference engine that fits in 100 lines of Python. We have seen it classify animals through forward chaining, propagating degrees of belief through layers of rules. And we have seen how LLMs dissolve the knowledge acquisition bottleneck that historically made these systems impractical.

Three properties make this combination worth paying attention to.

**Interpretability.** Every conclusion the engine reaches can be traced back through the exact chain of rules that produced it. When the engine says `species(mystery, zebra)` at degree 0.689, you can follow the trail: `zebra-rule` fired because `is-ungulate(mystery, 0.765)` and `has-stripes(mystery, 0.95)`, and `is-ungulate` came from `ungulate-rule` firing on `is-mammal(mystery, 0.855)` and `has-hooves(mystery, 0.85)`, and `is-mammal` came from `mammal-rule` firing on `has-hair(mystery, 0.9)`. Every step is visible, every degree is justified. Try doing that with a neural network's activations.

**Debuggability.** When the system gets something wrong, you can point to the specific rule that caused the error and fix it. If the engine incorrectly classifies a whale as a fish, you find the offending rule, adjust its conditions or degree expression, and re-run. No retraining, no hyperparameter tuning, no wondering whether your fix broke something else on the other side of the model. The fix is local and its effects are predictable.

**The neural-symbolic bridge.** This is perhaps the most interesting angle. LLMs are excellent at generating structured knowledge but poor at consistent, traceable reasoning. Fuzzy inference engines are excellent at consistent, traceable reasoning but historically required a human to supply the knowledge. The combination -- LLMs as knowledge compilers, fuzzy systems as interpretable executors -- gives you both.

The engine does not care where its rules come from. A domain expert can write them by hand for a safety-critical application where every rule must be reviewed. An LLM can generate hundreds for a prototype. A hybrid workflow can start with LLM-generated rules and have a human prune, correct, and extend them. The rules are data, plain and inspectable, in a format that both humans and machines can read.

Fuzzy logic is sixty years old. Forward chaining goes back to the production systems of the 1970s. These are not new ideas. But the ability to populate a knowledge base at scale, with an LLM, in seconds -- that is new. And it changes the cost-benefit calculation entirely.

The full [fuzzy-infer](https://github.com/metafunctor/fuzzy-infer) library implements everything shown here, with both a Python package and a TypeScript engine. The source code for this interactive post is in the same repository.

<!-- inject:style -->
<!-- inject:script -->
