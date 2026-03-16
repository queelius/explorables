// Shared types for the fuzzy-infer explorable

export interface Fact {
  pred: string;
  args: string[];
  deg: number;
}

export interface Condition {
  pred: string;
  args: string[];
  degVar?: string;
  degConstraint?: [string, string, number];
}

export type DegreeExpr = number | [string, ...(number | string)[]];

export interface ActionFact {
  pred: string;
  args: string[];
  deg: DegreeExpr;
}

export interface Action {
  type: 'add' | 'remove';
  fact: ActionFact;
}

export interface Rule {
  name: string;
  conditions: Condition[];
  actions: Action[];
  priority: number;
}

export interface InferenceResult {
  facts: Map<string, Fact>;
  firedRules: string[];
  iterations: number;
}

export type NodeType = 'fact' | 'rule' | 'result';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  layer: number;
  type: NodeType;
  label: string;
  deg: number;
  active: boolean;
}

export interface EdgePosition {
  from: string;
  to: string;
  active: boolean;
}

export interface TreeLayout {
  nodes: NodePosition[];
  edges: EdgePosition[];
  width: number;
  height: number;
}

export interface WidgetConfig {
  container: HTMLElement;
  rules: Rule[];
  initialFacts?: Fact[];
  showRuleSlider?: boolean;
  showStepControls?: boolean;
  ruleTiers?: Rule[][];
}
