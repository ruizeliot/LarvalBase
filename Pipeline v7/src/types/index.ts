// Pipeline v7 Types

export type PipelineType = 'desktop' | 'terminal';
export type PipelineMode = 'new' | 'feature' | 'fix';
export type PhaseStatus = 'pending' | 'in-progress' | 'complete' | 'error';
export type EpicStatus = 'pending' | 'in-progress' | 'complete';
export type TodoStatus = 'pending' | 'in_progress' | 'completed';
export type WorkerStatus = 'running' | 'paused' | 'complete' | 'error' | 'killed';
export type Screen = 'launcher' | 'resume' | 'splitview' | 'complete';

export interface Project {
  name: string;
  path: string;
  type: PipelineType;
  mode: PipelineMode;
}

export interface Epic {
  id: number;
  name: string;
  status: EpicStatus;
  stories: string[];
}

export interface Phase {
  status: PhaseStatus;
  completedAt?: string;
  currentEpic?: number;
  epics?: Epic[];
}

export interface Worker {
  sessionId: string;
  phase: number;
  epic?: number;
  pid: number;
  startedAt: string;
  status: WorkerStatus;
}

export interface Cost {
  total: number;
  byPhase: Record<number, number>;
}

export interface Duration {
  total: number;
  byPhase: Record<number, number>;
}

export interface Manifest {
  version: string;
  project: Project;
  currentPhase: number;
  currentEpic?: number;
  phases: Record<number, Phase>;
  workers: Worker[];
  cost: Cost;
  duration: Duration;
}

export interface Todo {
  content: string;
  status: TodoStatus;
  activeForm: string;
  sessionId?: string;
  timestamp?: number;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}
