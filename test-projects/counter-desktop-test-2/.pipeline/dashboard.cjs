#!/usr/bin/env node
/**
 * dashboard-v2.cjs - Simplified Pipeline Dashboard
 *
 * ARCHITECTURE (no supervisor, no pipe signals):
 * - Dashboard spawns ONLY the worker
 * - Dashboard monitors worker's todos in ~/.claude/todos/
 * - When todos reach 100% complete, dashboard kills worker and spawns next phase
 *
 * Worker responsibilities:
 * - Use TodoWrite to track progress
 * - Mark all todos as completed when done (dashboard detects 100%)
 */

const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_PATH = path.resolve(__dirname, '..');
const PROJECT_ID = 'pipeline-monitor-desktop';
// Claude Code stores todos globally, not per-project
const TODOS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'todos');

// Pipeline run tracker for analysis
const PIPELINE_OFFICE = path.resolve(__dirname, '..', '..', '..');
const tracker = require(path.join(PIPELINE_OFFICE, 'lib', 'pipeline-run-tracker.cjs'));

// Worker session ID - used to precisely identify the worker's todo file
let workerSessionId = null;
let pipelineRunId = null; // Track this pipeline run for analysis

function generateSessionId() {
  return crypto.randomUUID();
}

function getWorkerTodoFilePath() {
  if (workerSessionId) {
    return path.join(TODOS_DIR, workerSessionId + '-agent-' + workerSessionId + '.json');
  }
  return null;
}


const WORKER_COMMANDS = {
  '1': '/1-new-pipeline-desktop-v6.0',
  '2': '/2-new-pipeline-desktop-v6.0',
  '3': '/3-new-pipeline-desktop-v6.0',
  '4': '/4-new-pipeline-desktop-v6.0',
  '5': '/5-new-pipeline-desktop-v6.0'
};

const PHASE_TIMEOUTS = {
  '1': 60 * 60 * 1000,
  '2': 15 * 60 * 1000,
  '3': 45 * 60 * 1000,
  '4': 90 * 60 * 1000,
  '5': 30 * 60 * 1000
};

const PHASE_ORDER = ['1', '2', '3', '4', '5'];
const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

// Track active worker
let activeWorker = null;
let todoMonitorInterval = null;
let displayInterval = null;
let startTime = Date.now();
let currentPhase = '1';
let phaseStatus = { '1': 'pending', '2': 'pending', '3': 'pending', '4': 'pending', '5': 'pending' };
let lastTodoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };

const logFile = path.join(__dirname, 'dashboard-v2.log');
function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  fs.appendFileSync(logFile, line + '\n');
}

// ============ LIVE DISPLAY ============

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + 'm ' + s.toString().padStart(2, '0') + 's';
}

function renderDashboard() {
  clearScreen();
  const elapsed = Date.now() - startTime;

  console.log('\x1b[36m================================================================\x1b[0m');
  console.log('\x1b[36m  PIPELINE DASHBOARD v2 (No Supervisor)\x1b[0m');
  console.log('\x1b[36m  Project: ' + PROJECT_ID + '\x1b[0m');
  console.log('\x1b[36m================================================================\x1b[0m\n');

  // Phase checklist
  for (const phase of PHASE_ORDER) {
    let icon = '[ ]';
    let color = '';
    if (phaseStatus[phase] === 'complete') {
      icon = '\x1b[32m[x]\x1b[0m';
    } else if (phaseStatus[phase] === 'running') {
      icon = '\x1b[33m[>]\x1b[0m';
      color = '\x1b[33m';
    } else if (phaseStatus[phase] === 'failed') {
      icon = '\x1b[31m[X]\x1b[0m';
    }
    const label = phase === '1' ? ' [Interactive]' : ' [Autonomous]';
    console.log('  ' + icon + ' Phase ' + phase + ': ' + PHASE_NAMES[phase] + color + label + '\x1b[0m');
  }

  console.log('');
  console.log('\x1b[36m----------------------------------------------------------------\x1b[0m');
  let phaseLabel = '  Current Phase: \x1b[33m' + currentPhase + ' - ' + PHASE_NAMES[currentPhase] + '\x1b[0m';
  if (currentEpic) {
    phaseLabel += ' \x1b[35m(Epic ' + currentEpic.id + ': ' + currentEpic.name + ')\x1b[0m';
  }
  console.log(phaseLabel);
  console.log('  Elapsed: ' + formatTime(elapsed));
  console.log('\x1b[36m----------------------------------------------------------------\x1b[0m\n');

  // Worker todos section
  console.log('\x1b[36m  WORKER PROGRESS:\x1b[0m');
  if (lastTodoStats.total === 0) {
    console.log('  \x1b[90m(Waiting for worker to create todos...)\x1b[0m');
  } else {
    const pct = Math.round((lastTodoStats.completed / lastTodoStats.total) * 100);
    const bar = '#'.repeat(Math.floor(pct / 5)) + '.'.repeat(20 - Math.floor(pct / 5));
    console.log('  [' + bar + '] ' + pct + '% (' + lastTodoStats.completed + '/' + lastTodoStats.total + ')');
    console.log('');

    // Show todo items
    for (const item of lastTodoStats.items) {
      let icon = '[ ]';
      if (item.status === 'completed') icon = '\x1b[32m[x]\x1b[0m';
      else if (item.status === 'in_progress') icon = '\x1b[33m[>]\x1b[0m';
      const truncated = item.content.length > 50 ? item.content.substring(0, 47) + '...' : item.content;
      console.log('    ' + icon + ' ' + truncated);
    }
  }

  console.log('\n\x1b[36m----------------------------------------------------------------\x1b[0m');
  console.log('  \x1b[90mLog: .pipeline/dashboard-v2.log\x1b[0m');
  console.log('\x1b[36m----------------------------------------------------------------\x1b[0m');
}

function startDisplayLoop() {
  if (!displayInterval) {
    displayInterval = setInterval(() => renderDashboard(), 2000);
    renderDashboard(); // Immediate first render
  }
}

function stopDisplayLoop() {
  if (displayInterval) {
    clearInterval(displayInterval);
    displayInterval = null;
  }
}

// ============ TODO MONITORING ============

// Track phase state for completion detection
let phaseTodosLoaded = false;
let lastKnownTodoCount = 0;

function readWorkerTodos() {
  //// Method 1: Use session ID if we have one (exact match)
  const todoPath = getWorkerTodoFilePath();
  if (todoPath && fs.existsSync(todoPath)) {
    try {
      const content = fs.readFileSync(todoPath, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      log('[TODO] Error reading todo file: ' + err.message);
    }
  }

  //// Method 2: Fallback - find most recently modified todo file
  // Only use files modified after dashboard started (avoid stale data)
  if (!fs.existsSync(TODOS_DIR)) return null;
  
  const files = fs.readdirSync(TODOS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const fullPath = path.join(TODOS_DIR, f);
      const stat = fs.statSync(fullPath);
      return { name: f, path: fullPath, mtime: stat.mtimeMs };
    })
    .filter(f => f.mtime > startTime) // Only files modified after dashboard started
    .sort((a, b) => b.mtime - a.mtime); // Most recent first

  if (files.length === 0) return null;

  // Use most recently modified file
  const mostRecent = files[0];
  log('[TODO] Fallback: using recent file ' + mostRecent.name);

  try {
    const content = fs.readFileSync(mostRecent.path, 'utf8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      // Extract session ID from filename for future use
      const match = mostRecent.name.match(/^([a-f0-9-]+)-agent-/);
      if (match && !workerSessionId) {
        workerSessionId = match[1];
        log('[TODO] Discovered session ID from fallback: ' + workerSessionId);
      }
      return data;
    }
  } catch (err) {
    log('[TODO] Error reading fallback file: ' + err.message);
  }
  return null;
}

function getTodoStats() {
  const todos = readWorkerTodos();

  // If null (no file or error), treat as 0 todos
  if (!todos) return { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };

  return {
    pending: todos.filter(t => t.status === 'pending').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
    total: todos.length,
    items: todos.map(t => ({ content: t.content, status: t.status }))
  };
}

// Callback for when phase is complete
let onTodosComplete = null;

function startTodoMonitor(phase) {
  let completionDetected = false;

  // Reset phase tracking

  phaseTodosLoaded = false;
  lastKnownTodoCount = 0;
  lastTodoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };

  todoMonitorInterval = setInterval(() => {
    const stats = getTodoStats();

    // CRITICAL: Always update display with fresh data (no stale memory)
    lastTodoStats = stats;

    // Track if we've loaded todos for this phase
    if (stats.total > 0 && !phaseTodosLoaded) {
      phaseTodosLoaded = true;
      lastKnownTodoCount = stats.total;
      log(`[TODO] Phase ${phase}: Loaded ${stats.total} todos`);
    }

    // Log progress changes
    if (stats.total > 0) {
      const remaining = stats.pending + stats.inProgress;
      log(`[TODO] Phase ${phase}: ${stats.completed}/${stats.total} done, ${remaining} remaining`);

      // Show in-progress items
      const inProgress = stats.items.filter(t => t.status === 'in_progress');
      if (inProgress.length > 0) {
        log(`[TODO] Currently: ${inProgress.map(t => t.content).join(', ')}`);
      }
    }

    // COMPLETION DETECTION:
    // 1. All todos completed (100%)
    // 2. OR todos cleared after being loaded (N -> 0)

    if (!completionDetected) {
      // Case 1: 100% complete
      if (stats.total > 0 && stats.completed === stats.total) {
        completionDetected = true;
        log(`[TODO] 100% complete! All ${stats.total} todos done.`);
        if (onTodosComplete) {
          onTodosComplete();
        }
      }
      // Case 2: Todos cleared (we had todos, now we have 0)
      else if (phaseTodosLoaded && stats.total === 0) {
        completionDetected = true;
        log(`[TODO] Todos cleared (${lastKnownTodoCount} -> 0). Phase complete!`);
        if (onTodosComplete) {
          onTodosComplete();
        }
      }
    }
  }, 3000); // Check every 3 seconds for responsive display
}

function stopTodoMonitor() {
  if (todoMonitorInterval) {
    clearInterval(todoMonitorInterval);
    todoMonitorInterval = null;
  }
}

// ============ TERMINAL MANAGEMENT ============

function generateTerminalTitle(phase) {
  return 'Pipeline-Worker-' + phase + '-' + Date.now();
}

function killTerminalByTitle(title) {
  if (!title) return;
  try {
    log('Killing terminal: ' + title);
    execSync('taskkill /FI "WINDOWTITLE eq ' + title + '" /F 2>nul', { stdio: 'ignore' });
  } catch (err) { /* ignore */ }
}

function killWorker() {
  if (activeWorker) {
    killTerminalByTitle(activeWorker.title);
    activeWorker = null;
  }
  stopTodoMonitor();
}

function spawnWorker(phase) {
  const title = generateTerminalTitle(phase);
  const cmd = WORKER_COMMANDS[phase];

  // Generate session ID to track this worker's todos
  workerSessionId = generateSessionId();
  log('Spawning worker: ' + title + ' with session ID: ' + workerSessionId);

  // Log session to pipeline run tracker for later analysis
  if (pipelineRunId) {
    tracker.logPhaseSession(PROJECT_PATH, pipelineRunId, phase, workerSessionId, {
      command: cmd,
      spawnedAt: new Date().toISOString(),
      epicId: currentEpic ? currentEpic.id : null
    });
    log('[TRACKER] Logged session ' + workerSessionId + ' to run ' + pipelineRunId);
  }

  // Pass --session-id to Claude so we can track its todos
  const claudeCmd = 'claude "' + cmd + '" --session-id ' + workerSessionId + ' --dangerously-skip-permissions --max-turns 200';
  const proc = spawn('cmd.exe', ['/c', 'start', 'wt.exe', '--title', title, '-d', PROJECT_PATH, 'cmd', '/k', claudeCmd],
    { detached: true, stdio: 'ignore' });
  proc.unref();

  activeWorker = { title, phase, sessionId: workerSessionId };

  // Store session ID in manifest so it can be resumed
  updateManifest({ workerSessionId: workerSessionId });
  startTodoMonitor(phase);
}

// ============ MANIFEST ============

function readManifest() {
  const p = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function initManifest() {
  const m = {
    projectId: PROJECT_ID,
    projectPath: PROJECT_PATH,
    currentPhase: '1',
    status: 'running',
    createdAt: new Date().toISOString(),
    phases: {
      '1': { status: 'pending' },
      '2': { status: 'pending' },
      '1': { status: 'pending' },
      '2': { status: 'pending', loops: [] },
      '3': { status: 'pending' }
    }
  };
  fs.writeFileSync(path.join(PROJECT_PATH, '.pipeline', 'manifest.json'), JSON.stringify(m, null, 2));
  return m;
}

function getNextPhase(currentPhase) {
  const idx = PHASE_ORDER.indexOf(currentPhase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

function updateManifest(updates) {
  const manifest = readManifest();
  if (!manifest) return;
  Object.assign(manifest, updates);
  fs.writeFileSync(path.join(PROJECT_PATH, '.pipeline', 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function updateManifestPhase(phase, updates) {
  const manifest = readManifest();
  if (!manifest || !manifest.phases[phase]) return;
  Object.assign(manifest.phases[phase], updates);
  fs.writeFileSync(path.join(PROJECT_PATH, '.pipeline', 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function getEpicsFromManifest() {
  const manifest = readManifest();
  if (!manifest || !manifest.phases || !manifest.phases['2']) return [];
  return manifest.phases['2'].loops || [];
}

function getNextEpic() {
  const epics = getEpicsFromManifest();
  return epics.find(e => e.status !== 'complete') || null;
}

function markEpicComplete(epicId) {
  const manifest = readManifest();
  if (!manifest || !manifest.phases['2'] || !manifest.phases['2'].loops) return;

  const epic = manifest.phases['2'].loops.find(e => e.id === epicId);
  if (epic) {
    epic.status = 'complete';
    epic.completedAt = new Date().toISOString();
  }

  // Update currentEpic to next pending
  const nextEpic = manifest.phases['2'].loops.find(e => e.status !== 'complete');
  manifest.currentEpic = nextEpic ? nextEpic.id : null;

  fs.writeFileSync(path.join(PROJECT_PATH, '.pipeline', 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function allEpicsComplete() {
  const epics = getEpicsFromManifest();
  if (epics.length === 0) return true; // No epics defined, skip looping
  return epics.every(e => e.status === 'complete');
}

// Track current epic for display
let currentEpic = null;

// ============ PHASE RUNNER ============

async function runPhase(phase) {
  log('========================================');
  log('Starting phase: ' + phase);
  log('========================================');

  currentPhase = phase;
  phaseStatus[phase] = 'running';
  lastTodoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };

  // Spawn worker
  spawnWorker(phase);

  // Wait for todos to reach 100%
  return new Promise((resolve, reject) => {
    const timeout = PHASE_TIMEOUTS[phase];
    const startTime = Date.now();

    // Set up completion callback
    onTodosComplete = () => {
      log('Phase ' + phase + ' todos 100% complete!');
      // Small delay to let worker finish any final writes
      setTimeout(() => {
        killWorker();
        phaseStatus[phase] = 'complete';

        // Update tracker
        if (pipelineRunId) {
          tracker.completePhase(PROJECT_PATH, pipelineRunId, phase);
          log('[TRACKER] Marked phase ' + phase + ' complete in run ' + pipelineRunId);
        }

        log('Phase ' + phase + ' completed successfully');
        resolve(true);
      }, 2000);
    };

    // Timeout check
    const timeoutCheck = setInterval(() => {
      if (Date.now() - startTime > timeout) {
        clearInterval(timeoutCheck);
        onTodosComplete = null;
        phaseStatus[phase] = 'failed';
        log('Phase ' + phase + ' timed out');
        killWorker();
        reject(new Error('Timeout waiting for todos to complete'));
      }
    }, 10000);

    // Clean up on completion
    const originalCallback = onTodosComplete;
    onTodosComplete = () => {
      clearInterval(timeoutCheck);
      originalCallback();
    };
  });
}

// ============ MAIN ============

async function main() {
  const args = process.argv.slice(2);

  // Clear log on fresh start
  if (!args.includes('--resume')) {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  }

  log('Dashboard v2 starting...');
  startTime = Date.now();

  // Determine start phase
  let startPhase = '1';

  if (args.includes('--resume')) {
    const manifest = readManifest();
    if (manifest && manifest.currentPhase && manifest.currentPhase !== 'complete') {
      startPhase = manifest.currentPhase;
      log('Resuming from phase: ' + startPhase);
      // Mark earlier phases as complete
      const startIdx = PHASE_ORDER.indexOf(startPhase);
      for (let i = 0; i < startIdx; i++) {
        phaseStatus[PHASE_ORDER[i]] = 'complete';
      }
      // Try to get existing run ID from manifest
      pipelineRunId = manifest.pipelineRunId || tracker.getCurrentRunId(PROJECT_PATH);
      if (pipelineRunId) {
        log('[TRACKER] Resuming run ' + pipelineRunId);
      }
    }
  } else if (args.includes('--phase')) {
    const idx = args.indexOf('--phase');
    startPhase = args[idx + 1];
    log('Starting from phase: ' + startPhase);
    // Mark earlier phases as complete
    const startIdx = PHASE_ORDER.indexOf(startPhase);
    for (let i = 0; i < startIdx; i++) {
      phaseStatus[PHASE_ORDER[i]] = 'complete';
    }
  } else {
    // Fresh start: create a new pipeline run for tracking
    pipelineRunId = tracker.startRun(PROJECT_PATH, 'new', PROJECT_ID);
    log('[TRACKER] Started new run ' + pipelineRunId);
    console.log('\x1b[36mPipeline Run ID: ' + pipelineRunId + '\x1b[0m');

    initManifest();
    // Save run ID to manifest
    updateManifest({ pipelineRunId: pipelineRunId });
    log('Initialized manifest for fresh run');
  }

  currentPhase = startPhase;
  const startIndex = PHASE_ORDER.indexOf(startPhase);

  // Start live display
  startDisplayLoop();

  try {
    for (let i = startIndex; i < PHASE_ORDER.length; i++) {
      const phase = PHASE_ORDER[i];

      // Phase 2 has epic looping
      if (phase === '2') {
        const epics = getEpicsFromManifest();
        if (epics.length > 0) {
          log('Phase 2 has ' + epics.length + ' epics to implement');

          // Loop through each epic
          while (!allEpicsComplete()) {
            const epic = getNextEpic();
            if (!epic) break;

            currentEpic = epic;
            log('----------------------------------------');
            log('Starting Epic ' + epic.id + ': ' + epic.name);
            log('----------------------------------------');

            // Update manifest with current epic
            updateManifest({ currentEpic: epic.id });

            // Run phase 2 for this epic
            await runPhase(phase);

            // Mark epic complete
            markEpicComplete(epic.id);
            log('Epic ' + epic.id + ' complete!');

            // Brief pause before next epic
            await new Promise(r => setTimeout(r, 2000));
          }

          currentEpic = null;
          log('All epics complete for phase 2');
        } else {
          // No epics defined, run phase 2 once
          log('No epics defined, running phase 2 once');
          await runPhase(phase);
        }
      } else {
        // Normal phase (1, 2, 3, 5)
        await runPhase(phase);
      }

      // Update manifest phase status
      updateManifestPhase(phase, { status: 'complete', completedAt: new Date().toISOString() });

      const nextPhase = getNextPhase(phase);
      if (nextPhase) {
        updateManifest({ currentPhase: nextPhase });
        log('Advancing to phase: ' + nextPhase);
        // Brief pause before next phase
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    updateManifest({ currentPhase: 'complete', status: 'complete', completedAt: new Date().toISOString() });
    currentPhase = 'complete';

    // Complete the pipeline run in tracker
    if (pipelineRunId) {
      tracker.completeRun(PROJECT_PATH, pipelineRunId, 'complete');
      log('[TRACKER] Completed run ' + pipelineRunId);
    }

    log('========================================');
    log('PIPELINE COMPLETE!');
    log('========================================');

    // Final render
    stopDisplayLoop();
    renderDashboard();
    console.log('\n\x1b[32m  x ALL PHASES COMPLETE!\x1b[0m');
    if (pipelineRunId) {
      console.log('\x1b[36m  Run ID: ' + pipelineRunId + ' (use for analysis)\x1b[0m');
    }
    console.log('');

  } catch (err) {
    log('Pipeline stopped: ' + err.message);
    stopDisplayLoop();
    renderDashboard();
    console.log('\n\x1b[31m  Pipeline stopped: ' + err.message + '\x1b[0m');
    console.log('  Fix issues and run: node dashboard-v2.cjs --resume\n');
  } finally {
    killWorker();
    stopDisplayLoop();
  }
}

main().catch(console.error);
