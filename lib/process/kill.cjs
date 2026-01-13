/**
 * Process Killing Module
 *
 * Terminate processes and process trees.
 */

'use strict';

const { execSync, spawn } = require('child_process');
const { readPid, removePid, getAllPids } = require('./pid.cjs');

/**
 * Kill a single process by PID
 * @param {number} pid - Process ID
 * @param {boolean} force - Force kill (SIGKILL)
 * @returns {boolean} Success status
 */
function killProcess(pid, force = false) {
  try {
    // On Windows, we use taskkill
    const forceFlag = force ? '/F' : '';
    execSync(`taskkill /PID ${pid} ${forceFlag}`, {
      windowsHide: true,
      stdio: 'pipe'
    });
    return true;
  } catch (err) {
    // Process may already be dead
    return false;
  }
}

/**
 * Kill a process and all its children (process tree)
 * @param {number} pid - Process ID
 * @returns {boolean} Success status
 */
function killProcessTree(pid) {
  try {
    // /T kills the process tree
    execSync(`taskkill /PID ${pid} /T /F`, {
      windowsHide: true,
      stdio: 'pipe'
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Kill a process by role and remove its PID file
 * @param {string} projectPath - Project path
 * @param {string} role - Process role ('worker', 'supervisor', 'dashboard')
 * @returns {boolean} Success status
 */
function killByRole(projectPath, role) {
  const pidData = readPid(projectPath, role);

  if (!pidData) {
    return false;
  }

  const killed = killProcessTree(pidData.pid);
  removePid(projectPath, role);

  return killed;
}

/**
 * Kill the worker process
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function killWorker(projectPath) {
  return killByRole(projectPath, 'worker');
}

/**
 * Kill the supervisor process
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function killSupervisor(projectPath) {
  return killByRole(projectPath, 'supervisor');
}

/**
 * Kill the dashboard process
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function killDashboard(projectPath) {
  return killByRole(projectPath, 'dashboard');
}

/**
 * Kill all pipeline processes for a project
 * @param {string} projectPath - Project path
 * @returns {{ killed: string[], failed: string[] }}
 */
function killAll(projectPath) {
  const pids = getAllPids(projectPath);
  const killed = [];
  const failed = [];

  // Kill in order: worker first, then supervisor, then dashboard
  const order = ['worker', 'supervisor', 'dashboard', 'orchestrator'];

  for (const role of order) {
    const pidData = pids.find(p => p.role === role);
    if (pidData) {
      if (killByRole(projectPath, role)) {
        killed.push(role);
      } else {
        failed.push(role);
      }
    }
  }

  // Kill any remaining processes
  for (const pidData of pids) {
    if (!order.includes(pidData.role)) {
      if (killByRole(projectPath, pidData.role)) {
        killed.push(pidData.role);
      } else {
        failed.push(pidData.role);
      }
    }
  }

  return { killed, failed };
}

/**
 * Graceful shutdown - send interrupt signal first, then force kill after timeout
 * @param {number} pid - Process ID
 * @param {number} timeoutMs - Timeout before force kill
 * @returns {Promise<boolean>}
 */
async function gracefulKill(pid, timeoutMs = 5000) {
  try {
    // First try graceful termination (SIGINT equivalent on Windows)
    execSync(`taskkill /PID ${pid}`, {
      windowsHide: true,
      stdio: 'pipe'
    });

    // Wait for process to exit
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        process.kill(pid, 0); // Check if still running
        await new Promise(r => setTimeout(r, 100));
      } catch {
        return true; // Process exited
      }
    }

    // Force kill if still running
    return killProcess(pid, true);
  } catch {
    return false;
  }
}

module.exports = {
  killProcess,
  killProcessTree,
  killByRole,
  killWorker,
  killSupervisor,
  killDashboard,
  killAll,
  gracefulKill
};
