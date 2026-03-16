// The trace data is embedded at build time via esbuild's JSON loader
import data from '../data/knights_trace.json';

export interface TraceNode {
  id: string;
  state: string;
  value: number;
  visits: number;
  is_terminal: boolean;
  answer: string | null;
  children: TraceNode[];
}

export interface SimulationPhase {
  step: number;
  phase: 'select' | 'expand' | 'rollout' | 'backprop';
  selected_path?: string[];
  new_node_id?: string;
  rollout_path?: string[];
  backprop_path?: string[];
  score?: number;
  tree: TraceNode;
}

export interface TraceData {
  puzzle: {
    question: string;
    correct_answer: string;
    single_pass_wrong: string;
  };
  simulations: SimulationPhase[];
}

export const TRACE_DATA = data as TraceData;
