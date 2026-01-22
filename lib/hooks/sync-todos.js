#!/usr/bin/env node
/**
 * Sync Todos Hook
 *
 * PostToolUse hook that triggers on TodoWrite events from the worker.
 * Extracts transcript slice for completed todos and injects to supervisor.
 *
 * @module lib/hooks/sync-todos
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Debug logging to file
const DEBUG = true;
const DEBUG_LOG = path.join(process.env.USERPROFILE || process.env.HOME, 'sync-todos-debug.log');

function debugLog(message) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(DEBUG_LOG, line);
}

// Import modules from Pipeline-Office lib
const pipelineOffice = path.dirname(path.dirname(__dirname));
const { injectMessage } = require(path.join(pipelineOffice, 'lib', 'process', 'inject.cjs'));
const {
  extractTranscriptSlice,
  parseTranscriptFile,
  formatSupervisorMessage
} = require(path.join(pipelineOffice, 'lib', 'orchestrator', 'supervisor-check.cjs'));

/**
 * Read PID file - supports both v11 format (JSON in pids/) and older format (plain text)
 * @param {string} projectPath - Project path
 * @param {string} role - Process role ('worker', 'supervisor')
 * @returns {Object|null} PID data or null
 */
function readPidCompat(projectPath, role) {
  // Try v11 format first: .pipeline/pids/{role}.pid (JSON)
  const v11Path = path.join(projectPath, '.pipeline', 'pids', `${role}.pid`);
  if (fs.existsSync(v11Path)) {
    try {
      const content = fs.readFileSync(v11Path, 'utf8');
      return JSON.parse(content);
    } catch {
      // Fall through to older format
    }
  }

  // Try older format: .pipeline/{role}-powershell-pid.txt (plain PID number)
  const oldPath = path.join(projectPath, '.pipeline', `${role}-powershell-pid.txt`);
  if (fs.existsSync(oldPath)) {
    try {
      const content = fs.readFileSync(oldPath, 'utf8').trim();
      // Remove BOM if present
      const cleanContent = content.replace(/^\uFEFF/, '');
      const pid = parseInt(cleanContent, 10);
      if (!isNaN(pid)) {
        return { pid, role };
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Get the role from the cwd path (worker, orchestrator, supervisor, or null)
 * @param {string} cwd - Current working directory
 * @returns {string|null} Role name or null if not in a pipeline subdirectory
 */
function getRoleFromCwd(cwd) {
  if (!cwd) return null;

  // Match .pipeline/worker, .pipeline/orchestrator, or .pipeline/supervisor
  const match = cwd.match(/[/\\]\.pipeline[/\\](worker|orchestrator|supervisor)$/i);
  if (match) {
    return match[1].toLowerCase();
  }

  return null;
}

/**
 * Get the project path from hook input
 * The cwd field contains the current working directory where Claude is running.
 * Workers may run from .pipeline/worker/, .pipeline/orchestrator/, or .pipeline/supervisor/
 * subdirectories, so we need to detect this and return the actual project root.
 *
 * @param {Object} hookInput - Hook input object
 * @returns {string|null} Project path or null
 */
function getProjectPath(hookInput) {
  const cwd = hookInput.cwd;
  if (!cwd) return null;

  // Check if cwd is inside a .pipeline subdirectory
  // Handles both Windows (\.pipeline\) and Unix (/.pipeline/) paths
  const pipelinePattern = /[/\\]\.pipeline[/\\](worker|orchestrator|supervisor)$/i;

  if (pipelinePattern.test(cwd)) {
    // Remove the .pipeline/xxx suffix to get the project root
    // Find the index of .pipeline and take everything before it
    const pipelineIndex = cwd.search(/[/\\]\.pipeline[/\\]/i);
    if (pipelineIndex !== -1) {
      return cwd.substring(0, pipelineIndex);
    }
  }

  return cwd;
}

/**
 * Check if this TodoWrite event is from the WORKER (not orchestrator or supervisor)
 * @param {string} projectPath - Project path
 * @param {Object} hookInput - Hook input object
 * @returns {boolean}
 */
function isFromWorker(projectPath, hookInput) {
  // CRITICAL: Only process if the cwd indicates this is the WORKER
  // Ignore todos from orchestrator and supervisor
  const role = getRoleFromCwd(hookInput.cwd);
  if (role !== 'worker') {
    debugLog(`Ignoring TodoWrite from role: ${role || 'unknown'} (not worker)`);
    return false;
  }

  // Check if this project has a pipeline setup
  const pipelineDir = path.join(projectPath, '.pipeline');
  if (!fs.existsSync(pipelineDir)) {
    return false;
  }

  // Check if there's a worker running (either format)
  const workerPid = readPidCompat(projectPath, 'worker');
  if (!workerPid || !workerPid.pid) {
    return false;
  }

  // Check if there's a supervisor to send to
  const supervisorPid = readPidCompat(projectPath, 'supervisor');
  if (!supervisorPid || !supervisorPid.pid) {
    return false;
  }

  return true;
}

/**
 * Find newly completed todos by comparing with previous state
 * @param {Object[]} currentTodos - Current todos from hook input
 * @param {string} projectPath - Project path
 * @returns {Object[]} Array of newly completed todos
 */
function findNewlyCompletedTodos(currentTodos, projectPath) {
  const stateFile = path.join(projectPath, '.pipeline', 'todo-state.json');
  let previousTodos = [];

  // Read previous state
  if (fs.existsSync(stateFile)) {
    try {
      previousTodos = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
      previousTodos = [];
    }
  }

  // Find todos that are now completed but weren't before
  const newlyCompleted = [];
  for (const todo of currentTodos) {
    if (todo.status === 'completed') {
      const prev = previousTodos.find(t => t.content === todo.content);
      if (!prev || prev.status !== 'completed') {
        newlyCompleted.push(todo);
      }
    }
  }

  // Save current state for next comparison
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(stateFile, JSON.stringify(currentTodos, null, 2), 'utf8');

  return newlyCompleted;
}

/**
 * Get the transcript path from hook input or derive it from session_id
 * @param {Object} hookInput - Hook input object
 * @param {string} projectPath - Project path
 * @returns {string|null} Transcript file path
 */
function getTranscriptPath(hookInput, projectPath) {
  // Hook input may directly provide transcript_path
  if (hookInput.transcript_path && fs.existsSync(hookInput.transcript_path)) {
    return hookInput.transcript_path;
  }

  // Otherwise, derive from session_id
  if (hookInput.session_id) {
    const resolved = path.resolve(projectPath);
    let encoded = resolved.replace(/\\/g, '/').replace(/:/g, '-').replace(/ /g, '-').replace(/\//g, '-');
    if (encoded.startsWith('-')) encoded = encoded.substring(1);

    const userProfile = process.env.USERPROFILE || process.env.HOME;
    const transcriptsDir = path.join(userProfile, '.claude', 'projects', encoded);
    const transcriptPath = path.join(transcriptsDir, `${hookInput.session_id}.jsonl`);

    if (fs.existsSync(transcriptPath)) {
      return transcriptPath;
    }
  }

  return null;
}

/**
 * Get the current phase from manifest
 * @param {string} projectPath - Project path
 * @returns {string} Phase number (default: '0')
 */
function getCurrentPhase(projectPath) {
  const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return manifest.currentPhase || '0';
    } catch {
      return '0';
    }
  }
  return '0';
}

/**
 * Main hook handler
 */
async function main() {
  debugLog('=== sync-todos hook started ===');

  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  debugLog(`Raw input length: ${input.length}`);

  let hookInput;
  try {
    hookInput = JSON.parse(input);
    debugLog(`Parsed hook input - keys: ${Object.keys(hookInput).join(', ')}`);
    debugLog(`  tool_name: ${hookInput.tool_name}`);
    debugLog(`  cwd: ${hookInput.cwd}`);
    debugLog(`  session_id: ${hookInput.session_id}`);
    debugLog(`  transcript_path: ${hookInput.transcript_path}`);
  } catch (err) {
    debugLog(`Failed to parse hook input: ${err.message}`);
    console.error('[sync-todos] Failed to parse hook input:', err.message);
    process.exit(0); // Exit gracefully - don't block Claude
  }

  // Only process TodoWrite events
  if (hookInput.tool_name !== 'TodoWrite') {
    debugLog(`Ignoring non-TodoWrite event: ${hookInput.tool_name}`);
    process.exit(0);
  }

  const projectPath = getProjectPath(hookInput);
  debugLog(`Project path: ${projectPath}`);

  if (!projectPath) {
    debugLog('No project path found in hook input');
    console.error('[sync-todos] No project path found in hook input');
    process.exit(0);
  }

  // Check if this is from the worker we're supervising
  const fromWorker = isFromWorker(projectPath, hookInput);
  debugLog(`Is from worker: ${fromWorker}`);

  if (!fromWorker) {
    debugLog('Not from our worker, ignoring');
    process.exit(0);
  }

  // Get supervisor info
  const supervisorPid = readPidCompat(projectPath, 'supervisor');
  debugLog(`Supervisor PID data: ${JSON.stringify(supervisorPid)}`);

  if (!supervisorPid || !supervisorPid.pid) {
    debugLog('No supervisor running, nothing to do');
    process.exit(0);
  }

  // Verify this supervisor is linked to this worker
  const workerPid = readPidCompat(projectPath, 'worker');
  debugLog(`Worker PID data: ${JSON.stringify(workerPid)}`);

  if (supervisorPid.workerPid && workerPid && supervisorPid.workerPid !== workerPid.pid) {
    debugLog(`Supervisor workerPid (${supervisorPid.workerPid}) != worker pid (${workerPid.pid}), ignoring`);
    process.exit(0);
  }

  // Get the todos from hook input
  const todos = hookInput.tool_input?.todos || [];
  debugLog(`Todos count: ${todos.length}`);

  if (todos.length === 0) {
    debugLog('No todos in input');
    process.exit(0);
  }

  // Find newly completed todos
  const newlyCompleted = findNewlyCompletedTodos(todos, projectPath);
  debugLog(`Newly completed count: ${newlyCompleted.length}`);

  if (newlyCompleted.length === 0) {
    debugLog('No newly completed todos');
    process.exit(0);
  }

  // Get transcript path
  const transcriptPath = getTranscriptPath(hookInput, projectPath);
  debugLog(`Transcript path: ${transcriptPath}`);

  if (!transcriptPath) {
    debugLog('Could not find transcript file');
    console.error('[sync-todos] Could not find transcript file');
    process.exit(0);
  }

  // Parse transcript
  const events = parseTranscriptFile(transcriptPath);
  debugLog(`Parsed ${events.length} transcript events`);

  // Get current phase
  const phase = getCurrentPhase(projectPath);
  debugLog(`Current phase: ${phase}`);

  // Send supervisor check for each newly completed todo
  for (const todo of newlyCompleted) {
    try {
      debugLog(`Processing completed todo: ${todo.content.slice(0, 50)}...`);

      // Extract transcript slice for this todo
      const transcriptSlice = extractTranscriptSlice(events, todo.content);
      debugLog(`Transcript slice length: ${transcriptSlice.length}`);

      // Format the message
      const message = formatSupervisorMessage(todo, phase, transcriptSlice);
      debugLog(`Message length: ${message.length}`);

      // Inject to supervisor
      debugLog(`Injecting to supervisor PID: ${supervisorPid.pid}`);
      const success = await injectMessage(supervisorPid.pid, message);

      if (success) {
        debugLog(`Successfully sent check for todo`);
        console.log(`[sync-todos] Sent check for todo: ${todo.content.slice(0, 50)}...`);
      } else {
        debugLog(`Failed to inject message to supervisor`);
        console.error(`[sync-todos] Failed to inject message to supervisor`);
      }
    } catch (err) {
      debugLog(`Error processing todo: ${err.message}\n${err.stack}`);
      console.error(`[sync-todos] Error processing todo: ${err.message}`);
    }
  }

  debugLog('=== sync-todos hook finished ===');
  process.exit(0);
}

// Only run main() when executed directly (not when required for testing)
if (require.main === module) {
  main().catch(err => {
    debugLog(`Unhandled error: ${err.message}\n${err.stack}`);
    console.error('[sync-todos] Unhandled error:', err.message);
    process.exit(0); // Exit gracefully
  });
}

// Export for testing
module.exports = {
  getRoleFromCwd,
  getProjectPath,
  isFromWorker,
  findNewlyCompletedTodos,
  getTranscriptPath,
  getCurrentPhase
};
