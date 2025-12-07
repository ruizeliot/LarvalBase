import { EventEmitter } from 'events';
import type {
  Manifest,
  Phase,
  Epic,
  Worker,
  Cost,
  Duration,
  Todo,
  PhaseStatus,
  EpicStatus,
} from '../types/index.js';
import { ManifestService } from './manifest.js';
import { ProcessService, SpawnOptions } from './process.js';
import { FilesystemService } from './filesystem.js';
import { CostService } from './cost.js';

/**
 * Pipeline Orchestrator - Manages pipeline flow and state
 *
 * Epic 7 Implementation:
 * - US-110: Phase progression (advancePhase, validatePhaseComplete)
 * - US-111: Epic loop management (advanceEpic, getNextEpic)
 * - US-112: Todo completion detection (isTodoComplete, calculateProgress)
 * - US-113: Worker lifecycle (spawnWorker, killWorker)
 * - US-114: Resume from exact state (resume)
 * - US-115: Pause handling (pause, resume)
 * - US-116: Phase 1 user confirmation (requiresUserConfirmation)
 * - US-117: Cost integration (updateCost)
 * - US-118: Duration integration (updateDuration)
 * - US-119: Error recovery (handleWorkerCrash, retryPhase)
 * - US-120: Progress marker parsing (parseProgressMarker)
 */

export type OrchestratorState =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'paused'
  | 'waiting_user'
  | 'complete'
  | 'error';

export interface OrchestratorConfig {
  projectPath: string;
  pipelineType?: 'desktop' | 'terminal';
  pipelineMode?: 'new' | 'feature' | 'fix';
  commandPrefix?: string;
}

export interface PhaseConfig {
  command: string;
  requiresUserConfirmation: boolean;
  hasEpicLoops: boolean;
  timeout?: number;
}

export interface ProgressMarker {
  phase: number;
  epic?: number;
  percent: number;
  message?: string;
}

export interface OrchestratorEvents {
  'phase:start': (phase: number) => void;
  'phase:complete': (phase: number) => void;
  'epic:start': (epicId: number) => void;
  'epic:complete': (epicId: number) => void;
  'progress': (progress: ProgressMarker) => void;
  'todo:update': (todos: Todo[]) => void;
  'todo:complete': () => void;
  'worker:spawn': (worker: Worker) => void;
  'worker:exit': (sessionId: string, code: number) => void;
  'worker:crash': (sessionId: string, error: string) => void;
  'error': (error: Error) => void;
  'state:change': (state: OrchestratorState) => void;
  'pipeline:complete': () => void;
}

export class Orchestrator extends EventEmitter {
  private state: OrchestratorState = 'idle';
  private config: OrchestratorConfig;
  private manifestService: ManifestService;
  private processService: ProcessService;
  private filesystemService: FilesystemService;
  private costService: CostService;
  private currentWorkerSessionId: string | null = null;
  private currentTodos: Todo[] = [];
  private todoWatcher: { close: () => void } | null = null;
  private durationTimer: NodeJS.Timeout | null = null;
  private durationStartTime: number = 0;

  // Phase configuration
  private phaseConfigs: Record<number, PhaseConfig> = {
    1: {
      command: '/1-new-pipeline-terminal-v6.0',
      requiresUserConfirmation: true,
      hasEpicLoops: false,
    },
    2: {
      command: '/2-new-pipeline-terminal-v6.0',
      requiresUserConfirmation: false,
      hasEpicLoops: false,
    },
    3: {
      command: '/3-new-pipeline-terminal-v6.0',
      requiresUserConfirmation: false,
      hasEpicLoops: false,
    },
    4: {
      command: '/4-new-pipeline-terminal-v6.0',
      requiresUserConfirmation: false,
      hasEpicLoops: true,
    },
    5: {
      command: '/5-new-pipeline-terminal-v6.0',
      requiresUserConfirmation: false,
      hasEpicLoops: false,
    },
  };

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.manifestService = new ManifestService(config.projectPath);
    this.processService = new ProcessService();
    this.filesystemService = new FilesystemService();
    this.costService = new CostService();
  }

  /**
   * Get current orchestrator state
   */
  getState(): OrchestratorState {
    return this.state;
  }

  /**
   * Set state with event emission
   */
  private setState(newState: OrchestratorState): void {
    this.state = newState;
    this.emit('state:change', newState);
  }

  /**
   * Initialize a new pipeline
   * US-203: Orchestrator Creation
   * US-204: Pipeline Initialization
   */
  async initialize(projectName: string): Promise<Manifest> {
    this.setState('initializing');

    // Create project structure
    this.filesystemService.createProjectStructure(this.config.projectPath);

    // Create default manifest
    const manifest = ManifestService.createDefault(
      this.config.projectPath,
      projectName
    );

    // Set pipeline type and mode from config
    if (this.config.pipelineType) {
      manifest.project.type = this.config.pipelineType;
    }
    if (this.config.pipelineMode) {
      manifest.project.mode = this.config.pipelineMode;
    }

    // Write manifest
    this.manifestService.write(manifest);

    this.setState('idle');
    return manifest;
  }

  /**
   * Start the pipeline from current phase
   * US-205: Phase Progression
   */
  async start(): Promise<void> {
    const manifest = this.manifestService.read();
    if (!manifest) {
      throw new Error('No manifest found. Initialize pipeline first.');
    }

    this.setState('running');
    await this.startPhase(manifest.currentPhase);
  }

  /**
   * Start a specific phase
   * US-206-210: Phase-specific handling
   */
  async startPhase(phaseNum: number): Promise<void> {
    const manifest = this.manifestService.read();
    if (!manifest) {
      throw new Error('No manifest found');
    }

    const phaseConfig = this.phaseConfigs[phaseNum];
    if (!phaseConfig) {
      throw new Error(`Unknown phase: ${phaseNum}`);
    }

    // Update manifest
    this.manifestService.updatePhase(phaseNum, { status: 'in-progress' });

    // Emit phase start event
    this.emit('phase:start', phaseNum);

    // Start duration timer
    this.startDurationTimer(phaseNum);

    // Check if user confirmation required
    // US-116: Phase 1 user confirmation
    if (phaseConfig.requiresUserConfirmation) {
      this.setState('waiting_user');
      return;
    }

    // Spawn worker for this phase
    await this.spawnPhaseWorker(phaseNum);
  }

  /**
   * Check if current phase requires user confirmation
   * US-116: Phase 1 user confirmation
   */
  requiresUserConfirmation(phaseNum: number): boolean {
    return this.phaseConfigs[phaseNum]?.requiresUserConfirmation || false;
  }

  /**
   * User confirms to proceed (for Phase 1)
   */
  async confirmPhase(): Promise<void> {
    if (this.state !== 'waiting_user') {
      throw new Error('Not waiting for user confirmation');
    }

    const manifest = this.manifestService.read();
    if (!manifest) {
      throw new Error('No manifest found');
    }

    this.setState('running');
    await this.spawnPhaseWorker(manifest.currentPhase);
  }

  /**
   * Spawn a worker for a phase
   * US-213: Todo Monitoring
   * US-215: Worker Lifecycle Management
   */
  private async spawnPhaseWorker(phaseNum: number): Promise<void> {
    const manifest = this.manifestService.read();
    const phaseConfig = this.phaseConfigs[phaseNum];

    const spawnOptions: SpawnOptions = {
      phase: phaseNum,
      command: 'claude',
      args: [],
      cwd: this.config.projectPath,
      onOutput: (line) => this.handleWorkerOutput(line),
      onError: (line) => this.handleWorkerError(line),
      onExit: (code) => this.handleWorkerExit(code),
    };

    // Add epic for phase 4
    if (phaseNum === 4 && manifest?.currentEpic) {
      spawnOptions.epic = manifest.currentEpic;
    }

    // Spawn the worker
    const worker = this.processService.spawn(spawnOptions);
    this.currentWorkerSessionId = worker.sessionId;

    // Add worker to manifest
    if (manifest) {
      manifest.workers.push(worker);
      this.manifestService.write(manifest);
    }

    // Emit worker spawn event
    this.emit('worker:spawn', worker);

    // Start watching for todo updates
    this.startTodoWatcher(worker.sessionId);
  }

  /**
   * Handle worker output
   * US-120: Progress marker parsing
   */
  private handleWorkerOutput(line: string): void {
    // Parse progress markers
    const progress = this.parseProgressMarker(line);
    if (progress) {
      this.emit('progress', progress);
    }
  }

  /**
   * Parse [PROGRESS] JSON from worker output
   * US-120: Progress marker parsing
   */
  parseProgressMarker(line: string): ProgressMarker | null {
    const match = line.match(/\[PROGRESS\]\s*(\{.*\})/);
    if (!match) {
      return null;
    }

    try {
      const data = JSON.parse(match[1]);
      return {
        phase: data.phase,
        epic: data.epic,
        percent: data.percent,
        message: data.message,
      };
    } catch {
      return null;
    }
  }

  /**
   * Handle worker error output
   */
  private handleWorkerError(line: string): void {
    // Log errors but don't crash the orchestrator
    console.error(`[Worker Error] ${line}`);
  }

  /**
   * Handle worker exit
   * US-216: Worker Crash Recovery
   */
  private handleWorkerExit(code: number): void {
    const sessionId = this.currentWorkerSessionId;
    if (!sessionId) return;

    // Stop duration timer
    this.stopDurationTimer();

    // Emit exit event
    this.emit('worker:exit', sessionId, code);

    if (code === 0) {
      // Worker completed successfully
      this.handlePhaseComplete();
    } else {
      // Worker crashed or errored
      this.emit('worker:crash', sessionId, `Exit code: ${code}`);
      this.setState('error');
    }

    this.currentWorkerSessionId = null;
  }

  /**
   * Handle phase completion
   * US-205: Phase Progression
   */
  private handlePhaseComplete(): void {
    const manifest = this.manifestService.read();
    if (!manifest) return;

    const currentPhase = manifest.currentPhase;

    // Update phase status
    this.manifestService.updatePhase(currentPhase, {
      status: 'complete',
      completedAt: new Date().toISOString(),
    });

    // Emit phase complete event
    this.emit('phase:complete', currentPhase);

    // Check if pipeline is complete
    if (currentPhase >= 5) {
      this.setState('complete');
      this.emit('pipeline:complete');
      return;
    }

    // Advance to next phase
    this.manifestService.advancePhase();
    this.startPhase(currentPhase + 1);
  }

  /**
   * Start watching todo files
   * US-213: Todo Monitoring
   */
  private startTodoWatcher(sessionId: string): void {
    // Stop existing watcher
    if (this.todoWatcher) {
      this.todoWatcher.close();
    }

    const todoDir = this.filesystemService.getTodoDirectory();
    const todoPath = this.filesystemService.joinPaths(
      todoDir,
      `${sessionId}.json`
    );

    this.todoWatcher = this.filesystemService.watchTodoFile(todoPath, (todos) => {
      this.currentTodos = todos;
      this.emit('todo:update', todos);

      // Check for completion
      if (this.isTodoComplete(todos)) {
        this.emit('todo:complete');
      }
    });
  }

  /**
   * Check if all todos are completed
   * US-112: Todo Completion Detection
   * US-214: Todo Completion Detection
   */
  isTodoComplete(todos: Todo[]): boolean {
    if (todos.length === 0) {
      return true; // No todos = complete
    }
    return todos.every((t) => t.status === 'completed');
  }

  /**
   * Calculate progress percentage from todos
   * US-226: Progress Calculation
   */
  calculateProgress(todos: Todo[]): number {
    if (todos.length === 0) {
      return 100;
    }

    const completed = todos.filter((t) => t.status === 'completed').length;
    return Math.round((completed / todos.length) * 100);
  }

  /**
   * Get current todos
   */
  getTodos(): Todo[] {
    return this.currentTodos;
  }

  /**
   * Get epics for phase 4
   * US-211: Epic Loop Management
   */
  getEpics(): Epic[] {
    return this.manifestService.getEpics();
  }

  /**
   * Advance to next epic
   * US-211: Epic Loop Management
   * US-212: Epic Completion Detection
   */
  advanceEpic(): void {
    const manifest = this.manifestService.read();
    if (!manifest || manifest.currentPhase !== 4) {
      return;
    }

    const epics = manifest.phases[4]?.epics || [];
    const currentEpic = manifest.currentEpic || 1;

    // Mark current epic as complete
    const epicIndex = epics.findIndex((e) => e.id === currentEpic);
    if (epicIndex !== -1) {
      epics[epicIndex].status = 'complete';
    }

    // Find next epic
    const nextEpic = epics.find((e) => e.status === 'pending');

    if (nextEpic) {
      // Advance to next epic
      nextEpic.status = 'in-progress';
      manifest.currentEpic = nextEpic.id;
      this.manifestService.write(manifest);

      this.emit('epic:complete', currentEpic);
      this.emit('epic:start', nextEpic.id);

      // Spawn worker for next epic
      this.spawnPhaseWorker(4);
    } else {
      // All epics complete - advance phase
      this.emit('epic:complete', currentEpic);
      this.handlePhaseComplete();
    }
  }

  /**
   * Pause the pipeline
   * US-220: Pause Pipeline
   */
  pause(): void {
    if (this.state !== 'running') {
      return;
    }

    if (this.currentWorkerSessionId) {
      this.processService.pause(this.currentWorkerSessionId);
    }

    // Stop duration timer
    this.stopDurationTimer();

    // Update worker status in manifest
    const manifest = this.manifestService.read();
    if (manifest && this.currentWorkerSessionId) {
      const worker = manifest.workers.find(
        (w) => w.sessionId === this.currentWorkerSessionId
      );
      if (worker) {
        worker.status = 'paused';
        this.manifestService.write(manifest);
      }
    }

    this.setState('paused');
  }

  /**
   * Resume the pipeline after pause
   * US-268: Resume Functionality
   */
  resumeFromPause(): void {
    if (this.state !== 'paused') {
      return;
    }

    if (this.currentWorkerSessionId) {
      this.processService.resume(this.currentWorkerSessionId);
    }

    // Resume duration timer
    const manifest = this.manifestService.read();
    if (manifest) {
      this.startDurationTimer(manifest.currentPhase);
    }

    // Update worker status in manifest
    if (manifest && this.currentWorkerSessionId) {
      const worker = manifest.workers.find(
        (w) => w.sessionId === this.currentWorkerSessionId
      );
      if (worker) {
        worker.status = 'running';
        this.manifestService.write(manifest);
      }
    }

    this.setState('running');
  }

  /**
   * Resume pipeline from saved state
   * US-217: Resume Pipeline
   * US-218: Resume from Phase
   * US-219: Resume from Epic
   */
  async resume(): Promise<void> {
    const manifest = this.manifestService.read();
    if (!manifest) {
      throw new Error('No manifest found to resume from');
    }

    // Recalculate costs from ccusage
    const { cost, duration } = this.costService.recalculateFromCCUsage();
    manifest.cost = cost;
    manifest.duration = duration;
    this.manifestService.write(manifest);

    this.setState('running');

    // Resume from current phase and epic
    await this.startPhase(manifest.currentPhase);
  }

  /**
   * Cancel the pipeline
   * US-221: Cancel Pipeline
   */
  cancel(): void {
    // Kill current worker
    if (this.currentWorkerSessionId) {
      this.processService.kill(this.currentWorkerSessionId);
      this.currentWorkerSessionId = null;
    }

    // Stop duration timer
    this.stopDurationTimer();

    // Close todo watcher
    if (this.todoWatcher) {
      this.todoWatcher.close();
      this.todoWatcher = null;
    }

    this.setState('idle');
  }

  /**
   * Retry current phase after error
   * US-225: Error Recovery Options
   */
  async retry(): Promise<void> {
    if (this.state !== 'error') {
      return;
    }

    const manifest = this.manifestService.read();
    if (!manifest) {
      throw new Error('No manifest found');
    }

    // Reset phase status
    this.manifestService.updatePhase(manifest.currentPhase, {
      status: 'in-progress',
    });

    this.setState('running');
    await this.startPhase(manifest.currentPhase);
  }

  /**
   * Update cost in manifest
   * US-117: Cost Integration
   */
  updateCost(amount: number, phase: number): void {
    const manifest = this.manifestService.read();
    if (!manifest) return;

    manifest.cost.total += amount;
    manifest.cost.byPhase[phase] = (manifest.cost.byPhase[phase] || 0) + amount;
    this.manifestService.write(manifest);
  }

  /**
   * Update duration in manifest
   * US-118: Duration Integration
   */
  updateDuration(seconds: number, phase: number): void {
    const manifest = this.manifestService.read();
    if (!manifest) return;

    manifest.duration.total += seconds;
    manifest.duration.byPhase[phase] =
      (manifest.duration.byPhase[phase] || 0) + seconds;
    this.manifestService.write(manifest);
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(phase: number): void {
    this.durationStartTime = Date.now();

    this.durationTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.durationStartTime) / 1000);
      // Don't update manifest constantly - just track locally
      // Final duration is saved when phase completes
    }, 1000);
  }

  /**
   * Stop duration timer and save elapsed time
   */
  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;

      // Calculate and save elapsed time
      const manifest = this.manifestService.read();
      if (manifest && this.durationStartTime > 0) {
        const elapsed = Math.floor((Date.now() - this.durationStartTime) / 1000);
        this.updateDuration(elapsed, manifest.currentPhase);
      }
    }
  }

  /**
   * Cleanup resources
   * US-235: Orchestrator Cleanup
   */
  cleanup(): void {
    // Kill all workers
    this.processService.killAll();

    // Stop duration timer
    this.stopDurationTimer();

    // Close todo watcher
    if (this.todoWatcher) {
      this.todoWatcher.close();
      this.todoWatcher = null;
    }

    this.currentWorkerSessionId = null;
    this.currentTodos = [];
    this.setState('idle');
  }

  /**
   * Get current manifest
   */
  getManifest(): Manifest | null {
    return this.manifestService.read();
  }

  /**
   * Get current worker
   */
  getCurrentWorker(): Worker | undefined {
    if (!this.currentWorkerSessionId) {
      return undefined;
    }
    return this.processService.getWorker(this.currentWorkerSessionId);
  }
}
