#!/usr/bin/env node
/**
 * Pipeline v7.0 Dashboard
 *
 * Displays pipeline progress, reads from manifest and worker todos.
 * Spawned by orchestrator, runs in same terminal.
 * Sends heartbeat messages to orchestrator every HEARTBEAT_INTERVAL.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ============ CONFIGURATION ============

const PROJECT_PATH = process.argv[2] || process.cwd();
const ORCHESTRATOR_SESSION_ID = process.argv[3] || null; // Passed by orchestrator
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const TODOS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'todos');
const REFRESH_INTERVAL = 2000; // 2 seconds for display refresh
const HEARTBEAT_INTERVAL = 3 * 60 * 1000; // 3 minutes for orchestrator heartbeat

// Phase display names
const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

// ============ STATE ============

let expandedPhases = new Set(); // Phases with expanded todo breakdown
let lastManifest = null;
let lastTodos = null;
let lastHeartbeat = null;
let heartbeatCount = 0;

// ============ MANIFEST FUNCTIONS ============

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    }
  } catch (err) {
    // Ignore read errors
  }
  return null;
}

// ============ TODO FUNCTIONS ============

function findWorkerTodoFile(sessionId) {
  if (!sessionId || !fs.existsSync(TODOS_DIR)) return null;

  // Pattern: {sessionId}-agent-{sessionId}.json
  const expectedName = `${sessionId}-agent-${sessionId}.json`;
  const todoPath = path.join(TODOS_DIR, expectedName);

  if (fs.existsSync(todoPath)) {
    return todoPath;
  }

  // Fallback: find any file containing the session ID
  try {
    const files = fs.readdirSync(TODOS_DIR);
    for (const file of files) {
      if (file.includes(sessionId) && file.endsWith('.json')) {
        return path.join(TODOS_DIR, file);
      }
    }
  } catch (err) {
    // Ignore
  }

  return null;
}

function readWorkerTodos(sessionId) {
  const todoFile = findWorkerTodoFile(sessionId);
  if (!todoFile) return null;

  try {
    const content = fs.readFileSync(todoFile, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function getTodoStats(todos) {
  if (!Array.isArray(todos) || todos.length === 0) {
    return { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };
  }

  return {
    pending: todos.filter(t => t.status === 'pending').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
    total: todos.length,
    items: todos.map(t => ({ content: t.content, status: t.status }))
  };
}

// ============ FORMATTING ============

function formatTime(ms) {
  if (!ms || ms < 0) return '--:--';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatCost(usd) {
  if (usd === undefined || usd === null) return '$-.--';
  return '$' + parseFloat(usd).toFixed(2);
}

function renderProgressBar(completed, total, width = 20) {
  if (total === 0) return '.'.repeat(width);
  const filled = Math.floor((completed / total) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

// ============ DISPLAY ============

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function render() {
  const manifest = readManifest();
  if (!manifest) {
    console.log('Waiting for manifest...');
    return;
  }

  lastManifest = manifest;

  // Get current worker's todos
  let todoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };
  const currentPhase = manifest.currentPhase;
  if (currentPhase && manifest.phases[currentPhase]) {
    const sessionId = manifest.phases[currentPhase].workerSessionId;
    if (sessionId) {
      const todos = readWorkerTodos(sessionId);
      todoStats = getTodoStats(todos);
      lastTodos = todos;
    }
  }

  clearScreen();

  // Header
  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  console.log('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
  console.log(`\x1b[36m║\x1b[0m  PIPELINE DASHBOARD                                  \x1b[36m║\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m  Project: ${projectName.padEnd(15).slice(0, 15)}  │  Mode: ${mode.padEnd(10).slice(0, 10)}   \x1b[36m║\x1b[0m`);
  console.log('\x1b[36m╠══════════════════════════════════════════════════════╣\x1b[0m');
  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  \x1b[1mPHASES\x1b[0m                                              \x1b[36m║\x1b[0m');

  // Phases
  const phases = ['1', '2', '3', '4', '5'];
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[phase];

    let icon = '[ ]';
    let color = '';
    if (status === 'complete') {
      icon = '\x1b[32m[✓]\x1b[0m';
    } else if (status === 'running') {
      icon = '\x1b[33m[>]\x1b[0m';
      color = '\x1b[33m';
    } else if (status === 'failed') {
      icon = '\x1b[31m[X]\x1b[0m';
    }

    // Duration and cost for completed phases
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      const time = formatTime(phaseData.duration);
      const cost = formatCost(phaseData.cost);
      const expandIcon = expandedPhases.has(phase) ? '[-]' : '[+]';
      stats = `  ${time}   ${cost}  ${expandIcon}`;
    } else if (status === 'running' && manifest.phases[phase]?.startedAt) {
      const elapsed = Date.now() - new Date(manifest.phases[phase].startedAt).getTime();
      stats = `  ${formatTime(elapsed)}`;
    }

    console.log(`\x1b[36m║\x1b[0m  ${icon} ${phase}. ${color}${name.padEnd(12)}\x1b[0m${stats.padEnd(30).slice(0, 30)} \x1b[36m║\x1b[0m`);

    // Show expanded todo breakdown for completed phases
    if (expandedPhases.has(phase) && phaseData.todoBreakdown) {
      for (let i = 0; i < phaseData.todoBreakdown.length; i++) {
        const todo = phaseData.todoBreakdown[i];
        const prefix = i === phaseData.todoBreakdown.length - 1 ? '└─' : '├─';
        const todoTime = formatTime(todo.duration);
        const todoCost = formatCost(todo.cost);
        const content = todo.content.slice(0, 25).padEnd(25);
        console.log(`\x1b[36m║\x1b[0m      ${prefix} ${content} ${todoTime} ${todoCost}  \x1b[36m║\x1b[0m`);
      }
    }

    // Show epics under Phase 4
    if (phase === '4' && manifest.epics && manifest.epics.length > 0) {
      for (const epic of manifest.epics) {
        let epicIcon = '[ ]';
        if (epic.status === 'complete') {
          epicIcon = '\x1b[32m[✓]\x1b[0m';
        } else if (epic.status === 'running') {
          epicIcon = '\x1b[33m[>]\x1b[0m';
        }
        const epicName = `Epic ${epic.id}: ${epic.name}`.slice(0, 40);
        console.log(`\x1b[36m║\x1b[0m      ${epicIcon} ${epicName.padEnd(42)} \x1b[36m║\x1b[0m`);
      }
    }
  }

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');

  // Worker progress
  console.log('\x1b[36m║\x1b[0m  \x1b[1mWORKER PROGRESS\x1b[0m                                     \x1b[36m║\x1b[0m');
  if (todoStats.total === 0) {
    console.log('\x1b[36m║\x1b[0m  \x1b[90m(Waiting for worker to create todos...)\x1b[0m             \x1b[36m║\x1b[0m');
  } else {
    const pct = Math.round((todoStats.completed / todoStats.total) * 100);
    const bar = renderProgressBar(todoStats.completed, todoStats.total);
    console.log(`\x1b[36m║\x1b[0m  [${bar}] ${pct}%  (${todoStats.completed}/${todoStats.total} todos)       \x1b[36m║\x1b[0m`);
  }

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');

  // Cost
  console.log('\x1b[36m║\x1b[0m  \x1b[1mCOST\x1b[0m                                                \x1b[36m║\x1b[0m');
  const totalCost = formatCost(manifest.totalCost || 0);
  console.log(`\x1b[36m║\x1b[0m  This run: ${totalCost}                                  \x1b[36m║\x1b[0m`);

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');

  // Status line
  if (manifest.status === 'complete') {
    console.log('\n\x1b[32m  ✓ PIPELINE COMPLETE\x1b[0m');
  } else if (manifest.status === 'paused') {
    console.log('\n\x1b[33m  ⏸ PIPELINE PAUSED\x1b[0m');
  }
}

// ============ HEARTBEAT ============

function sendHeartbeat() {
  if (!ORCHESTRATOR_SESSION_ID) {
    return; // No orchestrator to notify
  }

  const manifest = readManifest();
  if (!manifest || manifest.status === 'complete' || manifest.status === 'paused') {
    return; // Pipeline not running, no heartbeat needed
  }

  heartbeatCount++;
  lastHeartbeat = new Date().toISOString();

  // Build status summary for orchestrator
  const currentPhase = manifest.currentPhase;
  const phaseData = manifest.phases?.[currentPhase] || {};
  let todoSummary = 'no todos yet';

  if (currentPhase && phaseData.workerSessionId) {
    const todos = readWorkerTodos(phaseData.workerSessionId);
    const stats = getTodoStats(todos);
    if (stats.total > 0) {
      todoSummary = `${stats.completed}/${stats.total} todos complete (${stats.inProgress} in progress)`;
    }
  }

  const message = `heartbeat #${heartbeatCount}: Phase ${currentPhase} running, ${todoSummary}`;

  // Send message to orchestrator using claude CLI
  try {
    const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude';
    const result = spawn(claudeCmd, [
      '--resume', ORCHESTRATOR_SESSION_ID,
      '--print',
      '--message', message
    ], {
      stdio: 'ignore',
      detached: true,
      shell: true
    });
    result.unref(); // Don't wait for it
  } catch (err) {
    // Silently ignore heartbeat failures
  }
}

// ============ MAIN ============

function main() {
  console.log('Starting Pipeline Dashboard...');
  console.log(`Project: ${PROJECT_PATH}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  if (ORCHESTRATOR_SESSION_ID) {
    console.log(`Orchestrator: ${ORCHESTRATOR_SESSION_ID}`);
    console.log(`Heartbeat: every ${HEARTBEAT_INTERVAL / 1000}s`);
  } else {
    console.log('Orchestrator: none (no heartbeat)');
  }
  console.log('');

  // Initial render
  render();

  // Refresh loop (display)
  setInterval(render, REFRESH_INTERVAL);

  // Heartbeat loop (orchestrator messages)
  if (ORCHESTRATOR_SESSION_ID) {
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    // Send first heartbeat after 30 seconds (give worker time to start)
    setTimeout(sendHeartbeat, 30 * 1000);
  }

  // Handle exit
  process.on('SIGINT', () => {
    console.log('\nDashboard stopped.');
    process.exit(0);
  });
}

main();
