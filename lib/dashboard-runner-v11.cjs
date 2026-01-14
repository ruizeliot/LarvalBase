#!/usr/bin/env node
/**
 * Dashboard Runner v11
 *
 * Full-featured runner for the v11 modular dashboard.
 * Features:
 * - Timer display (T H:MM:SS)
 * - Heartbeat countdown (H M:SS (N/M))
 * - Console injection for heartbeat (not file-based)
 * - Navigation with Up/Down/Tab
 * - All key bindings from spec
 *
 * Usage: node dashboard-runner-v11.cjs [projectPath] [orchestratorPID]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dashboard = require('./dashboard/index.cjs');

// ============ CONFIGURATION ============

const PROJECT_PATH = path.resolve(process.argv[2] || process.cwd());
const ORCHESTRATOR_PID = process.argv[3] || null;
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const DASHBOARD_STATE_PATH = path.join(PROJECT_PATH, '.pipeline', 'dashboard-state.json');
const CONSOLE_INJECTOR_PATH = path.join(__dirname, 'console-injector.ps1');

const REFRESH_INTERVAL = 1000; // 1 second
const SAVE_INTERVAL = 5000; // Save dashboard state every 5 seconds
const DEFAULT_HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

const PHASE_NAMES = {
  '2': 'Discovery',
  '3': 'Tests',
  '4': 'Implement',
  '5': 'Quality'
};

// Column Layout Constants (Excel-like)
const COL = {
  TIME: 10,      // "  7m 05s  "
  REG: 18,       // " 1.2M 2.3% $2.10" (SUB mode: tok % $)
  CACHE: 18,     // "  300K 0.5% $0.35"
  TOTAL: 18,     // " 1.5M 2.8% $2.45"
};
const DATA_COLS_WIDTH = COL.TIME + 1 + COL.REG + 1 + COL.CACHE + 1 + COL.TOTAL; // 68 (with 3 separators)

// Pricing Constants
const PRICING = {
  'claude-opus-4-5-20251101': { input: 5.0, output: 25.0, cacheRead: 0.50 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0, cacheRead: 0.30 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0, cacheRead: 0.10 },
  'default': { input: 3.0, output: 15.0, cacheRead: 0.30 }
};

// Subscription mode constants
const WEEKLY_SUB_BUDGET = 50; // $200/month ÷ 4 = $50/week
const DOLLARS_PER_PERCENT = 0.50; // 1% of 7-day = $0.50
const DEFAULT_TOKENS_PER_PERCENT = 182707;

// ============ STATE ============

let activeMs = 0;
let heartbeatCount = 0;
let nextHeartbeatTime = null;
let heartbeatIntervalId = null;
let lastSaveTime = Date.now();

// Navigation state
let cursorIndex = 0;
let expandedPhases = new Set();

// Pricing mode state
let pricingMode = 'api'; // 'api' or 'sub'
let tokensPerPercent = DEFAULT_TOKENS_PER_PERCENT;

// Auto-analysis state
let autoAnalysis = true;
let previousPhaseStatuses = {};

// ============ HELPERS ============

/**
 * Format milliseconds as H:MM:SS
 * @param {number} ms
 * @returns {string}
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format countdown as M:SS
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format duration in minutes and seconds
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (!ms) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Format token count with K/M suffix
 * @param {number} tokens
 * @returns {string}
 */
function formatTokens(tokens) {
  if (!tokens) return '-';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return String(tokens);
}

/**
 * Format cost as currency
 * @param {number} cost
 * @returns {string}
 */
function formatCost(cost) {
  if (cost === undefined || cost === null) return '-';
  return `$${cost.toFixed(2)}`;
}

/**
 * Get subscription cost from token count
 * @param {number} tokens
 * @returns {number|null}
 */
function getSubCostFromTokens(tokens) {
  if (!tokens || tokens === 0) return null;
  const estimatedPercent = tokens / tokensPerPercent;
  return estimatedPercent * DOLLARS_PER_PERCENT;
}

/**
 * Get display cost based on pricing mode
 * @param {number} apiCost
 * @param {number} usageDelta
 * @param {number} tokens
 * @returns {number}
 */
function getDisplayCost(apiCost, usageDelta, tokens) {
  if (pricingMode === 'sub') {
    if (usageDelta !== undefined && usageDelta !== null) {
      return usageDelta * DOLLARS_PER_PERCENT;
    }
    const tokenCost = getSubCostFromTokens(tokens);
    if (tokenCost !== null) return tokenCost;
  }
  return apiCost || 0;
}

/**
 * Center string in given width
 * @param {string} s
 * @param {number} w
 * @returns {string}
 */
function centerStr(s, w) {
  const len = s.length;
  if (len >= w) return s.slice(0, w);
  const left = Math.floor((w - len) / 2);
  const right = w - len - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

/**
 * Format data column with token, percent, cost
 * @param {string} tok - Token string
 * @param {string} pct - Percentage string
 * @param {string} cost - Cost string
 * @param {boolean} isSubMode
 * @param {number} colWidth
 * @returns {string}
 */
function formatDataCol(tok, pct, cost, isSubMode, colWidth = 18) {
  if (isSubMode) {
    // SUB: 5│5│6 = 18 chars
    return centerStr(tok, 5) + '│' + centerStr(pct, 5) + '│' + centerStr(cost, 6);
  } else {
    // API: 8│9 = 18 chars
    return centerStr(tok, 8) + '│' + centerStr(cost, 9);
  }
}

/**
 * Numbered progress bar for worker - shows each todo as a numbered segment
 */
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

/**
 * Read manifest from disk
 * @returns {Object|null}
 */
function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      let content = fs.readFileSync(MANIFEST_PATH, 'utf8');
      // Strip BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      if (content && content.trim().length > 0) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    // Log parse errors for debugging
    console.log('[MANIFEST] Read error: ' + err.message);
  }
  return null;
}

/**
 * Write manifest to disk (atomic)
 * @param {Object} manifest
 */
function writeManifest(manifest) {
  try {
    const tempPath = MANIFEST_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2));
    fs.renameSync(tempPath, MANIFEST_PATH);
  } catch (err) {
    console.log('[MANIFEST] Write error: ' + err.message);
  }
}

/**
 * Save dashboard state (timer, heartbeat count)
 */
function saveDashboardState() {
  try {
    const state = {
      activeMs,
      heartbeatCount,
      savedAt: new Date().toISOString()
    };
    const tempPath = DASHBOARD_STATE_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
    fs.renameSync(tempPath, DASHBOARD_STATE_PATH);
  } catch (err) {
    // Ignore save errors
  }
}

/**
 * Load dashboard state
 */
function loadDashboardState() {
  try {
    if (fs.existsSync(DASHBOARD_STATE_PATH)) {
      const content = fs.readFileSync(DASHBOARD_STATE_PATH, 'utf8');
      const state = JSON.parse(content);
      if (state.activeMs) activeMs = state.activeMs;
      if (state.heartbeatCount) heartbeatCount = state.heartbeatCount;
    }
  } catch (err) {
    // Ignore load errors
  }
}

/**
 * Get heartbeat interval from manifest
 * @param {Object} manifest
 * @returns {number}
 */
function getHeartbeatInterval(manifest) {
  if (manifest?.heartbeat?.intervalMs) {
    return manifest.heartbeat.intervalMs;
  }
  return DEFAULT_HEARTBEAT_INTERVAL;
}

// ============ HEARTBEAT ============

/**
 * Inject text into orchestrator console
 * @param {string} text
 * @param {boolean} sendEnter
 * @returns {Promise<string>}
 */
function injectConsole(text, sendEnter = false) {
  return new Promise((resolve) => {
    const manifest = readManifest();
    const orchestratorPid = manifest?.workers?.current?.orchestratorPid || ORCHESTRATOR_PID;

    if (!orchestratorPid) {
      resolve('No orchestrator PID');
      return;
    }

    const args = [
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', CONSOLE_INJECTOR_PATH,
      '-TargetPid', String(orchestratorPid),
      '-Text', text
    ];

    if (sendEnter) {
      args.push('-SendEnter');
    }

    const proc = spawn('powershell.exe', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    proc.on('close', () => {
      resolve(output.trim());
    });

    proc.on('error', (err) => {
      resolve('Error: ' + err.message);
    });
  });
}

/**
 * Send heartbeat to orchestrator
 * @param {boolean} manual - Whether this is a manual heartbeat (Enter key)
 */
async function sendHeartbeat(manual = false) {
  const manifest = readManifest();

  // Check if heartbeat is paused (skip for manual)
  if (!manual && manifest?.heartbeat?.enabled === false) {
    scheduleNextHeartbeat();
    return;
  }

  // Skip if pipeline is complete or paused
  if (!manifest || manifest.status === 'complete' || manifest.status === 'paused') {
    scheduleNextHeartbeat();
    return;
  }

  heartbeatCount++;

  // Update manifest heartbeat count
  const currentCount = (manifest.heartbeat?.count || 0) + 1;
  const refreshEvery = manifest.heartbeat?.refreshEvery || 6;

  if (!manifest.heartbeat) manifest.heartbeat = {};
  manifest.heartbeat.count = currentCount;
  manifest.heartbeat.lastSeen = new Date().toISOString();
  writeManifest(manifest);

  console.log(`\n[HEARTBEAT ${heartbeatCount}] Pinging orchestrator (${currentCount}/${refreshEvery})...`);

  // Inject heartbeat message
  const message = `HEARTBEAT: Read worker console, extract todo progress (X/Y), update manifest.phases[phase].workerProgress`;
  const result1 = await injectConsole(message, false);

  // Wait a bit then send Enter
  await new Promise(r => setTimeout(r, 800));
  const result2 = await injectConsole('', true);

  console.log(`[HEARTBEAT ${heartbeatCount}] Result: Text=${result1}, Enter=${result2}`);

  // Check if context refresh needed
  if (currentCount >= refreshEvery) {
    console.log(`[HEARTBEAT ${heartbeatCount}] Context refresh needed - orchestrator will handle`);
    manifest.heartbeat.count = 0;
    writeManifest(manifest);
  }

  // Schedule next heartbeat
  if (!manual) {
    scheduleNextHeartbeat();
  }
}

/**
 * Schedule next heartbeat
 */
function scheduleNextHeartbeat() {
  const manifest = readManifest();
  const interval = getHeartbeatInterval(manifest);

  if (heartbeatIntervalId) {
    clearTimeout(heartbeatIntervalId);
  }

  nextHeartbeatTime = Date.now() + interval;
  heartbeatIntervalId = setTimeout(() => sendHeartbeat(false), interval);
}

// ============ ANALYSIS ============

/**
 * Run analysis on a phase
 * @param {string} phaseNum - Phase number to analyze
 */
function runAnalysis(phaseNum) {
  const manifest = readManifest();
  if (!manifest) {
    console.log('\n[ANALYSIS] No manifest found');
    return;
  }

  const phase = manifest.phases?.[phaseNum];
  if (!phase) {
    console.log(`\n[ANALYSIS] Phase ${phaseNum} not found`);
    return;
  }

  if (phase.status !== 'complete') {
    console.log(`\n[ANALYSIS] Phase ${phaseNum} not complete - cannot analyze`);
    return;
  }

  const sessionId = phase.sessionId;
  if (!sessionId) {
    console.log(`\n[ANALYSIS] Phase ${phaseNum} has no sessionId - cannot analyze`);
    return;
  }

  console.log(`\n[ANALYSIS] Starting analysis for Phase ${phaseNum} (session: ${sessionId.substring(0, 8)}...)`);

  // Update manifest to show analysis running
  phase.analysisStatus = 'running';
  writeManifest(manifest);

  // Spawn analysis worker
  const analysisScript = path.join(__dirname, 'spawn-analysis-worker.ps1');
  const args = [
    '-ExecutionPolicy', 'Bypass',
    '-File', analysisScript,
    '-ProjectPath', PROJECT_PATH,
    '-PhaseNumber', phaseNum,
    '-SessionId', sessionId
  ];

  const proc = spawn('powershell.exe', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  proc.on('close', (code) => {
    const updatedManifest = readManifest();
    if (updatedManifest?.phases?.[phaseNum]) {
      updatedManifest.phases[phaseNum].analysisStatus = code === 0 ? 'complete' : 'failed';
      writeManifest(updatedManifest);
    }
    console.log(`\n[ANALYSIS] Phase ${phaseNum} analysis ${code === 0 ? 'complete' : 'failed'}`);
  });

  proc.on('error', (err) => {
    console.log(`\n[ANALYSIS] Error: ${err.message}`);
  });
}

// ============ AUTO-ANALYSIS ============

/**
 * Check for phase completion and trigger auto-analysis if enabled
 * @param {Object} manifest
 */
function checkAutoAnalysis(manifest) {
  if (!autoAnalysis || !manifest?.phases) return;

  const phases = ['2', '3', '4', '5'];

  for (const p of phases) {
    const phase = manifest.phases[p];
    if (!phase) continue;

    const currentStatus = phase.status;
    const previousStatus = previousPhaseStatuses[p];

    // Detect transition to 'complete'
    if (currentStatus === 'complete' && previousStatus !== 'complete') {
      // Check if analysis is already running or complete
      if (!phase.analysisStatus && !phase.analysis && phase.sessionId) {
        console.log(`\n[AUTO-ANALYSIS] Phase ${p} completed - triggering analysis`);
        runAnalysis(p);
      }
    }

    // Update previous status
    previousPhaseStatuses[p] = currentStatus;
  }
}

// ============ RENDERING ============

// Note: Old tableRow, drawLine, tableSeparator functions removed - using inline line() helper instead

/**
 * ANSI color codes (matching old dashboard)
 */
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgMagenta: '\x1b[45m',
};

/**
 * Clear screen and move cursor home (no scroll)
 */
function clearScreenHome() {
  process.stdout.write('\x1b[H\x1b[J\x1b[?25l');
}

/**
 * Render dashboard with timer and heartbeat info - EXCEL-LIKE COLUMNS
 * @param {Object} manifest
 */
function renderDashboard(manifest) {
  if (!manifest) return;

  clearScreenHome();

  const { width: W } = dashboard.getTerminalSize();
  const lines = [];
  const isSubMode = pricingMode === 'sub';
  const COL_SEP = C.dim + '│' + C.reset;

  // Calculate name column width: total - borders(2) - data columns(68) - 4 separators
  const nameColWidth = Math.max(20, W - 2 - DATA_COLS_WIDTH - 4);

  // Helper: create bordered line with cyan borders
  const line = (content) => {
    const visLen = content.replace(/\x1b\[[0-9;]*m/g, '').length;
    const innerWidth = W - 2;
    if (visLen >= innerWidth) {
      return C.cyan + '║' + C.reset + content;
    }
    const padding = ' '.repeat(innerWidth - visLen);
    return C.cyan + '║' + C.reset + content + padding + C.cyan + '║' + C.reset;
  };

  // ======= TOP BORDER =======
  lines.push(C.cyan + '╔' + '═'.repeat(W - 2) + '╗' + C.reset);

  // ======= HEADER: Logo line =======
  const logoLine = '━━ PIPELINE ━━';
  const versionStr = C.dim + 'v' + (manifest.version || '11.0') + C.reset;
  const logoPadding = Math.floor((W - 2 - logoLine.length - 6) / 2);
  lines.push(line(' '.repeat(logoPadding) + C.cyan + logoLine + C.reset + '  ' + versionStr));

  // ======= HEADER ROW: Project + Mode + Timer + Heartbeat =======
  const projectName = manifest.project?.name || 'Unknown';
  const pipelineMode = manifest.mode || 'new';
  const timerStr = formatTime(activeMs);

  // Step mode and iteration
  const stepModeActive = manifest.stepMode === true || manifest.stepMode === 'true';
  const currentIteration = manifest.currentIteration || 1;
  const iterationCount = manifest.iterations ? manifest.iterations.length : 1;
  const stepModeStr = stepModeActive ? C.magenta + '⏸ STEP' + C.reset : C.dim + 'AUTO' + C.reset;
  const iterationStr = stepModeActive ? '  ' + C.dim + '│' + C.reset + '  ' + C.cyan + 'v' + currentIteration + C.reset + (iterationCount > 1 ? C.dim + '/' + iterationCount + C.reset : '') : '';

  // Build header line
  let headerLine = '  ' + C.bold + 'Project:' + C.reset + ' ' + projectName.slice(0, 20) +
    '  ' + C.dim + '│' + C.reset + '  ' + C.bold + 'Mode:' + C.reset + ' ' + pipelineMode +
    '  ' + C.dim + '│' + C.reset + '  ' + stepModeStr + iterationStr +
    '  ' + C.dim + '│' + C.reset + '  ' + C.bold + '⏱' + C.reset + ' ' + timerStr;

  // Add checkpoint indicator if in checkpoint status
  if (manifest.status === 'checkpoint') {
    const checkpointPhase = manifest.currentPhase || '?';
    const checkpointLabel = `Phase ${checkpointPhase}`;
    headerLine += '  ' + C.dim + '│' + C.reset + '  ' + C.bgMagenta + C.white + C.bold + ' CHECKPOINT ' + C.reset + ' ' + C.magenta + checkpointLabel + C.reset;
  }

  // Add heartbeat info
  if (manifest.status !== 'complete' && manifest.status !== 'checkpoint' && ORCHESTRATOR_PID) {
    const heartbeatEnabled = !(manifest.heartbeat && manifest.heartbeat.enabled === false);
    if (heartbeatEnabled && nextHeartbeatTime) {
      const countdown = nextHeartbeatTime - Date.now();
      const countdownStr = countdown > 0 ? formatCountdown(countdown) : 'NOW';
      const currentCount = manifest.heartbeat?.count || 0;
      const refreshEvery = manifest.heartbeat?.refreshEvery || 6;
      headerLine += '  ' + C.dim + '│' + C.reset + '  ' + C.red + '💗' + C.reset + ' ' + countdownStr + ' ' + C.dim + '(' + currentCount + '/' + refreshEvery + ')' + C.reset;
    } else if (!heartbeatEnabled) {
      headerLine += '  ' + C.dim + '│' + C.reset + '  ' + C.red + '💗' + C.reset + ' ' + C.yellow + 'PAUSED' + C.reset;
    }
  }

  lines.push(line(headerLine));
  lines.push(C.cyan + '╠' + '═'.repeat(W - 2) + '╣' + C.reset);

  // ======= PHASES SECTION: Excel-like columns =======
  // Pricing mode header
  const pricingModeLabel = isSubMode ? '══ SUB MODE ══' : '══ API MODE ══';
  const dataColsWidth = COL.REG + 1 + COL.CACHE + 1 + COL.TOTAL; // 56 chars
  const pricingModeLeftPad = Math.floor((dataColsWidth - pricingModeLabel.length) / 2);
  const pricingModeRightPad = dataColsWidth - pricingModeLabel.length - pricingModeLeftPad;
  const pricingModeStr = ' '.repeat(pricingModeLeftPad) + C.bold + C.white + pricingModeLabel + C.reset + ' '.repeat(pricingModeRightPad);

  lines.push(line(' '.repeat(nameColWidth) + COL_SEP + ' '.repeat(COL.TIME) + COL_SEP + pricingModeStr));

  // Column headers: PHASES | time | regular | cached | total
  const navHint = C.dim + '↑↓ Tab' + C.reset;
  const headerLeftContent = '  ' + C.bold + C.white + 'PHASES' + C.reset + '  ' + navHint;
  const headerLeftVisLen = 2 + 6 + 2 + 6; // '  ' + 'PHASES' + '  ' + '↑↓ Tab'
  const headerLeftPadding = Math.max(0, nameColWidth - headerLeftVisLen);

  const headerRight =
    COL_SEP + C.dim + centerStr('time', COL.TIME) + C.reset +
    COL_SEP + C.yellow + centerStr('regular', COL.REG) + C.reset +
    COL_SEP + C.cyan + centerStr('cached', COL.CACHE) + C.reset +
    COL_SEP + C.green + centerStr('total', COL.TOTAL) + C.reset;

  lines.push(line(headerLeftContent + ' '.repeat(headerLeftPadding) + headerRight));

  // Sub-header row showing tok│%│$ or tok│$ structure
  const DIM_SEP = C.dim + '│';
  const subHeaderCol = isSubMode
    ? centerStr('tok', 5) + DIM_SEP + C.reset + centerStr('%', 5) + DIM_SEP + C.reset + centerStr('$', 6)
    : centerStr('tok', 8) + DIM_SEP + C.reset + centerStr('$', 9);
  const subHeaderRight =
    COL_SEP + C.dim + ' '.repeat(COL.TIME) + C.reset +
    COL_SEP + subHeaderCol +
    COL_SEP + subHeaderCol +
    COL_SEP + subHeaderCol;

  lines.push(line(' '.repeat(nameColWidth) + subHeaderRight));
  // Table separator
  const sepDataPart = '─'.repeat(COL.TIME) + '┼' + '─'.repeat(COL.REG) + '┼' + '─'.repeat(COL.CACHE) + '┼' + '─'.repeat(COL.TOTAL);
  lines.push(C.cyan + '╟' + C.dim + '─'.repeat(nameColWidth) + '┼' + sepDataPart + C.cyan + '╢' + C.reset);

  // ======= PHASE ROWS =======
  const phases = ['2', '3', '4', '5'];

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const phaseData = manifest.phases?.[p] || { status: 'pending' };
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[p];
    const isCurrent = p === manifest.currentPhase;
    const isSelected = i === cursorIndex;
    const isExpanded = expandedPhases.has(p);
    const hasTodos = phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0;

    // Phase icon based on status and analysis state
    let icon = C.dim + '○' + C.reset;
    let rowColor = C.dim;
    const analysisStatus = phaseData.analysisStatus;

    if (status === 'complete') {
      // Check analysis status for complete phases
      if (analysisStatus === 'running') {
        icon = C.cyan + '~' + C.reset;  // Analysis running
        rowColor = C.cyan;
      } else if (analysisStatus === 'complete' || phaseData.analysis) {
        icon = C.magenta + '#' + C.reset;  // Analysis complete
        rowColor = C.green;
      } else if (!phaseData.sessionId) {
        icon = C.yellow + '⚠' + C.reset;  // No sessionId - cannot analyze
        rowColor = C.yellow;
      } else {
        icon = C.green + '✓' + C.reset;
        rowColor = C.green;
      }
    } else if (status === 'running') {
      icon = C.yellow + '▶' + C.reset;
      rowColor = C.yellow;
    } else if (status === 'failed') {
      icon = C.red + '✗' + C.reset;
      rowColor = C.red;
    }

    // Cursor indicator
    const cursor = isSelected ? C.cyan + '>' + C.reset + ' ' : '  ';

    // Expand/collapse indicator
    let expandIcon = '  ';
    if (hasTodos || phaseData.analysis) {
      expandIcon = isExpanded ? C.dim + '▼' + C.reset + ' ' : C.dim + '►' + C.reset + ' ';
    }

    // Build stats columns
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      // Time column
      const timeStr = formatDuration(phaseData.duration);
      stats = COL_SEP + C.white + timeStr.padStart(COL.TIME) + C.reset;

      // Calculate token percentages for sub mode
      const totalTokens = phaseData.tokens || 0;
      const regTokens = phaseData.regularTokens || 0;
      const cacheTokens = phaseData.cachedTokens || 0;

      // Format columns using colored formatDataCol
      const formatColored = (tok, pct, cost, color) => {
        if (isSubMode) {
          return centerStr(tok, 5) + DIM_SEP + color + centerStr(pct, 5) + DIM_SEP + color + centerStr(cost, 6);
        } else {
          return centerStr(tok, 8) + DIM_SEP + color + centerStr(cost, 9);
        }
      };

      const regTok = formatTokens(regTokens);
      const regPct = isSubMode ? `${((regTokens / tokensPerPercent) * 100).toFixed(1)}%` : '';
      const regCost = formatCost(isSubMode ? getSubCostFromTokens(regTokens) : (phaseData.regularCost || 0));
      stats += COL_SEP + formatColored(regTok, regPct, regCost, C.yellow);

      const cacheTok = formatTokens(cacheTokens);
      const cachePct = isSubMode ? `${((cacheTokens / tokensPerPercent) * 100).toFixed(1)}%` : '';
      const cacheCost = formatCost(isSubMode ? getSubCostFromTokens(cacheTokens) : (phaseData.cachedCost || 0));
      stats += COL_SEP + formatColored(cacheTok, cachePct, cacheCost, C.cyan);

      const totTok = formatTokens(totalTokens);
      const totPct = isSubMode ? `${((totalTokens / tokensPerPercent) * 100).toFixed(1)}%` : '';
      const totCost = formatCost(isSubMode ? getSubCostFromTokens(totalTokens) : (phaseData.cost || 0));
      stats += COL_SEP + formatColored(totTok, totPct, totCost, C.green);
    } else if (status === 'running') {
      stats = COL_SEP + C.yellow + 'running'.padStart(COL.TIME) + C.reset + COL_SEP + ' '.repeat(COL.REG) + COL_SEP + ' '.repeat(COL.CACHE) + COL_SEP + ' '.repeat(COL.TOTAL);
    } else {
      stats = COL_SEP + C.dim + '--'.padStart(COL.TIME) + COL_SEP + '  --    --  '.padStart(COL.REG) + COL_SEP + '  --    --  '.padStart(COL.CACHE) + COL_SEP + '  --    --  '.padStart(COL.TOTAL) + C.reset;
    }

    // Name fills available space: "  [2] Discovery ✓ ▼ "
    const nameStr = `[${p}] ${name} `;
    const nameVisLen = cursor.replace(/\x1b\[[0-9;]*m/g, '').length + nameStr.length + 2 + 2; // cursor + name + icon + expand
    const namePadding = Math.max(0, nameColWidth - nameVisLen);

    const phaseRow = cursor + rowColor + nameStr + C.reset + icon + ' ' + expandIcon + ' '.repeat(namePadding) + stats;
    lines.push(line(phaseRow));

    // Show expanded phase details (analysis summary + todo breakdown)
    if (isExpanded) {
      const analysis = phaseData.analysis;
      const emptyStats = COL_SEP + ' '.repeat(COL.TIME) + COL_SEP + ' '.repeat(COL.REG) + COL_SEP + ' '.repeat(COL.CACHE) + COL_SEP + ' '.repeat(COL.TOTAL);

      // 1. Execution Summary (if analysis complete)
      if (analysis) {
        // Task health
        const taskHealth = analysis.taskHealth || {};
        const cleanCount = taskHealth.clean || 0;
        const frictionCount = taskHealth.friction || 0;
        const struggledCount = taskHealth.struggled || 0;
        const healthStr = `${C.green}${cleanCount} clean${C.reset}, ${C.yellow}${frictionCount} friction${C.reset}, ${C.red}${struggledCount} struggled${C.reset}`;
        lines.push(line('    ' + C.cyan + 'Task health: ' + C.reset + healthStr + ' '.repeat(Math.max(0, nameColWidth - 30)) + emptyStats));

        // Time/cost wasted
        if (analysis.wastedTime || analysis.wastedCost) {
          const wastedTime = analysis.wastedTime ? formatDuration(analysis.wastedTime) : '-';
          const wastedCost = analysis.wastedCost ? formatCost(analysis.wastedCost) : '-';
          const wastedStr = `${wastedTime} / ${wastedCost}`;
          lines.push(line('    ' + C.cyan + 'Wasted: ' + C.reset + C.yellow + wastedStr + C.reset + ' '.repeat(Math.max(0, nameColWidth - 16 - wastedStr.length)) + emptyStats));
        }

        // What went well (top 3)
        if (analysis.positives && analysis.positives.length > 0) {
          const maxPositives = Math.min(3, analysis.positives.length);
          for (let j = 0; j < maxPositives; j++) {
            const positive = analysis.positives[j].substring(0, nameColWidth - 8);
            const prefix = j === 0 ? C.cyan + 'Went well: ' + C.reset : '           ';
            lines.push(line('    ' + prefix + C.green + '+ ' + positive + C.reset + ' '.repeat(Math.max(0, nameColWidth - positive.length - 16)) + emptyStats));
          }
        }

        // Issues found
        if (analysis.issues && analysis.issues.length > 0) {
          const issueCount = analysis.issues.length;
          const recoveredCount = analysis.issues.filter(i => i.recovered).length;
          const issueStr = `${issueCount} found, ${recoveredCount} recovered`;
          lines.push(line('    ' + C.cyan + 'Issues: ' + C.reset + C.yellow + issueStr + C.reset + ' '.repeat(Math.max(0, nameColWidth - 12 - issueStr.length)) + emptyStats));
        }

        // Recommendations (top 3)
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          const maxRecs = Math.min(3, analysis.recommendations.length);
          for (let j = 0; j < maxRecs; j++) {
            const rec = analysis.recommendations[j].substring(0, nameColWidth - 8);
            const prefix = j === 0 ? C.cyan + 'Recommend: ' + C.reset : '           ';
            lines.push(line('    ' + prefix + C.blue + '→ ' + rec + C.reset + ' '.repeat(Math.max(0, nameColWidth - rec.length - 16)) + emptyStats));
          }
        }

        // Separator after analysis
        lines.push(line('    ' + C.dim + '─'.repeat(nameColWidth - 4) + C.reset + emptyStats));
      }

      // 2. Todo Breakdown
      if (phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0) {
        for (const todo of phaseData.todoBreakdown) {
          const todoName = (todo.content || 'Task').substring(0, nameColWidth - 6);
          const todoTime = todo.durationMs ? formatDuration(todo.durationMs) : '-';
          const todoCost = todo.cost ? formatCost(todo.cost) : '-';

          const todoRow = '    ' + C.dim + todoName + C.reset;
          const todoStats = COL_SEP + centerStr(todoTime, COL.TIME) + COL_SEP + ' '.repeat(COL.REG) + COL_SEP + ' '.repeat(COL.CACHE) + COL_SEP + centerStr(todoCost, COL.TOTAL);

          lines.push(line(todoRow + ' '.repeat(Math.max(0, nameColWidth - 4 - todoName.length)) + todoStats));
        }
      }

      // No data message
      if (!analysis && (!phaseData.todoBreakdown || phaseData.todoBreakdown.length === 0)) {
        lines.push(line('    ' + C.dim + 'No analysis or todo data available' + C.reset + ' '.repeat(Math.max(0, nameColWidth - 38)) + emptyStats));
      }
    }
  }

  // ======= TOTALS =======
  const totalsLabel = ' TOTALS ';
  const totalsLeftPad = Math.floor((W - 2 - totalsLabel.length) / 2);
  const totalsRightPad = W - 2 - totalsLabel.length - totalsLeftPad;
  lines.push(C.cyan + '╠' + '═'.repeat(totalsLeftPad) + C.bold + C.white + totalsLabel + C.reset + C.cyan + '═'.repeat(totalsRightPad) + '╣' + C.reset);

  // Calculate totals across all phases
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

  const totalCost = totalRegularCost + totalCachedCost;
  const totalRegPct = totalTokens > 0 ? Math.round((totalRegularTokens / totalTokens) * 100) : 0;
  const totalCachePct = totalTokens > 0 ? Math.round((totalCachedTokens / totalTokens) * 100) : 0;

  // Format totals row
  const totalsName = '  ' + C.bold + C.white + 'Total' + C.reset;
  let totalsStats = '';
  totalsStats += COL_SEP + centerStr('-', COL.TIME);  // No time for totals
  totalsStats += COL_SEP + C.yellow + centerStr(formatTokens(totalRegularTokens), 5) + C.dim + '│' + C.yellow + centerStr(totalRegPct + '%', 5) + C.dim + '│' + C.yellow + centerStr(formatCost(totalRegularCost), 6) + C.reset;
  totalsStats += COL_SEP + C.cyan + centerStr(formatTokens(totalCachedTokens), 5) + C.dim + '│' + C.cyan + centerStr(totalCachePct + '%', 5) + C.dim + '│' + C.cyan + centerStr(formatCost(totalCachedCost), 6) + C.reset;
  totalsStats += COL_SEP + C.green + centerStr(formatTokens(totalTokens), 5) + C.dim + '│' + C.green + centerStr('100%', 5) + C.dim + '│' + C.green + centerStr(formatCost(totalCost), 6) + C.reset;

  lines.push(line(totalsName + ' '.repeat(Math.max(0, nameColWidth - 7)) + totalsStats));

  // ======= WORKER PROGRESS =======
  const workerLabel = ' WORKER ';
  const workerLeftPad = Math.floor((W - 2 - workerLabel.length) / 2);
  const workerRightPad = W - 2 - workerLabel.length - workerLeftPad;
  lines.push(C.cyan + '╠' + '═'.repeat(workerLeftPad) + C.bold + C.white + workerLabel + C.reset + C.cyan + '═'.repeat(workerRightPad) + '╣' + C.reset);

  const currentPhase = manifest.currentPhase;
  const workerProgress = manifest.phases?.[currentPhase]?.workerProgress;

  if (!workerProgress || workerProgress.total === 0) {
    lines.push(line('  ' + C.dim + '(Waiting for worker...)' + C.reset));
  } else {
    const pct = Math.round((workerProgress.completed / workerProgress.total) * 100);
    const bar = renderNumberedProgressBar(workerProgress.completed, workerProgress.total);
    const pctStr = (pct + '%').padStart(4);
    lines.push(line('  [' + bar + '] ' + C.bold + pctStr + C.reset));
    if (workerProgress.currentTask) {
      const taskNum = workerProgress.completed + 1;
      const task = workerProgress.currentTask.length > W - 25 ? workerProgress.currentTask.slice(0, W - 28) + '...' : workerProgress.currentTask;
      lines.push(line('  ' + C.yellow + '→ Task ' + taskNum + '/' + workerProgress.total + C.reset + ' ' + C.dim + '│' + C.reset + ' ' + task));
    }
  }

  lines.push(C.cyan + '╟' + C.dim + '─'.repeat(W - 2) + C.cyan + '╢' + C.reset);

  // ======= BRAINSTORM WARNING =======
  if (!manifest.brainstorm?.completed) {
    lines.push(line(' ' + C.yellow + '⚠ Brainstorm not complete - run /brainstorm first' + C.reset));
    lines.push(C.cyan + '╟' + C.dim + '─'.repeat(W - 2) + C.cyan + '╢' + C.reset);
  }

  // ======= PROCESS STATUS =======
  const currentWorker = manifest.workers?.current;
  const supervisorPid = manifest.workers?.supervisor?.pid;
  const orchestratorPid = currentWorker?.orchestratorPid || ORCHESTRATOR_PID;
  const workerPid = currentWorker?.pid;

  // Build process status line
  let processLine = '';

  // Supervisor
  if (supervisorPid) {
    processLine += C.magenta + 'Supervisor:' + C.reset + ' ' + supervisorPid;
  }

  // Orchestrator
  if (orchestratorPid) {
    if (processLine) processLine += '  ' + C.dim + '│' + C.reset + '  ';
    processLine += C.cyan + 'Orchestrator:' + C.reset + ' ' + orchestratorPid;
  }

  // Worker
  if (processLine) processLine += '  ' + C.dim + '│' + C.reset + '  ';
  if (workerPid) {
    processLine += C.green + 'Worker:' + C.reset + ' ' + workerPid + ' ' + C.green + '●' + C.reset;
  } else {
    processLine += C.dim + 'Worker: --' + C.reset;
  }

  lines.push(line(' ' + processLine));

  // ======= USAGE =======
  const usageLabel = ' USAGE ';
  const usageLeftPad = Math.floor((W - 2 - usageLabel.length) / 2);
  const usageRightPad = W - 2 - usageLabel.length - usageLeftPad;
  lines.push(C.cyan + '╠' + '═'.repeat(usageLeftPad) + C.bold + C.white + usageLabel + C.reset + C.cyan + '═'.repeat(usageRightPad) + '╣' + C.reset);
  lines.push(line(''));

  // PRICING line
  const costPerPercent = '$' + DOLLARS_PER_PERCENT.toFixed(2) + ' per %';
  lines.push(line('  ' + C.white + 'PRICING' + C.reset + '       ' + C.dim + costPerPercent + '    Opus $5/$25 /MTok    Cache 10%' + C.reset));

  // SUBSCRIPTION line
  const calibrationStr = (tokensPerPercent / 1000000).toFixed(1) + 'M tok/%  $' + DOLLARS_PER_PERCENT.toFixed(2) + '/%';
  lines.push(line('  ' + C.white + 'SUBSCRIPTION' + C.reset + '  ' + C.dim + '5-hour: --     7-day: --     ' + calibrationStr + C.reset));

  lines.push(line(''));
  lines.push(C.cyan + '╟' + C.dim + '─'.repeat(W - 2) + C.cyan + '╢' + C.reset);

  // ======= FOOTER: Key bindings =======
  const autoAnalysisLabel = autoAnalysis ? 'On' : 'Off';
  const keys = [
    C.cyan + C.bold + '[Q]' + C.reset + 'uit',
    C.cyan + C.bold + '[P]' + C.reset + 'ause',
    C.cyan + C.bold + '[Enter]' + C.reset + 'HB',
    C.cyan + C.bold + '[Tab]' + C.reset + 'Expand',
    C.cyan + C.bold + '[r]' + C.reset + 'Analyze',
    C.cyan + C.bold + '[a]' + C.reset + autoAnalysisLabel,
    C.cyan + C.bold + '[Space]' + C.reset + 'Mode'
  ];

  lines.push(line(' ' + keys.join('  ')));
  lines.push(C.cyan + '╚' + '═'.repeat(W - 2) + '╝' + C.reset);

  // Output all lines
  process.stdout.write(lines.join('\n') + '\n');
}

// ============ INPUT HANDLING ============

/**
 * Handle keyboard input
 * @param {Buffer} key
 */
async function handleInput(key) {
  const keyStr = key.toString();
  const keyCode = key[0];

  // Q or Ctrl+C - Quit
  if (keyStr.toLowerCase() === 'q' || keyCode === 3) {
    cleanup();
    process.exit(0);
  }

  // P - Toggle pause
  if (keyStr.toLowerCase() === 'p') {
    const manifest = readManifest();
    if (manifest) {
      if (!manifest.heartbeat) manifest.heartbeat = {};
      manifest.heartbeat.enabled = manifest.heartbeat.enabled === false;
      writeManifest(manifest);
      console.log(`\n[HEARTBEAT] ${manifest.heartbeat.enabled ? 'Resumed' : 'Paused'}`);
    }
    return;
  }

  // Enter - Manual heartbeat
  if (keyCode === 13) {
    await sendHeartbeat(true);
    return;
  }

  // + or = - Increase interval
  if (keyStr === '+' || keyStr === '=') {
    const manifest = readManifest();
    if (manifest) {
      if (!manifest.heartbeat) manifest.heartbeat = {};
      const current = manifest.heartbeat.intervalMs || DEFAULT_HEARTBEAT_INTERVAL;
      manifest.heartbeat.intervalMs = current + 60000; // +1 min
      writeManifest(manifest);
      scheduleNextHeartbeat();
      console.log(`\n[HEARTBEAT] Interval: ${Math.floor(manifest.heartbeat.intervalMs / 60000)} minutes`);
    }
    return;
  }

  // - or _ - Decrease interval
  if (keyStr === '-' || keyStr === '_') {
    const manifest = readManifest();
    if (manifest) {
      if (!manifest.heartbeat) manifest.heartbeat = {};
      const current = manifest.heartbeat.intervalMs || DEFAULT_HEARTBEAT_INTERVAL;
      manifest.heartbeat.intervalMs = Math.max(60000, current - 60000); // min 1 min
      writeManifest(manifest);
      scheduleNextHeartbeat();
      console.log(`\n[HEARTBEAT] Interval: ${Math.floor(manifest.heartbeat.intervalMs / 60000)} minutes`);
    }
    return;
  }

  // 2-5 - Toggle phase expansion
  if (['2', '3', '4', '5'].includes(keyStr)) {
    if (expandedPhases.has(keyStr)) {
      expandedPhases.delete(keyStr);
    } else {
      expandedPhases.add(keyStr);
    }
    renderDashboard(readManifest());
    return;
  }

  // Space - Toggle pricing mode
  if (keyCode === 32) {
    pricingMode = pricingMode === 'api' ? 'sub' : 'api';
    renderDashboard(readManifest());
    return;
  }

  // Tab - Expand/collapse selected phase
  if (keyCode === 9) {
    const phases = ['2', '3', '4', '5'];
    const selectedPhase = phases[cursorIndex];
    if (expandedPhases.has(selectedPhase)) {
      expandedPhases.delete(selectedPhase);
    } else {
      expandedPhases.add(selectedPhase);
    }
    renderDashboard(readManifest());
    return;
  }

  // r - Run analysis on selected phase
  if (keyStr.toLowerCase() === 'r') {
    const phases = ['2', '3', '4', '5'];
    const selectedPhase = phases[cursorIndex];
    runAnalysis(selectedPhase);
    return;
  }

  // a/A - Toggle auto-analysis
  if (keyStr.toLowerCase() === 'a') {
    autoAnalysis = !autoAnalysis;
    renderDashboard(readManifest());
    return;
  }

  // Up/Down arrows (escape sequences)
  if (keyCode === 27 && key[1] === 91) {
    if (key[2] === 65) { // Up
      cursorIndex = Math.max(0, cursorIndex - 1);
    } else if (key[2] === 66) { // Down
      cursorIndex = Math.min(3, cursorIndex + 1);
    }
    renderDashboard(readManifest());
    return;
  }
}

// ============ MAIN ============

let renderIntervalId = null;
let saveIntervalId = null;

function cleanup() {
  if (renderIntervalId) clearInterval(renderIntervalId);
  if (saveIntervalId) clearInterval(saveIntervalId);
  if (heartbeatIntervalId) clearTimeout(heartbeatIntervalId);

  saveDashboardState();
  process.stdout.write('\x1b[?25h'); // Show cursor

  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
}

function main() {
  console.log(`Dashboard Runner v11.0`);
  console.log(`Project: ${PROJECT_PATH}`);
  console.log(`Orchestrator PID: ${ORCHESTRATOR_PID || 'from manifest'}`);
  console.log('');

  // Load saved state
  loadDashboardState();

  // Initial manifest read
  let manifest = readManifest();

  if (!manifest) {
    console.log(C.yellow + 'Waiting for manifest...' + C.reset);
  }

  // Hide cursor and clear screen
  process.stdout.write('\x1b[?25l'); // Hide cursor
  clearScreenHome();

  // Enable raw mode for single keypress capture
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', handleInput);
  }

  // Render loop
  renderIntervalId = setInterval(() => {
    manifest = readManifest();
    activeMs += REFRESH_INTERVAL; // Increment timer

    if (manifest) {
      // Check for auto-analysis triggers
      checkAutoAnalysis(manifest);

      renderDashboard(manifest);
    }
  }, REFRESH_INTERVAL);

  // Save state periodically
  saveIntervalId = setInterval(() => {
    saveDashboardState();
  }, SAVE_INTERVAL);

  // Schedule first heartbeat
  scheduleNextHeartbeat();

  // Handle process exit
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

// Run
main();
