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

// ============ STATE ============

let activeMs = 0;
let heartbeatCount = 0;
let nextHeartbeatTime = null;
let heartbeatIntervalId = null;
let lastSaveTime = Date.now();

// Navigation state
let cursorIndex = 0;
let expandedPhases = new Set();

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
 * Render dashboard with timer and heartbeat info
 * @param {Object} manifest
 */
function renderDashboard(manifest) {
  if (!manifest) return;

  dashboard.clearScreen();

  const { width } = dashboard.getTerminalSize();
  const lines = [];

  // ======= HEADER =======
  lines.push(dashboard.boxTop(width));

  // Title line with timer and heartbeat
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

  const headerContent = `${title}  ${timer}  ${heartbeatStr}`;
  lines.push(dashboard.boxRow(headerContent, width));

  // Project info line
  const projectName = dashboard.colors.accent(manifest.project?.name || 'Unknown');
  const mode = manifest.mode || 'new';
  const status = manifest.status || 'pending';
  const cost = dashboard.colors.cost(`$${(manifest.totalCost || 0).toFixed(2)}`);

  lines.push(dashboard.boxRow(`Project: ${projectName}  |  Mode: ${mode}  |  Status: ${status}  |  Cost: ${cost}`, width));
  lines.push(dashboard.boxSeparator(width));

  // ======= PHASES =======
  lines.push(dashboard.boxRow(dashboard.colors.label('PHASES'), width));

  const phaseDisplay = ['2', '3', '4', '5'].map((p, idx) => {
    const phase = manifest.phases?.[p] || { status: 'pending' };
    const { symbol, colorFn } = dashboard.getPhaseStyle(phase.status);
    const name = PHASE_NAMES[p];
    const isCurrent = p === manifest.currentPhase;
    const isSelected = idx === cursorIndex;

    let prefix = '  ';
    if (isSelected) prefix = '> ';
    if (isCurrent) prefix = '* ';

    return colorFn(`${prefix}[${p}] ${name} ${symbol}`);
  }).join('  ');

  lines.push(dashboard.boxRow(phaseDisplay, width));

  // Show expanded phase details
  if (expandedPhases.size > 0) {
    lines.push(dashboard.boxSeparator(width));

    for (const phaseNum of expandedPhases) {
      const phase = manifest.phases?.[phaseNum] || { status: 'pending' };
      lines.push(dashboard.boxRow(dashboard.colors.label(`Phase ${phaseNum} Details:`), width));

      if (phase.duration) {
        lines.push(dashboard.boxRow(`  Duration: ${dashboard.formatDuration(phase.duration)}`, width));
      }
      if (phase.cost) {
        lines.push(dashboard.boxRow(`  Cost: ${dashboard.formatCost(phase.cost)}`, width));
      }
      if (phase.tokens) {
        const regular = phase.regularTokens || 0;
        const cached = phase.cachedTokens || 0;
        lines.push(dashboard.boxRow(`  Tokens: ${phase.tokens.toLocaleString()} (regular: ${regular.toLocaleString()}, cached: ${cached.toLocaleString()})`, width));
      }
      if (phase.sessionId) {
        lines.push(dashboard.boxRow(`  Session: ${phase.sessionId.substring(0, 8)}...`, width));
      }
    }
  }

  // Brainstorm warning
  if (!manifest.brainstorm?.completed) {
    lines.push(dashboard.boxRow('', width));
    lines.push(dashboard.boxRow(
      dashboard.colors.warning('Warning: Brainstorm not complete - run /brainstorm first'),
      width
    ));
  }

  lines.push(dashboard.boxSeparator(width));

  // ======= WORKERS =======
  const currentWorker = manifest.workers?.current;
  const workerStatus = currentWorker
    ? dashboard.colors.success('Running')
    : dashboard.colors.muted('Not running');
  const workerPid = currentWorker ? dashboard.colors.muted(` | PID: ${currentWorker.pid}`) : '';

  lines.push(dashboard.boxRow(
    dashboard.colors.label('WORKER: ') + workerStatus + workerPid,
    width
  ));

  lines.push(dashboard.boxSeparator(width));

  // ======= FOOTER =======
  const keys = [
    dashboard.colors.key('[Q]') + 'uit',
    dashboard.colors.key('[P]') + 'ause HB',
    dashboard.colors.key('[Enter]') + ' HB Now',
    dashboard.colors.key('[+/-]') + ' Interval',
    dashboard.colors.key('[2-5]') + ' Expand',
    dashboard.colors.key('[K]') + 'ill'
  ];

  lines.push(dashboard.boxRow(keys.join('  '), width));
  lines.push(dashboard.boxBottom(width));

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
