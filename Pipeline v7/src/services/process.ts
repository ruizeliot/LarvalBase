import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { WorkerSession, SpawnWorkerOptions } from '../types/index.js';

const execAsync = promisify(exec);

export class ProcessService extends EventEmitter {
  private currentWorker: WorkerSession | null = null;
  private platform = process.platform;

  async detectWindowsTerminal(): Promise<{ available: boolean; path?: string }> {
    if (this.platform !== 'win32') {
      return { available: false };
    }

    try {
      const { stdout } = await execAsync('where wt');
      const wtPath = stdout.trim().split('\n')[0];
      return { available: true, path: wtPath };
    } catch {
      return { available: false };
    }
  }

  async isWindowsTerminalAvailable(): Promise<boolean> {
    const result = await this.detectWindowsTerminal();
    return result.available;
  }

  generateSessionId(): string {
    return randomUUID();
  }

  async spawnWorker(options: SpawnWorkerOptions): Promise<WorkerSession> {
    const { projectPath, sessionId, phase, command } = options;

    // Determine spawn method based on platform
    const { available: hasWt } = await this.detectWindowsTerminal();

    let childProcess;
    if (this.platform === 'win32' && hasWt) {
      // Windows with Windows Terminal
      childProcess = spawn('wt.exe', [
        '-w', '0',
        'nt',
        '-d', projectPath,
        '--title', `Pipeline Worker - Phase ${phase}`,
        'cmd', '/c', `claude --session-id ${sessionId} ${command}`,
      ], {
        detached: true,
        stdio: 'ignore',
      });
    } else if (this.platform === 'win32') {
      // Windows without Windows Terminal
      childProcess = spawn('cmd', ['/c', 'start', 'cmd', '/k', `cd /d "${projectPath}" && claude --session-id ${sessionId} ${command}`], {
        detached: true,
        stdio: 'ignore',
      });
    } else if (this.platform === 'darwin') {
      // macOS
      const script = `cd "${projectPath}" && claude --session-id ${sessionId} ${command}`;
      childProcess = spawn('osascript', [
        '-e', `tell application "Terminal" to do script "${script.replace(/"/g, '\\"')}"`,
      ], {
        detached: true,
        stdio: 'ignore',
      });
    } else {
      // Linux/other - try gnome-terminal, xterm, or direct
      try {
        childProcess = spawn('gnome-terminal', [
          '--',
          'bash', '-c', `cd "${projectPath}" && claude --session-id ${sessionId} ${command}; exec bash`,
        ], {
          detached: true,
          stdio: 'ignore',
        });
      } catch {
        // Fallback to xterm
        childProcess = spawn('xterm', [
          '-e', `cd "${projectPath}" && claude --session-id ${sessionId} ${command}`,
        ], {
          detached: true,
          stdio: 'ignore',
        });
      }
    }

    childProcess.unref();

    const worker: WorkerSession = {
      sessionId,
      pid: childProcess.pid ?? null,
      status: 'running',
      startedAt: new Date().toISOString(),
      phase,
      epic: options.epic,
    };

    this.currentWorker = worker;
    this.emit('worker:started', worker);

    return worker;
  }

  async killWorker(pid: number): Promise<void> {
    if (!pid) return;

    try {
      if (this.platform === 'win32') {
        await execAsync(`taskkill /PID ${pid} /F /T`);
      } else {
        process.kill(pid, 'SIGTERM');
        // Give it a moment, then force kill if needed
        setTimeout(() => {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            // Already dead
          }
        }, 3000);
      }

      if (this.currentWorker?.pid === pid) {
        this.currentWorker.status = 'stopped';
        this.emit('worker:stopped', this.currentWorker);
      }
    } catch {
      // Process might already be dead
    }
  }

  async stopWorker(pid: number): Promise<boolean> {
    try {
      await this.killWorker(pid);
      return true;
    } catch {
      return false;
    }
  }

  async restartWorker(options: SpawnWorkerOptions & { oldPid?: number | null }): Promise<WorkerSession> {
    if (options.oldPid) {
      await this.stopWorker(options.oldPid);
    }
    return this.spawnWorker(options);
  }

  async focusWorker(pid: number): Promise<void> {
    return this.focusWorkerWindow();
  }

  isWorkerRunning(pid: number): boolean {
    if (!pid) return false;

    try {
      // Send signal 0 to check if process exists (works cross-platform)
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async focusWorkerWindow(): Promise<void> {
    if (this.platform !== 'win32') {
      // TODO: Implement for macOS/Linux
      return;
    }

    try {
      // Try to focus Windows Terminal
      await execAsync('powershell -command "(Get-Process wt -ErrorAction SilentlyContinue | Select-Object -First 1).MainWindowHandle | ForEach-Object { [void][System.Runtime.InteropServices.Marshal]::SetForegroundWindow($_) }"');
    } catch {
      // Ignore focus errors
    }
  }

  getCurrentWorker(): WorkerSession | null {
    return this.currentWorker;
  }

  setWorkerStatus(status: WorkerSession['status']): void {
    if (this.currentWorker) {
      this.currentWorker.status = status;
    }
  }

  clearWorker(): void {
    this.currentWorker = null;
  }
}
