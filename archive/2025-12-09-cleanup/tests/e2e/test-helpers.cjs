/**
 * test-helpers.cjs - E2E Test Helpers
 *
 * Provides utilities for E2E testing with REAL Claude workers.
 * Workers spawn in MINIMIZED windows to avoid cluttering the screen during tests.
 * This ensures E2E tests match production conditions exactly.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawn, spawnSync } = require('child_process');

const IS_WINDOWS = process.platform === 'win32';
const PIPELINE_OFFICE = path.resolve(__dirname, '..', '..');

// E2E Test Mode: spawn workers in minimized windows
const E2E_TEST_MODE = true;

// CRITICAL: Record Claude PIDs that existed BEFORE tests started
// These must NEVER be killed (includes the Claude session running the tests)
let PROTECTED_PIDS = [];

/**
 * Initialize protected PIDs - call this ONCE at test suite start
 * Records all Claude processes that existed before any tests spawn workers
 */
function initProtectedPids() {
  PROTECTED_PIDS = getClaudePids();
  console.log(`[test-helpers] Protected PIDs (pre-existing Claude sessions): ${PROTECTED_PIDS.join(', ') || 'none'}`);
  return PROTECTED_PIDS;
}

/**
 * Get the list of protected PIDs
 */
function getProtectedPids() {
  return [...PROTECTED_PIDS];
}

/**
 * Create a temporary test project with .pipeline folder
 * @param {string} prefix - Prefix for temp folder name
 * @returns {object} { projectPath, pipelineDir, manifestPath, cleanup }
 */
function createTestProject(prefix = 'e2e-test') {
  const projectPath = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  const pipelineDir = path.join(projectPath, '.pipeline');
  const manifestPath = path.join(pipelineDir, 'manifest.json');

  fs.mkdirSync(pipelineDir, { recursive: true });

  return {
    projectPath,
    pipelineDir,
    manifestPath,
    cleanup: () => {
      try {
        fs.rmSync(projectPath, { recursive: true, force: true });
      } catch (e) { /* ignore */ }
    }
  };
}

/**
 * Create a manifest with specified configuration
 * @param {string} manifestPath - Path to manifest.json
 * @param {object} config - Manifest configuration
 * @returns {object} Created manifest
 */
function createManifest(manifestPath, config = {}) {
  const manifest = {
    projectId: config.projectId || 'test-project',
    projectPath: path.dirname(path.dirname(manifestPath)),
    currentPhase: config.currentPhase || '1',
    status: config.status || 'pending',
    mode: config.mode || 'new',
    createdAt: config.createdAt || new Date().toISOString(),
    pipelineInstanceId: config.pipelineInstanceId || `test-${Date.now()}`,
    workerPids: config.workerPids || [],
    phases: config.phases || {
      '1': { status: 'pending' },
      '2': { status: 'pending' },
      '3': { status: 'pending' },
      '4': { status: 'pending' },
      '5': { status: 'pending' }
    },
    ...config
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * Read manifest from path
 * @param {string} manifestPath - Path to manifest.json
 * @returns {object|null} Manifest or null
 */
function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Update manifest with partial data
 * @param {string} manifestPath - Path to manifest.json
 * @param {object} updates - Fields to update
 * @returns {object} Updated manifest
 */
function updateManifest(manifestPath, updates) {
  const manifest = readManifest(manifestPath) || {};
  Object.assign(manifest, updates);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * Simulate a todo file being written by a worker
 * @param {string} todosDir - Todos directory
 * @param {string} sessionId - Session ID
 * @param {Array} todos - Array of { content, status } objects
 * @returns {string} Path to todo file
 */
function simulateTodoFile(todosDir, sessionId, todos) {
  if (!fs.existsSync(todosDir)) {
    fs.mkdirSync(todosDir, { recursive: true });
  }

  const todoFile = path.join(todosDir, `${sessionId}-agent-${sessionId}.json`);
  const content = { todos };
  fs.writeFileSync(todoFile, JSON.stringify(content, null, 2));
  return todoFile;
}

/**
 * Simulate todo progress (update status over time)
 * @param {string} todoFile - Path to todo file
 * @param {number} completedCount - Number of todos to mark completed
 */
function simulateTodoProgress(todoFile, completedCount) {
  if (!fs.existsSync(todoFile)) return;

  const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
  const todos = content.todos || [];

  for (let i = 0; i < Math.min(completedCount, todos.length); i++) {
    todos[i].status = 'completed';
  }

  // Mark next one as in_progress if any remaining
  if (completedCount < todos.length) {
    todos[completedCount].status = 'in_progress';
  }

  fs.writeFileSync(todoFile, JSON.stringify({ todos }, null, 2));
}

/**
 * Simulate all todos complete
 * @param {string} todoFile - Path to todo file
 */
function simulateAllTodosComplete(todoFile) {
  if (!fs.existsSync(todoFile)) return;

  const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
  const todos = content.todos || [];

  todos.forEach(t => t.status = 'completed');

  fs.writeFileSync(todoFile, JSON.stringify({ todos }, null, 2));
}

/**
 * Create sample todos for a phase
 * @param {string} phase - Phase number
 * @returns {Array} Array of todo objects
 */
function createSampleTodos(phase) {
  const todosByPhase = {
    '1': [
      { content: 'Analyze user requirements', status: 'pending' },
      { content: 'Create user stories', status: 'pending' },
      { content: 'Design initial mockups', status: 'pending' }
    ],
    '2': [
      { content: 'Define technical specifications', status: 'pending' },
      { content: 'Create E2E test specs', status: 'pending' },
      { content: 'Document tech stack', status: 'pending' }
    ],
    '3': [
      { content: 'Initialize project structure', status: 'pending' },
      { content: 'Create skeleton files', status: 'pending' },
      { content: 'Write failing E2E tests', status: 'pending' },
      { content: 'Verify tests fail correctly', status: 'pending' }
    ],
    '4': [
      { content: 'Implement feature code', status: 'pending' },
      { content: 'Fix failing tests', status: 'pending' },
      { content: 'Ensure all tests pass', status: 'pending' },
      { content: 'Refactor for quality', status: 'pending' },
      { content: 'Run full test suite', status: 'pending' }
    ],
    '5': [
      { content: 'Review code quality', status: 'pending' },
      { content: 'Update documentation', status: 'pending' },
      { content: 'Final verification', status: 'pending' }
    ]
  };

  return todosByPhase[phase] || [];
}

/**
 * Get the Claude todos directory
 * @returns {string} Path to todos directory
 */
function getTodosDir() {
  return path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'todos');
}

/**
 * Clean up a session's todo file
 * @param {string} sessionId - Session ID
 */
function cleanupTodoFile(sessionId) {
  const todosDir = getTodosDir();
  const todoFile = path.join(todosDir, `${sessionId}-agent-${sessionId}.json`);
  if (fs.existsSync(todoFile)) {
    fs.unlinkSync(todoFile);
  }
}

/**
 * Count Claude processes
 * NOTE: Claude CLI runs as node.exe with @anthropic-ai/claude-code/cli.js
 * @returns {number} Number of Claude CLI processes
 */
function countClaudeProcesses() {
  try {
    const pids = getClaudePids();
    return pids.length;
  } catch (e) {
    return 0;
  }
}

/**
 * Get Claude process PIDs
 * NOTE: Claude CLI runs as node.exe with @anthropic-ai/claude-code/cli.js
 * @returns {Array} Array of PIDs
 */
function getClaudePids() {
  try {
    if (IS_WINDOWS) {
      // Claude runs as node.exe with claude-code/cli.js in command line
      // Use wmic to get node processes and filter by command line
      const output = execSync('wmic process where "name=\'node.exe\'" get processid,commandline /format:csv 2>nul', {
        encoding: 'utf8',
        timeout: 15000
      });

      const pids = [];
      const lines = output.trim().split('\n');
      for (const line of lines) {
        // Look for claude-code in the command line
        if (line.includes('claude-code') || line.includes('@anthropic-ai')) {
          // CSV format: Node,CommandLine,ProcessId
          const parts = line.split(',');
          const pidStr = parts[parts.length - 1];
          const pid = parseInt(pidStr.trim());
          if (!isNaN(pid) && pid > 0) {
            pids.push(pid);
          }
        }
      }
      return pids;
    } else {
      // On Linux/Mac, try to find node processes running claude
      const output = execSync('pgrep -f "claude-code" 2>/dev/null || true', {
        encoding: 'utf8',
        timeout: 5000
      });
      return output.trim().split('\n').filter(p => p).map(p => parseInt(p));
    }
  } catch (e) {
    console.error('[test-helpers] Error getting Claude PIDs:', e.message);
    return [];
  }
}

/**
 * Kill process by PID
 * @param {number} pid - Process ID
 * @returns {boolean} True if killed
 */
function killProcess(pid) {
  try {
    if (IS_WINDOWS) {
      // Use PowerShell which works better in Git Bash
      execSync(`powershell.exe -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`, { timeout: 10000 });
    } else {
      execSync(`kill -9 ${pid} 2>/dev/null || true`, { timeout: 5000 });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if process is running
 * @param {number} pid - Process ID
 * @returns {boolean} True if running
 */
function isProcessRunning(pid) {
  try {
    if (IS_WINDOWS) {
      // Use PowerShell which works better in Git Bash
      const result = execSync(`powershell.exe -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`, {
        encoding: 'utf8',
        timeout: 10000
      });
      return result.trim() === String(pid);
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch (e) {
    return false;
  }
}

/**
 * Wait for condition with timeout
 * @param {Function} conditionFn - Async function returning boolean
 * @param {number} timeoutMs - Timeout in ms
 * @param {number} intervalMs - Check interval in ms
 * @returns {Promise<boolean>} True if condition met before timeout
 */
async function waitFor(conditionFn, timeoutMs = 10000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await conditionFn()) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Create epic list for manifest
 * @param {number} count - Number of epics
 * @returns {Array} Array of epic objects
 */
function createEpicList(count) {
  const epics = [];
  for (let i = 1; i <= count; i++) {
    epics.push({
      id: `epic-${i}`,
      name: `Epic ${i}: Feature ${String.fromCharCode(64 + i)}`,
      status: 'pending',
      stories: [`US-${i}-001`, `US-${i}-002`]
    });
  }
  return epics;
}

/**
 * Simulate epic completion
 * @param {string} manifestPath - Path to manifest
 * @param {string} epicId - Epic ID to complete
 */
function simulateEpicComplete(manifestPath, epicId) {
  const manifest = readManifest(manifestPath);
  if (!manifest || !manifest.phases || !manifest.phases['4']) return;

  const epics = manifest.phases['4'].epicLoops || [];
  const epic = epics.find(e => e.id === epicId);
  if (epic) {
    epic.status = 'complete';
    epic.completedAt = new Date().toISOString();
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Create a mock log file
 * @param {string} logPath - Path to log file
 * @param {Array} entries - Log entries
 */
function createMockLogFile(logPath, entries) {
  const content = entries.map(e => `[${new Date().toISOString()}] ${e}`).join('\n');
  fs.writeFileSync(logPath, content);
}

/**
 * Read log file entries
 * @param {string} logPath - Path to log file
 * @returns {Array} Array of log entries
 */
function readLogEntries(logPath) {
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l);
}

/**
 * Create pipeline runs file
 * @param {string} runsPath - Path to pipeline-runs.json
 * @param {Array} runs - Array of run objects
 */
function createPipelineRunsFile(runsPath, runs = []) {
  fs.writeFileSync(runsPath, JSON.stringify({ runs }, null, 2));
}

/**
 * Read pipeline runs
 * @param {string} runsPath - Path to pipeline-runs.json
 * @returns {object} Runs data
 */
function readPipelineRuns(runsPath) {
  if (!fs.existsSync(runsPath)) return { runs: [] };
  try {
    return JSON.parse(fs.readFileSync(runsPath, 'utf8'));
  } catch (e) {
    return { runs: [] };
  }
}

// ============ REAL WORKER SPAWNING (E2E Tests) ============

/**
 * Spawn a REAL Claude worker in a MINIMIZED window
 * This matches production conditions exactly, except windows are minimized
 *
 * @param {string} projectPath - Path to project
 * @param {string} command - Claude command to run (e.g., "/0a-pipeline-brainstorm-feature-v6.0")
 * @param {object} options - Options
 * @param {string} options.title - Window title
 * @param {boolean} options.minimized - Whether to minimize (default: true for tests)
 * @param {string} options.sessionId - Optional session ID for resume
 * @returns {object} { pid, sessionId, title, cleanup }
 */
function spawnRealWorker(projectPath, command, options = {}) {
  const title = options.title || `E2E-Test-${Date.now()}`;
  const sessionId = options.sessionId || generateSessionId();
  // For tests, use fewer max-turns so Claude exits quickly after completing
  // Production uses 200, but tests only need 3-5 turns
  const maxTurns = options.maxTurns || 3;

  // Build Claude command
  let claudeCmd;
  if (options.resume) {
    claudeCmd = `claude --continue --dangerously-skip-permissions --max-turns ${maxTurns}`;
  } else {
    claudeCmd = `claude "${command}" --dangerously-skip-permissions --max-turns ${maxTurns}`;
  }

  let proc;
  const minimized = options.minimized !== false; // Default to minimized
  if (IS_WINDOWS) {
    // Spawn in a plain CMD window (not Windows Terminal)
    // Plain CMD windows close automatically when the process is killed
    const winPath = projectPath.replace(/\//g, '\\');
    // start [/MIN] /D<dir> "title" cmd /c <command>
    // /MIN makes it minimized (optional), /D sets working dir, "title" sets window title
    const startArgs = minimized
      ? ['/c', 'start', '/MIN', `/D${winPath}`, `"${title}"`, 'cmd', '/c', claudeCmd]
      : ['/c', 'start', `/D${winPath}`, `"${title}"`, 'cmd', '/c', claudeCmd];
    proc = spawn('cmd.exe', startArgs, {
      detached: true,
      stdio: 'ignore'
    });
  } else {
    // Linux/macOS
    proc = spawn('bash', ['-c', `cd "${projectPath}" && ${claudeCmd}`], {
      detached: true,
      stdio: 'ignore'
    });
  }
  proc.unref();

  // Track spawned workers for cleanup
  const workerInfo = {
    pid: null, // Will be populated after spawn completes
    sessionId,
    title,
    projectPath,
    spawnedAt: Date.now(),
    cleanup: () => cleanupWorker(workerInfo)
  };

  // Poll for the Claude PID after Windows Terminal spawns it
  // wt.exe spawns claude asynchronously, so we need to wait
  setTimeout(() => {
    try {
      const allPids = getClaudePids();
      // CRITICAL: Only consider PIDs that are NOT protected (not the test runner!)
      const newPids = allPids.filter(pid => !PROTECTED_PIDS.includes(pid));
      if (newPids.length > 0) {
        // Get newest PID (most recently spawned) that isn't protected
        workerInfo.pid = newPids[newPids.length - 1];
        console.log(`[test-helpers] Worker PID assigned: ${workerInfo.pid} (protected: ${PROTECTED_PIDS.join(',')})`);
      }
    } catch (e) {
      // Non-critical
    }
  }, 3000);

  return workerInfo;
}

/**
 * Cleanup a spawned worker
 * SAFE: Only kills the specific worker, never protected PIDs
 * Uses wmic delete which properly closes Windows Terminal tabs
 * @param {object} workerInfo - Worker info from spawnRealWorker
 */
function cleanupWorker(workerInfo) {
  if (workerInfo.pid) {
    // CRITICAL: Never kill protected PIDs
    if (PROTECTED_PIDS.includes(workerInfo.pid)) {
      console.log(`[test-helpers] cleanupWorker: SKIPPING protected PID ${workerInfo.pid}`);
      return;
    }

    if (IS_WINDOWS) {
      // Use wmic delete which properly closes the window/tab
      try {
        execSync(`wmic process where "ProcessId=${workerInfo.pid}" delete 2>nul`, {
          encoding: 'utf8',
          timeout: 5000
        });
        console.log(`[test-helpers] Deleted process ${workerInfo.pid} via wmic`);
      } catch (e) {
        // Fallback to regular kill
        killProcess(workerInfo.pid);
      }
    } else {
      killProcess(workerInfo.pid);
    }
  }
}

/**
 * Spawn the dashboard orchestrator in minimized mode for E2E tests
 * @param {string} projectPath - Path to project
 * @param {object} options - Options
 * @param {string} options.mode - Pipeline mode (new/feature/fix)
 * @param {boolean} options.minimized - Minimize window (default: true)
 * @returns {object} { proc, manifestPath, cleanup }
 */
function spawnDashboard(projectPath, options = {}) {
  const minimized = options.minimized !== false;
  const mode = options.mode || 'new';

  const dashboardPath = path.join(PIPELINE_OFFICE, 'bin', 'pipeline-dashboard.cjs');
  const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');

  // Ensure .pipeline directory exists
  const pipelineDir = path.join(projectPath, '.pipeline');
  if (!fs.existsSync(pipelineDir)) {
    fs.mkdirSync(pipelineDir, { recursive: true });
  }

  let proc;
  const args = [dashboardPath, projectPath, '--mode', mode];

  if (IS_WINDOWS && minimized) {
    // Spawn dashboard in minimized window using PowerShell
    const nodeCmd = `node ${args.map(a => `"${a}"`).join(' ')}`;
    const psCommand = `Start-Process -WindowStyle Minimized -FilePath 'cmd.exe' -ArgumentList '/k', '${nodeCmd.replace(/'/g, "''")}'`;
    proc = spawn('powershell.exe', ['-Command', psCommand], {
      detached: true,
      stdio: 'ignore',
      cwd: projectPath
    });
  } else {
    // Normal spawn
    proc = spawn('node', args, {
      detached: !IS_WINDOWS,
      stdio: 'ignore',
      cwd: projectPath
    });
  }

  proc.unref();

  // Track spawned worker PIDs for safe cleanup
  const spawnedPids = [];

  return {
    proc,
    manifestPath,
    projectPath,
    spawnedPids, // Track PIDs spawned by this dashboard
    addSpawnedPid: (pid) => spawnedPids.push(pid),
    cleanup: () => {
      try {
        if (proc.pid) {
          process.kill(proc.pid);
        }
        // Only kill tracked PIDs, NOT all Claude processes
        killTestClaudeProcesses(spawnedPids);
      } catch (e) {
        // Ignore
      }
    }
  };
}

/**
 * Kill Claude processes spawned by tests (SAFE version)
 * Only kills processes that were tracked during test run
 * NEVER kills protected PIDs (pre-existing Claude sessions like the test runner)
 * Uses wmic delete on Windows to properly close windows/tabs
 *
 * @param {Array<number>} pidsToKill - Specific PIDs to kill (from spawnedWorkers)
 */
function killTestClaudeProcesses(pidsToKill = []) {
  for (const pid of pidsToKill) {
    // CRITICAL: Never kill protected PIDs
    if (PROTECTED_PIDS.includes(pid)) {
      console.log(`[test-helpers] SKIPPING protected PID ${pid} - this is a pre-existing Claude session`);
      continue;
    }
    try {
      if (IS_WINDOWS) {
        // Use wmic delete which properly closes the window/tab
        execSync(`wmic process where "ProcessId=${pid}" delete 2>nul`, {
          encoding: 'utf8',
          timeout: 5000
        });
      } else {
        killProcess(pid);
      }
    } catch (e) {
      // Ignore - process may already be gone
    }
  }

  // Also close any orphaned E2E test windows
  if (IS_WINDOWS) {
    closeE2ETestWindows();
  }
}

/**
 * Close all E2E test windows
 * DISABLED: Wildcard patterns are too dangerous and can kill the test runner
 * We now rely solely on explicit PID-based cleanup via cleanupWorker() and killTestClaudeProcesses()
 * which track spawned PIDs and only kill those specific processes
 */
function closeE2ETestWindows() {
  // INTENTIONALLY EMPTY - wildcard cleanup was killing the test runner
  // All cleanup is now done via explicit PID tracking
}

/**
 * Kill all Claude processes EXCEPT those in the exclusion list
 * Use this only when you need aggressive cleanup and know what you're doing
 * Always excludes protected PIDs (pre-existing Claude sessions)
 *
 * @param {Array<number>} excludePids - Additional PIDs to NOT kill
 */
function killAllClaudeProcessesExcept(excludePids = []) {
  try {
    const allPids = getClaudePids();
    // Combine exclusion list with protected PIDs
    const allExcluded = [...new Set([...excludePids, ...PROTECTED_PIDS])];
    const pidsToKill = allPids.filter(pid => !allExcluded.includes(pid));

    for (const pid of pidsToKill) {
      killProcess(pid);
    }
  } catch (e) {
    // Ignore errors
  }
}

/**
 * @deprecated Use killTestClaudeProcesses instead - this kills ALL claude including the test runner!
 * Kill all Claude processes (DANGEROUS - will kill test runner too!)
 */
function killAllClaudeProcesses() {
  console.warn('WARNING: killAllClaudeProcesses is deprecated and dangerous! Use killTestClaudeProcesses instead.');
  try {
    const allPids = getClaudePids();
    for (const pid of allPids) {
      killProcess(pid);
    }
  } catch (e) {
    // Ignore - no processes to kill
  }
}

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return `e2e-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Wait for manifest to reach a specific phase
 * @param {string} manifestPath - Path to manifest
 * @param {string} targetPhase - Phase to wait for
 * @param {number} timeoutMs - Timeout in ms (default: 60000)
 * @returns {Promise<boolean>} True if reached
 */
async function waitForPhase(manifestPath, targetPhase, timeoutMs = 60000) {
  return waitFor(() => {
    const manifest = readManifest(manifestPath);
    return manifest && manifest.currentPhase === targetPhase;
  }, timeoutMs);
}

/**
 * Wait for manifest status
 * @param {string} manifestPath - Path to manifest
 * @param {string} targetStatus - Status to wait for
 * @param {number} timeoutMs - Timeout in ms
 * @returns {Promise<boolean>} True if reached
 */
async function waitForStatus(manifestPath, targetStatus, timeoutMs = 30000) {
  return waitFor(() => {
    const manifest = readManifest(manifestPath);
    return manifest && manifest.status === targetStatus;
  }, timeoutMs);
}

/**
 * Wait for a Claude worker process to appear
 * Only detects NEW processes that are NOT protected
 * @param {number} timeoutMs - Timeout in ms
 * @returns {Promise<number|null>} PID if found, null if timeout
 */
async function waitForClaudeProcess(timeoutMs = 15000) {
  const startPids = getClaudePids();
  const found = await waitFor(() => {
    const currentPids = getClaudePids();
    // Look for a new PID that wasn't there before AND isn't protected
    const newPids = currentPids.filter(p =>
      !startPids.includes(p) && !PROTECTED_PIDS.includes(p)
    );
    return newPids.length > 0;
  }, timeoutMs, 500);

  if (found) {
    const currentPids = getClaudePids();
    const newPids = currentPids.filter(p =>
      !startPids.includes(p) && !PROTECTED_PIDS.includes(p)
    );
    return newPids[0] || null;
  }
  return null;
}

/**
 * Wait for a spawned worker to get its PID assigned
 * The PID is assigned via setTimeout(3000) after spawn, so we wait for it
 * @param {object} workerInfo - Worker info object from spawnRealWorker
 * @param {number} timeoutMs - Timeout in ms (default 10000)
 * @returns {Promise<number|null>} PID or null if timeout
 */
async function waitForWorkerPid(workerInfo, timeoutMs = 10000) {
  const found = await waitFor(() => {
    return workerInfo.pid !== null && workerInfo.pid !== undefined;
  }, timeoutMs, 200);
  return found ? workerInfo.pid : null;
}

/**
 * Get the worker commands for each phase
 * @returns {object} Map of phase to command
 */
function getWorkerCommands() {
  return {
    '1': '/0a-pipeline-v4-brainstorm',
    '2': '/0b-pipeline-v4-technical',
    '3': '/1-pipeline-v4-bootstrap',
    '4': '/2-pipeline-v4-implementEpic',
    '5': '/3-pipeline-v4-finalize'
  };
}

module.exports = {
  // Constants
  IS_WINDOWS,
  PIPELINE_OFFICE,
  E2E_TEST_MODE,

  // Test project management
  createTestProject,
  createManifest,
  readManifest,
  updateManifest,

  // Todo simulation (for unit tests that don't need real workers)
  simulateTodoFile,
  simulateTodoProgress,
  simulateAllTodosComplete,
  createSampleTodos,
  getTodosDir,
  cleanupTodoFile,

  // Process management - CRITICAL: call initProtectedPids() before tests!
  initProtectedPids,            // MUST call first - records PIDs to never kill
  getProtectedPids,             // Get list of protected PIDs
  countClaudeProcesses,
  getClaudePids,
  killProcess,
  isProcessRunning,
  killTestClaudeProcesses,      // SAFE - kills only tracked PIDs, never protected
  killAllClaudeProcessesExcept, // SAFER - kills all except specified + protected
  killAllClaudeProcesses,       // DEPRECATED - dangerous, kills test runner too!
  closeE2ETestWindows,          // Close all E2E-Test-* windows (Windows only)

  // Async helpers
  waitFor,
  waitForPhase,
  waitForStatus,
  waitForClaudeProcess,
  waitForWorkerPid,

  // Epic management
  createEpicList,
  simulateEpicComplete,

  // Logging
  createMockLogFile,
  readLogEntries,

  // Pipeline runs
  createPipelineRunsFile,
  readPipelineRuns,

  // REAL WORKER SPAWNING (E2E Tests)
  spawnRealWorker,
  cleanupWorker,
  spawnDashboard,
  generateSessionId,
  getWorkerCommands
};
