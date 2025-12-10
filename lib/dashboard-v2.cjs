#!/usr/bin/env node
/**
 * Pipeline Dashboard v2 - Interactive
 *
 * Features:
 * - Press 1-5 to expand/collapse phase todo breakdown
 * - Press Q to quit
 * - Shows per-todo cost and duration for completed phases
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============ CONFIGURATION ============

const PROJECT_PATH = process.argv[2] || process.cwd();
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const REFRESH_INTERVAL = 2000;

const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

// UI State
let expandedPhases = new Set();

// ============ MOCK DATA FOR TESTING ============

function getMockManifest() {
  return {
    version: "7.0",
    project: { name: "Test Project", path: PROJECT_PATH },
    stack: "desktop",
    mode: "new",
    status: "running",
    orchestratorPid: 1234,
    workerPid: 5678,
    currentPhase: "3",
    phases: {
      "1": {
        status: "complete",
        startedAt: "2025-12-10T14:00:00Z",
        completedAt: "2025-12-10T14:21:32Z",
        duration: 1292000,
        cost: 2.76,
        tokens: 2915260,
        todoBreakdown: [
          { content: "1. Get this process PID", durationMs: 12000, cost: 0.02 },
          { content: "2. Ask user for stack and mode", durationMs: 165000, cost: 0.31 },
          { content: "3. Initialize project", durationMs: 68000, cost: 0.14 },
          { content: "4. Spawn dashboard", durationMs: 45000, cost: 0.08 },
          { content: "5. Spawn Phase 1 worker", durationMs: 32000, cost: 0.06 },
          { content: "6. Write user stories", durationMs: 742000, cost: 1.58 },
          { content: "7. Review epic structure", durationMs: 128000, cost: 0.27 },
          { content: "8. Finalize user-stories.md", durationMs: 100000, cost: 0.30 }
        ]
      },
      "2": {
        status: "complete",
        startedAt: "2025-12-10T14:22:00Z",
        completedAt: "2025-12-10T14:45:00Z",
        duration: 1380000,
        cost: 1.85,
        tokens: 1850000,
        todoBreakdown: [
          { content: "1. Read user stories", durationMs: 45000, cost: 0.06 },
          { content: "2. Generate E2E test specs", durationMs: 520000, cost: 0.72 },
          { content: "3. Verify 1:1 mapping", durationMs: 30000, cost: 0.04 },
          { content: "4. Generate Unit specs", durationMs: 280000, cost: 0.38 },
          { content: "5. Generate Integration specs", durationMs: 245000, cost: 0.33 },
          { content: "6. Add edge cases", durationMs: 160000, cost: 0.22 },
          { content: "7. Write test-specs.md", durationMs: 100000, cost: 0.10 }
        ]
      },
      "3": {
        status: "running",
        startedAt: "2025-12-10T14:46:00Z",
        workerProgress: {
          completed: 3,
          total: 8,
          currentTask: "Setting up Tauri project"
        }
      },
      "4": { status: "pending" },
      "5": { status: "pending" }
    },
    epics: [
      { id: 1, name: "App Shell", status: "pending" },
      { id: 2, name: "Graph Canvas", status: "pending" },
      { id: 3, name: "Node System", status: "pending" }
    ],
    totalCost: 4.61,
    createdAt: "2025-12-10T14:00:00Z",
    heartbeat: { enabled: true, intervalMs: 300000 }
  };
}

// ============ HELPERS ============

function readManifest() {
  // For testing, use mock data if no manifest exists
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    }
  } catch (err) {}
  return getMockManifest();
}

function formatTime(ms) {
  if (!ms || ms < 0) return '--:--';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + 'm ' + s.toString().padStart(2, '0') + 's';
}

function formatCost(usd) {
  if (usd === undefined || usd === null) return '$-.--';
  return '$' + parseFloat(usd).toFixed(2);
}

function formatDate(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return day + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function renderProgressBar(completed, total, width = 20) {
  if (total === 0) return '.'.repeat(width);
  const filled = Math.floor((completed / total) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

// ============ RENDER ============

function render() {
  const manifest = readManifest();
  if (!manifest) {
    clearScreen();
    console.log('Waiting for manifest...');
    return;
  }

  const lines = [];
  const W = 60; // Width

  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  // Header
  lines.push('\x1b[36m╔' + '═'.repeat(W-2) + '╗\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mPIPELINE DASHBOARD v2\x1b[0m' + ' '.repeat(W-25) + '\x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  Project: ' + projectName.slice(0,15).padEnd(15) + '  │  Mode: ' + mode.padEnd(10) + '     \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m╠' + '═'.repeat(W-2) + '╣\x1b[0m');

  // Duration
  let durationLine = '';
  if (manifest.createdAt) {
    const startDate = formatDate(manifest.createdAt);
    const totalElapsed = Date.now() - new Date(manifest.createdAt).getTime();
    const pausedMs = manifest.totalPausedMs || 0;
    const activeMs = totalElapsed - pausedMs;
    durationLine = 'Started: ' + startDate + '  │  Active: ' + formatTime(activeMs);
  }
  lines.push('\x1b[36m║\x1b[0m  ' + durationLine.padEnd(W-4) + '\x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m' + ' '.repeat(W-2) + '\x1b[36m║\x1b[0m');

  // Phases header
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mPHASES\x1b[0m  \x1b[90m(Press 1-5 to expand/collapse)\x1b[0m' + ' '.repeat(W-44) + '\x1b[36m║\x1b[0m');

  // Phases
  const phases = ['1', '2', '3', '4', '5'];
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[phase];
    const isExpanded = expandedPhases.has(phase);
    const hasTodos = phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0;

    // Status icon
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

    // Expand indicator
    let expandIcon = '  ';
    if (hasTodos) {
      expandIcon = isExpanded ? '\x1b[90m▼\x1b[0m ' : '\x1b[90m►\x1b[0m ';
    }

    // Stats
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      const todoCount = phaseData.todoBreakdown ? phaseData.todoBreakdown.length : 0;
      stats = formatTime(phaseData.duration) + '   ' + formatCost(phaseData.cost);
      if (todoCount > 0) stats += '  (' + todoCount + ' todos)';
    } else if (status === 'running' && phaseData.startedAt) {
      const elapsed = Date.now() - new Date(phaseData.startedAt).getTime();
      stats = formatTime(elapsed);
    }

    const phaseLine = icon + ' ' + phase + '. ' + expandIcon + color + name.padEnd(10) + '\x1b[0m ' + stats;
    lines.push('\x1b[36m║\x1b[0m  ' + phaseLine.padEnd(W + 20) + '\x1b[36m║\x1b[0m');

    // Expanded todo breakdown
    if (isExpanded && hasTodos) {
      const todos = phaseData.todoBreakdown;
      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const isLast = i === todos.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const todoName = truncate(todo.content, 28);
        const todoDur = formatTime(todo.durationMs).padStart(8);
        const todoCost = formatCost(todo.cost).padStart(6);

        const todoLine = '\x1b[90m' + prefix + '\x1b[0m ' + todoName.padEnd(28) + ' \x1b[90m' + todoDur + '  ' + todoCost + '\x1b[0m';
        lines.push('\x1b[36m║\x1b[0m      ' + todoLine + '  \x1b[36m║\x1b[0m');
      }
    }

    // Epics under phase 4
    if (phase === '4' && manifest.epics && manifest.epics.length > 0 && !isExpanded) {
      for (const epic of manifest.epics) {
        let epicIcon = '[ ]';
        if (epic.status === 'complete') epicIcon = '\x1b[32m[✓]\x1b[0m';
        else if (epic.status === 'running') epicIcon = '\x1b[33m[>]\x1b[0m';
        const epicName = ('Epic ' + epic.id + ': ' + epic.name).slice(0, 35);
        lines.push('\x1b[36m║\x1b[0m      ' + epicIcon + ' ' + epicName.padEnd(W-12) + '\x1b[36m║\x1b[0m');
      }
    }
  }

  lines.push('\x1b[36m║\x1b[0m' + ' '.repeat(W-2) + '\x1b[36m║\x1b[0m');

  // Worker progress
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mWORKER PROGRESS\x1b[0m' + ' '.repeat(W-19) + '\x1b[36m║\x1b[0m');

  const currentPhase = manifest.currentPhase;
  const workerProgress = manifest.phases?.[currentPhase]?.workerProgress;

  if (!workerProgress || workerProgress.total === 0) {
    lines.push('\x1b[36m║\x1b[0m  \x1b[90m(Waiting for worker...)\x1b[0m' + ' '.repeat(W-27) + '\x1b[36m║\x1b[0m');
  } else {
    const pct = Math.round((workerProgress.completed / workerProgress.total) * 100);
    const bar = renderProgressBar(workerProgress.completed, workerProgress.total);
    lines.push('\x1b[36m║\x1b[0m  [' + bar + '] ' + pct + '%  (' + workerProgress.completed + '/' + workerProgress.total + ' todos)' + ' '.repeat(W-42) + '\x1b[36m║\x1b[0m');
    if (workerProgress.currentTask) {
      const task = truncate(workerProgress.currentTask, W-8);
      lines.push('\x1b[36m║\x1b[0m  \x1b[90m' + task.padEnd(W-4) + '\x1b[0m\x1b[36m║\x1b[0m');
    }
  }

  lines.push('\x1b[36m║\x1b[0m' + ' '.repeat(W-2) + '\x1b[36m║\x1b[0m');

  // Cost
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mCOST\x1b[0m' + ' '.repeat(W-8) + '\x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  This run: ' + formatCost(manifest.totalCost || 0) + ' '.repeat(W-18) + '\x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m' + ' '.repeat(W-2) + '\x1b[36m║\x1b[0m');

  // Footer
  lines.push('\x1b[36m╚' + '═'.repeat(W-2) + '╝\x1b[0m');
  lines.push('');
  lines.push('\x1b[90mPress 1-5 to toggle phase details │ Q to quit\x1b[0m');

  // Render
  clearScreen();
  console.log(lines.join('\n'));
}

// ============ INPUT HANDLING ============

function setupKeypress() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      console.log('\nDashboard closed.');
      process.exit(0);
    }

    // Toggle phase expansion
    if (['1', '2', '3', '4', '5'].includes(str)) {
      if (expandedPhases.has(str)) {
        expandedPhases.delete(str);
      } else {
        expandedPhases.add(str);
      }
      render();
    }
  });

  process.stdin.resume();
}

// ============ MAIN ============

function main() {
  console.log('Pipeline Dashboard v2 - Interactive');
  console.log('====================================');
  console.log('Project: ' + PROJECT_PATH);
  console.log('Using mock data for testing...');
  console.log('');

  setupKeypress();
  render();
  setInterval(render, REFRESH_INTERVAL);
}

main();
