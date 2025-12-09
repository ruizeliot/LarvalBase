/**
 * Pipeline Run Tracker
 *
 * Tracks all session IDs for each pipeline run so they can be analyzed later.
 * Each pipeline run (new, feature, fix) gets a unique runId and logs all
 * worker sessions per phase.
 *
 * Usage:
 *   const tracker = require('./pipeline-run-tracker.cjs');
 *
 *   // Start a new pipeline run
 *   const runId = tracker.startRun(projectPath, 'feature', 'Calculator Feature');
 *
 *   // Log each phase's session
 *   tracker.logPhaseSession(projectPath, runId, '0a', 'session-uuid-here');
 *
 *   // Get all sessions for a run
 *   const sessions = tracker.getRunSessions(projectPath, runId);
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate a unique run ID
 */
function generateRunId(type) {
  const timestamp = Date.now();
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${type}-${timestamp}-${suffix}`;
}

/**
 * Get path to pipeline runs file
 */
function getRunsFilePath(projectPath) {
  return path.join(projectPath, '.pipeline', 'pipeline-runs.json');
}

/**
 * Load pipeline runs data
 */
function loadRuns(projectPath) {
  const runsFile = getRunsFilePath(projectPath);
  if (fs.existsSync(runsFile)) {
    try {
      return JSON.parse(fs.readFileSync(runsFile, 'utf8'));
    } catch {
      return { runs: [] };
    }
  }
  return { runs: [] };
}

/**
 * Save pipeline runs data
 */
function saveRuns(projectPath, data) {
  const runsFile = getRunsFilePath(projectPath);
  const dir = path.dirname(runsFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(runsFile, JSON.stringify(data, null, 2));
}

/**
 * Start a new pipeline run
 * @param {string} projectPath - Path to project
 * @param {string} type - 'new' | 'feature' | 'fix'
 * @param {string} description - Optional description (e.g., feature name)
 * @returns {string} runId
 */
function startRun(projectPath, type = 'new', description = '') {
  const data = loadRuns(projectPath);

  const runId = generateRunId(type);
  const run = {
    runId,
    type,
    description,
    startedAt: new Date().toISOString(),
    status: 'running',
    phases: {},
    sessions: []
  };

  data.runs.push(run);
  data.currentRunId = runId;

  saveRuns(projectPath, data);
  return runId;
}

/**
 * Log a phase session to the current run
 * @param {string} projectPath - Path to project
 * @param {string} runId - Run ID
 * @param {string} phase - Phase name (e.g., '0a', '1', '2')
 * @param {string} sessionId - Claude session ID
 * @param {object} metadata - Optional metadata (epic info, etc.)
 */
function logPhaseSession(projectPath, runId, phase, sessionId, metadata = {}) {
  const data = loadRuns(projectPath);

  const run = data.runs.find(r => r.runId === runId);
  if (!run) {
    console.error(`Run ${runId} not found`);
    return false;
  }

  // Initialize phase if needed
  if (!run.phases[phase]) {
    run.phases[phase] = {
      sessions: [],
      startedAt: new Date().toISOString()
    };
  }

  // Add session to phase
  const sessionEntry = {
    sessionId,
    startedAt: new Date().toISOString(),
    ...metadata
  };

  run.phases[phase].sessions.push(sessionEntry);
  run.sessions.push(sessionId); // Also add to flat list

  saveRuns(projectPath, data);
  return true;
}

/**
 * Mark a phase as complete
 */
function completePhase(projectPath, runId, phase) {
  const data = loadRuns(projectPath);

  const run = data.runs.find(r => r.runId === runId);
  if (!run || !run.phases[phase]) return false;

  run.phases[phase].status = 'complete';
  run.phases[phase].completedAt = new Date().toISOString();

  saveRuns(projectPath, data);
  return true;
}

/**
 * Complete a pipeline run
 */
function completeRun(projectPath, runId, status = 'complete') {
  const data = loadRuns(projectPath);

  const run = data.runs.find(r => r.runId === runId);
  if (!run) return false;

  run.status = status;
  run.completedAt = new Date().toISOString();

  // Clear current run if this was it
  if (data.currentRunId === runId) {
    data.currentRunId = null;
  }

  saveRuns(projectPath, data);
  return true;
}

/**
 * Get current run ID
 */
function getCurrentRunId(projectPath) {
  const data = loadRuns(projectPath);
  return data.currentRunId || null;
}

/**
 * Get all sessions for a specific run
 */
function getRunSessions(projectPath, runId) {
  const data = loadRuns(projectPath);
  const run = data.runs.find(r => r.runId === runId);
  return run ? run.sessions : [];
}

/**
 * Get detailed run info
 */
function getRunInfo(projectPath, runId) {
  const data = loadRuns(projectPath);
  return data.runs.find(r => r.runId === runId) || null;
}

/**
 * List all runs
 */
function listRuns(projectPath, limit = 10) {
  const data = loadRuns(projectPath);
  return data.runs.slice(-limit).reverse(); // Most recent first
}

/**
 * Get runs by type
 */
function getRunsByType(projectPath, type) {
  const data = loadRuns(projectPath);
  return data.runs.filter(r => r.type === type);
}

module.exports = {
  generateRunId,
  startRun,
  logPhaseSession,
  completePhase,
  completeRun,
  getCurrentRunId,
  getRunSessions,
  getRunInfo,
  listRuns,
  getRunsByType
};
