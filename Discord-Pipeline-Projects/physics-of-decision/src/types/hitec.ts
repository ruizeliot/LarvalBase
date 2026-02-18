// HITeC model types for Pod Definition

export type StructureNodeType = 'complex' | 'elementary';
export type CausalNodeType = 'component' | 'potential' | 'potentiality' | 'actuality';
export type HITeCNodeType = StructureNodeType | CausalNodeType;

export type HITeCEdgeType =
  | 'containment'
  | 'generation'
  | 'existenceCondition'
  | 'susceptibilityCondition'
  | 'triggeringCondition'
  | 'impact'
  | 'affectation'
  | 'coefficient';

export interface NodeParam {
  key: string;
  value: string;
}

export interface HITeCNodeData {
  label: string;
  nodeType: HITeCNodeType;
  description?: string;
  subtype?: string;
  params: NodeParam[];
}

export interface HITeCEdgeData {
  edgeType: HITeCEdgeType;
  value?: string;
  label?: string;
}

export interface CrossViewLink {
  elementaryId: string;
  componentId: string;
}

// Node type metadata
export const NODE_TYPE_META: Record<HITeCNodeType, {
  icon: string;
  label: string;
  color: string;
  gradient: string;
  view: 'structure' | 'causal';
}> = {
  complex:      { icon: '🔷', label: 'Complex',      color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', view: 'structure' },
  elementary:   { icon: '🟢', label: 'Elementary',   color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #4ade80)', view: 'structure' },
  component:    { icon: '⚙️', label: 'Component',    color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', view: 'causal' },
  potential:    { icon: '⚡', label: 'Potential',    color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', view: 'causal' },
  potentiality: { icon: '💎', label: 'Potentiality', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)', view: 'causal' },
  actuality:    { icon: '🔴', label: 'Actuality',    color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f87171)', view: 'causal' },
};

// Edge type metadata
export const EDGE_TYPE_META: Record<HITeCEdgeType, {
  color: string;
  strokeDasharray?: string;
  strokeWidth: number;
  label: string;
  view: 'structure' | 'causal';
  animated?: boolean;
}> = {
  containment:             { color: '#94a3b8', strokeWidth: 2,   label: 'Containment',           view: 'structure' },
  generation:              { color: '#1e293b', strokeWidth: 2,   label: 'Generation',            view: 'causal' },
  existenceCondition:      { color: '#2563eb', strokeDasharray: '5 3', strokeWidth: 1.5, label: 'ExistenceCondition',    view: 'causal' },
  susceptibilityCondition: { color: '#7c3aed', strokeDasharray: '5 3', strokeWidth: 1.5, label: 'SusceptibilityCondition', view: 'causal' },
  triggeringCondition:     { color: '#f97316', strokeDasharray: '5 3', strokeWidth: 1.5, label: 'TriggeringCondition',   view: 'causal' },
  impact:                  { color: '#e05a3a', strokeWidth: 3,   label: 'Impact',                view: 'causal' },
  affectation:             { color: '#0891b2', strokeDasharray: '8 4', strokeWidth: 1.5, label: 'Affectation',           view: 'causal' },
  coefficient:             { color: '#94a3b8', strokeWidth: 1,   label: 'Coefficient',           view: 'causal' },
};

// Preset graphs
export interface PresetGraph {
  label: string;
  nodes: Array<{ id: string; type: HITeCNodeType; position: { x: number; y: number }; data: HITeCNodeData }>;
  edges: Array<{ id: string; source: string; target: string; data: HITeCEdgeData }>;
  crossLinks: CrossViewLink[];
}
