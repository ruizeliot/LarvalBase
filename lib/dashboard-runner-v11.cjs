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
 * Read manifest from disk
 * @returns {Object|null}
 */
function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
      if (content && content.trim().length > 0) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    // Ignore parse errors
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

// ============ RENDERING ============

/**
 * Draw a horizontal line/separator
 * @param {number} W - Width
 * @param {string} char - Character to repeat
 * @param {string} left - Left border char
 * @param {string} right - Right border char
 * @returns {string}
 */
function drawLine(W, char = '─', left = '║', right = '║') {
  return dashboard.colors.border(left) + dashboard.colors.muted(char.repeat(W - 2)) + dashboard.colors.border(right);
}

/**
 * Render a table row with content
 * @param {string} content - Row content
 * @param {number} W - Width
 * @returns {string}
 */
function tableRow(content, W) {
  // Strip ANSI codes to calculate visible length
  const visibleLen = content.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = Math.max(0, W - 2 - visibleLen);
  return dashboard.colors.border('║') + content + ' '.repeat(padding) + dashboard.colors.border('║');
}

/**
 * Render table separator with column dividers
 * @param {number} W - Total width
 * @param {number} nameColWidth - Width of name column
 * @returns {string}
 */
function tableSeparator(W, nameColWidth) {
  const dataPart = '─'.repeat(COL.TIME) + '┼' + '─'.repeat(COL.REG) + '┼' + '─'.repeat(COL.CACHE) + '┼' + '─'.repeat(COL.TOTAL);
  const namePart = '─'.repeat(nameColWidth);
  return dashboard.colors.border('╟') + dashboard.colors.muted(namePart + '┼' + dataPart) + dashboard.colors.border('╢');
}

/**
 * Render dashboard with timer and heartbeat info - EXCEL-LIKE COLUMNS
 * @param {Object} manifest
 */
function renderDashboard(manifest) {
  if (!manifest) return;

  dashboard.clearScreen();

  const { width: W } = dashboard.getTerminalSize();
  const lines = [];
  const isSubMode = pricingMode === 'sub';

  // Calculate name column width: total - borders(2) - data columns(68) - 4 separators
  const nameColWidth = Math.max(20, W - 2 - DATA_COLS_WIDTH - 4);

  // ======= TOP BORDER =======
  lines.push(dashboard.colors.border('╔') + dashboard.colors.muted('═'.repeat(W - 2)) + dashboard.colors.border('╗'));

  // ======= HEADER ROW 1: Title + Timer + Heartbeat =======
  const title = dashboard.colors.header(`PIPELINE v${manifest.version || '11.0'}`);
  const timer = dashboard.colors.accent(`T ${formatTime(activeMs)}`);

  let heartbeatStr = '';
  if (nextHeartbeatTime) {
    const remaining = Math.max(0, nextHeartbeatTime - Date.now());
    const heartbeatEnabled = manifest.heartbeat?.enabled !== false;
    const currentCount = manifest.heartbeat?.count || 0;
    const refreshEvery = manifest.heartbeat?.refreshEvery || 6;

    if (heartbeatEnabled) {
      heartbeatStr = dashboard.colors.muted(`H ${formatCountdown(remaining)} (${currentCount}/${refreshEvery})`);
    } else {
      heartbeatStr = dashboard.colors.warning('H PAUSED');
    }
  }

  lines.push(tableRow(` ${title}  ${timer}  ${heartbeatStr}`, W));

  // ======= HEADER ROW 2: Project info =======
  const projectName = dashboard.colors.accent(manifest.project?.name || 'Unknown');
  const mode = manifest.mode || 'new';
  const status = manifest.status || 'pending';
  const totalCost = getDisplayCost(manifest.totalCost, manifest.usageDelta, manifest.totalTokens);
  const cost = dashboard.colors.cost(formatCost(totalCost));

  lines.push(tableRow(` Project: ${projectName}  │  Mode: ${mode}  │  Status: ${status}  │  Cost: ${cost}`, W));
  lines.push(drawLine(W, '─', '╟', '╢'));

  // ======= PHASES SECTION: Excel-like columns =======
  // Pricing mode header
  const pricingModeLabel = isSubMode ? '══ SUB MODE ══' : '══ API MODE ══';
  const dataColsWidth = COL.REG + 1 + COL.CACHE + 1 + COL.TOTAL; // 56 chars
  const pricingModeLeftPad = Math.floor((dataColsWidth - pricingModeLabel.length) / 2);
  const pricingModeStr = ' '.repeat(pricingModeLeftPad) + dashboard.colors.header(pricingModeLabel);

  lines.push(tableRow(' '.repeat(nameColWidth) + dashboard.colors.muted('│') + ' '.repeat(COL.TIME) + dashboard.colors.muted('│') + pricingModeStr, W));

  // Column headers: PHASES | time | regular | cached | total
  const headerLeft = ' ' + dashboard.colors.header('PHASES') + '   ' + dashboard.colors.muted('↑↓ Tab');
  const headerLeftVisLen = 1 + 6 + 3 + 6; // space + PHASES + spaces + ↑↓ Tab
  const headerLeftPadding = Math.max(0, nameColWidth - headerLeftVisLen);

  const headerRight =
    dashboard.colors.muted('│') + centerStr('time', COL.TIME) +
    dashboard.colors.muted('│') + dashboard.colors.regular(centerStr('regular', COL.REG)) +
    dashboard.colors.muted('│') + dashboard.colors.cached(centerStr('cached', COL.CACHE)) +
    dashboard.colors.muted('│') + dashboard.colors.success(centerStr('total', COL.TOTAL));

  lines.push(tableRow(headerLeft + ' '.repeat(headerLeftPadding) + headerRight, W));

  // Sub-header row showing tok│%│$ or tok│$ structure
  const subHeaderCol = isSubMode
    ? centerStr('tok', 5) + dashboard.colors.muted('│') + centerStr('%', 5) + dashboard.colors.muted('│') + centerStr('$', 6)
    : centerStr('tok', 8) + dashboard.colors.muted('│') + centerStr('$', 9);
  const subHeaderRight =
    dashboard.colors.muted('│') + ' '.repeat(COL.TIME) +
    dashboard.colors.muted('│') + dashboard.colors.muted(subHeaderCol) +
    dashboard.colors.muted('│') + dashboard.colors.muted(subHeaderCol) +
    dashboard.colors.muted('│') + dashboard.colors.muted(subHeaderCol);

  lines.push(tableRow(' '.repeat(nameColWidth) + subHeaderRight, W));
  lines.push(tableSeparator(W, nameColWidth));

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

    // Phase icon based on status
    let icon = dashboard.colors.muted('○');
    let rowColor = dashboard.colors.muted;
    if (status === 'complete') {
      icon = dashboard.colors.success('✓');
      rowColor = dashboard.colors.success;
    } else if (status === 'running') {
      icon = dashboard.colors.warning('▶');
      rowColor = dashboard.colors.warning;
    } else if (status === 'failed') {
      icon = dashboard.colors.error('✗');
      rowColor = dashboard.colors.error;
    }

    // Cursor/current indicators
    let prefix = '  ';
    if (isSelected) prefix = '> ';
    if (isCurrent) prefix = '* ';

    // Expand/collapse indicator
    const expandIcon = isExpanded ? '▼' : '▶';

    // Name column: " > [2] Discovery ○ ▶ "
    const nameContent = `${prefix}[${p}] ${name} `;
    const nameLen = nameContent.length + 1 + 1 + 1; // + icon + space + expand
    const namePadding = Math.max(0, nameColWidth - nameLen);

    // Build stats columns
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      // Time column
      const timeStr = formatDuration(phaseData.duration);
      const timeCol = centerStr(timeStr, COL.TIME);

      // Calculate token percentages for sub mode
      const totalCost = phaseData.cost || 0;
      const totalTokens = phaseData.tokens || 0;
      const regTokens = phaseData.regularTokens || 0;
      const cacheTokens = phaseData.cachedTokens || 0;
      const regCost = phaseData.regularCost || (totalCost * (regTokens / Math.max(1, totalTokens)));
      const cacheCost = phaseData.cachedCost || (totalCost * (cacheTokens / Math.max(1, totalTokens)));

      // Format columns
      const regCol = formatDataCol(
        formatTokens(regTokens),
        isSubMode ? `${((regTokens / tokensPerPercent) * 100).toFixed(1)}%` : '',
        formatCost(isSubMode ? getSubCostFromTokens(regTokens) : regCost),
        isSubMode
      );
      const cacheCol = formatDataCol(
        formatTokens(cacheTokens),
        isSubMode ? `${((cacheTokens / tokensPerPercent) * 100).toFixed(1)}%` : '',
        formatCost(isSubMode ? getSubCostFromTokens(cacheTokens) : cacheCost),
        isSubMode
      );
      const totalCol = formatDataCol(
        formatTokens(totalTokens),
        isSubMode ? `${((totalTokens / tokensPerPercent) * 100).toFixed(1)}%` : '',
        formatCost(isSubMode ? getSubCostFromTokens(totalTokens) : totalCost),
        isSubMode
      );

      stats =
        dashboard.colors.muted('│') + dashboard.colors.muted(timeCol) +
        dashboard.colors.muted('│') + dashboard.colors.regular(regCol) +
        dashboard.colors.muted('│') + dashboard.colors.cached(cacheCol) +
        dashboard.colors.muted('│') + dashboard.colors.success(totalCol);
    } else {
      // Empty stats for non-complete phases
      stats =
        dashboard.colors.muted('│') + ' '.repeat(COL.TIME) +
        dashboard.colors.muted('│') + ' '.repeat(COL.REG) +
        dashboard.colors.muted('│') + ' '.repeat(COL.CACHE) +
        dashboard.colors.muted('│') + ' '.repeat(COL.TOTAL);
    }

    const phaseRow = rowColor(nameContent) + icon + ' ' + dashboard.colors.muted(expandIcon) + ' '.repeat(namePadding) + stats;
    lines.push(tableRow(phaseRow, W));

    // Show expanded phase details (todo breakdown)
    if (isExpanded && phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0) {
      for (const todo of phaseData.todoBreakdown) {
        const todoName = (todo.content || 'Task').substring(0, nameColWidth - 6);
        const todoTime = todo.durationMs ? formatDuration(todo.durationMs) : '-';
        const todoCost = todo.cost ? formatCost(todo.cost) : '-';

        const todoRow = '    ' + dashboard.colors.muted(todoName);
        const todoStats =
          dashboard.colors.muted('│') + centerStr(todoTime, COL.TIME) +
          dashboard.colors.muted('│') + ' '.repeat(COL.REG) +
          dashboard.colors.muted('│') + ' '.repeat(COL.CACHE) +
          dashboard.colors.muted('│') + centerStr(todoCost, COL.TOTAL);

        lines.push(tableRow(todoRow + ' '.repeat(Math.max(0, nameColWidth - 4 - todoName.length)) + todoStats, W));
      }
    }
  }

  lines.push(drawLine(W, '─', '╟', '╢'));

  // ======= BRAINSTORM WARNING =======
  if (!manifest.brainstorm?.completed) {
    lines.push(tableRow(' ' + dashboard.colors.warning('⚠ Brainstorm not complete - run /brainstorm first'), W));
    lines.push(drawLine(W, '─', '╟', '╢'));
  }

  // ======= WORKER STATUS =======
  const currentWorker = manifest.workers?.current;
  const workerStatus = currentWorker
    ? dashboard.colors.success('Running')
    : dashboard.colors.muted('Not running');
  const workerPid = currentWorker ? dashboard.colors.muted(` │ PID: ${currentWorker.pid}`) : '';

  lines.push(tableRow(' ' + dashboard.colors.label('WORKER: ') + workerStatus + workerPid, W));
  lines.push(drawLine(W, '─', '╟', '╢'));

  // ======= FOOTER: Key bindings =======
  const keys = [
    dashboard.colors.key('[Q]') + 'uit',
    dashboard.colors.key('[P]') + 'ause HB',
    dashboard.colors.key('[Enter]') + ' HB',
    dashboard.colors.key('[+/-]') + ' Int',
    dashboard.colors.key('[2-5]') + ' Expand',
    dashboard.colors.key('[Space]') + ' Mode',
    dashboard.colors.key('[K]') + 'ill'
  ];

  lines.push(tableRow(' ' + keys.join('  '), W));
  lines.push(dashboard.colors.border('╚') + dashboard.colors.muted('═'.repeat(W - 2)) + dashboard.colors.border('╝'));

  console.log(lines.join('\n'));
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
    return;
  }

  // K - Kill worker
  if (keyStr.toLowerCase() === 'k') {
    const killPath = path.join(PROJECT_PATH, '.pipeline', 'kill-worker.txt');
    fs.writeFileSync(killPath, 'KILL');
    console.log('\n[DASHBOARD] Kill signal sent to worker');
    return;
  }

  // Space - Toggle pricing mode
  if (keyCode === 32) {
    pricingMode = pricingMode === 'api' ? 'sub' : 'api';
    console.log(`\n[PRICING] Mode: ${pricingMode.toUpperCase()}`);
    return;
  }

  // Up/Down arrows (escape sequences)
  if (keyCode === 27 && key[1] === 91) {
    if (key[2] === 65) { // Up
      cursorIndex = Math.max(0, cursorIndex - 1);
    } else if (key[2] === 66) { // Down
      cursorIndex = Math.min(3, cursorIndex + 1);
    }
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
  dashboard.showCursor();

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
    console.log(dashboard.colors.warning('Waiting for manifest...'));
  }

  // Hide cursor and clear screen
  dashboard.hideCursor();
  dashboard.clearScreen();

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
