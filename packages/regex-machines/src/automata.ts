import { EPSILON, Automaton, DFA, Transitions } from './types';

export function addTransition(t: Transitions, from: string, sym: string, to: string): void {
  if (!t[from]) t[from] = {};
  if (!t[from][sym]) t[from][sym] = [];
  if (!t[from][sym].includes(to)) t[from][sym].push(to);
}

export function mergeTransitions(dst: Transitions, src: Transitions): void {
  for (const from in src)
    for (const sym in src[from])
      for (const to of src[from][sym])
        addTransition(dst, from, sym, to);
}

export function epsilonClosure(nfa: Automaton, states: Set<string>): Set<string> {
  const closure = new Set(states);
  const stack = [...states];
  while (stack.length) {
    const s = stack.pop()!;
    const et = nfa.transitions[s]?.[EPSILON];
    if (et) for (const t of et) {
      if (!closure.has(t)) { closure.add(t); stack.push(t); }
    }
  }
  return closure;
}

export function nfaMove(nfa: Automaton, states: Set<string>, sym: string): Set<string> {
  const result = new Set<string>();
  for (const s of states) {
    const tr = nfa.transitions[s]?.[sym];
    if (tr) for (const t of tr) result.add(t);
  }
  return result;
}

export function sortedStates(st: Set<string>): string {
  return [...st].sort((a, b) =>
    (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0)
  ).join(', ');
}

function setKey(st: Set<string>): string {
  return [...st].sort().join(',');
}

export function nfaToDfa(nfa: Automaton): DFA {
  const dfaStates: Record<string, { name: string; nfaStates: Set<string> }> = {};
  const stateMap: Record<string, Set<string>> = {};
  let counter = 0;
  const alphabet = [...nfa.alphabet].filter(s => s !== EPSILON).sort();

  const initClosure = epsilonClosure(nfa, new Set([nfa.initial]));
  const initKey = setKey(initClosure);
  const initName = 'D' + counter++;
  dfaStates[initKey] = { name: initName, nfaStates: initClosure };
  stateMap[initName] = initClosure;

  const transitions: Transitions = {};
  const accepting = new Set<string>();
  const allStates = new Set([initName]);

  if ([...initClosure].some(s => nfa.accepting.has(s))) accepting.add(initName);

  const queue = [initKey];
  const processed = new Set<string>();

  while (queue.length) {
    const curKey = queue.shift()!;
    if (processed.has(curKey)) continue;
    processed.add(curKey);
    const curInfo = dfaStates[curKey];

    for (const sym of alphabet) {
      const moved = nfaMove(nfa, curInfo.nfaStates, sym);
      const nextClosure = epsilonClosure(nfa, moved);
      if (nextClosure.size === 0) continue;

      const nextKey = setKey(nextClosure);
      if (!dfaStates[nextKey]) {
        const nextName = 'D' + counter++;
        dfaStates[nextKey] = { name: nextName, nfaStates: nextClosure };
        stateMap[nextName] = nextClosure;
        allStates.add(nextName);
        queue.push(nextKey);
        if ([...nextClosure].some(s => nfa.accepting.has(s))) accepting.add(nextName);
      }
      addTransition(transitions, curInfo.name, sym, dfaStates[nextKey].name);
    }
  }

  return { states: allStates, alphabet: new Set(alphabet), transitions, initial: initName, accepting, stateMap };
}
