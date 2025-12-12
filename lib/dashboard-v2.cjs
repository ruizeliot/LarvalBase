#!/usr/bin/env node
/**
 * Pipeline Dashboard v2 - Interactive
 *
 * Features:
 * - Press 1-5 to expand phases, A-I to expand epics
 * - Press Q to quit
 * - Shows per-todo cost and duration for completed phases
 * - Simple timer: increments while alive, persists to manifest
 * - Heartbeat: pings orchestrator periodically
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

// ============ CONFIGURATION ============

const PROJECT_PATH = process.argv[2] || process.cwd();
const ORCHESTRATOR_PID = process.argv[3] || null;
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const REFRESH_INTERVAL = 1000; // 1 second for timer
const SAVE_INTERVAL = 5000; // Save to manifest every 5 seconds
const DEFAULT_HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

// UI State
let expandedPhases = new Set();
let expandedEpics = new Set();

// Timer State
let activeMs = 0;
let lastSaveTime = Date.now();

// Heartbeat State
let heartbeatCount = 0;
let nextHeartbeatTime = null;

// State tracking for event messages
let lastPhaseStatuses = {};
let lastEpicStatuses = {};
let lastPipelineStatus = null;

// Output Style Injection State
let outputStyleCountdown = null; // ms remaining until output style injection

// ============ MANIFEST HELPERS ============

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    }
  } catch (err) {}
  return null;
}

function writeManifest(manifest) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    return true;
  } catch (err) {
    return false;
  }
}

function saveActiveMs() {
  const manifest = readManifest();
  if (manifest) {
    manifest.activeMs = activeMs;
    writeManifest(manifest);
  }
}

// ============ HELPERS ============

function formatTime(ms) {
  if (!ms || ms < 0) return '--:--';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) {
    return h + 'h ' + m.toString().padStart(2, '0') + 'm ' + s.toString().padStart(2, '0') + 's';
  }
  return m + 'm ' + s.toString().padStart(2, '0') + 's';
}

function formatCost(usd) {
  if (usd === undefined || usd === null) return '$-.--';
  return '$' + parseFloat(usd).toFixed(2);
}

function formatTokens(tokens) {
  if (tokens === undefined || tokens === null) return "-.--M";
  const millions = tokens / 1000000;
  if (millions >= 1) return millions.toFixed(1) + "M";
  const thousands = tokens / 1000;
  return thousands.toFixed(0) + "K";
}
function formatCountdown(ms) {
  if (!ms || ms <= 0) return '0:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + ':' + s.toString().padStart(2, '0');
}

function renderProgressBar(completed, total, width = 30) {
  if (total === 0) return '[90m' + '░'.repeat(width) + '[0m';
  const pct = completed / total;
  const filled = Math.floor(pct * width);
  const empty = width - filled;

  let bar = '';
  for (let i = 0; i < filled; i++) {
    const position = i / width;
    if (position < 0.6) {
      bar += '[32m█[0m';  // Green
    } else {
      bar += '[33m█[0m';  // Yellow
    }
  }
  bar += '[90m' + '░'.repeat(empty) + '[0m';
  return bar;
}

// Numbered progress bar for worker - shows each todo as a numbered segment
function renderNumberedProgressBar(completed, total) {
  if (total === 0) return C.dim + '(no tasks)' + C.reset;

  let bar = '';
  for (let i = 1; i <= total; i++) {
    const num = i.toString();
    if (i <= completed) {
      // Completed task - green background
      bar += C.green + '██' + num + '██' + C.reset;
    } else if (i === completed + 1) {
      // Current task - yellow/active
      bar += C.yellow + '▶▶' + num + '▶▶' + C.reset;
    } else {
      // Pending task - dim
      bar += C.dim + '░░' + num + '░░' + C.reset;
    }
  }
  return bar;
}

// ASCII Art Logo
const LOGO = [
  '██████╗ ██╗██████╗ ███████╗██╗     ██╗███╗   ██╗███████╗',
  '██╔══██╗██║██╔══██╗██╔════╝██║     ██║████╗  ██║██╔════╝',
  '██████╔╝██║██████╔╝█████╗  ██║     ██║██╔██╗ ██║█████╗  ',
  '██╔═══╝ ██║██╔═══╝ ██╔══╝  ██║     ██║██║╚██╗██║██╔══╝  ',
  '██║     ██║██║     ███████╗███████╗██║██║ ╚████║███████╗',
  '╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝'
];

// Color codes
const C = {
  reset: '[0m',
  bold: '[1m',
  dim: '[90m',
  cyan: '[36m',
  green: '[32m',
  yellow: '[33m',
  red: '[31m',
  blue: '[34m',
  magenta: '[35m',
  white: '[37m',
};

// Section separator line
function separator(W, char = '─') {
  return C.cyan + '║' + C.dim + char.repeat(W - 2) + C.cyan + '║' + C.reset;
}


function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

// Strip ANSI escape codes to get visible length
function visibleLength(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

// Create a line with left border, content, padding, and right border
// If content exceeds width, omit the right border
function line(content, W) {
  const left = '\x1b[36m║\x1b[0m';
  const right = '\x1b[36m║\x1b[0m';
  const visLen = visibleLength(content);
  const innerWidth = W - 2; // space for both borders
  if (visLen >= innerWidth) {
    return left + content; // no right border, let it wrap
  }
  const padding = ' '.repeat(innerWidth - visLen);
  return left + content + padding + right;
}


function getHeartbeatInterval(manifest) {
  if (manifest && manifest.heartbeat && manifest.heartbeat.intervalMs) {
    return manifest.heartbeat.intervalMs;
  }
  return DEFAULT_HEARTBEAT_INTERVAL;
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
  const W = process.stdout.columns || 80;

  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  // Header with ASCII art logo
  lines.push(C.cyan + '╔' + '═'.repeat(W-2) + '╗' + C.reset);

  // Render ASCII logo (cyan color) with version on last line only
  for (let i = 0; i < LOGO.length; i++) {
    const logoLine = LOGO[i];
    const version = (i === LOGO.length - 1) ? '  ' + C.dim + 'v8.0' + C.reset : '';
    lines.push(line('  ' + C.cyan + logoLine + C.reset + version, W));
  }
  lines.push(line('', W));

  // Project info, timer, and heartbeat on same line
  const timerStr = formatTime(activeMs);
  let headerLine = '  ' + C.bold + 'Project:' + C.reset + ' ' + projectName.slice(0, 25) + '  ' + C.dim + '│' + C.reset + '  ' + C.bold + 'Mode:' + C.reset + ' ' + mode + '  ' + C.dim + '│' + C.reset + '  ' + C.bold + '⏱' + C.reset + ' ' + timerStr;

  // Add heartbeat to header if running
  if (manifest.status !== 'complete' && ORCHESTRATOR_PID) {
    const heartbeatEnabled = !(manifest.heartbeat && manifest.heartbeat.enabled === false);
    if (heartbeatEnabled && nextHeartbeatTime) {
      const countdown = nextHeartbeatTime - Date.now();
      const countdownStr = countdown > 0 ? formatCountdown(countdown) : 'NOW';
      const currentCount = manifest.heartbeat?.count || 0;
      const refreshEvery = manifest.heartbeat?.refreshEvery || 5;
      headerLine += '  ' + C.dim + '│' + C.reset + '  ' + C.red + '💗' + C.reset + ' ' + countdownStr + ' ' + C.dim + '(' + currentCount + '/' + refreshEvery + ')' + C.reset;
    } else if (!heartbeatEnabled) {
      headerLine += '  ' + C.dim + '│' + C.reset + '  ' + C.red + '💗' + C.reset + ' ' + C.yellow + 'PAUSED' + C.reset;
    }
  }

  lines.push(line(headerLine, W));
  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);

  // Phases header
  const isFeatureMode = manifest.mode === 'feature';
  const phases = isFeatureMode ? ['1', '2', '3'] : ['1', '2', '3', '4', '5'];
  const phaseHint = isFeatureMode ? '[1-3]' : '[1-5]';
  lines.push(line('', W));
  // Column headers centered over their columns: time(10) + regular(13) + cached(13) + total(13) + padding(2)
  const headerLeft = '  ' + C.bold + C.white + 'PHASES' + C.reset + '  ' + C.dim + phaseHint + C.reset;
  // Center each header in its 13-char column (6 tok + 1 space + 6 cost)
  const centerIn13 = (s) => { const pad = Math.floor((13 - s.length) / 2); return ''.padEnd(pad) + s + ''.padEnd(13 - pad - s.length); };
  const headerRight = C.dim + '   time   ' + C.reset + ' ' + C.yellow + centerIn13('regular') + C.reset + ' ' + C.cyan + centerIn13('cached') + C.reset + ' ' + C.green + centerIn13('total') + C.reset;
  lines.push(line(headerLeft + ''.padEnd(W - 15 - 54) + headerRight, W)); // 54 = 52 stats + 2 right padding
  lines.push(separator(W));

  // Phases
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[phase];
    const isExpanded = expandedPhases.has(phase);
    const hasTodos = phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0;

    // Status icon - cleaner symbols
    let icon = C.dim + '○' + C.reset;
    let rowColor = C.dim;
    if (status === 'complete') {
      icon = C.green + '✓' + C.reset;
      rowColor = C.green;
    } else if (status === 'running') {
      icon = C.yellow + '▶' + C.reset;
      rowColor = C.yellow;
    } else if (status === 'failed') {
      icon = C.red + '✗' + C.reset;
      rowColor = C.red;
    }

    // Expand indicator
    let expandIcon = '  ';
    if (hasTodos) {
      expandIcon = isExpanded ? C.dim + '▼' + C.reset + ' ' : C.dim + '►' + C.reset + ' ';
    }

    // Stats with colors: regular (yellow), cached (cyan), total (green)
    // Fixed width: time(10) + space + reg(6+6) + space + cache(6+6) + space + tot(6+6) = 52 chars
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      const todoCount = phaseData.todoBreakdown ? phaseData.todoBreakdown.length : 0;
      stats = C.white + formatTime(phaseData.duration).padStart(10) + C.reset + ' ';
      // Regular tokens + cost (yellow)
      const regTok = phaseData.regularTokens ? formatTokens(phaseData.regularTokens) : '--';
      const regCost = phaseData.regularCost !== undefined ? formatCost(phaseData.regularCost) : '$--';
      stats += C.yellow + regTok.padStart(6) + ' ' + regCost.padStart(6) + C.reset + ' ';
      // Cached tokens + cost (cyan)
      const cacheTok = phaseData.cachedTokens ? formatTokens(phaseData.cachedTokens) : '--';
      const cacheCost = phaseData.cachedCost !== undefined ? formatCost(phaseData.cachedCost) : '$--';
      stats += C.cyan + cacheTok.padStart(6) + ' ' + cacheCost.padStart(6) + C.reset + ' ';
      // Total tokens + cost (green)
      const totTok = phaseData.tokens ? formatTokens(phaseData.tokens) : '--';
      const totCost = phaseData.cost !== undefined ? formatCost(phaseData.cost) : '$--';
      stats += C.green + totTok.padStart(6) + ' ' + totCost.padStart(6) + C.reset;
      if (todoCount > 0) stats += C.dim + '(' + todoCount + ')' + C.reset;
    } else if (status === 'running' && phaseData.startedAt) {
      const elapsed = Date.now() - new Date(phaseData.startedAt).getTime();
      stats = C.yellow + formatTime(elapsed).padStart(10) + C.reset + ''.padEnd(42);
    } else {
      stats = C.dim + '--'.padStart(10) + '    --    --     --    --     --    --' + C.reset;
    }

    // Fixed layout: left section (22 chars) + padding + right section (stats ~52 chars) + 2 right padding
    const phaseNameTrunc = truncate(name, 12).padEnd(12);
    const leftPart = '  ' + icon + '  ' + phase + '. ' + expandIcon + rowColor + phaseNameTrunc + C.reset;
    const leftWidth = 22; // 2 + 1 + 2 + 1 + 2 + 2 + 12 = 22
    const statsWidth = 52;
    const rightPad = 2;
    const padding = ''.padEnd(Math.max(0, W - 4 - leftWidth - statsWidth - rightPad)); // -4 for borders
    lines.push(line(leftPart + padding + stats, W));

    // Expanded todo breakdown with token/cost breakdown - right-aligned same as parent
    if (isExpanded && hasTodos) {
      const todos = phaseData.todoBreakdown;
      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const isLast = i === todos.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const todoName = truncate(todo.content, 20).padEnd(20);
        const todoDur = formatTime(todo.durationMs).padStart(10);
        // Regular (yellow)
        const todoRegTok = todo.regularTokens ? formatTokens(todo.regularTokens) : '--';
        const todoRegCost = todo.regularCost !== undefined ? formatCost(todo.regularCost) : '$--';
        // Cached (cyan)
        const todoCacheTok = todo.cachedTokens ? formatTokens(todo.cachedTokens) : '--';
        const todoCacheCost = todo.cachedCost !== undefined ? formatCost(todo.cachedCost) : '$--';
        // Total (green)
        const todoTotTok = todo.tokens ? formatTokens(todo.tokens) : '--';
        const todoTotCost = todo.cost !== undefined ? formatCost(todo.cost) : '$--';

        let todoStats = C.dim + todoDur + C.reset + ' ';
        todoStats += C.yellow + todoRegTok.padStart(6) + ' ' + todoRegCost.padStart(6) + C.reset + ' ';
        todoStats += C.cyan + todoCacheTok.padStart(6) + ' ' + todoCacheCost.padStart(6) + C.reset + ' ';
        todoStats += C.green + todoTotTok.padStart(6) + ' ' + todoTotCost.padStart(6) + C.reset;

        // Right-aligned: left(29) + padding + stats(52) + rightPad(2)
        const todoLeft = '      ' + C.dim + prefix + C.reset + ' ' + todoName;
        const todoLeftWidth = 29; // 6 + 2 + 1 + 20
        const todoPadding = ''.padEnd(Math.max(0, W - 4 - todoLeftWidth - 52 - 2));
        lines.push(line(todoLeft + todoPadding + todoStats, W));
      }
    }

  }

  // Epics section (shown after all phases, only if epics exist)
  if (manifest.epics && manifest.epics.length > 0) {
    lines.push(line('', W));
    // Column headers centered same as phases
    const epicHeaderLeft = '  ' + C.bold + C.white + 'EPICS' + C.reset + '   ' + C.dim + '[A-I]' + C.reset;
    const epicHeaderRight = C.dim + '   time   ' + C.reset + ' ' + C.yellow + centerIn13('regular') + C.reset + ' ' + C.cyan + centerIn13('cached') + C.reset + ' ' + C.green + centerIn13('total') + C.reset;
    lines.push(line(epicHeaderLeft + ''.padEnd(W - 16 - 54) + epicHeaderRight, W)); // 54 = 52 stats + 2 right padding
    lines.push(separator(W));

    for (const epic of manifest.epics) {
      let epicIcon = C.dim + '○' + C.reset;
      let epicRowColor = C.dim;
      if (epic.status === 'complete') { epicIcon = C.green + '✓' + C.reset; epicRowColor = C.green; }
      else if (epic.status === 'running') { epicIcon = C.yellow + '▶' + C.reset; epicRowColor = C.yellow; }
      else if (epic.status === 'verifying') { epicIcon = C.blue + '?' + C.reset; epicRowColor = C.blue; }

      const epicKey = String.fromCharCode(96 + epic.id).toUpperCase();
      const isEpicExpanded = expandedEpics.has(epic.id);
      const hasEpicData = epic.cost || epic.duration || (epic.todoBreakdown && epic.todoBreakdown.length > 0);
      const expandIndicator = hasEpicData ? (isEpicExpanded ? C.dim + '▼' + C.reset : C.dim + '►' + C.reset) : ' ';

      let epicStats = '';
      if (epic.duration) {
        epicStats += C.white + formatTime(epic.duration).padStart(10) + C.reset + ' ';
        // Regular (yellow)
        const eRegTok = epic.regularTokens ? formatTokens(epic.regularTokens) : '--';
        const eRegCost = epic.regularCost !== undefined ? formatCost(epic.regularCost) : '$--';
        epicStats += C.yellow + eRegTok.padStart(6) + ' ' + eRegCost.padStart(6) + C.reset + ' ';
        // Cached (cyan)
        const eCacheTok = epic.cachedTokens ? formatTokens(epic.cachedTokens) : '--';
        const eCacheCost = epic.cachedCost !== undefined ? formatCost(epic.cachedCost) : '$--';
        epicStats += C.cyan + eCacheTok.padStart(6) + ' ' + eCacheCost.padStart(6) + C.reset + ' ';
        // Total (green)
        const eTotTok = epic.tokens ? formatTokens(epic.tokens) : '--';
        const eTotCost = epic.cost !== undefined ? formatCost(epic.cost) : '$--';
        epicStats += C.green + eTotTok.padStart(6) + ' ' + eTotCost.padStart(6) + C.reset;
        if (epic.todoBreakdown) epicStats += C.dim + '(' + epic.todoBreakdown.length + ')' + C.reset;
      } else {
        epicStats += C.dim + '--'.padStart(10) + '    --    --     --    --     --    --' + C.reset;
      }

      // Fixed layout: left section (26 chars) + padding + right section (stats ~52 chars) + 2 right padding
      const epicNameTrunc = truncate(epic.name, 16).padEnd(16);
      const epicLeftPart = '  ' + epicIcon + '  ' + C.yellow + '[' + epicKey + ']' + C.reset + ' ' + expandIndicator + ' ' + epicRowColor + epicNameTrunc + C.reset;
      const epicLeftWidth = 26; // 2 + 1 + 2 + 3 + 1 + 1 + 16 = 26
      const epicPadding = ''.padEnd(Math.max(0, W - 4 - epicLeftWidth - 52 - 2)); // -2 for right padding
      lines.push(line(epicLeftPart + epicPadding + epicStats, W));

      // Expanded epic details with token/cost breakdown - right-aligned same as parent
      if (isEpicExpanded && epic.todoBreakdown && epic.todoBreakdown.length > 0) {
        for (let i = 0; i < epic.todoBreakdown.length; i++) {
          const todo = epic.todoBreakdown[i];
          const isLast = i === epic.todoBreakdown.length - 1;
          const prefix = isLast ? '└─' : '├─';
          const todoName = truncate(todo.content || '', 18).padEnd(18);
          const todoDur = todo.durationMs ? formatTime(todo.durationMs).padStart(10) : '--'.padStart(10);
          // Regular (yellow)
          const todoRegTok = todo.regularTokens ? formatTokens(todo.regularTokens) : '--';
          const todoRegCost = todo.regularCost !== undefined ? formatCost(todo.regularCost) : '$--';
          // Cached (cyan)
          const todoCacheTok = todo.cachedTokens ? formatTokens(todo.cachedTokens) : '--';
          const todoCacheCost = todo.cachedCost !== undefined ? formatCost(todo.cachedCost) : '$--';
          // Total (green)
          const todoTotTok = todo.tokens ? formatTokens(todo.tokens) : '--';
          const todoTotCost = todo.cost !== undefined ? formatCost(todo.cost) : '$--';

          let todoStats = C.dim + todoDur + C.reset + ' ';
          todoStats += C.yellow + todoRegTok.padStart(6) + ' ' + todoRegCost.padStart(6) + C.reset + ' ';
          todoStats += C.cyan + todoCacheTok.padStart(6) + ' ' + todoCacheCost.padStart(6) + C.reset + ' ';
          todoStats += C.green + todoTotTok.padStart(6) + ' ' + todoTotCost.padStart(6) + C.reset;

          // Right-aligned: left(29) + padding + stats(52) + rightPad(2)
          const epicTodoLeft = '        ' + C.dim + prefix + C.reset + ' ' + todoName;
          const epicTodoLeftWidth = 29; // 8 + 2 + 1 + 18
          const epicTodoPadding = ''.padEnd(Math.max(0, W - 4 - epicTodoLeftWidth - 52 - 2));
          lines.push(line(epicTodoLeft + epicTodoPadding + todoStats, W));
        }
      }
    }
  }

  lines.push(line('', W));
  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);

  // Worker progress section
  lines.push(line('  ' + C.bold + C.white + 'WORKER' + C.reset, W));
  lines.push(separator(W));

  const currentPhase = manifest.currentPhase;
  const workerProgress = manifest.phases?.[currentPhase]?.workerProgress;

  if (!workerProgress || workerProgress.total === 0) {
    lines.push(line('  ' + C.dim + '(Waiting for worker...)' + C.reset, W));
  } else {
    const pct = Math.round((workerProgress.completed / workerProgress.total) * 100);
    const bar = renderNumberedProgressBar(workerProgress.completed, workerProgress.total);
    const pctStr = (pct + '%').padStart(4);
    lines.push(line('  [' + bar + '] ' + C.bold + pctStr + C.reset, W));
    if (workerProgress.currentTask) {
      const taskNum = workerProgress.completed + 1;
      const task = truncate(workerProgress.currentTask, W-20);
      lines.push(line('  ' + C.yellow + '→ Task ' + taskNum + '/' + workerProgress.total + C.reset + ' ' + C.dim + '│' + C.reset + ' ' + task, W));
    }
  }

  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);

  // Cost & Tokens section - calculate totals with breakdown
  let totalTokens = 0;
  let totalRegularTokens = 0;
  let totalCachedTokens = 0;
  let totalRegularCost = 0;
  let totalCachedCost = 0;

  if (manifest.phases) {
    for (const p of Object.values(manifest.phases)) {
      if (p.tokens) totalTokens += p.tokens;
      if (p.regularTokens) totalRegularTokens += p.regularTokens;
      if (p.cachedTokens) totalCachedTokens += p.cachedTokens;
      if (p.regularCost) totalRegularCost += p.regularCost;
      if (p.cachedCost) totalCachedCost += p.cachedCost;
    }
  }
  if (manifest.epics) {
    for (const e of manifest.epics) {
      if (e.tokens) totalTokens += e.tokens;
      if (e.regularTokens) totalRegularTokens += e.regularTokens;
      if (e.cachedTokens) totalCachedTokens += e.cachedTokens;
      if (e.regularCost) totalRegularCost += e.regularCost;
      if (e.cachedCost) totalCachedCost += e.cachedCost;
    }
  }

  // TOTALS line with breakdown: regular (yellow), cached (cyan), total (green)
  // Right-aligned to match phase/epic columns with 2 char right padding
  const totalsLeft = '  ' + C.bold + C.white + 'TOTALS' + C.reset;
  let totalsStats = ''.padStart(10) + ' '; // empty time column
  totalsStats += C.yellow + formatTokens(totalRegularTokens).padStart(6) + ' ' + formatCost(totalRegularCost).padStart(6) + C.reset + ' ';
  totalsStats += C.cyan + formatTokens(totalCachedTokens).padStart(6) + ' ' + formatCost(totalCachedCost).padStart(6) + C.reset + ' ';
  totalsStats += C.green + formatTokens(totalTokens).padStart(6) + ' ' + formatCost(manifest.totalCost || 0).padStart(6) + C.reset;
  const totalsPadding = ''.padEnd(Math.max(0, W - 4 - 8 - 52 - 2)); // 8 = "  TOTALS", 2 = right padding
  lines.push(line(totalsLeft + totalsPadding + totalsStats, W));

  // Output style countdown (subtle)
  if (outputStyleCountdown !== null && outputStyleCountdown > 0) {
    const countdownStr = formatCountdown(outputStyleCountdown);
    const styleLabel = manifest.outputStyle || 'unknown';
    lines.push(line('  ' + C.dim + 'Output style "' + styleLabel + '" in ' + countdownStr + C.reset, W));
  }

  // Pricing legend (compact) with color key
  lines.push(line('', W));
  lines.push(line('  ' + C.dim + 'Opus=' + C.reset + '$5/$25' + C.dim + '/MTok  Sonnet=' + C.reset + '$3/$15' + C.dim + '  Haiku=' + C.reset + '$1/$5' + C.dim + '  (Cache: 0.1x)' + C.reset, W));

  // Footer with hotkey hints
  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);
  lines.push(line('  ' + C.yellow + '[1-5]' + C.reset + ' Phases    ' + C.yellow + '[A-I]' + C.reset + ' Epics    ' + C.yellow + '[' + C.reset + C.red + '💗' + C.reset + C.yellow + ' Space]' + C.reset + ' Heartbeat    ' + C.yellow + '[Q]' + C.reset + ' Quit', W));
  lines.push(C.cyan + '╚' + '═'.repeat(W-2) + '╝' + C.reset);

  // Render
  clearScreen();
  console.log(lines.join('\n'));
}
function tick() {
  activeMs += 1000;

  // Decrement output style countdown
  if (outputStyleCountdown !== null && outputStyleCountdown > 0) {
    outputStyleCountdown -= 1000;
  }

  // Save to manifest periodically
  if (Date.now() - lastSaveTime >= SAVE_INTERVAL) {
    saveActiveMs();
    lastSaveTime = Date.now();
  }

  // Check for state transitions (phase/epic/pipeline complete)
  checkStateTransitions();

  render();
}

// ============ HEARTBEAT ============

function scheduleNextHeartbeat() {
  if (!ORCHESTRATOR_PID) return;
  const manifest = readManifest();
  const interval = getHeartbeatInterval(manifest);
  nextHeartbeatTime = Date.now() + interval;
  setTimeout(sendHeartbeat, interval);
}

function setOrchestratorOutputStyle() {
  if (!ORCHESTRATOR_PID) return;

  const manifest = readManifest();
  if (!manifest || !manifest.outputStyle) {
    console.log('[STARTUP] No output style in manifest, skipping');
    return;
  }

  const outputStyle = manifest.outputStyle;
  const delayMs = 60000; // 60 seconds
  outputStyleCountdown = delayMs;
  console.log('[STARTUP] Will set orchestrator output style in 60s: ' + outputStyle);

  // Delay 60 seconds to let orchestrator finish its startup tasks
  setTimeout(() => {
    outputStyleCountdown = null; // Clear countdown
    console.log('[STARTUP] Now setting orchestrator output style: ' + outputStyle);

    const scriptPath = path.join(PROJECT_PATH, '.pipeline', 'inject-style.ps1');
    const psScript = `Add-Type @'
using System;
using System.Runtime.InteropServices;

public class StyleInjector
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const ushort KEY_EVENT = 0x0001;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr CreateFile(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr hConsoleInput, INPUT_RECORD[] lpBuffer,
        uint nLength, out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD
    {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct KEY_EVENT_RECORD
    {
        [FieldOffset(0)] public int bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static string SendText(int targetPid, string text)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed";

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2];

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = 1;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = c;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return result ? "OK" : "WriteConsoleInput failed";
    }

    public static string SendEnter(int targetPid)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed";

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        INPUT_RECORD[] records = new INPUT_RECORD[2];
        records[0].EventType = KEY_EVENT;
        records[0].KeyEvent.bKeyDown = 1;
        records[0].KeyEvent.wRepeatCount = 1;
        records[0].KeyEvent.UnicodeChar = (char)13;
        records[0].KeyEvent.wVirtualKeyCode = 0x0D;

        records[1].EventType = KEY_EVENT;
        records[1].KeyEvent.bKeyDown = 0;
        records[1].KeyEvent.wRepeatCount = 1;
        records[1].KeyEvent.UnicodeChar = (char)13;
        records[1].KeyEvent.wVirtualKeyCode = 0x0D;

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return result ? "OK" : "WriteConsoleInput failed";
    }
}
'@

# Step 1: Send the command text (without Enter)
Write-Output "Sending /output-style ${outputStyle}..."
$r1 = [StyleInjector]::SendText(${ORCHESTRATOR_PID}, "/output-style ${outputStyle}")
Write-Output "Text result: $r1"

# Step 2: Wait 300ms
Start-Sleep -Milliseconds 300

# Step 3: Send Enter
Write-Output "Sending Enter..."
$r2 = [StyleInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Enter result: $r2"
`;

    try {
      fs.writeFileSync(scriptPath, psScript);
      const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });

      proc.on('close', (code) => {
        console.log('[STARTUP] Output style result: ' + output.trim());
      });
    } catch (err) {
      console.log('[STARTUP] Error setting output style: ' + err.message);
    }
  }, 60000); // 60 second delay
}

function triggerContextRefresh() {
  // Reset heartbeat count in manifest BEFORE triggering refresh
  const manifest = readManifest();
  if (manifest) {
    manifest.heartbeat = manifest.heartbeat || {};
    manifest.heartbeat.count = 0;
    writeManifest(manifest);
  }

  const scriptPath = path.join(PROJECT_PATH, '.pipeline', 'inject-refresh.ps1');
  const psScript = `Add-Type @'
using System;
using System.Runtime.InteropServices;

public class RefreshInjector
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const ushort KEY_EVENT = 0x0001;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess,
        uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool WriteConsoleInput(IntPtr hConsoleInput,
        INPUT_RECORD[] lpBuffer, uint nLength, out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD
    {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct KEY_EVENT_RECORD
    {
        [FieldOffset(0)] public int bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static string SendText(int targetPid, string text)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed";

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2];

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = 1;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = c;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return result ? "OK" : "WriteConsoleInput failed";
    }

    public static string SendEnter(int targetPid)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed";

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        INPUT_RECORD[] records = new INPUT_RECORD[2];

        records[0].EventType = KEY_EVENT;
        records[0].KeyEvent.bKeyDown = 1;
        records[0].KeyEvent.wRepeatCount = 1;
        records[0].KeyEvent.UnicodeChar = (char)13;
        records[0].KeyEvent.wVirtualKeyCode = 0x0D;

        records[1].EventType = KEY_EVENT;
        records[1].KeyEvent.bKeyDown = 0;
        records[1].KeyEvent.wRepeatCount = 1;
        records[1].KeyEvent.UnicodeChar = (char)13;
        records[1].KeyEvent.wVirtualKeyCode = 0x0D;

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return result ? "OK" : "WriteConsoleInput failed";
    }
}
'@

# Step 1: Send /clear (text, wait 300ms, enter)
Write-Output "Sending /clear..."
$r1 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/clear")
Start-Sleep -Milliseconds 300
$r1e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Clear result: text=$r1, enter=$r1e"

# Step 2: Wait 3 seconds for clear to complete
Write-Output "Waiting 3 seconds for clear..."
Start-Sleep -Seconds 3

# Step 3: Send /orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION (text, wait 300ms, enter)
Write-Output "Sending /orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION..."
$r2 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION")
Start-Sleep -Milliseconds 300
$r2e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Orchestrator result: text=$r2, enter=$r2e"
`;

  try {
    fs.writeFileSync(scriptPath, psScript);
    const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      console.log('[REFRESH] Result:\n' + output.trim());
    });
  } catch (err) {
    console.log('[REFRESH] Error: ' + err.message);
  }
}


function sendHeartbeat() {
  if (!ORCHESTRATOR_PID) return;
  const manifest = readManifest();

  // Schedule next heartbeat first
  scheduleNextHeartbeat();

  // Check if we should send
  if (!manifest || manifest.status === 'complete' || manifest.status === 'paused') return;
  if (manifest.heartbeat && manifest.heartbeat.enabled === false) return;

  heartbeatCount++;

  // Check if context refresh is needed
  const currentCount = (manifest.heartbeat?.count || 0) + 1;
  const refreshEvery = manifest.heartbeat?.refreshEvery || 5;
  const needsRefresh = currentCount >= refreshEvery;

  if (needsRefresh) {
    console.log('\n[HEARTBEAT ' + heartbeatCount + '] Context refresh needed (' + currentCount + '/' + refreshEvery + ')');
    console.log('[HEARTBEAT ' + heartbeatCount + '] Triggering /clear + /orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION...');
    triggerContextRefresh();
    return;
  }

  console.log('\n[HEARTBEAT ' + heartbeatCount + '] Pinging orchestrator PID ' + ORCHESTRATOR_PID + ' (' + currentCount + '/' + refreshEvery + ')...');


  // Update heartbeat count in manifest
  if (!manifest.heartbeat) manifest.heartbeat = {};
  manifest.heartbeat.count = currentCount;
  writeManifest(manifest);

  try {
    const scriptPath = path.join(PROJECT_PATH, '.pipeline', 'inject-heartbeat.ps1');
    const psScript = `Add-Type @'
using System;
using System.Runtime.InteropServices;

public class ConsoleInjector
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const ushort KEY_EVENT = 0x0001;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr CreateFile(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr hConsoleInput, INPUT_RECORD[] lpBuffer,
        uint nLength, out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD
    {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct KEY_EVENT_RECORD
    {
        [FieldOffset(0)] public int bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static string SendString(int targetPid, string text, bool sendEnter)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed";

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        int extraEvents = sendEnter ? 2 : 0;
        INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2 + extraEvents];

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = 1;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = c;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
        }

        if (sendEnter)
        {
            int idx = text.Length * 2;
            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 1;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = (char)13;
            records[idx].KeyEvent.wVirtualKeyCode = 0x0D;

            records[idx + 1].EventType = KEY_EVENT;
            records[idx + 1].KeyEvent.bKeyDown = 0;
            records[idx + 1].KeyEvent.wRepeatCount = 1;
            records[idx + 1].KeyEvent.UnicodeChar = (char)13;
            records[idx + 1].KeyEvent.wVirtualKeyCode = 0x0D;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return result ? "OK" : "WriteConsoleInput failed";
    }
}
'@

$r1 = [ConsoleInjector]::SendString(${ORCHESTRATOR_PID}, "HEARTBEAT: Check worker progress, update manifest.", $false)
Start-Sleep -Milliseconds 300
$r2 = [ConsoleInjector]::SendString(${ORCHESTRATOR_PID}, "", $true)
Write-Output "Text: $r1, Enter: $r2"
`;

    fs.writeFileSync(scriptPath, psScript);
    const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      console.log('[HEARTBEAT ' + heartbeatCount + '] Result: ' + output.trim());
    });
  } catch (err) {
    console.log('[HEARTBEAT ' + heartbeatCount + '] Error: ' + err.message);
  }
}

// ============ EVENT MESSAGES ============

function sendEventMessage(message) {
  if (!ORCHESTRATOR_PID) return;

  console.log('\n[EVENT] Sending: ' + message);

  const scriptPath = path.join(PROJECT_PATH, '.pipeline', 'inject-event.ps1');
  const psScript = `Add-Type @'
using System;
using System.Runtime.InteropServices;

public class EventInjector
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const ushort KEY_EVENT = 0x0001;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr CreateFile(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr hConsoleInput, INPUT_RECORD[] lpBuffer,
        uint nLength, out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD
    {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct KEY_EVENT_RECORD
    {
        [FieldOffset(0)] public int bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static string SendString(int targetPid, string text, bool sendEnter)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed";

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        int extraEvents = sendEnter ? 2 : 0;
        INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2 + extraEvents];

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = 1;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = c;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
        }

        if (sendEnter)
        {
            int idx = text.Length * 2;
            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 1;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = (char)13;
            records[idx].KeyEvent.wVirtualKeyCode = 0x0D;

            records[idx + 1].EventType = KEY_EVENT;
            records[idx + 1].KeyEvent.bKeyDown = 0;
            records[idx + 1].KeyEvent.wRepeatCount = 1;
            records[idx + 1].KeyEvent.UnicodeChar = (char)13;
            records[idx + 1].KeyEvent.wVirtualKeyCode = 0x0D;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return result ? "OK" : "WriteConsoleInput failed";
    }
}
'@

$r1 = [EventInjector]::SendString(${ORCHESTRATOR_PID}, "${message}", $false)
Start-Sleep -Milliseconds 300
$r2 = [EventInjector]::SendString(${ORCHESTRATOR_PID}, "", $true)
Write-Output "Text: $r1, Enter: $r2"
`;

  try {
    fs.writeFileSync(scriptPath, psScript);
    const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      console.log('[EVENT] Result: ' + output.trim());
    });
  } catch (err) {
    console.log('[EVENT] Error: ' + err.message);
  }
}

function checkStateTransitions() {
  if (!ORCHESTRATOR_PID) return;

  const manifest = readManifest();
  if (!manifest) return;

  // Check pipeline complete
  if (manifest.status === 'complete' && lastPipelineStatus !== 'complete') {
    sendEventMessage('PIPELINE COMPLETE: Generate final report.');
    lastPipelineStatus = manifest.status;
    return;
  }
  lastPipelineStatus = manifest.status;

  // Check phase transitions
  if (manifest.phases) {
    for (const [phase, data] of Object.entries(manifest.phases)) {
      const currentStatus = data.status;
      const previousStatus = lastPhaseStatuses[phase];

      if (currentStatus === 'complete' && previousStatus === 'running') {
        sendEventMessage('PHASE COMPLETE: Run analyze-session.ps1 to get todoBreakdown, save to manifest, then spawn next phase worker.');
      }

      lastPhaseStatuses[phase] = currentStatus;
    }
  }

  // Check epic transitions
  if (manifest.epics && manifest.epics.length > 0) {
    for (const epic of manifest.epics) {
      const currentStatus = epic.status;
      const previousStatus = lastEpicStatuses[epic.id];

      if (currentStatus === 'complete' && previousStatus === 'running') {
        sendEventMessage('EPIC COMPLETE: Run analyze-session.ps1 to get todoBreakdown, save to manifest, then spawn next epic worker.');
      }

      lastEpicStatuses[epic.id] = currentStatus;
    }
  }
}

// ============ INPUT HANDLING ============

function setupKeypress() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      saveActiveMs();
      console.log('\nDashboard closed. Timer saved.');
      process.exit(0);
    }

    if (['1', '2', '3', '4', '5'].includes(str)) {
      if (expandedPhases.has(str)) {
        expandedPhases.delete(str);
      } else {
        expandedPhases.add(str);
      }
      render();
    }

    // Epic expansion: a-i for epics 1-9
    if (str >= 'a' && str <= 'i') {
      const epicNum = str.charCodeAt(0) - 96; // a=1, b=2, ..., i=9
      if (expandedEpics.has(epicNum)) {
        expandedEpics.delete(epicNum);
      } else {
        expandedEpics.add(epicNum);
      }
      render();
    }

    // Manual heartbeat: Space key
    if (str === ' ') {
      sendHeartbeat();
    }

  });

  process.stdin.resume();
}

// ============ MAIN ============

function main() {
  console.log('Pipeline Dashboard v2');
  console.log('=====================');
  console.log('Project: ' + PROJECT_PATH);

  // Load activeMs from manifest and reset heartbeat counter
  const manifest = readManifest();
  if (manifest) {
    if (typeof manifest.activeMs === 'number') {
      activeMs = manifest.activeMs;
      console.log('Resuming timer from ' + formatTime(activeMs));
    } else {
      activeMs = 0;
      console.log('Starting timer from 0');
    }
    // Reset heartbeat counter on dashboard spawn
    manifest.heartbeat = manifest.heartbeat || {};
    manifest.heartbeat.count = 0;
    writeManifest(manifest);
    console.log('Heartbeat counter reset to 0');

    // Initialize state tracking to current state (avoid false triggers on startup)
    lastPipelineStatus = manifest.status;
    if (manifest.phases) {
      for (const [phase, data] of Object.entries(manifest.phases)) {
        lastPhaseStatuses[phase] = data.status;
      }
    }
    if (manifest.epics) {
      for (const epic of manifest.epics) {
        lastEpicStatuses[epic.id] = epic.status;
      }
    }
    console.log('State tracking initialized');
  }

  if (ORCHESTRATOR_PID) {
    console.log('Orchestrator PID: ' + ORCHESTRATOR_PID);
  } else {
    console.log('No orchestrator PID - heartbeat disabled');
  }
  console.log('');

  setupKeypress();

  // Start timer - ticks every second
  setInterval(tick, REFRESH_INTERVAL);

  // Set orchestrator output style once at startup
  // DISABLED: Feature commented out - was causing issues
  // if (ORCHESTRATOR_PID) {
  //   setOrchestratorOutputStyle();
  // }

  // Start heartbeat if orchestrator PID provided
  if (ORCHESTRATOR_PID) {
    nextHeartbeatTime = Date.now() + 5000;
    setTimeout(sendHeartbeat, 5000);
  }

  // Handle exit - save timer
  process.on('SIGINT', () => { saveActiveMs(); process.exit(0); });
  process.on('SIGTERM', () => { saveActiveMs(); process.exit(0); });

  render();
}

main();
