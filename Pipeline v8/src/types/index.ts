/**
 * Type Definitions
 * Pipeline v8
 */

// Pipeline modes
export type PipelineMode = 'new' | 'feature' | 'fix';

// Pipeline states
export type PipelineState = 'idle' | 'running' | 'paused' | 'complete' | 'error';

// Worker status
export type WorkerStatus = 'running' | 'completed' | 'killed' | 'errored';

// Todo status
export type TodoStatus = 'pending' | 'in_progress' | 'completed';

// Screen names
export type ScreenName = 'launcher' | 'resume' | 'dashboard' | 'complete';

// Epic status
export type EpicStatus = 'pending' | 'in-progress' | 'complete';

// Phase status
export type PhaseStatus = 'pending' | 'in-progress' | 'complete';

// Manifest schema
export interface Manifest {
  version: string;
  project: {
    name: string;
    path: string;
    mode: PipelineMode;
  };
  currentPhase: number;
  phases: {
    [key: string]: PhaseInfo;
  };
  worker?: WorkerInfo;
  cost: CostInfo;
  duration: DurationInfo;
}

export interface PhaseInfo {
  status: PhaseStatus;
  completedAt?: string;
  currentEpic?: number;
  epics?: EpicInfo[];
}

export interface EpicInfo {
  id: number;
  name: string;
  status: EpicStatus;
}

export interface WorkerInfo {
  sessionId: string;
  pid: number;
  phase: number;
  epic?: number;
  startedAt: string;
  status: WorkerStatus;
}

export interface CostInfo {
  total: number;
  byPhase: { [key: string]: number };
}

export interface DurationInfo {
  total: number;
  byPhase: { [key: string]: number };
}

// Todo item
export interface TodoItem {
  content: string;
  status: TodoStatus;
  activeForm?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Recent project
export interface RecentProject {
  name: string;
  path: string;
  lastPhase: number;
  lastStatus: PhaseStatus;
  lastAccess: string;
}

// Config
export interface AppConfig {
  recentProjects: RecentProject[];
}
