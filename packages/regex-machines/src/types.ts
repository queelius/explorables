export const EPSILON = '\u03b5';
export const R = 20; // node radius
export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Transitions {
  [from: string]: {
    [symbol: string]: string[];
  };
}

export interface Automaton {
  states: Set<string>;
  alphabet: Set<string>;
  transitions: Transitions;
  initial: string;
  accepting: Set<string>;
}

export interface DFA extends Automaton {
  stateMap?: Record<string, Set<string>>;
}

export interface Position {
  x: number;
  y: number;
}

export interface Edge {
  from: string;
  to: string;
  symbols: string[];
  bidir: boolean;
}

export interface TraceEntry {
  step: number;
  sym: string | null;
  nfaStates: Set<string>;
  dfaState: string | null;
  desc: string;
}

export interface SimState {
  nfa: Automaton;
  dfa: DFA;
  input: string;
  step: number;
  nfaStates: Set<string>;
  dfaState: string | null;
  trace: TraceEntry[];
  playing: boolean;
  interval: ReturnType<typeof setInterval> | null;
}
