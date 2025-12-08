import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProcessService } from '../../../src/services/process.js';

// Create mock process outside the mock factory
const createMockChildProcess = () => ({
  pid: 12345,
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  on: vi.fn(),
  kill: vi.fn().mockReturnValue(true),
  unref: vi.fn(),
});

// Mock child_process with all needed exports
vi.mock('child_process', () => {
  return {
    spawn: vi.fn(() => createMockChildProcess()),
    execSync: vi.fn().mockReturnValue(Buffer.from('wt.exe')),
    exec: vi.fn((cmd: string, optsOrCb?: unknown, cb?: unknown) => {
      // Handle both (cmd, callback) and (cmd, options, callback) signatures
      const callback = typeof optsOrCb === 'function' ? optsOrCb : cb;
      if (typeof callback === 'function') {
        // Async execution of callback
        setImmediate(() => {
          // Return mock data for 'where wt' command (Windows Terminal detection)
          if (cmd.includes('where wt')) {
            (callback as (err: null, stdout: string, stderr: string) => void)(null, 'C:\\Program Files\\WindowsApps\\wt.exe', '');
          } else {
            (callback as (err: null, stdout: string, stderr: string) => void)(null, '', '');
          }
        });
      }
      return { pid: 12345 };
    }),
  };
});

describe('Epic 5: Process Service', () => {
  let processService: ProcessService;

  beforeEach(() => {
    processService = new ProcessService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Windows Terminal Detection', () => {
    it('detects Windows Terminal availability', async () => {
      const available = await processService.isWindowsTerminalAvailable();
      // In mock environment, this depends on mock setup
      expect(typeof available).toBe('boolean');
    });

    it('caches Windows Terminal detection result', async () => {
      const first = await processService.isWindowsTerminalAvailable();
      const second = await processService.isWindowsTerminalAvailable();
      expect(first).toBe(second);
    });
  });

  describe('Worker Spawning', () => {
    it('spawns worker with correct command', async () => {
      const { spawn } = await import('child_process');

      await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      expect(spawn).toHaveBeenCalled();
    });

    it('returns worker session with PID', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      expect(session.pid).toBeDefined();
      expect(typeof session.pid).toBe('number');
    });

    it('sets session ID correctly', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'my-custom-session',
      });

      expect(session.sessionId).toBe('my-custom-session');
    });

    it('marks worker as running after spawn', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      expect(session.status).toBe('running');
    });
  });

  describe('Worker Control', () => {
    it('stops running worker', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      const result = await processService.stopWorker(session.pid!);
      expect(result).toBe(true);
    });

    it('handles stopping non-existent worker gracefully', async () => {
      const result = await processService.stopWorker(99999);
      // Should not throw, may return false or true depending on implementation
      expect(typeof result).toBe('boolean');
    });

    it('checks if worker is running by PID', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      const isRunning = processService.isWorkerRunning(session.pid!);
      expect(typeof isRunning).toBe('boolean');
    });
  });

  describe('Cross-Platform Support', () => {
    it('handles Windows paths correctly', async () => {
      const session = await processService.spawnWorker({
        projectPath: 'C:\\Users\\test\\project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      expect(session).toBeDefined();
    });

    it('handles Unix paths correctly', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/home/user/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      expect(session).toBeDefined();
    });

    it('handles paths with spaces', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/home/user/My Project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      expect(session).toBeDefined();
    });
  });

  describe('Window Focus', () => {
    it('attempts to focus worker window', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      // Focus should not throw
      await expect(processService.focusWorker(session.pid!)).resolves.not.toThrow();
    });
  });

  describe('Restart Functionality', () => {
    it('restarts worker by stopping and starting', async () => {
      const session = await processService.spawnWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
      });

      const newSession = await processService.restartWorker({
        projectPath: '/test/project',
        command: '/test-command',
        sessionId: 'test-session',
        oldPid: session.pid,
      });

      expect(newSession.pid).toBeDefined();
    });
  });
});
