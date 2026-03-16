import { Automaton, DFA, SimState } from './types';
import { epsilonClosure, nfaMove, sortedStates } from './automata';

export function initSim(nfa: Automaton, dfa: DFA, input: string): SimState {
  const initStates = epsilonClosure(nfa, new Set([nfa.initial]));
  return {
    nfa, dfa, input,
    step: -1,
    nfaStates: initStates,
    dfaState: dfa.initial,
    trace: [{
      step: -1, sym: null, nfaStates: initStates, dfaState: dfa.initial,
      desc: `Start: \u03b5-closure({${nfa.initial}}) = {${sortedStates(initStates)}}`,
    }],
    playing: false,
    interval: null,
  };
}

export function stepSim(sim: SimState, tab: 'nfa' | 'dfa'): boolean {
  if (sim.step >= sim.input.length - 1) return false;
  sim.step++;
  const ch = sim.input[sim.step];

  // NFA step
  const moved = nfaMove(sim.nfa, sim.nfaStates, ch);
  const closed = epsilonClosure(sim.nfa, moved);
  sim.nfaStates = closed;

  // DFA step
  const dtr = sim.dfa.transitions[sim.dfaState!];
  sim.dfaState = (dtr?.[ch]?.[0]) ?? null;

  const desc = tab === 'nfa'
    ? `move \u2192 {${sortedStates(moved)}}, \u03b5-closure \u2192 {${sortedStates(closed)}}`
    : `\u2192 ${sim.dfaState ?? '\u2205'}`;

  sim.trace.push({ step: sim.step, sym: ch, nfaStates: closed, dfaState: sim.dfaState, desc });
  return sim.step < sim.input.length - 1;
}

export function isAccepted(sim: SimState, tab: 'nfa' | 'dfa'): boolean | null {
  const done = sim.input.length === 0 || sim.step >= sim.input.length - 1;
  if (!done) return null;
  if (tab === 'nfa') {
    for (const s of sim.nfaStates) if (sim.nfa.accepting.has(s)) return true;
    return false;
  }
  return sim.dfaState !== null && sim.dfa.accepting.has(sim.dfaState);
}
