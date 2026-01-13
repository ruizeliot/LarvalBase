/**
 * Process Manager Tests
 *
 * Tests for PID management and message file operations.
 * Note: Spawning/killing tests require real Windows Terminal and are skipped in CI.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const process = require('../index.cjs');

describe('PID Management', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'process-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('getPidDir returns correct path', () => {
    const pidDir = process.getPidDir(tempDir);
    expect(pidDir).toContain('.pipeline');
    expect(pidDir).toContain('pids');
  });

  test('getPidPath returns correct path for role', () => {
    const pidPath = process.getPidPath(tempDir, 'worker');
    expect(pidPath).toContain('worker.pid');
  });

  test('savePid creates PID file', () => {
    process.savePid(tempDir, 'worker', 12345, { phase: '4' });

    const pidPath = process.getPidPath(tempDir, 'worker');
    expect(fs.existsSync(pidPath)).toBe(true);
  });

  test('readPid returns saved data', () => {
    process.savePid(tempDir, 'worker', 12345, { phase: '4' });

    const data = process.readPid(tempDir, 'worker');
    expect(data.pid).toBe(12345);
    expect(data.role).toBe('worker');
    expect(data.phase).toBe('4');
    expect(data.startedAt).toBeDefined();
  });

  test('readPid returns null for non-existent PID', () => {
    const data = process.readPid(tempDir, 'nonexistent');
    expect(data).toBeNull();
  });

  test('removePid deletes PID file', () => {
    process.savePid(tempDir, 'worker', 12345);
    process.removePid(tempDir, 'worker');

    const pidPath = process.getPidPath(tempDir, 'worker');
    expect(fs.existsSync(pidPath)).toBe(false);
  });

  test('getAllPids returns all PID files', () => {
    process.savePid(tempDir, 'worker', 12345);
    process.savePid(tempDir, 'supervisor', 12346);
    process.savePid(tempDir, 'dashboard', 12347);

    const pids = process.getAllPids(tempDir);
    expect(pids.length).toBe(3);

    const roles = pids.map(p => p.role);
    expect(roles).toContain('worker');
    expect(roles).toContain('supervisor');
    expect(roles).toContain('dashboard');
  });

  test('clearAllPids removes all PID files', () => {
    process.savePid(tempDir, 'worker', 12345);
    process.savePid(tempDir, 'supervisor', 12346);

    process.clearAllPids(tempDir);

    const pids = process.getAllPids(tempDir);
    expect(pids.length).toBe(0);
  });

  test('isProcessRunning returns true for current process', () => {
    // Use current process PID which is definitely running
    const running = process.isProcessRunning(global.process.pid);
    expect(running).toBe(true);
  });

  test('isProcessRunning returns false for non-existent PID', () => {
    // Use a very high PID that's unlikely to exist
    const running = process.isProcessRunning(999999999);
    expect(running).toBe(false);
  });

  test('cleanupStalePids removes dead process PIDs', () => {
    // Save a PID for a non-existent process
    process.savePid(tempDir, 'dead-worker', 999999999);

    // Save a PID for a running process (current process)
    process.savePid(tempDir, 'alive-process', global.process.pid);

    const removed = process.cleanupStalePids(tempDir);

    expect(removed).toContain('dead-worker');
    expect(removed).not.toContain('alive-process');

    // Verify only alive process remains
    const pids = process.getAllPids(tempDir);
    expect(pids.length).toBe(1);
    expect(pids[0].role).toBe('alive-process');
  });
});

describe('Message File Operations', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'message-test-'));
    // Create .pipeline directory
    fs.mkdirSync(path.join(tempDir, '.pipeline'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('writeMessageFile creates message file', () => {
    process.writeMessageFile(tempDir, 'Test message');

    const filePath = path.join(tempDir, '.pipeline', 'orchestrator-message.txt');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('readMessageFile returns message and deletes file', () => {
    process.writeMessageFile(tempDir, 'Test message');

    const data = process.readMessageFile(tempDir);
    expect(data.message).toBe('Test message');
    expect(data.timestamp).toBeDefined();

    // File should be deleted after reading
    const filePath = path.join(tempDir, '.pipeline', 'orchestrator-message.txt');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  test('readMessageFile returns null for non-existent file', () => {
    const data = process.readMessageFile(tempDir);
    expect(data).toBeNull();
  });

  test('writeMessageFile with custom filename', () => {
    process.writeMessageFile(tempDir, 'Custom message', 'custom.txt');

    const filePath = path.join(tempDir, '.pipeline', 'custom.txt');
    expect(fs.existsSync(filePath)).toBe(true);

    const data = process.readMessageFile(tempDir, 'custom.txt');
    expect(data.message).toBe('Custom message');
  });
});

describe('Process Status', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('getProcessStatus returns structured status', () => {
    // Create some PIDs
    process.savePid(tempDir, 'worker', 12345);
    process.savePid(tempDir, 'supervisor', 12346);

    const status = process.getProcessStatus(tempDir);

    expect(status.worker).toBeDefined();
    expect(status.supervisor).toBeDefined();
    expect(status.orchestrator).toBeNull();
    expect(status.dashboard).toBeNull();
    expect(status.other).toEqual([]);
  });

  test('getProcessStatus includes running status', () => {
    // Save current process as orchestrator (it's running)
    process.savePid(tempDir, 'orchestrator', global.process.pid);

    // Save fake PID that's not running
    process.savePid(tempDir, 'worker', 999999999);

    const status = process.getProcessStatus(tempDir);

    expect(status.orchestrator.running).toBe(true);
    expect(status.worker.running).toBe(false);
  });

  test('isWorkerAlive returns false when no worker', () => {
    expect(process.isWorkerAlive(tempDir)).toBe(false);
  });

  test('isWorkerAlive returns true for running worker', () => {
    // Use current process PID
    process.savePid(tempDir, 'worker', global.process.pid);
    expect(process.isWorkerAlive(tempDir)).toBe(true);
  });

  test('isWorkerAlive returns false for dead worker', () => {
    process.savePid(tempDir, 'worker', 999999999);
    expect(process.isWorkerAlive(tempDir)).toBe(false);
  });
});

describe('Module Exports', () => {
  test('exports all PID functions', () => {
    expect(typeof process.savePid).toBe('function');
    expect(typeof process.readPid).toBe('function');
    expect(typeof process.removePid).toBe('function');
    expect(typeof process.getAllPids).toBe('function');
    expect(typeof process.clearAllPids).toBe('function');
    expect(typeof process.isProcessRunning).toBe('function');
    expect(typeof process.cleanupStalePids).toBe('function');
  });

  test('exports spawn functions', () => {
    expect(typeof process.spawnWorker).toBe('function');
    expect(typeof process.spawnSupervisor).toBe('function');
    expect(typeof process.spawnDashboard).toBe('function');
    expect(typeof process.createPipelineWindow).toBe('function');
  });

  test('exports kill functions', () => {
    expect(typeof process.killProcess).toBe('function');
    expect(typeof process.killProcessTree).toBe('function');
    expect(typeof process.killWorker).toBe('function');
    expect(typeof process.killSupervisor).toBe('function');
    expect(typeof process.killDashboard).toBe('function');
    expect(typeof process.killAll).toBe('function');
    expect(typeof process.gracefulKill).toBe('function');
  });

  test('exports inject functions', () => {
    expect(typeof process.injectMessage).toBe('function');
    expect(typeof process.injectToWorker).toBe('function');
    expect(typeof process.sendBeginMessage).toBe('function');
    expect(typeof process.sendSlashCommand).toBe('function');
    expect(typeof process.writeMessageFile).toBe('function');
    expect(typeof process.readMessageFile).toBe('function');
  });

  test('exports high-level functions', () => {
    expect(typeof process.getProcessStatus).toBe('function');
    expect(typeof process.isWorkerAlive).toBe('function');
    expect(typeof process.restartWorker).toBe('function');
    expect(typeof process.restartSupervisor).toBe('function');
  });

  test('exports constants', () => {
    expect(process.PIPELINE_DIR).toBe('.pipeline');
    expect(process.PID_DIR).toBe('pids');
  });
});
