import { EventEmitter } from 'node:events';
import type { Manifest, Todo, WorkerSession, PipelineEvent } from '../types/index.js';
import { FilesystemService } from './filesystem.js';
import { ProcessService } from './process.js';
import { CostService } from './cost.js';
import { ManifestService } from './manifest.js';

export type OrchestratorStatus = 'idle' | 'running' | 'paused' | 'complete' | 'error';

const PHASE_COMMANDS: Record<string, string> = {
  '1': '/1-pipeline-brainstorm-v6.0',
  '2': '/2-pipeline-specs-v6.0',
  '3': '/3-pipeline-bootstrap-v6.0',
  '4': '/4-pipeline-implement-v6.0',
  '5': '/5-pipeline-finalize-v6.0',
};

export class Orchestrator extends EventEmitter {
  private filesystemService: FilesystemService;
  private processService: ProcessService;
  private costService: CostService;
  private manifestService: ManifestService;

  private projectPath: string;
  private manifest: Manifest | null = null;
  private todos: Todo[] = [];
  private status: OrchestratorStatus = 'idle';

  private manifestUnwatch: (() => void) | null = null;
  private todoUnwatch: (() => void) | null = null;
  private durationTimer: NodeJS.Timeout | null = null;
  private elapsedSeconds = 0;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
    this.filesystemService = new FilesystemService();
    this.processService = new ProcessService();
    this.costService = new CostService();
    this.manifestService = new ManifestService();

    // Forward process events
    this.processService.on('worker:started', (worker) => {
      this.emitEvent({ type: 'WORKER_START', sessionId: worker.sessionId, pid: worker.pid });
    });
    this.processService.on('worker:stopped', (worker) => {
      this.emitEvent({ type: 'WORKER_STOP', sessionId: worker.sessionId });
    });
  }

  async initialize(): Promise<void> {
    this.manifest = await this.filesystemService.readManifest(this.projectPath);

    if (!this.manifest) {
      throw new Error('No manifest found. Run pipeline init first.');
    }

    // Watch manifest for external changes
    this.manifestUnwatch = this.filesystemService.watchManifest(
      this.projectPath,
      (manifest) => {
        this.manifest = manifest;
        this.emit('manifest:updated', manifest);
      }
    );

    this.status = 'idle';
  }

  async startWorker(): Promise<void> {
    if (!this.manifest) {
      throw new Error('Not initialized');
    }

    const phase = parseInt(this.manifest.currentPhase, 10);
    const command = PHASE_COMMANDS[String(phase)] ?? '';

    const sessionId = this.processService.generateSessionId();

    // Watch todos for this session
    this.todoUnwatch = this.filesystemService.watchTodos(sessionId, (todos) => {
      this.todos = todos;
      const progress = this.manifestService.calculateProgress(todos);
      this.emitEvent({ type: 'PROGRESS', percent: progress });
      this.emitEvent({ type: 'TODO_UPDATE', todos });

      // Check for phase completion
      if (this.manifestService.isPhaseComplete(todos)) {
        this.onPhaseComplete();
      }
    });

    // Spawn worker
    await this.processService.spawnWorker({
      projectPath: this.projectPath,
      sessionId,
      phase,
      command,
    });

    // Start duration timer
    this.startDurationTimer();

    this.status = 'running';
    this.emitEvent({ type: 'PHASE_START', phase });
  }

  async stopWorker(): Promise<void> {
    const worker = this.processService.getCurrentWorker();
    if (worker?.pid) {
      await this.processService.killWorker(worker.pid);
    }

    this.processService.clearWorker();
    this.stopDurationTimer();
    this.todoUnwatch?.();
    this.todoUnwatch = null;

    this.status = 'paused';
  }

  async restartWorker(): Promise<void> {
    await this.stopWorker();
    await this.startWorker();
  }

  async focusWorker(): Promise<void> {
    await this.processService.focusWorkerWindow();
  }

  private onPhaseComplete(): void {
    if (!this.manifest) return;

    const phase = parseInt(this.manifest.currentPhase, 10);
    this.emitEvent({ type: 'PHASE_COMPLETE', phase });

    this.stopDurationTimer();
    this.todoUnwatch?.();

    // Check if this is the last phase
    if (phase >= 5) {
      this.status = 'complete';
      return;
    }

    // Advance to next phase
    this.manifest = this.manifestService.advancePhase(this.manifest);
    this.filesystemService.writeManifest(this.projectPath, this.manifest);

    // Start next phase automatically
    this.startWorker();
  }

  private startDurationTimer(): void {
    this.durationTimer = setInterval(() => {
      this.elapsedSeconds++;
      this.emit('duration:update', this.elapsedSeconds);
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private emitEvent(event: PipelineEvent): void {
    this.emit('pipeline:event', event);
    this.emit(event.type, event);
  }

  getStatus(): OrchestratorStatus {
    return this.status;
  }

  getManifest(): Manifest | null {
    return this.manifest;
  }

  getTodos(): Todo[] {
    return this.todos;
  }

  getWorker(): WorkerSession | null {
    return this.processService.getCurrentWorker();
  }

  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  updateTodos(todos: Todo[]): void {
    this.todos = todos;
    this.emit('TODO_UPDATE', todos);
  }

  getCurrentPhase(): string {
    return this.manifest?.currentPhase ?? '1';
  }

  async advancePhase(): Promise<void> {
    if (!this.manifest) return;

    const currentPhase = parseInt(this.manifest.currentPhase, 10);

    // Mark current phase as complete
    if (this.manifest.phases[String(currentPhase)]) {
      this.manifest.phases[String(currentPhase)].status = 'complete';
    }

    // Advance to next phase
    const nextPhase = currentPhase + 1;
    this.manifest.currentPhase = String(nextPhase);

    await this.filesystemService.writeManifest(this.projectPath, this.manifest);
    this.emit('manifest:updated', this.manifest);
  }

  getCurrentEpic() {
    if (!this.manifest?.epics?.length) return null;
    return this.manifest.epics.find(e => e.status === 'in_progress') ??
           this.manifest.epics.find(e => e.status === 'pending') ??
           null;
  }

  async completeCurrentEpic(): Promise<void> {
    if (!this.manifest?.epics) return;

    const currentEpic = this.getCurrentEpic();
    if (currentEpic) {
      currentEpic.status = 'complete';
      await this.filesystemService.writeManifest(this.projectPath, this.manifest);
      this.emit('manifest:updated', this.manifest);
    }
  }

  async recalculateCost(): Promise<number> {
    return this.costService.recalculateCost(this.projectPath);
  }

  formatCost(amount: number): string {
    return this.costService.formatCost(amount);
  }

  formatDuration(seconds: number): string {
    return this.costService.formatDuration(seconds);
  }

  cleanup(): void {
    // Stop worker if running
    const worker = this.processService.getCurrentWorker();
    if (worker?.pid) {
      this.processService.killWorker(worker.pid);
    }
    this.processService.clearWorker();

    this.stopDurationTimer();
    this.manifestUnwatch?.();
    this.todoUnwatch?.();
    this.filesystemService.cleanup();
    this.processService.removeAllListeners();
    this.removeAllListeners();
  }
}
