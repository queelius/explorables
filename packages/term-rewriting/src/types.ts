export const SVG_NS = 'http://www.w3.org/2000/svg';

// Trees: atoms or arrays (S-expressions)
export type Atom = string | number;
export type Tree = Atom | Tree[];

// A rewrite rule with name, match predicate, apply function
export interface Rule {
  name: string;
  match: (t: Tree) => boolean;
  apply: (t: Tree) => Tree;
}

// Animation events emitted during a bottom-up pass
export interface StepEvent {
  nodeIdx: number;   // pre-order index in the tree
  type: 'visit' | 'match';
  label: string;
  rule?: string;
}

// One full bottom-up pass over the tree
export interface Iteration {
  before: Tree;
  after: Tree;
  events: StepEvent[];
}

// Layout node for SVG rendering
export interface LayoutNode {
  id: number;
  x: number;
  y: number;
  label: string;
}

export interface LayoutEdge {
  from: LayoutNode;
  to: LayoutNode;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

// Example definition
export interface Example {
  tree: Tree;
  rules?: Rule[];
}

// Demo state
export interface DemoState {
  iterations: Iteration[];
  iterIdx: number;
  evtIdx: number;
  tree: Tree;
  layout: Layout;
}
