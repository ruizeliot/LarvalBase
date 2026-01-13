/**
 * Process Manager Module - Public API
 *
 * Main entry point for the Process Manager module.
 * Provides process spawning, killing, PID tracking, and message injection.
 *
 * @module lib/process
 * @version 11.0.0
 */

'use strict';

const {
  PIPELINE_DIR,
  PID_DIR,
  getPidDir,
  getPidPath,
  ensurePidDir,
  savePid,
  readPid,
  removePid,
  getAllPids,
  clearAllPids,
  isProcessRunning,
  cleanupStalePids
} = require('./pid.cjs');

const {
  getScriptsDir,
  executePowerShell,
  spawnWorker,
  spawnSupervisor,
  spawnDashboard,
  createPipelineWindow
} = require('./spawn.cjs');

const {
  killProcess,
  killProcessTree,
  killByRole,
  killWorker,
  killSupervisor,
  killDashboard,
  killAll,
  gracefulKill
} = require('./kill.cjs');

const {
  injectMessage,
  injectToRole,
  injectToWorker,
  sendBeginMessage,
  sendSlashCommand,
  writeMessageFile,
  readMessageFile
} = require('./inject.cjs');

/**
 * Get status of all pipeline processes
 * @param {string} projectPath - Project path
 * @returns {Object} Status object with process info
 */
function getProcessStatus(projectPath) {
  const pids = getAllPids(projectPath);
  const status = {
    orchestrator: null,
    worker: null,
    supervisor: null,
    dashboard: null,
    other: []
  };

  for (const pidData of pids) {
    const running = isProcessRunning(pidData.pid);
    const info = { ...pidData, running };

    switch (pidData.role) {
      case 'orchestrator':
        status.orchestrator = info;
        break;
      case 'worker':
        status.worker = info;
        break;
      case 'supervisor':
        status.supervisor = info;
        break;
      case 'dashboard':
        status.dashboard = info;
        break;
      default:
        status.other.push(info);
    }
  }

  return status;
}

/**
 * Check if worker is alive (running and responsive)
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function isWorkerAlive(projectPath) {
  const pidData = readPid(projectPath, 'worker');

  if (!pidData) {
    return false;
  }

  return isProcessRunning(pidData.pid);
}

/**
 * Restart worker process
 * @param {string} projectPath - Project path
 * @param {string} orchestratorPid - Orchestrator PID
 * @param {string} phase - Current phase
 * @param {Object} options - Spawn options
 * @returns {Promise<{ pid: number }>}
 */
async function restartWorker(projectPath, orchestratorPid, phase, options = {}) {
  // Kill existing worker
  killWorker(projectPath);

  // Wait for process to fully terminate
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Spawn new worker
  return spawnWorker(projectPath, orchestratorPid, phase, options);
}

/**
 * Restart supervisor process
 * @param {string} projectPath - Project path
 * @param {string} orchestratorPid - Orchestrator PID
 * @returns {Promise<{ pid: number }>}
 */
async function restartSupervisor(projectPath, orchestratorPid) {
  killSupervisor(projectPath);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return spawnSupervisor(projectPath, orchestratorPid);
}

// Export public API
module.exports = {
  // Constants
  PIPELINE_DIR,
  PID_DIR,

  // PID Management
  getPidDir,
  getPidPath,
  ensurePidDir,
  savePid,
  readPid,
  removePid,
  getAllPids,
  clearAllPids,
  isProcessRunning,
  cleanupStalePids,

  // Spawning
  getScriptsDir,
  executePowerShell,
  spawnWorker,
  spawnSupervisor,
  spawnDashboard,
  createPipelineWindow,

  // Killing
  killProcess,
  killProcessTree,
  killByRole,
  killWorker,
  killSupervisor,
  killDashboard,
  killAll,
  gracefulKill,

  // Message Injection
  injectMessage,
  injectToRole,
  injectToWorker,
  sendBeginMessage,
  sendSlashCommand,
  writeMessageFile,
  readMessageFile,

  // High-level operations
  getProcessStatus,
  isWorkerAlive,
  restartWorker,
  restartSupervisor
};
