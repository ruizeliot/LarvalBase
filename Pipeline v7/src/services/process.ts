import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import type { Worker, WorkerStatus } from '../types/index.js';

// SKELETON: Service structure in place but methods are stubs

export interface SpawnOptions {
  phase: number;
  epic?: number;
  command?: string;
  onOutput?: (line: string) => void;
  onExit?: (code: number) => void;
}

export class ProcessService {
  private workers: Map<string, ChildProcess> = new Map();
  private workerMeta: Map<string, Worker> = new Map();

  spawn(options: SpawnOptions): Worker {
    // SKELETON: Would spawn actual Claude CLI process
    const sessionId = uuidv4();
    const command = options.command || 'claude';

    // In production, would spawn real process
    // const proc = spawn(command, [], { ... });
    // this.workers.set(sessionId, proc);

    const worker: Worker = {
      sessionId,
      phase: options.phase,
      epic: options.epic,
      pid: 0, // Would be actual PID
      startedAt: new Date().toISOString(),
      status: 'running',
    };

    this.workerMeta.set(sessionId, worker);
    return worker;
  }

  kill(sessionId: string): boolean {
    // SKELETON: Would kill by session ID (not wildcard!)
    const proc = this.workers.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.workers.delete(sessionId);
      const meta = this.workerMeta.get(sessionId);
      if (meta) {
        meta.status = 'killed';
      }
      return true;
    }
    return false;
  }

  getWorker(sessionId: string): Worker | undefined {
    return this.workerMeta.get(sessionId);
  }

  getRunningWorkers(): Worker[] {
    return Array.from(this.workerMeta.values()).filter(
      (w) => w.status === 'running'
    );
  }

  updateStatus(sessionId: string, status: WorkerStatus): void {
    const worker = this.workerMeta.get(sessionId);
    if (worker) {
      worker.status = status;
    }
  }

  killAll(): void {
    // SKELETON: Would kill all workers for this project
    for (const sessionId of this.workers.keys()) {
      this.kill(sessionId);
    }
  }
}
