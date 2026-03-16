import { EPSILON, Automaton, Transitions } from './types';
import { addTransition, mergeTransitions } from './automata';

let stateCounter = 0;

function ns(): string { return 'q' + stateCounter++; }

function makeNFA(initial: string, accepting: string[], states: string[], alphabet: string[], transitions: Transitions): Automaton {
  return {
    initial,
    accepting: new Set(accepting),
    states: new Set(states),
    alphabet: new Set(alphabet),
    transitions,
  };
}

function addConcatOps(rx: string): string {
  const r: string[] = [];
  for (let i = 0; i < rx.length; i++) {
    r.push(rx[i]);
    if (i + 1 < rx.length) {
      const c = rx[i], n = rx[i + 1];
      const endsAtom = c !== '(' && c !== '|';
      const beginsAtom = n !== ')' && !'*+?|'.includes(n);
      if (endsAtom && beginsAtom) r.push('\xb7');
    }
  }
  return r.join('');
}

function prec(op: string): number {
  if (op === '|') return 1;
  if (op === '\xb7') return 2;
  return 3;
}

function toPostfix(rx: string): string {
  const out: string[] = [], ops: string[] = [];
  for (const c of rx) {
    if (c === '(') { ops.push(c); }
    else if (c === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()!);
      if (ops.length) ops.pop();
    } else if ('|*+?\xb7'.includes(c)) {
      while (ops.length && ops[ops.length - 1] !== '(' && prec(ops[ops.length - 1]) >= prec(c))
        out.push(ops.pop()!);
      ops.push(c);
    } else {
      out.push(c);
    }
  }
  while (ops.length) out.push(ops.pop()!);
  return out.join('');
}

// ─── Thompson's construction primitives ──────

function symNFA(ch: string): Automaton {
  const s = ns(), a = ns();
  const t: Transitions = {};
  addTransition(t, s, ch, a);
  return makeNFA(s, [a], [s, a], [ch], t);
}

function catNFA(n1: Automaton, n2: Automaton): Automaton {
  const t: Transitions = {};
  mergeTransitions(t, n1.transitions);
  mergeTransitions(t, n2.transitions);
  for (const a of n1.accepting) addTransition(t, a, EPSILON, n2.initial);
  return makeNFA(n1.initial, [...n2.accepting],
    [...n1.states, ...n2.states], [...new Set([...n1.alphabet, ...n2.alphabet])], t);
}

function unionNFA(n1: Automaton, n2: Automaton): Automaton {
  const s = ns(), a = ns();
  const t: Transitions = {};
  mergeTransitions(t, n1.transitions);
  mergeTransitions(t, n2.transitions);
  addTransition(t, s, EPSILON, n1.initial);
  addTransition(t, s, EPSILON, n2.initial);
  for (const ac of n1.accepting) addTransition(t, ac, EPSILON, a);
  for (const ac of n2.accepting) addTransition(t, ac, EPSILON, a);
  return makeNFA(s, [a], [s, a, ...n1.states, ...n2.states],
    [...new Set([...n1.alphabet, ...n2.alphabet])], t);
}

function starNFA(n: Automaton): Automaton {
  const s = ns(), a = ns();
  const t: Transitions = {};
  mergeTransitions(t, n.transitions);
  addTransition(t, s, EPSILON, n.initial);
  addTransition(t, s, EPSILON, a);
  for (const ac of n.accepting) {
    addTransition(t, ac, EPSILON, a);
    addTransition(t, ac, EPSILON, n.initial);
  }
  return makeNFA(s, [a], [s, a, ...n.states], [...n.alphabet], t);
}

function plusNFA(n: Automaton): Automaton {
  const s = ns(), a = ns();
  const t: Transitions = {};
  mergeTransitions(t, n.transitions);
  addTransition(t, s, EPSILON, n.initial);
  for (const ac of n.accepting) {
    addTransition(t, ac, EPSILON, a);
    addTransition(t, ac, EPSILON, n.initial);
  }
  return makeNFA(s, [a], [s, a, ...n.states], [...n.alphabet], t);
}

function optNFA(n: Automaton): Automaton {
  const s = ns(), a = ns();
  const t: Transitions = {};
  mergeTransitions(t, n.transitions);
  addTransition(t, s, EPSILON, n.initial);
  addTransition(t, s, EPSILON, a);
  for (const ac of n.accepting) addTransition(t, ac, EPSILON, a);
  return makeNFA(s, [a], [s, a, ...n.states], [...n.alphabet], t);
}

// ─── Public API ──────────────────────────────

export function validateRegex(rx: string): string | null {
  let depth = 0;
  for (const c of rx) {
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (depth < 0) return 'Unmatched closing parenthesis.';
  }
  if (depth !== 0) return 'Unmatched opening parenthesis.';
  if (rx.includes('()')) return 'Empty group.';
  if (rx.length > 0 && '*+?'.includes(rx[0])) return 'Nothing to repeat.';
  return null;
}

export function parseRegex(rx: string): Automaton {
  stateCounter = 0;
  if (!rx) {
    const s = ns(), a = ns();
    const t: Transitions = {};
    addTransition(t, s, EPSILON, a);
    return makeNFA(s, [a], [s, a], [], t);
  }
  const pf = toPostfix(addConcatOps(rx));
  const stack: Automaton[] = [];
  for (const c of pf) {
    if (c === '\xb7') { if (stack.length >= 2) { const b = stack.pop()!; stack.push(catNFA(stack.pop()!, b)); } }
    else if (c === '|') { if (stack.length >= 2) { const b = stack.pop()!; stack.push(unionNFA(stack.pop()!, b)); } }
    else if (c === '*') { if (stack.length) stack.push(starNFA(stack.pop()!)); }
    else if (c === '+') { if (stack.length) stack.push(plusNFA(stack.pop()!)); }
    else if (c === '?') { if (stack.length) stack.push(optNFA(stack.pop()!)); }
    else stack.push(symNFA(c));
  }
  return stack.length ? stack[0] : parseRegex('');
}
