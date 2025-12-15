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

const PROJECT_PATH = path.resolve(process.argv[2] || process.cwd());
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

// Analysis worker script path (absolute path - dashboard is copied to projects but script stays in Pipeline-Office)
const ANALYSIS_SPAWN_SCRIPT = 'C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-analysis-worker.ps1';

// Pricing per million tokens (from Anthropic pricing page)
const PRICING = {
  'claude-opus-4-5-20251101': { input: 5.0, output: 25.0, cacheWrite5m: 6.25, cacheWrite1h: 10.0, cacheRead: 0.50 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0, cacheWrite5m: 3.75, cacheWrite1h: 6.0, cacheRead: 0.30 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, cacheWrite5m: 3.75, cacheWrite1h: 6.0, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0, cacheWrite5m: 1.25, cacheWrite1h: 2.0, cacheRead: 0.10 },
  'default': { input: 3.0, output: 15.0, cacheWrite5m: 3.75, cacheWrite1h: 6.0, cacheRead: 0.30 }
};

// Column Layout Constants defined after C (see below line ~520)

// UI State
let expandedPhases = new Set();
let expandedEpics = new Set();
let expandedTodos = new Set(); // For nested analysis expansion: "phase-3-todo-1"

// Navigation State
let cursorIndex = 0;
let navItems = []; // Flat list of navigable items built on each render

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
const DOLLARS_PER_PERCENT = 0.50; // 1% of 7-day = $0.50 ($50/week)
const DEFAULT_TOKENS_PER_PERCENT = 182707; // Calibrated value (Dec 2025)
let tokensPerPercent = DEFAULT_TOKENS_PER_PERCENT;

// Calculate subscription cost from 7-day usage delta percentage
function getSubCost(usageDelta) {
  if (usageDelta === undefined || usageDelta === null) return null;
  return usageDelta * DOLLARS_PER_PERCENT; // usageDelta is now 7-day %
}

// Calculate subscription cost from token count (using calibration)
function getSubCostFromTokens(tokens) {
  if (tokens === undefined || tokens === null || tokens === 0) return null;
  const estimatedPercent = tokens / tokensPerPercent;
  return estimatedPercent * DOLLARS_PER_PERCENT; // Convert to 7-day $
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

// Default phase entry structure
const DEFAULT_PHASE_ENTRY = {
  status: 'pending',
  tokens: 0,
  cost: 0,
  regularTokens: 0,
  regularCost: 0,
  cachedTokens: 0,
  cachedCost: 0
};

// Ensure all phase entries exist in manifest (self-healing)
function ensurePhaseEntries(manifest) {
  if (!manifest) return false;

  const isFeatureMode = manifest.mode === 'feature';
  const phases = isFeatureMode ? ['1', '2', '3'] : ['1', '2', '3', '4', '5'];

  if (!manifest.phases) {
    manifest.phases = {};
  }

  let modified = false;
  for (const phase of phases) {
    if (!manifest.phases[phase]) {
      manifest.phases[phase] = { ...DEFAULT_PHASE_ENTRY };
      console.log(`[INIT] Created missing phase ${phase} entry in manifest`);
      modified = true;
    }
  }

  return modified;
}

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

      // Self-healing: ensure all phase entries exist
      if (ensurePhaseEntries(manifest)) {
        writeManifest(manifest);
      }

      return manifest;
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

// Spawn analysis worker in visible window (uses PowerShell to spawn Claude Code)
function spawnAnalysisWorker(sessionId, type, number) {
  if (!sessionId) {
    console.log('[ANALYSIS-WORKER] No sessionId, skipping analysis worker');
    return;
  }

  // Verify spawn script exists
  if (!fs.existsSync(ANALYSIS_SPAWN_SCRIPT)) {
    console.log(`[ANALYSIS-WORKER] ERROR: Spawn script not found at ${ANALYSIS_SPAWN_SCRIPT}`);
    return;
  }

  // Verify transcript exists before spawning
  const transcriptPath = findTranscriptPath(sessionId);
  if (!transcriptPath) {
    console.log(`[ANALYSIS-WORKER] WARNING: No transcript found for session ${sessionId}`);
    console.log(`[ANALYSIS-WORKER] Skipping AI pattern analysis (transcript may be deleted)`);
    return;
  }

  console.log(`[ANALYSIS-WORKER] Spawning Claude Code for ${type} ${number}`);
  console.log(`[ANALYSIS-WORKER] Session: ${sessionId}`);
  console.log(`[ANALYSIS-WORKER] Transcript: ${transcriptPath}`);
  console.log(`[ANALYSIS-WORKER] Project: ${PROJECT_PATH}`);
  console.log(`[ANALYSIS-WORKER] A new window will open for AI pattern analysis...`);

  // Spawn analysis worker directly (no hidden window - script needs console access)
  const proc = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-File', ANALYSIS_SPAWN_SCRIPT,
    '-ProjectPath', PROJECT_PATH,
    '-SessionId', sessionId,
    '-Type', type,
    '-Number', String(number)
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false
  });

  proc.stdout.on('data', (data) => {
    console.log(`[ANALYSIS-WORKER] ${data.toString().trim()}`);
  });
  proc.stderr.on('data', (data) => {
    console.log(`[ANALYSIS-WORKER] ERROR: ${data.toString().trim()}`);
  });
  proc.on('close', (code) => {
    console.log(`[ANALYSIS-WORKER] Spawn script completed with code ${code}`);
  });
}

// Run analysis on the currently selected phase/epic (triggered by 'r' key)
async function runSelectedAnalysis() {
  if (cursorIndex < 0 || cursorIndex >= navItems.length) {
    console.log('\n[ANALYZE] No item selected');
    return;
  }

  const item = navItems[cursorIndex];

  // Only allow analysis on phases and epics (not todos or analysis items)
  if (item.type !== 'phase' && item.type !== 'epic') {
    console.log('\n[ANALYZE] Select a phase or epic to analyze');
    return;
  }

  const manifest = readManifest();
  if (!manifest) {
    console.log('\n[ANALYZE] No manifest found');
    return;
  }

  let analysisRan = false;

  if (item.type === 'phase') {
    const phase = item.id;
    const data = manifest.phases?.[phase];

    if (!data) {
      console.log(`\n[ANALYZE] Phase ${phase} not found in manifest`);
      return;
    }

    if (data.status === 'pending') {
      console.log(`\n[ANALYZE] Phase ${phase} has not been run yet`);
      return;
    }

    if (data.status !== 'complete') {
      console.log(`\n[ANALYZE] Phase ${phase} is not complete (status: ${data.status})`);
      return;
    }

    if (!data.sessionId) {
      console.log(`\n[ANALYZE] Phase ${phase} has no sessionId - was it run without dashboard tracking?`);
      return;
    }

    console.log(`\n[ANALYZE] Phase ${phase}: running analysis...`);

    // Run cost analysis
    const transcriptPath = findTranscriptPath(data.sessionId);
    if (transcriptPath) {
      console.log(`[ANALYZE] Phase ${phase}: running cost analysis...`);
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

        // Calculate usageDelta from tokens
        const tpp = manifest.tokensPerPercent || tokensPerPercent;
        if (metrics.regularTokens && tpp) {
          manifest.phases[phase].usageDelta = Math.round((metrics.regularTokens / tpp) * 100) / 100;
        }

        // Display detailed calculation results
        const phaseResult = manifest.phases[phase];
        console.log(`
╔════════════════════════════════════════════════════════╗`);
        console.log(`║  PHASE ${phase} CALCULATION COMPLETE                        ║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        console.log(`║  Duration:     ${formatTime(phaseResult.duration).padEnd(38)}║`);
        console.log(`║  Tokens:       ${(phaseResult.tokens?.toLocaleString() || '0').padEnd(38)}║`);
        console.log(`║    Regular:    ${(phaseResult.regularTokens?.toLocaleString() || '0').padEnd(38)}║`);
        console.log(`║    Cached:     ${(phaseResult.cachedTokens?.toLocaleString() || '0').padEnd(38)}║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        console.log(`║  API Cost:     $${(phaseResult.cost?.toFixed(4) || '0.0000').padEnd(37)}║`);
        console.log(`║    Regular:    $${(phaseResult.regularCost?.toFixed(4) || '0.0000').padEnd(37)}║`);
        console.log(`║    Cached:     $${(phaseResult.cachedCost?.toFixed(4) || '0.0000').padEnd(37)}║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        const phaseSubCost = phaseResult.usageDelta ? (phaseResult.usageDelta * DOLLARS_PER_PERCENT).toFixed(2) : 'N/A';
        const phaseUsagePct = phaseResult.usageDelta ? phaseResult.usageDelta.toFixed(2) + '%' : 'N/A';
        console.log(`║  Sub Cost:     $${phaseSubCost.padEnd(37)}║`);
        console.log(`║  Usage Delta:  ${phaseUsagePct.padEnd(38)}║`);
        console.log(`╚════════════════════════════════════════════════════════╝
`);

        analysisRan = true;
      }
    } else {
      console.log(`[ANALYZE] Phase ${phase}: transcript not found for session ${data.sessionId}`);
    }

    // Spawn pattern analysis worker
    console.log(`[ANALYZE] Phase ${phase}: spawning pattern analysis worker...`);
    spawnAnalysisWorker(data.sessionId, 'phase', phase);
    analysisRan = true;

  } else if (item.type === 'epic') {
    const epicId = item.id;
    const epic = manifest.epics?.find(e => e.id === epicId);

    if (!epic) {
      console.log(`\n[ANALYZE] Epic ${epicId} not found in manifest`);
      return;
    }

    if (epic.status !== 'complete') {
      console.log(`\n[ANALYZE] Epic ${epicId} is not complete (status: ${epic.status})`);
      return;
    }

    if (!epic.sessionId) {
      console.log(`\n[ANALYZE] Epic ${epicId} has no sessionId`);
      return;
    }

    console.log(`\n[ANALYZE] Epic ${epicId}: running analysis...`);

    // Run cost analysis
    const transcriptPath = findTranscriptPath(epic.sessionId);
    if (transcriptPath) {
      console.log(`[ANALYZE] Epic ${epicId}: running cost analysis...`);
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

        // Calculate usageDelta from tokens
        const tpp = manifest.tokensPerPercent || tokensPerPercent;
        if (metrics.regularTokens && tpp) {
          epic.usageDelta = Math.round((metrics.regularTokens / tpp) * 100) / 100;
        }

        // Display detailed calculation results
        console.log(`
╔════════════════════════════════════════════════════════╗`);
        console.log(`║  EPIC ${epicId} CALCULATION COMPLETE                         ║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        console.log(`║  Duration:     ${formatTime(epic.duration).padEnd(38)}║`);
        console.log(`║  Tokens:       ${(epic.tokens?.toLocaleString() || '0').padEnd(38)}║`);
        console.log(`║    Regular:    ${(epic.regularTokens?.toLocaleString() || '0').padEnd(38)}║`);
        console.log(`║    Cached:     ${(epic.cachedTokens?.toLocaleString() || '0').padEnd(38)}║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        console.log(`║  API Cost:     $${(epic.cost?.toFixed(4) || '0.0000').padEnd(37)}║`);
        console.log(`║    Regular:    $${(epic.regularCost?.toFixed(4) || '0.0000').padEnd(37)}║`);
        console.log(`║    Cached:     $${(epic.cachedCost?.toFixed(4) || '0.0000').padEnd(37)}║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        const epicSubCost = epic.usageDelta ? (epic.usageDelta * DOLLARS_PER_PERCENT).toFixed(2) : 'N/A';
        const epicUsagePct = epic.usageDelta ? epic.usageDelta.toFixed(2) + '%' : 'N/A';
        console.log(`║  Sub Cost:     $${epicSubCost.padEnd(37)}║`);
        console.log(`║  Usage Delta:  ${epicUsagePct.padEnd(38)}║`);
        console.log(`╚════════════════════════════════════════════════════════╝
`);

        analysisRan = true;
      }
    } else {
      console.log(`[ANALYZE] Epic ${epicId}: transcript not found for session ${epic.sessionId}`);
    }

    // Spawn pattern analysis worker
    console.log(`[ANALYZE] Epic ${epicId}: spawning pattern analysis worker...`);
    spawnAnalysisWorker(epic.sessionId, 'epic', epicId.toString());
    analysisRan = true;
  }

  if (analysisRan) {
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
    writeManifest(manifest);
    console.log('[ANALYZE] Manifest updated');
  }

  render();
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

// Column Layout Constants (Excel-like table structure)
const COL = {
  TIME: 10,      // "  7m 05s  "
  REG: 18,       // " 1.2M 2.3% $2.10" (SUB mode: tok % $)
  CACHE: 18,     // "  300K 0.5% $0.35"
  TOTAL: 18,     // " 1.5M 2.8% $2.45"
};
const DATA_COLS_WIDTH = COL.TIME + 1 + COL.REG + 1 + COL.CACHE + 1 + COL.TOTAL; // 68 (with 3 separators)
const COL_SEP = C.dim + '│' + C.reset;  // Column separator

// Section separator line
function separator(W, char = '─') {
  return C.cyan + '║' + C.dim + char.repeat(W - 2) + C.cyan + '║' + C.reset;
}

// Table separator with column crossings (Excel-like)
function tableSeparator(W, nameColWidth) {
  const cross = '┼';
  const line = '─';
  // nameColWidth + separator positions for time, reg, cache, total columns
  const namePart = line.repeat(nameColWidth);
  const timePart = line.repeat(COL.TIME);
  const regPart = line.repeat(COL.REG);
  const cachePart = line.repeat(COL.CACHE);
  const totalPart = line.repeat(COL.TOTAL);
  const inner = namePart + cross + timePart + cross + regPart + cross + cachePart + cross + totalPart;
  // Pad or trim to fit width
  const needed = W - 2;
  const content = inner.length >= needed ? inner.slice(0, needed) : inner + line.repeat(needed - inner.length);
  return C.cyan + '║' + C.dim + content + C.cyan + '║' + C.reset;
}

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

// Calculate visible terminal width (accounting for wide Unicode characters)
function visibleLength(str) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  let width = 0;
  for (const char of stripped) {
    const code = char.codePointAt(0);
    // Wide characters: emoji and misc symbols that render as 2 columns
    if (code >= 0x1F300 || // Emoji range (🌀 onwards)
        (code >= 0x2300 && code <= 0x23FF) || // Misc Technical (includes ⏱)
        (code >= 0x2600 && code <= 0x27BF)) { // Misc Symbols (includes ⚠️)
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
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

// ============ NAVIGATION ============

// Build flat list of navigable items from manifest
function buildNavItems(manifest) {
  const items = [];

  if (!manifest) return items;

  const isFeatureMode = manifest.mode === 'feature';
  const phases = isFeatureMode ? ['1', '2', '3'] : ['1', '2', '3', '4', '5'];

  // Add phases
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const hasChildren = phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0;

    items.push({
      type: 'phase',
      id: phase,
      name: PHASE_NAMES[phase],
      data: phaseData,
      depth: 0,
      expandable: hasChildren,
      expanded: expandedPhases.has(phase)
    });

    // Add todos if phase is expanded
    if (expandedPhases.has(phase) && phaseData.todoBreakdown) {
      for (let i = 0; i < phaseData.todoBreakdown.length; i++) {
        const todo = phaseData.todoBreakdown[i];
        const todoKey = `phase-${phase}-todo-${i}`;
        // Check if analysis data exists for this todo
        const analysis = phaseData.analysis?.todoSummaries?.[i];
        const hasAnalysis = !!analysis;

        items.push({
          type: 'todo',
          id: todoKey,
          parentPhase: phase,
          todoIndex: i,
          name: todo.content,
          data: todo,
          analysis: analysis,
          depth: 1,
          expandable: hasAnalysis,
          expanded: expandedTodos.has(todoKey)
        });

        // Add analysis if todo is expanded
        if (expandedTodos.has(todoKey) && analysis) {
          items.push({
            type: 'analysis',
            id: `${todoKey}-analysis`,
            parentTodo: todoKey,
            summary: analysis.summary,
            depth: 2,
            expandable: false,
            expanded: false
          });
        }
      }
    }
  }

  // Add epics if they exist
  if (manifest.epics && manifest.epics.length > 0) {
    for (const epic of manifest.epics) {
      const hasChildren = epic.todoBreakdown && epic.todoBreakdown.length > 0;

      items.push({
        type: 'epic',
        id: epic.id,
        name: epic.name,
        data: epic,
        depth: 0,
        expandable: hasChildren,
        expanded: expandedEpics.has(epic.id)
      });

      // Add todos if epic is expanded
      if (expandedEpics.has(epic.id) && epic.todoBreakdown) {
        for (let i = 0; i < epic.todoBreakdown.length; i++) {
          const todo = epic.todoBreakdown[i];
          const todoKey = `epic-${epic.id}-todo-${i}`;
          const analysis = epic.analysis?.todoSummaries?.[i];
          const hasAnalysis = !!analysis;

          items.push({
            type: 'todo',
            id: todoKey,
            parentEpic: epic.id,
            todoIndex: i,
            name: todo.content || '',
            data: todo,
            analysis: analysis,
            depth: 1,
            expandable: hasAnalysis,
            expanded: expandedTodos.has(todoKey)
          });

          // Add analysis if todo is expanded
          if (expandedTodos.has(todoKey) && analysis) {
            items.push({
              type: 'analysis',
              id: `${todoKey}-analysis`,
              parentTodo: todoKey,
              summary: analysis.summary,
              depth: 2,
              expandable: false,
              expanded: false
            });
          }
        }
      }
    }
  }

  // Add totals section
  items.push({
    type: 'totals-header',
    id: 'totals',
    name: 'TOTALS',
    depth: 0,
    expandable: false,
    expanded: false
  });

  return items;
}

// Toggle expansion for the item at cursor
function toggleExpansion() {
  if (cursorIndex < 0 || cursorIndex >= navItems.length) return;

  const item = navItems[cursorIndex];
  if (!item.expandable) return;

  if (item.type === 'phase') {
    if (expandedPhases.has(item.id)) {
      expandedPhases.delete(item.id);
    } else {
      expandedPhases.add(item.id);
    }
  } else if (item.type === 'epic') {
    if (expandedEpics.has(item.id)) {
      expandedEpics.delete(item.id);
    } else {
      expandedEpics.add(item.id);
    }
  } else if (item.type === 'todo') {
    if (expandedTodos.has(item.id)) {
      expandedTodos.delete(item.id);
    } else {
      expandedTodos.add(item.id);
    }
  }
}

// ============ RENDER ============

function render() {
  const manifest = readManifest();
  if (!manifest) {
    clearScreen();
    console.log('Waiting for manifest...');
    return;
  }

  // Build navigation items
  navItems = buildNavItems(manifest);

  // Clamp cursor index to valid range
  if (cursorIndex >= navItems.length) {
    cursorIndex = Math.max(0, navItems.length - 1);
  }

  // Update calibration value from manifest if available
  if (manifest.tokensPerPercent) {
    tokensPerPercent = manifest.tokensPerPercent;
  }

  const lines = [];
  const W = process.stdout.columns || 80;

  // Helper to check if navItem index matches cursor
  const isCursor = (itemId) => {
    if (cursorIndex < 0 || cursorIndex >= navItems.length) return false;
    return navItems[cursorIndex].id === itemId;
  };

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
  const navHint = C.dim + '↑↓ Tab' + C.reset;
  lines.push(line('', W));
  // Excel-like column layout: Name fills space │ time(10) │ regular(13) │ cached(13) │ total(13)
  const nameColWidth = W - 2 - DATA_COLS_WIDTH - 4; // -2 for borders, -4 for 4 separators
  const headerLeft = '  ' + C.bold + C.white + 'PHASES' + C.reset + '  ' + navHint;
  const headerLeftVisible = 2 + 6 + 2 + 6; // '  ' + 'PHASES' + '  ' + '↑↓ Tab'
  // Center header text in each column
  const centerIn = (s, w) => { const pad = Math.floor((w - s.length) / 2); return ''.padEnd(pad) + s + ''.padEnd(w - pad - s.length); };
  const regHeader = pricingMode === 'api' ? 'regular' : 'reg %';
  const cacheHeader = pricingMode === 'api' ? 'cached' : 'cache %';
  const totalHeader = pricingMode === 'api' ? 'total' : 'total %';
  const headerRight = COL_SEP + C.dim + centerIn('time', COL.TIME) + C.reset + COL_SEP + C.yellow + centerIn(regHeader, COL.REG) + C.reset + COL_SEP + C.cyan + centerIn(cacheHeader, COL.CACHE) + C.reset + COL_SEP + C.green + centerIn(totalHeader, COL.TOTAL) + C.reset;
  const headerPadding = Math.max(0, nameColWidth - headerLeftVisible);
  lines.push(line(headerLeft + ''.padEnd(headerPadding) + headerRight, W));
  lines.push(tableSeparator(W, nameColWidth));

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

    // Stats with column separators: │ time(10) │ regular(13) │ cached(13) │ total(13)
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      const todoCount = phaseData.todoBreakdown ? phaseData.todoBreakdown.length : 0;

      // Calculate proportional percentages for SUB mode
      const totalCost = phaseData.cost || 0;
      const totalTokens = phaseData.tokens || 0;
      const usageDelta = phaseData.usageDelta;
      const hasUsageDelta = usageDelta !== undefined && usageDelta !== null;
      const regPct = (hasUsageDelta && totalTokens > 0) ? usageDelta * ((phaseData.regularTokens || 0) / totalTokens) : null;
      const cachePct = (hasUsageDelta && totalTokens > 0) ? usageDelta * ((phaseData.cachedTokens || 0) / totalTokens) : null;

      // Time column (10 chars)
      stats = COL_SEP + C.white + formatTime(phaseData.duration).padStart(COL.TIME) + C.reset;

      // Regular column: tok % $ (SUB mode) or tok $ (API mode)
      const regTok = phaseData.regularTokens ? formatTokens(phaseData.regularTokens) : '--';
      const regPctStr = pricingMode === 'sub' && regPct !== null ? formatPercent(regPct) : '';
      const subRegCost = getSubCost(regPct);
      const regCost = phaseData.regularCost !== undefined ? formatCost(pricingMode === 'sub' && subRegCost !== null ? subRegCost : phaseData.regularCost) : '$--';
      const regContent = pricingMode === 'sub' ? (regTok.padStart(5) + ' ' + regPctStr.padStart(5) + ' ' + regCost.padStart(6)) : (regTok.padStart(6) + ' ' + regCost.padStart(6));
      stats += COL_SEP + C.yellow + regContent.padStart(COL.REG) + C.reset;

      // Cached column: tok % $ (SUB mode) or tok $ (API mode)
      const cacheTok = phaseData.cachedTokens ? formatTokens(phaseData.cachedTokens) : '--';
      const cachePctStr = pricingMode === 'sub' && cachePct !== null ? formatPercent(cachePct) : '';
      const subCacheCost = getSubCost(cachePct);
      const cacheCost = phaseData.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && subCacheCost !== null ? subCacheCost : phaseData.cachedCost) : '$--';
      const cacheContent = pricingMode === 'sub' ? (cacheTok.padStart(5) + ' ' + cachePctStr.padStart(5) + ' ' + cacheCost.padStart(6)) : (cacheTok.padStart(6) + ' ' + cacheCost.padStart(6));
      stats += COL_SEP + C.cyan + cacheContent.padStart(COL.CACHE) + C.reset;

      // Total column: tok % $ (SUB mode) or tok $ (API mode)
      const totTok = phaseData.tokens ? formatTokens(phaseData.tokens) : '--';
      const totPctStr = pricingMode === 'sub' && usageDelta !== undefined ? formatPercent(usageDelta) : '';
      const phaseDisplayCost = getDisplayCost(phaseData.cost, phaseData.usageDelta);
      const totCost = phaseDisplayCost !== undefined && phaseDisplayCost !== null ? formatCost(phaseDisplayCost) : '$--';
      let totalContent = pricingMode === 'sub' ? (totTok.padStart(5) + ' ' + totPctStr.padStart(5) + ' ' + totCost.padStart(6)) : (totTok.padStart(6) + ' ' + totCost.padStart(6));
      if (todoCount > 0) totalContent = pricingMode === 'sub' ? (totTok.padStart(5) + ' ' + totPctStr.padStart(5) + ' ' + totCost.padStart(4) + C.dim + '(' + todoCount + ')' + C.green) : (totTok.padStart(6) + ' ' + totCost.padStart(4) + C.dim + '(' + todoCount + ')' + C.green);
      stats += COL_SEP + C.green + totalContent.padStart(COL.TOTAL + (todoCount > 0 ? 10 : 0)) + C.reset;
    } else if (status === 'running') {
      stats = COL_SEP + C.yellow + 'running'.padStart(COL.TIME) + C.reset + COL_SEP + ''.padEnd(COL.REG) + COL_SEP + ''.padEnd(COL.CACHE) + COL_SEP + ''.padEnd(COL.TOTAL);
    } else {
      stats = COL_SEP + C.dim + '--'.padStart(COL.TIME) + COL_SEP + '  --    --  '.padStart(COL.REG) + COL_SEP + '  --    --  '.padStart(COL.CACHE) + COL_SEP + '  --    --  '.padStart(COL.TOTAL) + C.reset;
    }

    // Name fills available space until column separator
    const cursor = isCursor(phase) ? C.cyan + '>' + C.reset + ' ' : '  ';
    // Truncate name to fit: prefix is cursor(2) + icon(1) + spaces(2) + phase#(3) + expand(2) = 10
    const maxNameLen = Math.max(5, nameColWidth - 10);
    const displayName = truncate(name, maxNameLen);
    const leftPart = cursor + icon + '  ' + phase + '. ' + expandIcon + rowColor + displayName + C.reset;
    // Pad name to fill nameColWidth (calculated from W - data columns - separators)
    const leftVisible = 2 + 1 + 2 + 3 + 2 + displayName.length; // cursor + icon + spaces + phase# + expand + name
    const leftPadding = Math.max(0, nameColWidth - leftVisible);
    lines.push(line(leftPart + ''.padEnd(leftPadding) + stats, W));

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
      const phaseTotalTokens = phaseData.tokens || 0;

      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const todoKey = `phase-${phase}-todo-${i}`;
        const isLast = i === todos.length - 1;
        const prefix = isLast ? '└─' : '├─';

        // Check if this todo has analysis data
        const analysis = phaseData.analysis?.todoSummaries?.[i];
        const hasAnalysis = !!analysis;
        const isTodoExpanded = expandedTodos.has(todoKey);

        // Expand indicator for todos with analysis
        let todoExpandIcon = '  ';
        if (hasAnalysis) {
          todoExpandIcon = isTodoExpanded ? C.dim + '▼' + C.reset + ' ' : C.dim + '►' + C.reset + ' ';
        }

        const todoName = truncate(todo.content, 18).padEnd(18);
        const todoDur = formatTime(todo.durationMs).padStart(10);

        // Calculate proportional percentage for this todo
        const todoApiCost = todo.cost || 0;
        const todoRatio = totalTodoCost > 0 ? todoApiCost / totalTodoCost : 0;
        const todoUsagePct = hasPhaseUsageDelta ? phaseUsageDelta * todoRatio : null;

        // Regular: tok % $ in SUB mode
        const todoRegRatio = phaseTotalTokens > 0 ? (todo.regularTokens || 0) / phaseTotalTokens : 0;
        const todoRegPct = hasPhaseUsageDelta ? phaseUsageDelta * todoRegRatio : null;
        const todoRegTok = todo.regularTokens ? formatTokens(todo.regularTokens) : '--';
        const todoRegPctStr = pricingMode === 'sub' && todoRegPct !== null ? formatPercent(todoRegPct) : '';
        const todoSubRegCost = getSubCost(todoRegPct);
        const todoRegCost = todo.regularCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubRegCost !== null ? todoSubRegCost : todo.regularCost) : '$--';

        // Cached: tok % $ in SUB mode
        const todoCacheRatio = phaseTotalTokens > 0 ? (todo.cachedTokens || 0) / phaseTotalTokens : 0;
        const todoCachePct = hasPhaseUsageDelta ? phaseUsageDelta * todoCacheRatio : null;
        const todoCacheTok = todo.cachedTokens ? formatTokens(todo.cachedTokens) : '--';
        const todoCachePctStr = pricingMode === 'sub' && todoCachePct !== null ? formatPercent(todoCachePct) : '';
        const todoSubCacheCost = getSubCost(todoCachePct);
        const todoCacheCost = todo.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubCacheCost !== null ? todoSubCacheCost : todo.cachedCost) : '$--';

        // Total: tok % $ in SUB mode
        const todoTotTok = todo.tokens ? formatTokens(todo.tokens) : '--';
        const todoTotPctStr = pricingMode === 'sub' && todoUsagePct !== null ? formatPercent(todoUsagePct) : '';
        const todoSubCost = (phaseSubCost && totalTodoCost > 0) ? todoApiCost / totalTodoCost * phaseSubCost : null;
        const todoDisplayCost = pricingMode === 'sub' && todoSubCost !== null ? todoSubCost : todoApiCost;
        const todoTotCost = formatCost(todoDisplayCost);

        // Build stats with column separators
        let todoStats = COL_SEP + C.dim + todoDur.padStart(COL.TIME) + C.reset;
        const todoRegContent = pricingMode === 'sub' ? (todoRegTok.padStart(5) + ' ' + todoRegPctStr.padStart(5) + ' ' + todoRegCost.padStart(6)) : (todoRegTok.padStart(6) + ' ' + todoRegCost.padStart(6));
        todoStats += COL_SEP + C.yellow + todoRegContent.padStart(COL.REG) + C.reset;
        const todoCacheContent = pricingMode === 'sub' ? (todoCacheTok.padStart(5) + ' ' + todoCachePctStr.padStart(5) + ' ' + todoCacheCost.padStart(6)) : (todoCacheTok.padStart(6) + ' ' + todoCacheCost.padStart(6));
        todoStats += COL_SEP + C.cyan + todoCacheContent.padStart(COL.CACHE) + C.reset;
        const todoTotContent = pricingMode === 'sub' ? (todoTotTok.padStart(5) + ' ' + todoTotPctStr.padStart(5) + ' ' + todoTotCost.padStart(6)) : (todoTotTok.padStart(6) + ' ' + todoTotCost.padStart(6));
        todoStats += COL_SEP + C.green + todoTotContent.padStart(COL.TOTAL) + C.reset;

        // Cursor for todo
        const todoCursor = isCursor(todoKey) ? C.cyan + '>' + C.reset + ' ' : '  ';

        // Name fills space: cursor(2) + indent(4) + prefix(2) + expand(2) + name
        const maxTodoLen = Math.max(5, nameColWidth - 11);
        const displayTodoContent = truncate(todo.content, maxTodoLen);
        const todoLeft = todoCursor + '    ' + C.dim + prefix + C.reset + ' ' + todoExpandIcon + displayTodoContent;
        const todoLeftVisible = 2 + 4 + 2 + 1 + 2 + displayTodoContent.length;
        const todoPadding = Math.max(0, nameColWidth - todoLeftVisible);
        lines.push(line(todoLeft + ''.padEnd(todoPadding) + todoStats, W));

        // Show analysis summary if todo is expanded
        if (isTodoExpanded && analysis) {
          const summaryText = analysis.summary || 'No analysis summary available';
          // Word wrap the summary to fit
          const summaryIndent = '          ';
          const maxSummaryWidth = W - 10 - 4; // Leave room for borders and indent
          const wrappedSummary = summaryText.length > maxSummaryWidth
            ? summaryText.slice(0, maxSummaryWidth - 3) + '...'
            : summaryText;

          // Health indicator
          const healthIcon = analysis.health === 'clean' ? C.green + '✓' + C.reset
            : analysis.health === 'minor_friction' ? C.yellow + '⚠' + C.reset
            : analysis.health === 'struggled' ? C.red + '✗' + C.reset
            : C.dim + '?' + C.reset;

          const analysisCursor = isCursor(`${todoKey}-analysis`) ? C.cyan + '>' + C.reset + ' ' : '  ';
          lines.push(line(analysisCursor + summaryIndent + healthIcon + ' ' + C.dim + wrappedSummary + C.reset, W));
        }
      }
    }

  }

  // Epics section (shown after all phases, only if epics exist)
  if (manifest.epics && manifest.epics.length > 0) {
    lines.push(line('', W));
    // Excel-like column headers with separators
    const epicHeaderLeft = '  ' + C.bold + C.white + 'EPICS' + C.reset + '   ' + navHint;
    const epicHeaderLeftVisible = 2 + 5 + 3 + 6; // '  ' + 'EPICS' + '   ' + '↑↓ Tab'
    const epicHeaderRight = COL_SEP + C.dim + centerIn('time', COL.TIME) + C.reset + COL_SEP + C.yellow + centerIn(regHeader, COL.REG) + C.reset + COL_SEP + C.cyan + centerIn(cacheHeader, COL.CACHE) + C.reset + COL_SEP + C.green + centerIn(totalHeader, COL.TOTAL) + C.reset;
    const epicHeaderPadding = Math.max(0, nameColWidth - epicHeaderLeftVisible);
    lines.push(line(epicHeaderLeft + ''.padEnd(epicHeaderPadding) + epicHeaderRight, W));
    lines.push(tableSeparator(W, nameColWidth));

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

      // Stats with column separators
      let epicStats = '';
      if (epic.duration) {
        // Calculate proportional percentages for SUB mode
        const epicTotalCost = epic.cost || 0;
        const epicTotalTokens = epic.tokens || 0;
        const epicUsageDelta = epic.usageDelta;
        const hasEpicUsageDelta = epicUsageDelta !== undefined && epicUsageDelta !== null;
        const eRegPct = (hasEpicUsageDelta && epicTotalTokens > 0) ? epicUsageDelta * ((epic.regularTokens || 0) / epicTotalTokens) : null;
        const eCachePct = (hasEpicUsageDelta && epicTotalTokens > 0) ? epicUsageDelta * ((epic.cachedTokens || 0) / epicTotalTokens) : null;

        // Time column (10 chars)
        epicStats = COL_SEP + C.white + formatTime(epic.duration).padStart(COL.TIME) + C.reset;

        // Regular column: tok % $ (SUB mode) or tok $ (API mode)
        const eRegTok = epic.regularTokens ? formatTokens(epic.regularTokens) : '--';
        const eRegPctStr = pricingMode === 'sub' && eRegPct !== null ? formatPercent(eRegPct) : '';
        const eSubRegCost = getSubCost(eRegPct);
        const eRegCost = epic.regularCost !== undefined ? formatCost(pricingMode === 'sub' && eSubRegCost !== null ? eSubRegCost : epic.regularCost) : '$--';
        const eRegContent = pricingMode === 'sub' ? (eRegTok.padStart(5) + ' ' + eRegPctStr.padStart(5) + ' ' + eRegCost.padStart(6)) : (eRegTok.padStart(6) + ' ' + eRegCost.padStart(6));
        epicStats += COL_SEP + C.yellow + eRegContent.padStart(COL.REG) + C.reset;

        // Cached column: tok % $ (SUB mode) or tok $ (API mode)
        const eCacheTok = epic.cachedTokens ? formatTokens(epic.cachedTokens) : '--';
        const eCachePctStr = pricingMode === 'sub' && eCachePct !== null ? formatPercent(eCachePct) : '';
        const eSubCacheCost = getSubCost(eCachePct);
        const eCacheCost = epic.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && eSubCacheCost !== null ? eSubCacheCost : epic.cachedCost) : '$--';
        const eCacheContent = pricingMode === 'sub' ? (eCacheTok.padStart(5) + ' ' + eCachePctStr.padStart(5) + ' ' + eCacheCost.padStart(6)) : (eCacheTok.padStart(6) + ' ' + eCacheCost.padStart(6));
        epicStats += COL_SEP + C.cyan + eCacheContent.padStart(COL.CACHE) + C.reset;

        // Total column: tok % $ (SUB mode) or tok $ (API mode)
        const eTotTok = epic.tokens ? formatTokens(epic.tokens) : '--';
        const eTotPctStr = pricingMode === 'sub' && epicUsageDelta !== undefined ? formatPercent(epicUsageDelta) : '';
        const epicDisplayCost = getDisplayCost(epic.cost, epic.usageDelta);
        const eTotCost = epicDisplayCost !== undefined && epicDisplayCost !== null ? formatCost(epicDisplayCost) : '$--';
        let eTotalContent = pricingMode === 'sub' ? (eTotTok.padStart(5) + ' ' + eTotPctStr.padStart(5) + ' ' + eTotCost.padStart(6)) : (eTotTok.padStart(6) + ' ' + eTotCost.padStart(6));
        if (epic.todoBreakdown) eTotalContent = pricingMode === 'sub' ? (eTotTok.padStart(5) + ' ' + eTotPctStr.padStart(5) + ' ' + eTotCost.padStart(4) + C.dim + '(' + epic.todoBreakdown.length + ')' + C.green) : (eTotTok.padStart(6) + ' ' + eTotCost.padStart(4) + C.dim + '(' + epic.todoBreakdown.length + ')' + C.green);
        epicStats += COL_SEP + C.green + eTotalContent.padStart(COL.TOTAL + (epic.todoBreakdown ? 10 : 0)) + C.reset;
      } else {
        epicStats = COL_SEP + C.dim + '--'.padStart(COL.TIME) + COL_SEP + '  --    --  '.padStart(COL.REG) + COL_SEP + '  --    --  '.padStart(COL.CACHE) + COL_SEP + '  --    --  '.padStart(COL.TOTAL) + C.reset;
      }

      // Name fills available space until column separator
      const epicCursor = isCursor(epic.id) ? C.cyan + '>' + C.reset + ' ' : '  ';
      // Truncate epic name to fit: prefix is cursor(2) + icon(1) + spaces(2) + key#(3) + expand(1) + space(1) = 10
      const maxEpicNameLen = Math.max(5, nameColWidth - 10);
      const displayEpicName = truncate(epic.name, maxEpicNameLen);
      const epicLeftPart = epicCursor + epicIcon + '  ' + epicKey + '. ' + expandIndicator + ' ' + epicRowColor + displayEpicName + C.reset;
      const epicLeftVisible = 2 + 1 + 2 + 3 + 1 + 1 + displayEpicName.length; // cursor + icon + spaces + key# + expand + space + name
      const epicPadding = Math.max(0, nameColWidth - epicLeftVisible);
      lines.push(line(epicLeftPart + ''.padEnd(epicPadding) + epicStats, W));

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
        const epicTotalTokens = epic.tokens || 0;

        for (let i = 0; i < epic.todoBreakdown.length; i++) {
          const todo = epic.todoBreakdown[i];
          const todoKey = `epic-${epic.id}-todo-${i}`;
          const isLast = i === epic.todoBreakdown.length - 1;
          const prefix = isLast ? '└─' : '├─';

          // Check if analysis data exists for this todo
          const analysis = epic.analysis?.todoSummaries?.[i];
          const hasAnalysis = !!analysis;
          const isTodoExpanded = expandedTodos.has(todoKey);
          const todoExpandIcon = hasAnalysis ? (isTodoExpanded ? C.dim + '▼' + C.reset + ' ' : C.dim + '►' + C.reset + ' ') : '  ';

          const todoName = truncate(todo.content || '', 16).padEnd(16);
          const todoDur = todo.durationMs ? formatTime(todo.durationMs).padStart(10) : '--'.padStart(10);

          // Calculate proportional percentage for this todo
          const todoApiCost = todo.cost || 0;
          const todoRatio = totalEpicTodoCost > 0 ? todoApiCost / totalEpicTodoCost : 0;
          const todoUsagePct = hasEpicTodoUsageDelta ? epicUsageDelta * todoRatio : null;

          // Regular: tok % $ in SUB mode
          const todoRegRatio = epicTotalTokens > 0 ? (todo.regularTokens || 0) / epicTotalTokens : 0;
          const todoRegPct = hasEpicTodoUsageDelta ? epicUsageDelta * todoRegRatio : null;
          const todoRegTok = todo.regularTokens ? formatTokens(todo.regularTokens) : '--';
          const todoRegPctStr = pricingMode === 'sub' && todoRegPct !== null ? formatPercent(todoRegPct) : '';
          const todoSubRegCost = getSubCost(todoRegPct);
          const todoRegCost = todo.regularCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubRegCost !== null ? todoSubRegCost : todo.regularCost) : '$--';

          // Cached: tok % $ in SUB mode
          const todoCacheRatio = epicTotalTokens > 0 ? (todo.cachedTokens || 0) / epicTotalTokens : 0;
          const todoCachePct = hasEpicTodoUsageDelta ? epicUsageDelta * todoCacheRatio : null;
          const todoCacheTok = todo.cachedTokens ? formatTokens(todo.cachedTokens) : '--';
          const todoCachePctStr = pricingMode === 'sub' && todoCachePct !== null ? formatPercent(todoCachePct) : '';
          const todoSubCacheCost = getSubCost(todoCachePct);
          const todoCacheCost = todo.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && todoSubCacheCost !== null ? todoSubCacheCost : todo.cachedCost) : '$--';

          // Total: tok % $ in SUB mode
          const todoTotTok = todo.tokens ? formatTokens(todo.tokens) : '--';
          const todoTotPctStr = pricingMode === 'sub' && todoUsagePct !== null ? formatPercent(todoUsagePct) : '';
          const todoSubCost = (epicSubCost && totalEpicTodoCost > 0) ? todoApiCost / totalEpicTodoCost * epicSubCost : null;
          const todoDisplayCost = pricingMode === 'sub' && todoSubCost !== null ? todoSubCost : todoApiCost;
          const todoTotCost = formatCost(todoDisplayCost);

          // Build stats with column separators
          let todoStats = COL_SEP + C.dim + todoDur.padStart(COL.TIME) + C.reset;
          const todoRegContent = pricingMode === 'sub' ? (todoRegTok.padStart(5) + ' ' + todoRegPctStr.padStart(5) + ' ' + todoRegCost.padStart(6)) : (todoRegTok.padStart(6) + ' ' + todoRegCost.padStart(6));
          todoStats += COL_SEP + C.yellow + todoRegContent.padStart(COL.REG) + C.reset;
          const todoCacheContent = pricingMode === 'sub' ? (todoCacheTok.padStart(5) + ' ' + todoCachePctStr.padStart(5) + ' ' + todoCacheCost.padStart(6)) : (todoCacheTok.padStart(6) + ' ' + todoCacheCost.padStart(6));
          todoStats += COL_SEP + C.cyan + todoCacheContent.padStart(COL.CACHE) + C.reset;
          const todoTotContent = pricingMode === 'sub' ? (todoTotTok.padStart(5) + ' ' + todoTotPctStr.padStart(5) + ' ' + todoTotCost.padStart(6)) : (todoTotTok.padStart(6) + ' ' + todoTotCost.padStart(6));
          todoStats += COL_SEP + C.green + todoTotContent.padStart(COL.TOTAL) + C.reset;

          // Cursor for epic todo
          const epicTodoCursor = isCursor(todoKey) ? C.cyan + '>' + C.reset + ' ' : '  ';

          // Name fills space: cursor(2) + indent(4) + prefix(2) + expand(2) + name
          const todoContentRaw = todo.content || '';
          const maxEpicTodoLen = Math.max(5, nameColWidth - 11);
          const todoContent = truncate(todoContentRaw, maxEpicTodoLen);
          const epicTodoLeft = epicTodoCursor + '    ' + C.dim + prefix + C.reset + ' ' + todoExpandIcon + todoContent;
          const epicTodoLeftVisible = 2 + 4 + 2 + 1 + 2 + todoContent.length;
          const epicTodoPadding = Math.max(0, nameColWidth - epicTodoLeftVisible);
          lines.push(line(epicTodoLeft + ''.padEnd(epicTodoPadding) + todoStats, W));

          // Show analysis summary if epic todo is expanded
          if (isTodoExpanded && analysis) {
            const summaryIndent = '            '; // 12 spaces for nested content
            const wrappedSummary = truncate(analysis.summary || 'No analysis summary', W - 20);
            const healthIcon = analysis.health === 'clean' ? C.green + '✓' + C.reset
              : analysis.health === 'minor_friction' ? C.yellow + '⚠' + C.reset
              : analysis.health === 'struggled' ? C.red + '✗' + C.reset
              : C.dim + '?' + C.reset;

            const epicAnalysisCursor = isCursor(`${todoKey}-analysis`) ? C.cyan + '>' + C.reset + ' ' : '  ';
            lines.push(line(epicAnalysisCursor + summaryIndent + healthIcon + ' ' + C.dim + wrappedSummary + C.reset, W));
          }
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

  // TOTALS section with centered label
  const totalsLabel = ' TOTALS ';
  const totalsLeftPad = Math.floor((W - 2 - totalsLabel.length) / 2);
  const totalsRightPad = W - 2 - totalsLabel.length - totalsLeftPad;
  lines.push(C.cyan + '╠' + '═'.repeat(totalsLeftPad) + C.bold + C.white + totalsLabel + C.reset + C.cyan + '═'.repeat(totalsRightPad) + '╣' + C.reset);
  lines.push(line('', W));

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

  // Regular: tok % $ in SUB mode (yellow)
  const workersRegTok = formatTokens(totalRegularTokens);
  const workersRegPctStr = pricingMode === 'sub' && workersRegPct !== null ? formatPercent(workersRegPct) : '';
  const workersSubRegCost = getSubCost(workersRegPct);
  const workersRegCostVal = formatCost(pricingMode === 'sub' && workersSubRegCost !== null ? workersSubRegCost : totalRegularCost);
  const workersRegContent = pricingMode === 'sub' ? (workersRegTok.padStart(5) + ' ' + workersRegPctStr.padStart(5) + ' ' + workersRegCostVal.padStart(6)) : (workersRegTok.padStart(6) + ' ' + workersRegCostVal.padStart(6));
  workersStats += C.yellow + workersRegContent + C.reset + ' ';

  // Cached: tok % $ in SUB mode (cyan)
  const workersCacheTok = formatTokens(totalCachedTokens);
  const workersCachePctStr = pricingMode === 'sub' && workersCachePct !== null ? formatPercent(workersCachePct) : '';
  const workersSubCacheCost = getSubCost(workersCachePct);
  const workersCacheCostVal = formatCost(pricingMode === 'sub' && workersSubCacheCost !== null ? workersSubCacheCost : totalCachedCost);
  const workersCacheContent = pricingMode === 'sub' ? (workersCacheTok.padStart(5) + ' ' + workersCachePctStr.padStart(5) + ' ' + workersCacheCostVal.padStart(6)) : (workersCacheTok.padStart(6) + ' ' + workersCacheCostVal.padStart(6));
  workersStats += C.cyan + workersCacheContent + C.reset + ' ';

  // Total: tok % $ in SUB mode (green)
  const workersTotTok = formatTokens(totalTokens);
  const workersTotPctStr = pricingMode === 'sub' && totalUsageDelta > 0 ? formatPercent(totalUsageDelta) : '';
  const workersTotContent = pricingMode === 'sub' ? (workersTotTok.padStart(5) + ' ' + workersTotPctStr.padStart(5) + ' ' + formatCost(workersDisplayCost).padStart(6)) : (workersTotTok.padStart(6) + ' ' + formatCost(workersDisplayCost).padStart(6));
  workersStats += C.green + workersTotContent + C.reset;

  const workersPadding = ''.padEnd(Math.max(0, W - 4 - 9 - 52 - 2)); // 9 = "  WORKERS", 2 = right padding
  lines.push(line(workersLeft + workersPadding + workersStats, W));

  // SUPERVISOR line - shows orchestrator cost (if orchestrator data exists)
  if (hasSupervisorData) {
    const supLeft = '  ' + C.bold + C.magenta + 'SUPERVISOR' + C.reset;
    let supStats = ''.padStart(10) + ' '; // empty time column

    // Calculate proportional percentages for regular and cached (supervisor)
    const supRegPct = (supervisorUsageDelta && supervisorApiCost > 0) ? supervisorUsageDelta * (supervisorRegularCost / supervisorApiCost) : null;
    const supCachePct = (supervisorUsageDelta && supervisorApiCost > 0) ? supervisorUsageDelta * (supervisorCachedCost / supervisorApiCost) : null;

    // Regular: tok % $ in SUB mode (yellow)
    const supRegTok = formatTokens(supervisorRegularTokens);
    const supRegPctStr = pricingMode === 'sub' && supRegPct !== null ? formatPercent(supRegPct) : '';
    const supSubRegCost = getSubCost(supRegPct);
    const supRegCostVal = formatCost(pricingMode === 'sub' && supSubRegCost !== null ? supSubRegCost : supervisorRegularCost);
    const supRegContent = pricingMode === 'sub' ? (supRegTok.padStart(5) + ' ' + supRegPctStr.padStart(5) + ' ' + supRegCostVal.padStart(6)) : (supRegTok.padStart(6) + ' ' + supRegCostVal.padStart(6));
    supStats += C.yellow + supRegContent + C.reset + ' ';

    // Cached: tok % $ in SUB mode (cyan)
    const supCacheTok = formatTokens(supervisorCachedTokens);
    const supCachePctStr = pricingMode === 'sub' && supCachePct !== null ? formatPercent(supCachePct) : '';
    const supSubCacheCost = getSubCost(supCachePct);
    const supCacheCostVal = formatCost(pricingMode === 'sub' && supSubCacheCost !== null ? supSubCacheCost : supervisorCachedCost);
    const supCacheContent = pricingMode === 'sub' ? (supCacheTok.padStart(5) + ' ' + supCachePctStr.padStart(5) + ' ' + supCacheCostVal.padStart(6)) : (supCacheTok.padStart(6) + ' ' + supCacheCostVal.padStart(6));
    supStats += C.cyan + supCacheContent + C.reset + ' ';

    // Total: tok % $ in SUB mode (magenta)
    const supTotTok = formatTokens(supervisorTokens);
    const supTotPctStr = pricingMode === 'sub' && supervisorUsageDelta > 0 ? formatPercent(supervisorUsageDelta) : '';
    const supDisplayCost = pricingMode === 'sub' && supervisorSubCost !== null ? supervisorSubCost : supervisorApiCost;
    const supTotContent = pricingMode === 'sub' ? (supTotTok.padStart(5) + ' ' + supTotPctStr.padStart(5) + ' ' + formatCost(supDisplayCost).padStart(6)) : (supTotTok.padStart(6) + ' ' + formatCost(supDisplayCost).padStart(6));
    supStats += C.magenta + supTotContent + C.reset;

    const supPadding = ''.padEnd(Math.max(0, W - 4 - 12 - 52 - 2)); // 12 = "  SUPERVISOR", 2 = right padding
    lines.push(line(supLeft + supPadding + supStats, W));
  }

  // Subtle divider before TOTAL
  lines.push(line('  ' + C.dim + '─'.repeat(W - 6) + C.reset, W));

  // GRAND TOTAL line (workers + supervisor)
  const grandLeft = '  ' + C.bold + C.white + 'TOTAL' + C.reset;
  let grandStats = ''.padStart(10) + ' '; // empty time column

  // If supervisor data exists, show combined totals; otherwise same as workers
  if (hasSupervisorData) {
    // Calculate proportional percentages for regular and cached (grand total)
    const grandRegPct = (grandUsageDelta && grandApiCost > 0) ? grandUsageDelta * (grandRegularCost / grandApiCost) : null;
    const grandCachePct = (grandUsageDelta && grandApiCost > 0) ? grandUsageDelta * (grandCachedCost / grandApiCost) : null;

    // Regular: tok % $ in SUB mode (yellow)
    const grandRegTok = formatTokens(grandRegularTokens);
    const grandRegPctStr = pricingMode === 'sub' && grandRegPct !== null ? formatPercent(grandRegPct) : '';
    const grandSubRegCost = getSubCost(grandRegPct);
    const grandRegCostVal = formatCost(pricingMode === 'sub' && grandSubRegCost !== null ? grandSubRegCost : grandRegularCost);
    const grandRegContent = pricingMode === 'sub' ? (grandRegTok.padStart(5) + ' ' + grandRegPctStr.padStart(5) + ' ' + grandRegCostVal.padStart(6)) : (grandRegTok.padStart(6) + ' ' + grandRegCostVal.padStart(6));
    grandStats += C.yellow + grandRegContent + C.reset + ' ';

    // Cached: tok % $ in SUB mode (cyan)
    const grandCacheTok = formatTokens(grandCachedTokens);
    const grandCachePctStr = pricingMode === 'sub' && grandCachePct !== null ? formatPercent(grandCachePct) : '';
    const grandSubCacheCost = getSubCost(grandCachePct);
    const grandCacheCostVal = formatCost(pricingMode === 'sub' && grandSubCacheCost !== null ? grandSubCacheCost : grandCachedCost);
    const grandCacheContent = pricingMode === 'sub' ? (grandCacheTok.padStart(5) + ' ' + grandCachePctStr.padStart(5) + ' ' + grandCacheCostVal.padStart(6)) : (grandCacheTok.padStart(6) + ' ' + grandCacheCostVal.padStart(6));
    grandStats += C.cyan + grandCacheContent + C.reset + ' ';

    // Total: tok % $ in SUB mode (green)
    const grandTotTok = formatTokens(grandTokens);
    const grandTotPctStr = pricingMode === 'sub' && grandUsageDelta > 0 ? formatPercent(grandUsageDelta) : '';
    const grandTotContent = pricingMode === 'sub' ? (grandTotTok.padStart(5) + ' ' + grandTotPctStr.padStart(5) + ' ' + formatCost(grandDisplayCost).padStart(6)) : (grandTotTok.padStart(6) + ' ' + formatCost(grandDisplayCost).padStart(6));
    grandStats += C.green + grandTotContent + C.reset;
  } else {
    // No supervisor data - grand total = workers total (use workers content variables)
    grandStats += C.yellow + workersRegContent + C.reset + ' ';
    grandStats += C.cyan + workersCacheContent + C.reset + ' ';
    grandStats += C.green + workersTotContent + C.reset;
  }

  const grandPadding = ''.padEnd(Math.max(0, W - 4 - 7 - 52 - 2)); // 7 = "  TOTAL", 2 = right padding
  lines.push(line(grandLeft + grandPadding + grandStats, W));
  lines.push(line('', W));

  // USAGE section with centered label
  const usageLabel = ' USAGE ';
  const usageLeftPad = Math.floor((W - 2 - usageLabel.length) / 2);
  const usageRightPad = W - 2 - usageLabel.length - usageLeftPad;
  lines.push(C.cyan + '╠' + '═'.repeat(usageLeftPad) + C.bold + C.white + usageLabel + C.reset + C.cyan + '═'.repeat(usageRightPad) + '╣' + C.reset);
  lines.push(line('', W));

  // PRICING line - cost reference info (white label, gray values)
  const costPerPercent = '$' + DOLLARS_PER_PERCENT.toFixed(2) + ' per %';
  lines.push(line('  ' + C.white + 'PRICING' + C.reset + '       ' + C.dim + costPerPercent + '    Opus $5/$25 /MTok    Cache 10%' + C.reset, W));

  // SUBSCRIPTION line - current usage levels (white label, gray values) + calibration
  const calibrationStr = (tokensPerPercent / 1000000).toFixed(1) + 'M tok/%  $' + DOLLARS_PER_PERCENT.toFixed(2) + '/%';
  if (subscriptionUsage) {
    const fiveHr = subscriptionUsage.fiveHour !== null ? subscriptionUsage.fiveHour + '%' : '--';
    const sevenDay = subscriptionUsage.sevenDay !== null ? subscriptionUsage.sevenDay + '%' : '--';
    lines.push(line('  ' + C.white + 'SUBSCRIPTION' + C.reset + '  ' + C.dim + '5-hour: ' + fiveHr + '     7-day: ' + sevenDay + '     ' + calibrationStr + C.reset, W));
  } else {
    lines.push(line('  ' + C.white + 'SUBSCRIPTION' + C.reset + '  ' + C.dim + '(not available)     ' + calibrationStr + C.reset, W));
  }

  // Output style countdown (subtle)
  if (outputStyleCountdown !== null && outputStyleCountdown > 0) {
    const countdownStr = formatCountdown(outputStyleCountdown);
    const styleLabel = manifest.outputStyle || 'unknown';
    lines.push(line('  ' + C.dim + 'OUTPUT STYLE    "' + styleLabel + '" in ' + countdownStr + C.reset, W));
  }

  lines.push(line('', W));

  // Footer with hotkey hints
  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);
  const modeLabel = pricingMode === 'api' ? 'API' : 'SUB';
  const modeColor = pricingMode === 'api' ? C.green : C.magenta;
  lines.push(line('  ' + C.yellow + '[↑↓]' + C.reset + ' Nav  ' + C.yellow + '[Tab]' + C.reset + ' Expand  ' + C.yellow + '[Space]' + C.reset + ' ' + modeColor + modeLabel + C.reset + '  ' + C.yellow + '[r]' + C.reset + ' Analyze  ' + C.yellow + '[Enter]' + C.reset + ' ' + C.red + '💗' + C.reset + '  ' + C.yellow + '[Q]' + C.reset + ' Quit', W));
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
// Analyze ALL orchestrator sessions from sessions.orchestrator array
function analyzeAndStoreOrchestratorMetrics() {
  const manifest = readManifest();
  if (!manifest) return;

  // Initialize structures
  ensureSessionsStructure(manifest);
  if (!manifest.orchestrator) {
    manifest.orchestrator = { runs: [], totalTokens: 0, totalCost: 0, totalUsageDelta: 0 };
  }

  // Migrate legacy orchestratorSessionId to sessions.orchestrator if needed
  if (manifest.orchestratorSessionId && !manifest.sessions.orchestrator.includes(manifest.orchestratorSessionId)) {
    manifest.sessions.orchestrator.push(manifest.orchestratorSessionId);
    console.log('[ORCHESTRATOR] Migrated legacy orchestratorSessionId to sessions.orchestrator');
  }

  // Process all orchestrator sessions
  let newRunsAdded = 0;
  for (const sessionId of manifest.sessions.orchestrator) {
    // Skip if already analyzed
    const existingRun = manifest.orchestrator.runs.find(r => r.sessionId === sessionId);
    if (existingRun) continue;

    // Skip if this session belongs to a phase or epic (avoid double-counting)
    if (isPhaseOrEpicSession(manifest, sessionId)) {
      console.log('[ORCHESTRATOR] Skipping session ' + sessionId + ' (belongs to phase/epic)');
      continue;
    }

    // Find transcript
    const transcriptPath = findTranscriptPath(sessionId);
    if (!transcriptPath) {
      console.log('[ORCHESTRATOR] Transcript not found for session: ' + sessionId);
      continue;
    }

    console.log('[ORCHESTRATOR] Analyzing session: ' + sessionId);
    const metrics = analyzeTranscript(transcriptPath);
    if (!metrics) {
      console.log('[ORCHESTRATOR] No metrics extracted from: ' + sessionId);
      continue;
    }

    // Add new run
    const run = {
      sessionId: sessionId,
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
    newRunsAdded++;
    console.log('[ORCHESTRATOR] Stored: tokens=' + run.tokens + ', cost=$' + run.cost.toFixed(2));
  }

  if (newRunsAdded > 0) {
    // Update totals
    manifest.orchestrator.totalTokens = manifest.orchestrator.runs.reduce((sum, r) => sum + (r.tokens || 0), 0);
    manifest.orchestrator.totalRegularTokens = manifest.orchestrator.runs.reduce((sum, r) => sum + (r.regularTokens || 0), 0);
    manifest.orchestrator.totalCost = manifest.orchestrator.runs.reduce((sum, r) => sum + (r.cost || 0), 0);

    // Estimate usageDelta from regularTokens using calibration (cached tokens don't count toward subscription)
    const tpp = manifest.tokensPerPercent || tokensPerPercent;
    const estimatedPercent = tpp ? manifest.orchestrator.totalRegularTokens / tpp : 0;
    manifest.orchestrator.totalUsageDelta = Math.round(estimatedPercent * 100) / 100;

    writeManifest(manifest);
    console.log('[ORCHESTRATOR] Added ' + newRunsAdded + ' new run(s), total cost: $' + manifest.orchestrator.totalCost.toFixed(2));
  }
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
          manifest.phases[phase].usageBefore = usage.sevenDay;
          console.log(`[METRICS] Phase ${phase} usageBefore: ${usage.sevenDay}%`);
        }
        writeManifest(manifest);
      }
      // Phase completed - calculate all metrics
      if (currentStatus === 'complete' && previousStatus === 'running') {
        // IMMEDIATELY update tracking to prevent race condition (multiple tick() calls)
        lastPhaseStatuses[phase] = currentStatus;

        console.log(`\n[METRICS] Phase ${phase} completed - analyzing...`);

        // Fetch usageAfter
        const usage = await fetchSubscriptionUsage();
        if (usage) {
          manifest.phases[phase].usageAfter = usage.sevenDay;
          const before = manifest.phases[phase].usageBefore || 0;
          manifest.phases[phase].usageDelta = Math.round((usage.sevenDay - before) * 100) / 100;
          console.log(`[METRICS] Phase ${phase} usageAfter: ${usage.sevenDay}%, delta: ${manifest.phases[phase].usageDelta}%`);
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

        // Spawn analysis worker to profile execution patterns
        spawnAnalysisWorker(data.sessionId, 'phase', phase);

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
          epic.usageBefore = usage.sevenDay;
          console.log(`[METRICS] Epic ${epic.id} usageBefore: ${usage.sevenDay}%`);
        }
        writeManifest(manifest);
      }

      // Epic completed - calculate all metrics
      if (currentStatus === 'complete' && previousStatus === 'running') {
        // IMMEDIATELY update tracking to prevent race condition (multiple tick() calls)
        lastEpicStatuses[epic.id] = currentStatus;

        console.log(`\n[METRICS] Epic ${epic.id} completed - analyzing...`);

        // Fetch usageAfter
        const usage = await fetchSubscriptionUsage();
        if (usage) {
          epic.usageAfter = usage.sevenDay;
          const before = epic.usageBefore || 0;
          epic.usageDelta = Math.round((usage.sevenDay - before) * 100) / 100;
          console.log(`[METRICS] Epic ${epic.id} usageAfter: ${usage.sevenDay}%, delta: ${epic.usageDelta}%`);
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

        // Spawn analysis worker to profile execution patterns
        spawnAnalysisWorker(epic.sessionId, 'epic', epic.id.toString());

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
    // Quit
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      saveActiveMs();
      console.log('\nDashboard closed. Timer saved.');
      process.exit(0);
    }

    // Navigation: Arrow Up
    if (key.name === 'up') {
      if (cursorIndex > 0) {
        cursorIndex--;
        render();
      }
      return;
    }

    // Navigation: Arrow Down
    if (key.name === 'down') {
      if (cursorIndex < navItems.length - 1) {
        cursorIndex++;
        render();
      }
      return;
    }

    // Toggle expand/collapse: Tab
    if (key.name === 'tab') {
      toggleExpansion();
      render();
      return;
    }

    // Toggle pricing mode: Space
    if (str === ' ') {
      pricingMode = pricingMode === 'api' ? 'sub' : 'api';
      render();
      return;
    }

    // Manual heartbeat: Enter
    if (key.name === 'return') {
      sendHeartbeat();
      return;
    }

    // Legacy: Still allow 1-5 for quick phase toggle
    if (['1', '2', '3', '4', '5'].includes(str)) {
      if (expandedPhases.has(str)) {
        expandedPhases.delete(str);
      } else {
        expandedPhases.add(str);
      }
      render();
      return;
    }

    // Legacy: Still allow a-i for quick epic toggle
    if (str >= 'a' && str <= 'i') {
      const epicNum = str.charCodeAt(0) - 96;
      if (expandedEpics.has(epicNum)) {
        expandedEpics.delete(epicNum);
      } else {
        expandedEpics.add(epicNum);
      }
      render();
      return;
    }

    // Run analysis on selected phase/epic: 'r'
    if (str === 'r') {
      runSelectedAnalysis();
      return;
    }

  });

  process.stdin.resume();
}

// ============ MAIN ============

// ============ SESSION-INFO WATCHER ============
// Watches session-info.txt and automatically captures sessionId for running phases/epics
// Tracks ALL sessions in manifest.sessions for later analysis

let sessionInfoWatcher = null;
let lastSessionInfoMtime = 0;

// Initialize sessions structure if needed
function ensureSessionsStructure(manifest) {
  if (!manifest.sessions) {
    manifest.sessions = {
      orchestrator: [],  // Array of all orchestrator sessionIds (each /clear adds new)
      workers: {}        // Map: "phase-1" -> sessionId, "epic-3" -> sessionId
    };
  }
  if (!manifest.sessions.orchestrator) manifest.sessions.orchestrator = [];
  if (!manifest.sessions.workers) manifest.sessions.workers = {};
  return manifest;
}

// Check if sessionId is already tracked anywhere
function isSessionTracked(manifest, sessionId) {
  ensureSessionsStructure(manifest);

  // Check orchestrator sessions
  if (manifest.sessions.orchestrator.includes(sessionId)) return true;

  // Check worker sessions
  for (const key of Object.keys(manifest.sessions.workers)) {
    if (manifest.sessions.workers[key] === sessionId) return true;
  }

  return false;
}

// Check if sessionId is used by any phase or epic (to avoid double-counting)
function isPhaseOrEpicSession(manifest, sessionId) {
  // Check phases
  if (manifest.phases) {
    for (const data of Object.values(manifest.phases)) {
      if (data.sessionId === sessionId) return true;
    }
  }
  // Check epics
  if (manifest.epics) {
    for (const epic of manifest.epics) {
      if (epic.sessionId === sessionId) return true;
    }
  }
  return false;
}

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

  // Initialize sessions structure
  ensureSessionsStructure(manifest);

  let updated = false;
  let isWorkerSession = false;

  // Ensure phases object exists
  if (!manifest.phases) {
    manifest.phases = {};
  }

  // Check if there's a running phase without sessionId (this would be a worker)
  for (const [phase, data] of Object.entries(manifest.phases)) {
    if (data.status === 'running' && !data.sessionId) {
      // Check if this session was previously captured as orchestrator
      // (happens when Phase 1 runs in orchestrator - same session)
      const wasOrchestrator = manifest.sessions.orchestrator.includes(sessionId);
      if (wasOrchestrator) {
        // MOVE from orchestrator to phase (it was miscategorized)
        manifest.sessions.orchestrator = manifest.sessions.orchestrator.filter(s => s !== sessionId);
        console.log('[SESSION] Reassigning orchestrator session to Phase ' + phase + ' (same session)');
      }

      manifest.phases[phase].sessionId = sessionId;
      manifest.sessions.workers[`phase-${phase}`] = sessionId;
      console.log('[SESSION] Captured WORKER sessionId for Phase ' + phase + ': ' + sessionId);
      updated = true;
      isWorkerSession = true;
      break;
    }
  }

  // Skip remaining logic if already tracked (and not reassigned above)
  if (!isWorkerSession && isSessionTracked(manifest, sessionId)) {
    return;
  }

  // Check if there's a running epic without sessionId (Phase 4 worker)
  if (!isWorkerSession && manifest.epics && manifest.currentPhase === '4') {
    for (const epic of manifest.epics) {
      if (epic.status === 'running' && !epic.sessionId) {
        // This is a worker session for this epic
        epic.sessionId = sessionId;
        manifest.sessions.workers[`epic-${epic.id}`] = sessionId;
        console.log('[SESSION] Captured WORKER sessionId for Epic ' + epic.id + ': ' + sessionId);
        updated = true;
        isWorkerSession = true;
        break;
      }
    }
  }

  // FALLBACK: Check currentPhase if no running phase found
  if (!isWorkerSession && manifest.currentPhase) {
    const currentPhase = String(manifest.currentPhase);

    // Ensure phase entry exists
    if (!manifest.phases[currentPhase]) {
      manifest.phases[currentPhase] = { ...DEFAULT_PHASE_ENTRY };
    }

    // If phase has no sessionId yet, this could be a worker
    if (!manifest.phases[currentPhase].sessionId && manifest.workerPid) {
      manifest.phases[currentPhase].sessionId = sessionId;
      manifest.phases[currentPhase].status = 'running';
      manifest.sessions.workers[`phase-${currentPhase}`] = sessionId;
      console.log('[SESSION] Captured WORKER sessionId for currentPhase ' + currentPhase + ': ' + sessionId);
      updated = true;
      isWorkerSession = true;
    }
  }

  // If not a worker session, it's an orchestrator session
  if (!isWorkerSession) {
    manifest.sessions.orchestrator.push(sessionId);
    // Also update legacy field (keep most recent for backward compat)
    manifest.orchestratorSessionId = sessionId;
    console.log('[SESSION] Captured ORCHESTRATOR sessionId: ' + sessionId + ' (total: ' + manifest.sessions.orchestrator.length + ')');
    updated = true;
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
        // Warn about phases that can't be analyzed due to missing sessionId
        if (data.status === 'complete' && !data.sessionId && (!data.tokens || data.tokens === 0)) {
          console.log(`[METRICS] WARNING: Phase ${phase} is complete but has no sessionId - cannot analyze`);
          continue;
        }
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
        // Warn about epics that can't be analyzed due to missing sessionId
        if (epic.status === 'complete' && !epic.sessionId && (!epic.tokens || epic.tokens === 0)) {
          console.log(`[METRICS] WARNING: Epic ${epic.id} is complete but has no sessionId - cannot analyze`);
          continue;
        }
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

    // Analyze orchestrator sessions at startup (for SUPERVISOR cost line)
    console.log('[STARTUP] Analyzing orchestrator sessions...');
    analyzeAndStoreOrchestratorMetrics();

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
