/**
 * worker-lifecycle.cjs - Worker process lifecycle management
 *
 * CRITICAL: Ensures workers are properly killed and don't accumulate.
 *
 * Features:
 * - Track worker PIDs per pipeline instance
 * - Kill previous worker before spawning new one
 * - Clean up all workers on exit
 * - Detect orphan processes
 * - Cross-platform (Windows/Linux/macOS)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_WINDOWS = process.platform === 'win32';

// In-memory tracking of workers for this process
let trackedWorkers = [];
let pipelineInstanceId = null;
let projectIdentifier = null;  // Short hash of project path for scoped window titles

/**
 * Initialize worker lifecycle management for a pipeline
 * @param {string} projectPath - Project path (for manifest storage)
 * @returns {string} Pipeline instance ID
 */
function initWorkerLifecycle(projectPath) {
  pipelineInstanceId = 'pipeline-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
  trackedWorkers = [];

  // Generate a short project identifier for scoped window titles
  // This ensures each project's workers have unique titles
  projectIdentifier = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 8);

  // Read any existing worker PIDs from manifest
  const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.workerPids && Array.isArray(manifest.workerPids)) {
        // These are orphans from a crashed pipeline - offer to clean them
        const orphans = manifest.workerPids.filter(pid => isProcessRunning(pid));
        if (orphans.length > 0) {
          console.log(`\x1b[33m[WORKER] Found ${orphans.length} orphan worker(s) from previous run\x1b[0m`);
          orphans.forEach(pid => {
            console.log(`  - PID ${pid}`);
          });
        }
      }
    } catch (err) {
      // Ignore manifest read errors
    }
  }

  // Set up cleanup handlers
  setupCleanupHandlers(projectPath);

  return pipelineInstanceId;
}

/**
 * Check if a process is running
 * @param {number} pid - Process ID
 * @returns {boolean} True if running
 */
function isProcessRunning(pid) {
  try {
    if (IS_WINDOWS) {
      const result = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV 2>nul`, {
        encoding: 'utf8',
        timeout: 5000
      });
      return result.includes(String(pid));
    } else {
      // On Unix, kill -0 checks if process exists
      process.kill(pid, 0);
      return true;
    }
  } catch (err) {
    return false;
  }
}

/**
 * Kill a process by PID
 * @param {number} pid - Process ID
 * @param {string} reason - Reason for killing (for logging)
 * @returns {boolean} True if killed successfully
 */
function killProcess(pid, reason = 'cleanup') {
  if (!pid) return false;

  try {
    if (IS_WINDOWS) {
      // Kill the process tree (includes child processes)
      execSync(`taskkill /F /T /PID ${pid} 2>nul`, {
        timeout: 10000,
        stdio: 'ignore'
      });
    } else {
      // On Unix, kill the process group
      try {
        process.kill(-pid, 'SIGTERM');
      } catch (e) {
        // If process group kill fails, try direct kill
        process.kill(pid, 'SIGTERM');
      }

      // Wait briefly then force kill if still running
      setTimeout(() => {
        if (isProcessRunning(pid)) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch (e) { /* ignore */ }
        }
      }, 5000);
    }

    console.log(`\x1b[90m[WORKER] Killed PID ${pid} (${reason})\x1b[0m`);
    return true;
  } catch (err) {
    // Process might have already exited
    return false;
  }
}

/**
 * Kill previous worker before spawning new one (CRITICAL)
 * @param {string} projectPath - Project path
 * @returns {number} Number of workers killed
 */
function killPreviousWorkers(projectPath) {
  let killedCount = 0;

  // Kill in-memory tracked workers (by PID - most reliable)
  for (const worker of trackedWorkers) {
    if (worker.pid && isProcessRunning(worker.pid)) {
      if (killProcess(worker.pid, 'new worker spawn')) {
        killedCount++;
      }
    }
  }
  trackedWorkers = [];

  // NOTE: We intentionally do NOT use wildcard window title matching here.
  // The old code used: taskkill /FI "WINDOWTITLE eq Pipeline-Worker-*" /F
  // This was DANGEROUS because it killed ALL worker windows across ALL projects.
  // Now we only kill workers we've tracked by PID.

  return killedCount;
}

/**
 * Get the project identifier for scoped window titles
 * @returns {string} 8-character hex identifier
 */
function getProjectIdentifier() {
  return projectIdentifier;
}

/**
 * Generate a project-scoped window title for a worker
 * @param {string} phase - Phase number
 * @returns {string} Window title like "Pipeline-Worker-abc12345-3-1234567890"
 */
function generateWorkerWindowTitle(phase) {
  if (!projectIdentifier) {
    // Fallback if not initialized (shouldn't happen)
    return 'Pipeline-Worker-' + phase + '-' + Date.now();
  }
  return 'Pipeline-Worker-' + projectIdentifier + '-' + phase + '-' + Date.now();
}

/**
 * Kill worker by project-scoped window title
 * @param {string} title - Exact window title to kill
 * @returns {boolean} True if killed
 */
function killWorkerByTitle(title) {
  if (!title || !IS_WINDOWS) return false;

  try {
    // Use exact title match (eq), not wildcard
    execSync('taskkill /FI "WINDOWTITLE eq ' + title + '" /F 2>nul', {
      timeout: 5000,
      stdio: 'ignore'
    });
    console.log(`\x1b[90m[WORKER] Killed window: ${title}\x1b[0m`);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Register a spawned worker
 * @param {number} pid - Process ID
 * @param {string} phase - Phase number
 * @param {object} metadata - Additional metadata
 * @param {string} projectPath - Project path for manifest
 */
function registerWorker(pid, phase, metadata = {}, projectPath = null) {
  const worker = {
    pid,
    phase,
    pipelineInstanceId,
    spawnedAt: new Date().toISOString(),
    ...metadata
  };

  trackedWorkers.push(worker);

  // Persist to manifest if project path provided
  if (projectPath) {
    persistWorkerPids(projectPath);
  }

  console.log(`\x1b[90m[WORKER] Registered PID ${pid} for phase ${phase}\x1b[0m`);
}

/**
 * Persist worker PIDs to manifest
 * @param {string} projectPath - Project path
 */
function persistWorkerPids(projectPath) {
  const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.workerPids = trackedWorkers.map(w => w.pid);
    manifest.pipelineInstanceId = pipelineInstanceId;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.error(`\x1b[31m[WORKER] Failed to persist PIDs: ${err.message}\x1b[0m`);
  }
}

/**
 * Clean up all workers
 * @param {string} projectPath - Project path
 * @returns {number} Number of workers killed
 */
function cleanupAllWorkers(projectPath) {
  let killedCount = 0;

  // Kill all tracked workers
  for (const worker of trackedWorkers) {
    if (worker.pid && isProcessRunning(worker.pid)) {
      if (killProcess(worker.pid, 'pipeline exit')) {
        killedCount++;
      }
    }
  }
  trackedWorkers = [];

  // Clear PIDs from manifest
  if (projectPath) {
    const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.workerPids = [];
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      } catch (err) { /* ignore */ }
    }
  }

  if (killedCount > 0) {
    console.log(`\x1b[32m[WORKER] Cleaned up ${killedCount} worker(s)\x1b[0m`);
  }

  return killedCount;
}

/**
 * Set up cleanup handlers for process exit
 * @param {string} projectPath - Project path
 */
function setupCleanupHandlers(projectPath) {
  const cleanup = () => {
    cleanupAllWorkers(projectPath);
  };

  // Handle various exit scenarios
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('uncaughtException', (err) => {
    console.error(`\x1b[31m[WORKER] Uncaught exception: ${err.message}\x1b[0m`);
    cleanup();
    process.exit(1);
  });
}

/**
 * Find orphan Claude processes (not tracked by any pipeline)
 * @returns {Array} Array of { pid, age } objects
 */
function findOrphanProcesses() {
  const orphans = [];

  try {
    if (IS_WINDOWS) {
      const result = execSync('tasklist /FI "IMAGENAME eq claude.exe" /FO CSV 2>nul', {
        encoding: 'utf8',
        timeout: 10000
      });

      const lines = result.split('\n').filter(line => line.includes('claude'));
      for (const line of lines) {
        const match = line.match(/"claude\.exe","(\d+)"/);
        if (match) {
          const pid = parseInt(match[1]);
          // Check if this PID is tracked
          const isTracked = trackedWorkers.some(w => w.pid === pid);
          if (!isTracked) {
            orphans.push({ pid, name: 'claude.exe' });
          }
        }
      }
    } else {
      const result = execSync('pgrep -a claude 2>/dev/null || true', {
        encoding: 'utf8',
        timeout: 10000
      });

      const lines = result.trim().split('\n').filter(l => l);
      for (const line of lines) {
        const match = line.match(/^(\d+)/);
        if (match) {
          const pid = parseInt(match[1]);
          const isTracked = trackedWorkers.some(w => w.pid === pid);
          if (!isTracked) {
            orphans.push({ pid, name: 'claude' });
          }
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }

  return orphans;
}

/**
 * Kill orphan processes
 * @param {Array} orphans - Array from findOrphanProcesses
 * @returns {number} Number killed
 */
function killOrphans(orphans) {
  let killedCount = 0;

  for (const orphan of orphans) {
    if (killProcess(orphan.pid, 'orphan cleanup')) {
      killedCount++;
    }
  }

  return killedCount;
}

/**
 * Get current worker count
 * @returns {number} Number of tracked workers
 */
function getWorkerCount() {
  return trackedWorkers.filter(w => w.pid && isProcessRunning(w.pid)).length;
}

/**
 * Get tracked workers
 * @returns {Array} Array of worker objects
 */
function getTrackedWorkers() {
  return trackedWorkers.map(w => ({
    ...w,
    isRunning: isProcessRunning(w.pid)
  }));
}

module.exports = {
  initWorkerLifecycle,
  isProcessRunning,
  killProcess,
  killPreviousWorkers,
  registerWorker,
  persistWorkerPids,
  cleanupAllWorkers,
  findOrphanProcesses,
  killOrphans,
  getWorkerCount,
  getTrackedWorkers,
  getProjectIdentifier,
  generateWorkerWindowTitle,
  killWorkerByTitle
};
