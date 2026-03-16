---
title: "Regex Under the Hood"
date: 2022-09-12
draft: false
description: "Your regex compiles into a state machine. Type a pattern, feed it a string, and watch the machine think — step by step."
tags:
  - automata-theory
  - regex
  - computer-science
  - interactive
categories:
  - computer-science
---

You type `grep 'a*b+' file.txt` and results appear. But what actually happened in that fraction of a second? Your pattern compiled into a *state machine* — a tiny computer with no memory except "where am I right now?"

This post builds that machine from scratch and lets you watch it think.

## The Pipeline

Every regex engine follows the same path:

**Regex → NFA → DFA → Match**

1. **Parse** the regex and build a Nondeterministic Finite Automaton (NFA) using Thompson's construction. The NFA can be in *multiple states at once* and can take free epsilon (ε) transitions without consuming input.

2. **Convert** the NFA to a Deterministic Finite Automaton (DFA) using subset construction. Each DFA state represents a *set* of NFA states. One state at a time, one transition per symbol.

3. **Simulate** the DFA on input — one character, one lookup, O(n). No backtracking.

## Thompson's Construction

Thompson's construction builds NFAs by snapping together small templates. Each template has exactly one start and one accepting state:

**Single character** `a`:
```
──▶(q0)──a──▶((q1))
```

**Concatenation** `ab` — chain the fragments, connecting the first's accept to the second's start via ε:
```
──▶(q0)─a─▶(q1)─ε─▶(q2)─b─▶((q3))
```

**Union** `a|b` — new start fans out via ε, both accepts converge via ε:
```
       ┌─ε─▶(q2)─a─▶(q3)─ε─┐
──▶(q0)┤                     ├▶((q5))
       └─ε─▶(q4)─b─▶(q5)─ε─┘
```

**Kleene star** `a*` — ε-bypass for zero occurrences, ε-loop for repetition:
```
    ┌────────ε────────┐
    │   ┌──ε──┐       │
──▶(q0)─ε─▶(q1)─a─▶(q2)─ε─▶((q3))
    │                       ▲
    └───────────ε───────────┘
```

These compose mechanically. `(a|b)*abb` nests a union inside a star, then concatenates three symbols. The result is a graph of states and transitions that *exactly* encodes the regex's meaning.

## Try It

Type a regex and an input string. **Build** constructs the NFA, then **Step** through the input one character at a time. Watch which states light up — the NFA explores all possibilities simultaneously.

<div id="nfa-sim">
  <div class="sim-controls">
    <div class="sim-fields">
      <div class="sim-field">
        <label for="sim-regex">Pattern</label>
        <input id="sim-regex" type="text" value="(a|b)*abb" spellcheck="false" autocomplete="off" />
      </div>
      <div class="sim-field">
        <label for="sim-input">Input</label>
        <input id="sim-input" type="text" value="aabb" spellcheck="false" autocomplete="off" />
      </div>
      <button id="sim-build">Build</button>
    </div>
    <div class="sim-presets">
      <button data-regex="(a|b)*abb" data-input="aabb">classic</button>
      <button data-regex="a*b+" data-input="aaabb">a*b+</button>
      <button data-regex="(ab|cd)*" data-input="ababcd">groups</button>
      <button data-regex="a(b|c)*d" data-input="abcbd">nested</button>
    </div>
  </div>

  <div class="sim-error" id="sim-error"></div>

  <div class="sim-tabs">
    <button class="sim-tab active" data-tab="nfa">NFA</button>
    <button class="sim-tab" data-tab="dfa">DFA</button>
  </div>

  <div class="sim-canvas">
    <svg id="sim-svg"></svg>
  </div>

  <div class="sim-legend" id="sim-legend"></div>

  <div class="sim-tape" id="sim-tape"></div>

  <div class="sim-playback">
    <button id="sim-reset" disabled>Reset</button>
    <button id="sim-step" disabled>Step</button>
    <button id="sim-play" disabled>Play</button>
  </div>

  <div class="sim-result" id="sim-result"></div>

  <div class="sim-trace" id="sim-trace"></div>
</div>


<!-- inject:style -->
<!-- inject:script -->


Switch to the **DFA** tab to see the determinized version — each DFA state is a set of NFA states, computed by subset construction. The legend below the graph shows the mapping.

## Subset Construction

The NFA simulates nondeterminism by tracking *all possible states simultaneously*. Subset construction makes this explicit: each set of NFA states becomes a single DFA state.

The algorithm is a BFS:

1. Start with the ε-closure of the NFA's initial state. That's your first DFA state.
2. For each DFA state, for each symbol, compute: move (follow symbol transitions), then ε-closure. The resulting set is the next DFA state.
3. Repeat until no new DFA states are discovered.
4. A DFA state is accepting if it contains *any* NFA accepting state.

The result: a machine that makes exactly one transition per input character. No branching. No backtracking. O(n) matching, guaranteed.

## What Regex Can't Do

Finite states = finite memory = no unbounded counting.

A DFA can't match "n `a`s followed by n `b`s" (like `aaabbb`). It would need to *remember how many* `a`s it saw, but it has no counter — just a fixed set of states. By the Pumping Lemma, any sufficiently long string accepted by a finite automaton contains a pumpable substring, which breaks the equal-count requirement.

This is why you can't match balanced parentheses, valid HTML nesting, or palindromes with regex. The machine would need infinitely many states. For that, you need a pushdown automaton (context-free) or a Turing machine.

The limitation is exactly why regex is fast. Finite states means finite work per character. No stack, no tape, no backtracking — just a lookup table.

---

*Implementation adapted from [nfa-tools](https://github.com/queelius/nfa-tools). For the formal treatment: Sipser, "Introduction to the Theory of Computation," Chapter 1.*
