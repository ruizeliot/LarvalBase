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

// Pricing per million tokens (from Anthropic pricing page)
const PRICING = {
  'claude-opus-4-5-20251101': { input: 5.0, output: 25.0, cacheWrite5m: 6.25, cacheWrite1h: 10.0, cacheRead: 0.50 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0, cacheWrite5m: 3.75, cacheWrite1h: 6.0, cacheRead: 0.30 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, cacheWrite5m: 3.75, cacheWrite1h: 6.0, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0, cacheWrite5m: 1.25, cacheWrite1h: 2.0, cacheRead: 0.10 },
  'default': { input: 3.0, output: 15.0, cacheWrite5m: 3.75, cacheWrite1h: 6.0, cacheRead: 0.30 }
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

// Subscription Usage State
let subscriptionUsage = null; // { fiveHour, sevenDay, sevenDayResetsAt }
let lastUsageFetch = 0; // timestamp of last fetch
const USAGE_FETCH_INTERVAL = 60000; // fetch every 60 seconds

// Pricing Mode State
let pricingMode = 'api'; // 'api' or 'sub'
const WEEKLY_SUB_BUDGET = 50; // $200/month ÷ 4 = $50/week
const FIVE_HOUR_SUB_BUDGET = WEEKLY_SUB_BUDGET * (5 / 168); // ~$1.49 (5hr out of 168hr/week)
const DEFAULT_TOKENS_PER_PERCENT = 182707; // Calibrated value (Dec 2025)
let tokensPerPercent = DEFAULT_TOKENS_PER_PERCENT;

// Calculate subscription cost from usage delta percentage
function getSubCost(usageDelta) {
  if (usageDelta === undefined || usageDelta === null) return null;
  return (usageDelta / 100) * FIVE_HOUR_SUB_BUDGET;
}

// Calculate subscription cost from token count (using calibration)
function getSubCostFromTokens(tokens) {
  if (tokens === undefined || tokens === null || tokens === 0) return null;
  const estimatedPercent = tokens / tokensPerPercent;
  return (estimatedPercent / 100) * FIVE_HOUR_SUB_BUDGET;
}

// Get display cost based on current pricing mode
function getDisplayCost(apiCost, usageDelta, tokens) {
  if (pricingMode === 'sub') {
    // Prefer usageDelta if available, otherwise estimate from tokens
    const subCost = getSubCost(usageDelta);
    if (subCost !== null) return subCost;
    const tokenCost = getSubCostFromTokens(tokens);
    if (tokenCost !== null) return tokenCost;
    return apiCost;
  }
  return apiCost;
}

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

// ============ TRANSCRIPT & USAGE ANALYSIS ============

// Find transcript path for a session
function findTranscriptPath(sessionId) {
  const resolved = path.resolve(PROJECT_PATH);
  let encoded = resolved.replace(/\\/g, '/').replace(/:/g, '-').replace(/ /g, '-').replace(/\//g, '-');
  if (encoded.startsWith('-')) encoded = encoded.substring(1);

  const transcriptsDir = path.join(process.env.USERPROFILE, '.claude', 'projects', encoded);
  const transcriptPath = path.join(transcriptsDir, `${sessionId}.jsonl`);

  if (fs.existsSync(transcriptPath)) {
    return transcriptPath;
  }
  return null;
}

// Find the most recent transcript (orchestrator's current session)
function findMostRecentTranscript() {
  const resolved = path.resolve(PROJECT_PATH);
  let encoded = resolved.replace(/\\/g, '/').replace(/:/g, '-').replace(/ /g, '-').replace(/\//g, '-');
  if (encoded.startsWith('-')) encoded = encoded.substring(1);

  const transcriptsDir = path.join(process.env.USERPROFILE, '.claude', 'projects', encoded);

  if (!fs.existsSync(transcriptsDir)) return null;

  try {
    const files = fs.readdirSync(transcriptsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(transcriptsDir, f),
        mtime: fs.statSync(path.join(transcriptsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      return {
        path: files[0].path,
        sessionId: files[0].name.replace('.jsonl', ''),
        mtime: files[0].mtime
      };
    }
  } catch (e) {
    console.log('[DEBUG] Error finding most recent transcript:', e.message);
  }
  return null;
}

// Parse transcript JSONL and calculate metrics
function analyzeTranscript(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return null;
  }

  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim());
    const usageEntries = [];
    const todoChanges = [];

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);

        // Extract usage from API responses
        if (obj.message && obj.message.usage) {
          const u = obj.message.usage;
          const entry = {
            timestamp: obj.timestamp,
            model: obj.message.model,
            inputTokens: u.input_tokens || 0,
            outputTokens: u.output_tokens || 0,
            cacheReadTokens: u.cache_read_input_tokens || 0,
            cacheWrite5mTokens: 0,
            cacheWrite1hTokens: 0
          };

          if (u.cache_creation) {
            entry.cacheWrite5mTokens = u.cache_creation.ephemeral_5m_input_tokens || 0;
            entry.cacheWrite1hTokens = u.cache_creation.ephemeral_1h_input_tokens || 0;
          } else if (u.cache_creation_input_tokens) {
            entry.cacheWrite5mTokens = u.cache_creation_input_tokens;
          }

          usageEntries.push(entry);
        }

        // Extract TodoWrite calls
        if (obj.message && obj.message.content) {
          const todoContent = obj.message.content.find(c => c.type === 'tool_use' && c.name === 'TodoWrite');
          if (todoContent && todoContent.input && todoContent.input.todos) {
            todoChanges.push({
              timestamp: obj.timestamp,
              todos: todoContent.input.todos
            });
          }
        }
      } catch (e) { /* skip unparseable lines */ }
    }

    if (usageEntries.length === 0) return null;

    // Calculate totals
    let regularTokens = 0, cachedTokens = 0;
    let regularCost = 0, cachedCost = 0;

    for (const entry of usageEntries) {
      const p = PRICING[entry.model] || PRICING['default'];

      regularTokens += entry.inputTokens + entry.outputTokens;
      cachedTokens += entry.cacheReadTokens + entry.cacheWrite5mTokens + entry.cacheWrite1hTokens;

      regularCost += (entry.inputTokens / 1000000) * p.input + (entry.outputTokens / 1000000) * p.output;
      cachedCost += (entry.cacheWrite5mTokens / 1000000) * p.cacheWrite5m +
                    (entry.cacheWrite1hTokens / 1000000) * p.cacheWrite1h +
                    (entry.cacheReadTokens / 1000000) * p.cacheRead;
    }

    // Calculate duration
    const startTime = new Date(usageEntries[0].timestamp);
    const endTime = new Date(usageEntries[usageEntries.length - 1].timestamp);
    const duration = endTime - startTime;

    // Calculate per-todo breakdown
    const todoBreakdown = [];
    const todoTimings = {};

    for (const change of todoChanges) {
      const changeTime = new Date(change.timestamp);

      for (const todo of change.todos) {
        if (todo.status === 'in_progress') {
          todoTimings[todo.content] = { startTime: changeTime, content: todo.content };
        } else if (todo.status === 'completed' && todoTimings[todo.content]) {
          const started = todoTimings[todo.content].startTime;
          const durationMs = changeTime - started;

          // Get tokens/cost in this window
          let todoRegTok = 0, todoCacheTok = 0, todoRegCost = 0, todoCacheCost = 0;
          for (const entry of usageEntries) {
            const entryTime = new Date(entry.timestamp);
            if (entryTime >= started && entryTime <= changeTime) {
              const p = PRICING[entry.model] || PRICING['default'];
              todoRegTok += entry.inputTokens + entry.outputTokens;
              todoCacheTok += entry.cacheReadTokens + entry.cacheWrite5mTokens + entry.cacheWrite1hTokens;
              todoRegCost += (entry.inputTokens / 1000000) * p.input + (entry.outputTokens / 1000000) * p.output;
              todoCacheCost += (entry.cacheWrite5mTokens / 1000000) * p.cacheWrite5m +
                              (entry.cacheWrite1hTokens / 1000000) * p.cacheWrite1h +
                              (entry.cacheReadTokens / 1000000) * p.cacheRead;
            }
          }

          todoBreakdown.push({
            content: todo.content,
            durationMs: durationMs,
            tokens: todoRegTok + todoCacheTok,
            regularTokens: todoRegTok,
            cachedTokens: todoCacheTok,
            cost: Math.round((todoRegCost + todoCacheCost) * 10000) / 10000,
            regularCost: Math.round(todoRegCost * 10000) / 10000,
            cachedCost: Math.round(todoCacheCost * 10000) / 10000
          });

          delete todoTimings[todo.content];
        }
      }
    }

    return {
      duration: duration,
      tokens: regularTokens + cachedTokens,
      regularTokens: regularTokens,
      cachedTokens: cachedTokens,
      cost: Math.round((regularCost + cachedCost) * 10000) / 10000,
      regularCost: Math.round(regularCost * 10000) / 10000,
      cachedCost: Math.round(cachedCost * 10000) / 10000,
      todoBreakdown: todoBreakdown,
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString()
    };
  } catch (err) {
    console.log('[ANALYSIS] Error: ' + err.message);
    return null;
  }
}

// Fetch subscription usage from Anthropic OAuth API
async function fetchSubscriptionUsage() {
  try {
    const credsPath = path.join(process.env.USERPROFILE, '.claude', '.credentials.json');
    if (!fs.existsSync(credsPath)) return null;

    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (!creds.claudeAiOauth || !creds.claudeAiOauth.accessToken) return null;

    const https = require('https');

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${creds.claudeAiOauth.accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'User-Agent': 'claude-code/2.0.32'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const usage = JSON.parse(data);
            resolve({
              fiveHour: usage.five_hour?.utilization || null,
              sevenDay: usage.seven_day?.utilization || null,
              sevenDayResetsAt: usage.seven_day?.resets_at || null
            });
          } catch { resolve(null); }
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(5000, () => { req.destroy(); resolve(null); });
      req.end();
    });
  } catch (err) {
    return null;
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

function formatPercent(pct) {
  if (pct === undefined || pct === null) return "--%";
  if (pct < 0.01) return "<.01%";
  if (pct < 1) return pct.toFixed(2) + "%";
  return pct.toFixed(1) + "%";
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

  // Update calibration value from manifest if available
  if (manifest.tokensPerPercent) {
    tokensPerPercent = manifest.tokensPerPercent;
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
      const refreshEvery = manifest.heartbeat?.refreshEvery || 6;
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
  const regHeader = pricingMode === 'api' ? 'regular' : 'reg %';
  const cacheHeader = pricingMode === 'api' ? 'cached' : 'cache %';
  const totalHeader = pricingMode === 'api' ? 'total' : 'total %';
  const headerRight = C.dim + '   time   ' + C.reset + ' ' + C.yellow + centerIn13(regHeader) + C.reset + ' ' + C.cyan + centerIn13(cacheHeader) + C.reset + ' ' + C.green + centerIn13(totalHeader) + C.reset;
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

      // Calculate proportional percentages for SUB mode
      const totalCost = phaseData.cost || 0;
      const usageDelta = phaseData.usageDelta;
      const hasUsageDelta = usageDelta !== undefined && usageDelta !== null;
      const regPct = (hasUsageDelta && totalCost > 0) ? usageDelta * ((phaseData.regularCost || 0) / totalCost) : null;
      const cachePct = (hasUsageDelta && totalCost > 0) ? usageDelta * ((phaseData.cachedCost || 0) / totalCost) : null;

      // Regular: tokens or % (yellow)
      const regVal = pricingMode === 'sub' && regPct !== null ? formatPercent(regPct) : (phaseData.regularTokens ? formatTokens(phaseData.regularTokens) : '--');
      const subRegCost = getSubCost(regPct);
      const regCost = phaseData.regularCost !== undefined ? formatCost(pricingMode === 'sub' && subRegCost !== null ? subRegCost : phaseData.regularCost) : '$--';
      stats += C.yellow + regVal.padStart(6) + ' ' + regCost.padStart(6) + C.reset + ' ';
      // Cached: tokens or % (cyan)
      const cacheVal = pricingMode === 'sub' && cachePct !== null ? formatPercent(cachePct) : (phaseData.cachedTokens ? formatTokens(phaseData.cachedTokens) : '--');
      const subCacheCost = getSubCost(cachePct);
      const cacheCost = phaseData.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && subCacheCost !== null ? subCacheCost : phaseData.cachedCost) : '$--';
      stats += C.cyan + cacheVal.padStart(6) + ' ' + cacheCost.padStart(6) + C.reset + ' ';
      // Total: tokens or % (green)
      const totVal = pricingMode === 'sub' && usageDelta !== undefined ? formatPercent(usageDelta) : (phaseData.tokens ? formatTokens(phaseData.tokens) : '--');
      const phaseDisplayCost = getDisplayCost(phaseData.cost, phaseData.usageDelta);
      const totCost = phaseDisplayCost !== undefined && phaseDisplayCost !== null ? formatCost(phaseDisplayCost) : '$--';
      stats += C.green + totVal.padStart(6) + ' ' + totCost.padStart(6) + C.reset;
      if (todoCount > 0) stats += C.dim + '(' + todoCount + ')' + C.reset;
    } else if (status === 'running') {
      stats = C.yellow + 'running'.padStart(10) + C.reset + ''.padEnd(42);
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
      // Calculate total API cost from todos for proportional SUB cost/percentage distribution
      const totalTodoCost = todos.reduce((sum, t) => sum + (t.cost || 0), 0);
      const phaseSubCost = getSubCost(phaseData.usageDelta);
      // Estimate usageDelta from tokens if not available (for retroactive analysis)
      let phaseUsageDelta = phaseData.usageDelta;
      if ((phaseUsageDelta === undefined || phaseUsageDelta === null || phaseUsageDelta === 0) && phaseData.regularTokens && tokensPerPercent) {
        phaseUsageDelta = phaseData.regularTokens / tokensPerPercent;
      }
      const hasPhaseUsageDelta = phaseUsageDelta !== undefined && phaseUsageDelta !== null && phaseUsageDelta !== 0;
      const phaseTotalCost = phaseData.cost || 0;

      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const isLast = i === todos.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const todoName = truncate(todo.content, 20).padEnd(20);
        const todoDur = formatTime(todo.durationMs).padStart(10);

        // Calculate proportional percentage for this todo
        const todoApiCost = todo.cost || 0;
        const todoRatio = totalTodoCost > 0 ? todoApiCost / totalTodoCost : 0;
        const todoUsagePct = hasPhaseUsageDelta ? phaseUsageDelta * todoRatio : null;

        // Regular: proportional percentage in SUB mode
        const todoRegRatio = phaseTotalCost > 0 ? (todo.regularCost || 0) / phaseTotalCost : 0;
        const todoRegPct = hasPhaseUsageDelta ? phaseUsageDelta * todoRegRatio : null;
        const todoRegVal = pricingMode === 'sub' && todoRegPct !== null ? formatPercent(todoRegPct) : (todo.regularTokens ? formatTokens(todo.regularTokens) : '--');
        const todoSubRegCost = getSubCost(todoRegPct);
        const todoRegCost = todo.regularCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubRegCost !== null ? todoSubRegCost : todo.regularCost) : '$--';

        // Cached: proportional percentage in SUB mode
        const todoCacheRatio = phaseTotalCost > 0 ? (todo.cachedCost || 0) / phaseTotalCost : 0;
        const todoCachePct = hasPhaseUsageDelta ? phaseUsageDelta * todoCacheRatio : null;
        const todoCacheVal = pricingMode === 'sub' && todoCachePct !== null ? formatPercent(todoCachePct) : (todo.cachedTokens ? formatTokens(todo.cachedTokens) : '--');
        const todoSubCacheCost = getSubCost(todoCachePct);
        const todoCacheCost = todo.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubCacheCost !== null ? todoSubCacheCost : todo.cachedCost) : '$--';

        // Total: proportional percentage in SUB mode
        const todoTotVal = pricingMode === 'sub' && todoUsagePct !== null ? formatPercent(todoUsagePct) : (todo.tokens ? formatTokens(todo.tokens) : '--');
        const todoSubCost = (phaseSubCost && totalTodoCost > 0) ? todoApiCost / totalTodoCost * phaseSubCost : null;
        const todoDisplayCost = pricingMode === 'sub' && todoSubCost !== null ? todoSubCost : todoApiCost;
        const todoTotCost = formatCost(todoDisplayCost);

        let todoStats = C.dim + todoDur + C.reset + ' ';
        todoStats += C.yellow + todoRegVal.padStart(6) + ' ' + todoRegCost.padStart(6) + C.reset + ' ';
        todoStats += C.cyan + todoCacheVal.padStart(6) + ' ' + todoCacheCost.padStart(6) + C.reset + ' ';
        todoStats += C.green + todoTotVal.padStart(6) + ' ' + todoTotCost.padStart(6) + C.reset;

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
    const epicHeaderRight = C.dim + '   time   ' + C.reset + ' ' + C.yellow + centerIn13(regHeader) + C.reset + ' ' + C.cyan + centerIn13(cacheHeader) + C.reset + ' ' + C.green + centerIn13(totalHeader) + C.reset;
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

        // Calculate proportional percentages for SUB mode
        const epicTotalCost = epic.cost || 0;
        const epicUsageDelta = epic.usageDelta;
        const hasEpicUsageDelta = epicUsageDelta !== undefined && epicUsageDelta !== null;
        const eRegPct = (hasEpicUsageDelta && epicTotalCost > 0) ? epicUsageDelta * ((epic.regularCost || 0) / epicTotalCost) : null;
        const eCachePct = (hasEpicUsageDelta && epicTotalCost > 0) ? epicUsageDelta * ((epic.cachedCost || 0) / epicTotalCost) : null;

        // Regular: tokens or % (yellow)
        const eRegVal = pricingMode === 'sub' && eRegPct !== null ? formatPercent(eRegPct) : (epic.regularTokens ? formatTokens(epic.regularTokens) : '--');
        const eSubRegCost = getSubCost(eRegPct);
        const eRegCost = epic.regularCost !== undefined ? formatCost(pricingMode === 'sub' && eSubRegCost !== null ? eSubRegCost : epic.regularCost) : '$--';
        epicStats += C.yellow + eRegVal.padStart(6) + ' ' + eRegCost.padStart(6) + C.reset + ' ';
        // Cached: tokens or % (cyan)
        const eCacheVal = pricingMode === 'sub' && eCachePct !== null ? formatPercent(eCachePct) : (epic.cachedTokens ? formatTokens(epic.cachedTokens) : '--');
        const eSubCacheCost = getSubCost(eCachePct);
        const eCacheCost = epic.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && eSubCacheCost !== null ? eSubCacheCost : epic.cachedCost) : '$--';
        epicStats += C.cyan + eCacheVal.padStart(6) + ' ' + eCacheCost.padStart(6) + C.reset + ' ';
        // Total: tokens or % (green)
        const eTotVal = pricingMode === 'sub' && epicUsageDelta !== undefined ? formatPercent(epicUsageDelta) : (epic.tokens ? formatTokens(epic.tokens) : '--');
        const epicDisplayCost = getDisplayCost(epic.cost, epic.usageDelta);
        const eTotCost = epicDisplayCost !== undefined && epicDisplayCost !== null ? formatCost(epicDisplayCost) : '$--';
        epicStats += C.green + eTotVal.padStart(6) + ' ' + eTotCost.padStart(6) + C.reset;
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
        // Calculate total API cost from todos for proportional SUB cost/percentage distribution
        const totalEpicTodoCost = epic.todoBreakdown.reduce((sum, t) => sum + (t.cost || 0), 0);
        const epicSubCost = getSubCost(epic.usageDelta);
        // Estimate usageDelta from tokens if not available (for retroactive analysis)
        let epicUsageDelta = epic.usageDelta;
        if ((epicUsageDelta === undefined || epicUsageDelta === null || epicUsageDelta === 0) && epic.regularTokens && tokensPerPercent) {
          epicUsageDelta = epic.regularTokens / tokensPerPercent;
        }
        const hasEpicTodoUsageDelta = epicUsageDelta !== undefined && epicUsageDelta !== null && epicUsageDelta !== 0;
        const epicTotalCost = epic.cost || 0;

        for (let i = 0; i < epic.todoBreakdown.length; i++) {
          const todo = epic.todoBreakdown[i];
          const isLast = i === epic.todoBreakdown.length - 1;
          const prefix = isLast ? '└─' : '├─';
          const todoName = truncate(todo.content || '', 18).padEnd(18);
          const todoDur = todo.durationMs ? formatTime(todo.durationMs).padStart(10) : '--'.padStart(10);

          // Calculate proportional percentage for this todo
          const todoApiCost = todo.cost || 0;
          const todoRatio = totalEpicTodoCost > 0 ? todoApiCost / totalEpicTodoCost : 0;
          const todoUsagePct = hasEpicTodoUsageDelta ? epicUsageDelta * todoRatio : null;

          // Regular: proportional percentage in SUB mode
          const todoRegRatio = epicTotalCost > 0 ? (todo.regularCost || 0) / epicTotalCost : 0;
          const todoRegPct = hasEpicTodoUsageDelta ? epicUsageDelta * todoRegRatio : null;
          const todoRegVal = pricingMode === 'sub' && todoRegPct !== null ? formatPercent(todoRegPct) : (todo.regularTokens ? formatTokens(todo.regularTokens) : '--');
          const todoSubRegCost = getSubCost(todoRegPct);
          const todoRegCost = todo.regularCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubRegCost !== null ? todoSubRegCost : todo.regularCost) : '$--';

          // Cached: proportional percentage in SUB mode
          const todoCacheRatio = epicTotalCost > 0 ? (todo.cachedCost || 0) / epicTotalCost : 0;
          const todoCachePct = hasEpicTodoUsageDelta ? epicUsageDelta * todoCacheRatio : null;
          const todoCacheVal = pricingMode === 'sub' && todoCachePct !== null ? formatPercent(todoCachePct) : (todo.cachedTokens ? formatTokens(todo.cachedTokens) : '--');
          const todoSubCacheCost = getSubCost(todoCachePct);
          const todoCacheCost = todo.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubCacheCost !== null ? todoSubCacheCost : todo.cachedCost) : '$--';

          // Total: proportional percentage in SUB mode
          const todoTotVal = pricingMode === 'sub' && todoUsagePct !== null ? formatPercent(todoUsagePct) : (todo.tokens ? formatTokens(todo.tokens) : '--');
          const todoSubCost = (epicSubCost && totalEpicTodoCost > 0) ? todoApiCost / totalEpicTodoCost * epicSubCost : null;
          const todoDisplayCost = pricingMode === 'sub' && todoSubCost !== null ? todoSubCost : todoApiCost;
          const todoTotCost = formatCost(todoDisplayCost);

          let todoStats = C.dim + todoDur + C.reset + ' ';
          todoStats += C.yellow + todoRegVal.padStart(6) + ' ' + todoRegCost.padStart(6) + C.reset + ' ';
          todoStats += C.cyan + todoCacheVal.padStart(6) + ' ' + todoCacheCost.padStart(6) + C.reset + ' ';
          todoStats += C.green + todoTotVal.padStart(6) + ' ' + todoTotCost.padStart(6) + C.reset;

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
  let totalUsageDelta = 0; // For SUB mode

  if (manifest.phases) {
    for (const p of Object.values(manifest.phases)) {
      if (p.tokens) totalTokens += p.tokens;
      if (p.regularTokens) totalRegularTokens += p.regularTokens;
      if (p.cachedTokens) totalCachedTokens += p.cachedTokens;
      if (p.regularCost) totalRegularCost += p.regularCost;
      if (p.cachedCost) totalCachedCost += p.cachedCost;
      if (p.usageDelta) totalUsageDelta += p.usageDelta;
    }
  }
  if (manifest.epics) {
    for (const e of manifest.epics) {
      if (e.tokens) totalTokens += e.tokens;
      if (e.regularTokens) totalRegularTokens += e.regularTokens;
      if (e.cachedTokens) totalCachedTokens += e.cachedTokens;
      if (e.regularCost) totalRegularCost += e.regularCost;
      if (e.cachedCost) totalCachedCost += e.cachedCost;
      if (e.usageDelta) totalUsageDelta += e.usageDelta;
    }
  }

  // Calculate workers total display cost based on pricing mode
  const workersApiCost = totalRegularCost + totalCachedCost;
  const workersSubCost = getSubCost(totalUsageDelta);
  const workersDisplayCost = pricingMode === 'sub' && workersSubCost !== null ? workersSubCost : workersApiCost;

  // Calculate supervisor cost from orchestrator runs (stored by analyzeAndStoreOrchestratorMetrics)
  const orchestrator = manifest.orchestrator || { runs: [], totalTokens: 0, totalCost: 0, totalUsageDelta: 0 };
  const supervisorTokens = orchestrator.totalTokens || 0;
  const supervisorRegularTokens = orchestrator.runs.reduce((sum, r) => sum + (r.regularTokens || 0), 0);
  const supervisorCachedTokens = orchestrator.runs.reduce((sum, r) => sum + (r.cachedTokens || 0), 0);
  const supervisorApiCost = orchestrator.totalCost || 0;
  const supervisorRegularCost = orchestrator.runs.reduce((sum, r) => sum + (r.regularCost || 0), 0);
  const supervisorCachedCost = orchestrator.runs.reduce((sum, r) => sum + (r.cachedCost || 0), 0);
  const supervisorUsageDelta = orchestrator.totalUsageDelta || 0;
  const supervisorSubCost = getSubCost(supervisorUsageDelta);
  const hasSupervisorData = orchestrator.runs.length > 0;

  // Grand totals (workers + supervisor)
  const grandTokens = totalTokens + supervisorTokens;
  const grandRegularTokens = totalRegularTokens + supervisorRegularTokens;
  const grandCachedTokens = totalCachedTokens + supervisorCachedTokens;
  const grandRegularCost = totalRegularCost + supervisorRegularCost;
  const grandCachedCost = totalCachedCost + supervisorCachedCost;
  const grandUsageDelta = totalUsageDelta + supervisorUsageDelta;
  const grandApiCost = workersApiCost + supervisorApiCost;
  const grandSubCost = getSubCost(grandUsageDelta);
  const grandDisplayCost = pricingMode === 'sub' && grandSubCost !== null ? grandSubCost : grandApiCost;

  // WORKERS line - shows only phase + epic costs
  const workersLeft = '  ' + C.bold + C.white + 'WORKERS' + C.reset;
  let workersStats = ''.padStart(10) + ' '; // empty time column

  // Calculate proportional percentages for regular and cached (workers)
  const workersRegPct = (totalUsageDelta && workersApiCost > 0) ? totalUsageDelta * (totalRegularCost / workersApiCost) : null;
  const workersCachePct = (totalUsageDelta && workersApiCost > 0) ? totalUsageDelta * (totalCachedCost / workersApiCost) : null;

  // Regular: tokens or % (yellow)
  const workersRegVal = pricingMode === 'sub' && workersRegPct !== null ? formatPercent(workersRegPct) : formatTokens(totalRegularTokens);
  const workersSubRegCost = getSubCost(workersRegPct);
  const workersRegCostVal = formatCost(pricingMode === 'sub' && workersSubRegCost !== null ? workersSubRegCost : totalRegularCost);
  workersStats += C.yellow + workersRegVal.padStart(6) + ' ' + workersRegCostVal.padStart(6) + C.reset + ' ';

  // Cached: tokens or % (cyan)
  const workersCacheVal = pricingMode === 'sub' && workersCachePct !== null ? formatPercent(workersCachePct) : formatTokens(totalCachedTokens);
  const workersSubCacheCost = getSubCost(workersCachePct);
  const workersCacheCostVal = formatCost(pricingMode === 'sub' && workersSubCacheCost !== null ? workersSubCacheCost : totalCachedCost);
  workersStats += C.cyan + workersCacheVal.padStart(6) + ' ' + workersCacheCostVal.padStart(6) + C.reset + ' ';

  // Total: tokens or % (green)
  const workersTotVal = pricingMode === 'sub' && totalUsageDelta > 0 ? formatPercent(totalUsageDelta) : formatTokens(totalTokens);
  workersStats += C.green + workersTotVal.padStart(6) + ' ' + formatCost(workersDisplayCost).padStart(6) + C.reset;

  const workersPadding = ''.padEnd(Math.max(0, W - 4 - 9 - 52 - 2)); // 9 = "  WORKERS", 2 = right padding
  lines.push(line(workersLeft + workersPadding + workersStats, W));

  // SUPERVISOR line - shows orchestrator cost (if orchestrator data exists)
  if (hasSupervisorData) {
    const supLeft = '  ' + C.bold + C.magenta + 'SUPERVISOR' + C.reset;
    let supStats = ''.padStart(10) + ' '; // empty time column

    // Calculate proportional percentages for regular and cached (supervisor)
    const supRegPct = (supervisorUsageDelta && supervisorApiCost > 0) ? supervisorUsageDelta * (supervisorRegularCost / supervisorApiCost) : null;
    const supCachePct = (supervisorUsageDelta && supervisorApiCost > 0) ? supervisorUsageDelta * (supervisorCachedCost / supervisorApiCost) : null;

    // Regular: tokens or % (yellow)
    const supRegVal = pricingMode === 'sub' && supRegPct !== null ? formatPercent(supRegPct) : formatTokens(supervisorRegularTokens);
    const supSubRegCost = getSubCost(supRegPct);
    const supRegCostVal = formatCost(pricingMode === 'sub' && supSubRegCost !== null ? supSubRegCost : supervisorRegularCost);
    supStats += C.yellow + supRegVal.padStart(6) + ' ' + supRegCostVal.padStart(6) + C.reset + ' ';

    // Cached: tokens or % (cyan)
    const supCacheVal = pricingMode === 'sub' && supCachePct !== null ? formatPercent(supCachePct) : formatTokens(supervisorCachedTokens);
    const supSubCacheCost = getSubCost(supCachePct);
    const supCacheCostVal = formatCost(pricingMode === 'sub' && supSubCacheCost !== null ? supSubCacheCost : supervisorCachedCost);
    supStats += C.cyan + supCacheVal.padStart(6) + ' ' + supCacheCostVal.padStart(6) + C.reset + ' ';

    // Total: percentage or tokens (magenta)
    const supTotVal = pricingMode === 'sub' && supervisorUsageDelta > 0 ? formatPercent(supervisorUsageDelta) : formatTokens(supervisorTokens);
    const supDisplayCost = pricingMode === 'sub' && supervisorSubCost !== null ? supervisorSubCost : supervisorApiCost;
    supStats += C.magenta + supTotVal.padStart(6) + ' ' + formatCost(supDisplayCost).padStart(6) + C.reset;

    const supPadding = ''.padEnd(Math.max(0, W - 4 - 12 - 52 - 2)); // 12 = "  SUPERVISOR", 2 = right padding
    lines.push(line(supLeft + supPadding + supStats, W));
  }

  // GRAND TOTAL line (workers + supervisor)
  const grandLeft = '  ' + C.bold + C.white + 'TOTAL' + C.reset;
  let grandStats = ''.padStart(10) + ' '; // empty time column

  // If supervisor data exists, show combined totals; otherwise same as workers
  if (hasSupervisorData) {
    // Calculate proportional percentages for regular and cached (grand total)
    const grandRegPct = (grandUsageDelta && grandApiCost > 0) ? grandUsageDelta * (grandRegularCost / grandApiCost) : null;
    const grandCachePct = (grandUsageDelta && grandApiCost > 0) ? grandUsageDelta * (grandCachedCost / grandApiCost) : null;

    // Regular: tokens or % (yellow)
    const grandRegVal = pricingMode === 'sub' && grandRegPct !== null ? formatPercent(grandRegPct) : formatTokens(grandRegularTokens);
    const grandSubRegCost = getSubCost(grandRegPct);
    const grandRegCostVal = formatCost(pricingMode === 'sub' && grandSubRegCost !== null ? grandSubRegCost : grandRegularCost);
    grandStats += C.yellow + grandRegVal.padStart(6) + ' ' + grandRegCostVal.padStart(6) + C.reset + ' ';

    // Cached: tokens or % (cyan)
    const grandCacheVal = pricingMode === 'sub' && grandCachePct !== null ? formatPercent(grandCachePct) : formatTokens(grandCachedTokens);
    const grandSubCacheCost = getSubCost(grandCachePct);
    const grandCacheCostVal = formatCost(pricingMode === 'sub' && grandSubCacheCost !== null ? grandSubCacheCost : grandCachedCost);
    grandStats += C.cyan + grandCacheVal.padStart(6) + ' ' + grandCacheCostVal.padStart(6) + C.reset + ' ';

    // Total: combined percentage or tokens (green)
    const grandTotVal = pricingMode === 'sub' && grandUsageDelta > 0 ? formatPercent(grandUsageDelta) : formatTokens(grandTokens);
    grandStats += C.green + grandTotVal.padStart(6) + ' ' + formatCost(grandDisplayCost).padStart(6) + C.reset;
  } else {
    // No supervisor data - grand total = workers total
    grandStats += C.yellow + workersRegVal.padStart(6) + ' ' + workersRegCostVal.padStart(6) + C.reset + ' ';
    grandStats += C.cyan + workersCacheVal.padStart(6) + ' ' + workersCacheCostVal.padStart(6) + C.reset + ' ';
    grandStats += C.green + workersTotVal.padStart(6) + ' ' + formatCost(workersDisplayCost).padStart(6) + C.reset;
  }

  const grandPadding = ''.padEnd(Math.max(0, W - 4 - 7 - 52 - 2)); // 7 = "  TOTAL", 2 = right padding
  lines.push(line(grandLeft + grandPadding + grandStats, W));

  // Subscription Usage Display
  if (subscriptionUsage) {
    const fiveHr = subscriptionUsage.fiveHour !== null ? subscriptionUsage.fiveHour + '%' : '--';
    const sevenDay = subscriptionUsage.sevenDay !== null ? subscriptionUsage.sevenDay + '%' : '--';

    // Color code based on usage level
    let sevenDayColor = C.green;
    if (subscriptionUsage.sevenDay > 80) sevenDayColor = C.red;
    else if (subscriptionUsage.sevenDay > 60) sevenDayColor = C.yellow;

    let fiveHrColor = C.green;
    if (subscriptionUsage.fiveHour > 80) fiveHrColor = C.red;
    else if (subscriptionUsage.fiveHour > 60) fiveHrColor = C.yellow;

    const calDisplay = (tokensPerPercent / 1000).toFixed(0) + 'K tok/%';
    const costPerPercent = '$' + (FIVE_HOUR_SUB_BUDGET / 100).toFixed(3) + '/%';
    lines.push(line('', W));
    lines.push(line('  ' + C.magenta + 'SUBSCRIPTION' + C.reset + '  5hr: ' + fiveHrColor + fiveHr.padStart(4) + C.reset + '  7-day: ' + sevenDayColor + sevenDay.padStart(4) + C.reset + '  cal: ' + C.cyan + calDisplay + C.reset + '  ' + C.green + costPerPercent + C.reset, W));
  }

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
  const modeLabel = pricingMode === 'api' ? 'API' : 'SUB';
  const modeColor = pricingMode === 'api' ? C.green : C.magenta;
  lines.push(line('  ' + C.yellow + '[1-5]' + C.reset + ' Phases  ' + C.yellow + '[A-I]' + C.reset + ' Epics  ' + C.yellow + '[Tab]' + C.reset + ' ' + modeColor + modeLabel + C.reset + '  ' + C.yellow + '[Space]' + C.reset + ' ' + C.red + '💗' + C.reset + '  ' + C.yellow + '[Q]' + C.reset + ' Quit', W));
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

  // Fetch subscription usage periodically
  if (Date.now() - lastUsageFetch >= USAGE_FETCH_INTERVAL) {
    lastUsageFetch = Date.now();
    fetchSubscriptionUsage().then(usage => {
      if (usage) subscriptionUsage = usage;
    }).catch(() => {});
  }

  // Check for state transitions (phase/epic/pipeline complete) - async but fire-and-forget
  checkStateTransitions().catch(err => console.log('[TICK] Error: ' + err.message));

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
Start-Sleep -Milliseconds 800

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


// Analyze and store orchestrator metrics before context refresh
function analyzeAndStoreOrchestratorMetrics() {
  const manifest = readManifest();
  if (!manifest) return;

  // Use orchestratorSessionId from manifest if available (more reliable)
  let transcriptInfo;
  if (manifest.orchestratorSessionId) {
    const transcriptPath = findTranscriptPath(manifest.orchestratorSessionId);
    if (transcriptPath) {
      transcriptInfo = {
        path: transcriptPath,
        sessionId: manifest.orchestratorSessionId
      };
    }
  }

  // Fallback to most recent transcript if no orchestratorSessionId
  if (!transcriptInfo) {
    transcriptInfo = findMostRecentTranscript();
  }

  if (!transcriptInfo) {
    console.log('[ORCHESTRATOR] No transcript found to analyze');
    return;
  }

  console.log('[ORCHESTRATOR] Analyzing transcript:', transcriptInfo.sessionId);

  const metrics = analyzeTranscript(transcriptInfo.path);
  if (!metrics) {
    console.log('[ORCHESTRATOR] No metrics extracted from transcript');
    return;
  }

  // Initialize orchestrator tracking if needed
  if (!manifest.orchestrator) {
    manifest.orchestrator = { runs: [], totalTokens: 0, totalCost: 0, totalUsageDelta: 0 };
  }

  // Check if this session was already analyzed (avoid duplicates)
  const existingRun = manifest.orchestrator.runs.find(r => r.sessionId === transcriptInfo.sessionId);
  if (existingRun) {
    console.log('[ORCHESTRATOR] Session already analyzed, skipping');
    return;
  }

  // Add new run
  const run = {
    sessionId: transcriptInfo.sessionId,
    analyzedAt: new Date().toISOString(),
    tokens: metrics.regularTokens + metrics.cachedTokens,
    regularTokens: metrics.regularTokens,
    cachedTokens: metrics.cachedTokens,
    cost: metrics.regularCost + metrics.cachedCost,
    regularCost: metrics.regularCost,
    cachedCost: metrics.cachedCost,
    duration: metrics.duration
  };

  manifest.orchestrator.runs.push(run);

  // Update totals
  manifest.orchestrator.totalTokens = manifest.orchestrator.runs.reduce((sum, r) => sum + (r.tokens || 0), 0);
  manifest.orchestrator.totalRegularTokens = manifest.orchestrator.runs.reduce((sum, r) => sum + (r.regularTokens || 0), 0);
  manifest.orchestrator.totalCost = manifest.orchestrator.runs.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Estimate usageDelta from regularTokens using calibration (cached tokens don't count toward subscription)
  const tpp = manifest.tokensPerPercent || tokensPerPercent;
  const estimatedPercent = tpp ? manifest.orchestrator.totalRegularTokens / tpp : 0;
  manifest.orchestrator.totalUsageDelta = Math.round(estimatedPercent * 100) / 100;

  writeManifest(manifest);
  console.log('[ORCHESTRATOR] Stored metrics: tokens=' + run.tokens + ', cost=$' + run.cost.toFixed(2));
}

function triggerContextRefresh() {
  // Analyze orchestrator transcript BEFORE /clear (which creates new session)
  analyzeAndStoreOrchestratorMetrics();

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

# Step 1: Send first /clear
Write-Output "Sending first /clear..."
$r1 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/clear")
Start-Sleep -Milliseconds 800
$r1e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "First clear result: text=$r1, enter=$r1e"

# Step 2: Wait 30 seconds for context to fully clear
Write-Output "Waiting 30 seconds..."
Start-Sleep -Seconds 30

# Step 3: Send second /clear
Write-Output "Sending second /clear..."
$r2 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/clear")
Start-Sleep -Milliseconds 800
$r2e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Second clear result: text=$r2, enter=$r2e"

# Step 4: Wait 5 seconds
Write-Output "Waiting 5 seconds..."
Start-Sleep -Seconds 5

# Step 5: Send /orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION
Write-Output "Sending /orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION..."
$r3 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION")
Start-Sleep -Milliseconds 800
$r3e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Orchestrator result: text=$r3, enter=$r3e"
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
      console.log('[REFRESH] Dashboard exiting - orchestrator will spawn fresh dashboard on resume.');
      process.exit(0);
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
  const refreshEvery = manifest.heartbeat?.refreshEvery || 6;
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
Start-Sleep -Milliseconds 800
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
Start-Sleep -Milliseconds 800
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

async function checkStateTransitions() {
  const manifest = readManifest();
  if (!manifest) return;

  // Check pipeline complete
  if (manifest.status === 'complete' && lastPipelineStatus !== 'complete') {
    if (ORCHESTRATOR_PID) {
      sendEventMessage('PIPELINE COMPLETE: Generate final report.');
    }
    lastPipelineStatus = manifest.status;
    return;
  }
  lastPipelineStatus = manifest.status;

  // Check phase transitions
  if (manifest.phases) {
    for (const [phase, data] of Object.entries(manifest.phases)) {
      const currentStatus = data.status;
      const previousStatus = lastPhaseStatuses[phase];

      // Phase started running - record usageBefore and capture sessionId
      if (currentStatus === 'running' && previousStatus !== 'running') {
        console.log(`
[METRICS] Phase ${phase} started - fetching usage before...`);
        
        // Capture sessionId from session-info.txt (written by SessionStart hook)
        const sessionInfoPath = path.join(PROJECT_PATH, '.pipeline', 'session-info.txt');
        if (fs.existsSync(sessionInfoPath)) {
          try {
            const sessionInfo = JSON.parse(fs.readFileSync(sessionInfoPath, 'utf8'));
            if (sessionInfo.session_id) {
              manifest.phases[phase].sessionId = sessionInfo.session_id;
              console.log(`[METRICS] Phase ${phase} sessionId: ${sessionInfo.session_id}`);
            }
          } catch (e) {
            console.log(`[METRICS] Could not read session-info.txt: ${e.message}`);
          }
        }
        
        const usage = await fetchSubscriptionUsage();
        if (usage) {
          manifest.phases[phase].usageBefore = usage.fiveHour;
          console.log(`[METRICS] Phase ${phase} usageBefore: ${usage.fiveHour}%`);
        }
        writeManifest(manifest);
      }
      // Phase completed - calculate all metrics
      if (currentStatus === 'complete' && previousStatus === 'running') {
        console.log(`\n[METRICS] Phase ${phase} completed - analyzing...`);

        // Fetch usageAfter
        const usage = await fetchSubscriptionUsage();
        if (usage) {
          manifest.phases[phase].usageAfter = usage.fiveHour;
          const before = manifest.phases[phase].usageBefore || 0;
          manifest.phases[phase].usageDelta = Math.round((usage.fiveHour - before) * 100) / 100;
          console.log(`[METRICS] Phase ${phase} usageAfter: ${usage.fiveHour}%, delta: ${manifest.phases[phase].usageDelta}%`);
        }

        // Analyze transcript if sessionId exists
        if (data.sessionId) {
          const transcriptPath = findTranscriptPath(data.sessionId);
          if (transcriptPath) {
            const metrics = analyzeTranscript(transcriptPath);
            if (metrics) {
              manifest.phases[phase].duration = metrics.duration;
              manifest.phases[phase].tokens = metrics.tokens;
              manifest.phases[phase].regularTokens = metrics.regularTokens;
              manifest.phases[phase].cachedTokens = metrics.cachedTokens;
              manifest.phases[phase].cost = metrics.cost;
              manifest.phases[phase].regularCost = metrics.regularCost;
              manifest.phases[phase].cachedCost = metrics.cachedCost;
              manifest.phases[phase].todoBreakdown = metrics.todoBreakdown;

              // Update total cost
              let totalCost = 0;
              for (const p of Object.values(manifest.phases)) {
                if (p.cost) totalCost += p.cost;
              }
              if (manifest.epics) {
                for (const e of manifest.epics) {
                  if (e.cost) totalCost += e.cost;
                }
              }
              manifest.totalCost = Math.round(totalCost * 100) / 100;

              console.log(`[METRICS] Phase ${phase}: ${metrics.tokens} tokens, $${metrics.cost}`);
            }
          }
        }

        writeManifest(manifest);

        if (ORCHESTRATOR_PID) {
          sendEventMessage('PHASE COMPLETE: Metrics calculated automatically. Spawn next phase worker.');
        }
      }

      lastPhaseStatuses[phase] = currentStatus;
    }
  }

  // Check epic transitions
  if (manifest.epics && manifest.epics.length > 0) {
    for (const epic of manifest.epics) {
      const currentStatus = epic.status;
      const previousStatus = lastEpicStatuses[epic.id];

      // Epic started running - record usageBefore and capture sessionId
      if (currentStatus === 'running' && previousStatus !== 'running') {
        console.log(`
[METRICS] Epic ${epic.id} started - fetching usage before...`);
        
        // Capture sessionId from session-info.txt (written by SessionStart hook)
        const sessionInfoPath = path.join(PROJECT_PATH, '.pipeline', 'session-info.txt');
        if (fs.existsSync(sessionInfoPath)) {
          try {
            const sessionInfo = JSON.parse(fs.readFileSync(sessionInfoPath, 'utf8'));
            if (sessionInfo.session_id) {
              epic.sessionId = sessionInfo.session_id;
              console.log(`[METRICS] Epic ${epic.id} sessionId: ${sessionInfo.session_id}`);
            }
          } catch (e) {
            console.log(`[METRICS] Could not read session-info.txt: ${e.message}`);
          }
        }
        
        const usage = await fetchSubscriptionUsage();
        if (usage) {
          epic.usageBefore = usage.fiveHour;
          console.log(`[METRICS] Epic ${epic.id} usageBefore: ${usage.fiveHour}%`);
        }
        writeManifest(manifest);
      }

      // Epic completed - calculate all metrics
      if (currentStatus === 'complete' && previousStatus === 'running') {
        console.log(`\n[METRICS] Epic ${epic.id} completed - analyzing...`);

        // Fetch usageAfter
        const usage = await fetchSubscriptionUsage();
        if (usage) {
          epic.usageAfter = usage.fiveHour;
          const before = epic.usageBefore || 0;
          epic.usageDelta = Math.round((usage.fiveHour - before) * 100) / 100;
          console.log(`[METRICS] Epic ${epic.id} usageAfter: ${usage.fiveHour}%, delta: ${epic.usageDelta}%`);
        }

        // Analyze transcript if sessionId exists
        if (epic.sessionId) {
          const transcriptPath = findTranscriptPath(epic.sessionId);
          if (transcriptPath) {
            const metrics = analyzeTranscript(transcriptPath);
            if (metrics) {
              epic.duration = metrics.duration;
              epic.tokens = metrics.tokens;
              epic.regularTokens = metrics.regularTokens;
              epic.cachedTokens = metrics.cachedTokens;
              epic.cost = metrics.cost;
              epic.regularCost = metrics.regularCost;
              epic.cachedCost = metrics.cachedCost;
              epic.todoBreakdown = metrics.todoBreakdown;

              // Update total cost
              let totalCost = 0;
              for (const p of Object.values(manifest.phases)) {
                if (p.cost) totalCost += p.cost;
              }
              for (const e of manifest.epics) {
                if (e.cost) totalCost += e.cost;
              }
              manifest.totalCost = Math.round(totalCost * 100) / 100;

              console.log(`[METRICS] Epic ${epic.id}: ${metrics.tokens} tokens, $${metrics.cost}`);
            }
          }
        }

        writeManifest(manifest);

        if (ORCHESTRATOR_PID) {
          sendEventMessage('EPIC COMPLETE: Metrics calculated automatically. Spawn next epic worker.');
        }
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

    // Toggle pricing mode: Tab key
    if (key.name === 'tab') {
      pricingMode = pricingMode === 'api' ? 'sub' : 'api';
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

// ============ SESSION-INFO WATCHER ============
// Watches session-info.txt and automatically captures sessionId for running phases/epics

let sessionInfoWatcher = null;
let lastSessionInfoMtime = 0;

function captureSessionId() {
  const sessionInfoPath = path.join(PROJECT_PATH, '.pipeline', 'session-info.txt');
  if (!fs.existsSync(sessionInfoPath)) return;

  // Check if file was modified
  const stats = fs.statSync(sessionInfoPath);
  const mtime = stats.mtimeMs;
  if (mtime <= lastSessionInfoMtime) return;
  lastSessionInfoMtime = mtime;

  // Read session info
  let sessionInfo;
  try {
    sessionInfo = JSON.parse(fs.readFileSync(sessionInfoPath, 'utf8'));
  } catch (e) {
    console.log('[SESSION] Could not parse session-info.txt: ' + e.message);
    return;
  }

  if (!sessionInfo.session_id) {
    console.log('[SESSION] session-info.txt has no session_id');
    return;
  }

  const sessionId = sessionInfo.session_id;
  const manifest = readManifest();
  if (!manifest) return;

  let updated = false;

  // FIRST: Capture orchestrator sessionId if not set yet
  // The first session-info.txt (before workers spawn) contains orchestrator's sessionId
  if (!manifest.orchestratorSessionId) {
    manifest.orchestratorSessionId = sessionId;
    console.log('[SESSION] Captured orchestratorSessionId: ' + sessionId);
    updated = true;
  }

  // Find running phase without sessionId
  if (manifest.phases) {
    for (const [phase, data] of Object.entries(manifest.phases)) {
      if (data.status === 'running' && !data.sessionId) {
        manifest.phases[phase].sessionId = sessionId;
        console.log('[SESSION] Captured sessionId for Phase ' + phase + ': ' + sessionId);
        updated = true;
        break; // Only one phase can be running
      }
    }
  }

  // Find running epic without sessionId (Phase 4)
  if (manifest.epics && manifest.currentPhase === '4') {
    for (const epic of manifest.epics) {
      if (epic.status === 'running' && !epic.sessionId) {
        epic.sessionId = sessionId;
        console.log('[SESSION] Captured sessionId for Epic ' + epic.id + ': ' + sessionId);
        updated = true;
        break; // Only one epic can be running
      }
    }
  }

  if (updated) {
    writeManifest(manifest);
  }
}

function startSessionInfoWatcher() {
  const sessionInfoPath = path.join(PROJECT_PATH, '.pipeline', 'session-info.txt');
  const pipelineDir = path.join(PROJECT_PATH, '.pipeline');

  // Initial capture if file exists
  captureSessionId();

  // Watch the .pipeline directory for session-info.txt changes
  try {
    sessionInfoWatcher = fs.watch(pipelineDir, (eventType, filename) => {
      if (filename === 'session-info.txt') {
        // Small delay to ensure file is fully written
        setTimeout(captureSessionId, 100);
      }
    });
    console.log('[SESSION] Watching session-info.txt for changes');
  } catch (e) {
    console.log('[SESSION] Could not watch session-info.txt: ' + e.message);
    // Fallback: check in tick() via polling
  }
}


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

    // Retroactive analysis for phases that completed while dashboard was down
    if (manifest.phases) {
      for (const [phase, data] of Object.entries(manifest.phases)) {
        if (data.status === 'complete' && data.sessionId && (!data.tokens || data.tokens === 0)) {
          console.log(`[METRICS] Phase ${phase} needs retroactive analysis...`);
          const transcriptPath = findTranscriptPath(data.sessionId);
          if (transcriptPath) {
            const metrics = analyzeTranscript(transcriptPath);
            if (metrics) {
              data.tokens = metrics.regularTokens + metrics.cachedTokens;
              data.regularTokens = metrics.regularTokens;
              data.cachedTokens = metrics.cachedTokens;
              data.cost = metrics.regularCost + metrics.cachedCost;
              data.regularCost = metrics.regularCost;
              data.cachedCost = metrics.cachedCost;
              data.duration = metrics.duration;
              data.todoBreakdown = metrics.todoBreakdown;
              writeManifest(manifest);
              console.log(`[METRICS] Phase ${phase} analyzed: ${data.tokens} tokens, $${data.cost.toFixed(2)}`);
            }
          }
        }
      }
    }

    // Retroactive analysis for epics that completed while dashboard was down
    if (manifest.epics) {
      for (const epic of manifest.epics) {
        if (epic.status === 'complete' && epic.sessionId && (!epic.tokens || epic.tokens === 0)) {
          console.log(`[METRICS] Epic ${epic.id} needs retroactive analysis...`);
          const transcriptPath = findTranscriptPath(epic.sessionId);
          if (transcriptPath) {
            const metrics = analyzeTranscript(transcriptPath);
            if (metrics) {
              epic.tokens = metrics.regularTokens + metrics.cachedTokens;
              epic.regularTokens = metrics.regularTokens;
              epic.cachedTokens = metrics.cachedTokens;
              epic.cost = metrics.regularCost + metrics.cachedCost;
              epic.regularCost = metrics.regularCost;
              epic.cachedCost = metrics.cachedCost;
              epic.duration = metrics.duration;
              epic.todoBreakdown = metrics.todoBreakdown;
              writeManifest(manifest);
              console.log(`[METRICS] Epic ${epic.id} analyzed: ${epic.tokens} tokens, $${epic.cost.toFixed(2)}`);
            }
          }
        }
      }
    }

    // Re-estimate usageDelta from tokens for ALL completed phases/epics
    // This fixes any items that were tracked with wrong metric (sevenDay instead of fiveHour)
    let recalcCount = 0;
    const tpp = manifest.tokensPerPercent || tokensPerPercent;
    if (manifest.phases && tpp) {
      for (const [phase, data] of Object.entries(manifest.phases)) {
        if (data.status === 'complete' && data.regularTokens && data.regularTokens > 0) {
          const oldDelta = data.usageDelta;
          const newDelta = Math.round((data.regularTokens / tpp) * 100) / 100;
          if (oldDelta !== newDelta) {
            data.usageDelta = newDelta;
            recalcCount++;
          }
        }
      }
    }
    if (manifest.epics && tpp) {
      for (const epic of manifest.epics) {
        if (epic.status === 'complete' && epic.regularTokens && epic.regularTokens > 0) {
          const oldDelta = epic.usageDelta;
          const newDelta = Math.round((epic.regularTokens / tpp) * 100) / 100;
          if (oldDelta !== newDelta) {
            epic.usageDelta = newDelta;
            recalcCount++;
          }
        }
      }
    }
    if (recalcCount > 0) {
      writeManifest(manifest);
      console.log(`[METRICS] Re-estimated usageDelta for ${recalcCount} completed items from tokens`);
    }

    // Fetch subscription usage on startup
    fetchSubscriptionUsage().then(usage => {
      if (usage) {
        subscriptionUsage = usage;
        lastUsageFetch = Date.now();
        console.log('Subscription usage: 5hr=' + usage.fiveHour + '%, 7day=' + usage.sevenDay + '%');
      }
    }).catch(() => {});
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

  // Start session-info.txt watcher for automatic sessionId capture
  startSessionInfoWatcher();

  // Handle exit - save timer
  process.on('SIGINT', () => { saveActiveMs(); process.exit(0); });
  process.on('SIGTERM', () => { saveActiveMs(); process.exit(0); });

  render();
}

main();
