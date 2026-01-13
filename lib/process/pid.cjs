/**
 * PID Management Module
 *
 * Manages PID files for tracking running processes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PIPELINE_DIR = '.pipeline';
const PID_DIR = 'pids';

/**
 * Get the PID directory path
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
function getPidDir(projectPath) {
  return path.join(projectPath, PIPELINE_DIR, PID_DIR);
}

/**
 * Get the PID file path for a role
 * @param {string} projectPath - Project root path
 * @param {string} role - Process role ('worker', 'supervisor', 'dashboard', 'orchestrator')
 * @returns {string}
 */
function getPidPath(projectPath, role) {
  return path.join(getPidDir(projectPath), `${role}.pid`);
}

/**
 * Ensure PID directory exists
 * @param {string} projectPath - Project root path
 */
function ensurePidDir(projectPath) {
  const pidDir = getPidDir(projectPath);
  if (!fs.existsSync(pidDir)) {
    fs.mkdirSync(pidDir, { recursive: true });
  }
}

/**
 * Save a PID file
 * @param {string} projectPath - Project root path
 * @param {string} role - Process role
 * @param {number} pid - Process ID
 * @param {Object} metadata - Additional metadata
 */
function savePid(projectPath, role, pid, metadata = {}) {
  ensurePidDir(projectPath);

  const pidPath = getPidPath(projectPath, role);
  const data = {
    pid,
    role,
    startedAt: new Date().toISOString(),
    ...metadata
  };

  fs.writeFileSync(pidPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Read a PID file
 * @param {string} projectPath - Project root path
 * @param {string} role - Process role
 * @returns {Object|null} PID data or null if not found
 */
function readPid(projectPath, role) {
  const pidPath = getPidPath(projectPath, role);

  if (!fs.existsSync(pidPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(pidPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Remove a PID file
 * @param {string} projectPath - Project root path
 * @param {string} role - Process role
 */
function removePid(projectPath, role) {
  const pidPath = getPidPath(projectPath, role);

  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
}

/**
 * Get all PID files
 * @param {string} projectPath - Project root path
 * @returns {Object[]} Array of PID data objects
 */
function getAllPids(projectPath) {
  const pidDir = getPidDir(projectPath);

  if (!fs.existsSync(pidDir)) {
    return [];
  }

  const files = fs.readdirSync(pidDir).filter(f => f.endsWith('.pid'));
  const pids = [];

  for (const file of files) {
    const role = file.replace('.pid', '');
    const data = readPid(projectPath, role);
    if (data) {
      pids.push(data);
    }
  }

  return pids;
}

/**
 * Clear all PID files
 * @param {string} projectPath - Project root path
 */
function clearAllPids(projectPath) {
  const pidDir = getPidDir(projectPath);

  if (!fs.existsSync(pidDir)) {
    return;
  }

  const files = fs.readdirSync(pidDir).filter(f => f.endsWith('.pid'));

  for (const file of files) {
    fs.unlinkSync(path.join(pidDir, file));
  }
}

/**
 * Check if a process is still running (Windows)
 * @param {number} pid - Process ID to check
 * @returns {boolean}
 */
function isProcessRunning(pid) {
  try {
    // On Windows, process.kill with signal 0 throws if process doesn't exist
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Clean up stale PID files (processes no longer running)
 * @param {string} projectPath - Project root path
 * @returns {string[]} List of removed roles
 */
function cleanupStalePids(projectPath) {
  const pids = getAllPids(projectPath);
  const removed = [];

  for (const pidData of pids) {
    if (!isProcessRunning(pidData.pid)) {
      removePid(projectPath, pidData.role);
      removed.push(pidData.role);
    }
  }

  return removed;
}

module.exports = {
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
};
