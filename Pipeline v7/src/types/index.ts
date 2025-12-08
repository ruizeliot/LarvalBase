// Pipeline v7 Type Definitions

// Todo item from Claude CLI
export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

// Phase status
export type PhaseStatus = 'pending' | 'running' | 'complete' | 'error';

// Phase information
export interface Phase {
  status: PhaseStatus;
  completedAt?: string;
  note?: string;
  loops?: string[];
}

// Epic information
export interface Epic {
  id: number;
  name: string;
  stories: number;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
}

// Worker session
export interface WorkerSession {
  sessionId: string;
  pid: number | null;
  status: 'idle' | 'running' | 'stopped' | 'crashed';
  startedAt?: string;
  phase?: number;
  epic?: number;
}

// Cost tracking
export interface CostData {
  total: number;
  byPhase: Record<string, number>;
  lastUpdated?: string;
}

// Duration tracking
export interface DurationData {
  total: number;
  byPhase: Record<string, number>;
}

// Project configuration
export interface Project {
  name: string;
  path: string;
  type?: 'terminal-tui' | 'desktop';
  mode?: 'new' | 'feature' | 'fix';
}

// Pipeline configuration
export interface PipelineConfig {
  type: string;
  version: string;
  architecture: string;
}

// Test results
export interface TestResults {
  total: number;
  passing: number;
  coverage: number;
}

// Full manifest structure
export interface Manifest {
  version: string;
  project: Project;
  pipeline: PipelineConfig;
  currentPhase: string;
  phases: Record<string, Phase>;
  epics: Epic[];
  tests: TestResults;
  cost: CostData;
  duration: DurationData;
  workers: WorkerSession[];
  createdAt: string;
  updatedAt: string;
  rebuildReason?: string;
}

// Screen navigation
export type ScreenName = 'launcher' | 'resume' | 'dashboard' | 'complete' | 'settings' | 'help';

// App state
export interface AppState {
  currentScreen: ScreenName;
  project: Project | null;
  manifest: Manifest | null;
  worker: WorkerSession | null;
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
}

// Event types
export type PipelineEvent =
  | { type: 'PHASE_START'; phase: number }
  | { type: 'PHASE_COMPLETE'; phase: number }
  | { type: 'EPIC_START'; epic: number }
  | { type: 'EPIC_COMPLETE'; epic: number }
  | { type: 'WORKER_START'; sessionId: string; pid: number }
  | { type: 'WORKER_STOP'; sessionId: string }
  | { type: 'WORKER_CRASH'; sessionId: string; error: string }
  | { type: 'PROGRESS'; percent: number }
  | { type: 'COST_UPDATE'; cost: number }
  | { type: 'TODO_UPDATE'; todos: Todo[] }
  | { type: 'ERROR'; message: string };

// Component props
export interface BoxProps {
  borderStyle?: 'single' | 'double' | 'round' | 'classic';
  padding?: number;
  margin?: number;
  flexDirection?: 'row' | 'column';
  children?: React.ReactNode;
}

export interface TextProps {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dimColor?: boolean;
  inverse?: boolean;
  children?: React.ReactNode;
}

export interface ProgressBarProps {
  value: number;
  width?: number;
  showPercent?: boolean;
}

export interface BadgeProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  children: string;
}

// Service interfaces
export interface FilesystemService {
  readManifest(projectPath: string): Promise<Manifest | null>;
  writeManifest(projectPath: string, manifest: Manifest): Promise<void>;
  watchManifest(projectPath: string, callback: (manifest: Manifest) => void): () => void;
  watchTodos(sessionId: string, callback: (todos: Todo[]) => void): () => void;
  exists(path: string): Promise<boolean>;
}

export interface ProcessService {
  detectWindowsTerminal(): Promise<{ available: boolean; path?: string }>;
  spawnWorker(options: SpawnWorkerOptions): Promise<WorkerSession>;
  killWorker(pid: number): Promise<void>;
  isWorkerRunning(pid: number): Promise<boolean>;
  focusWorkerWindow(): Promise<void>;
  generateSessionId(): string;
}

export interface SpawnWorkerOptions {
  projectPath: string;
  sessionId: string;
  phase: number;
  epic?: number;
  command: string;
}

export interface CostService {
  getSessionCost(sessionId: string): Promise<{ totalCost: number; duration: number }>;
  recalculateCost(projectPath: string): Promise<number>;
  formatCost(amount: number): string;
  formatDuration(seconds: number): string;
}
