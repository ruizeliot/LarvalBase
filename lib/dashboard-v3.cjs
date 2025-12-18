#!/usr/bin/env node
/**
 * Pipeline Dashboard v3 - Interactive (Pipeline v9.0)
 *
 * Features:
 * - Arrow keys to navigate, Tab to expand/collapse
 * - P to pause/resume heartbeat, +/- to adjust interval
 * - A to toggle auto-analysis (on phase/epic complete), r for manual analysis
 * - Q to quit, Space to toggle pricing mode
 * - Shows per-todo cost and duration for completed phases
 * - Simple timer: increments while alive, persists to manifest
 * - Heartbeat: pings orchestrator periodically
 *
 * v3.0 Additions:
 * - Quality Audit Panel (3 layers: Automated, Smoke Test, Nielsen)
 * - Gate Status Display (Gate 1, Gate 2)
 * - Onboarding Level Indicator
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

// Analyzer Worker Tracking - Map of "phase-X" or "epic-Y" to { conhostPid, workerPid }
let runningAnalyzers = new Map();

// Check if a process is actually running (synchronous)
function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    const result = require('child_process').execSync(
      `tasklist /FI "PID eq ${pid}" /NH`,
      { encoding: 'utf8', windowsHide: true, timeout: 3000 }
    );
    // If process exists, tasklist returns a line with the PID
    // If not, it returns "INFO: No tasks are running..."
    return result.includes(String(pid));
  } catch (err) {
    return false;
  }
}

// Navigation State
let cursorIndex = 0;
let navItems = []; // Flat list of navigable items built on each render

// Timer State
let activeMs = 0;
let lastSaveTime = Date.now();

// Render change detection (only re-render when content changes)
let lastRenderHash = '';

// Heartbeat State
let heartbeatCount = 0;
let nextHeartbeatTime = null;

// State tracking for event messages
let lastPhaseStatuses = {};
let lastEpicStatuses = {};
let lastAnalysisStatuses = {}; // Track analysis completion: "phase-3" or "epic-1" -> status
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
      const content = fs.readFileSync(MANIFEST_PATH, 'utf8');

      // Check for empty/corrupt file - attempt recovery from backup
      if (!content || content.trim().length === 0) {
        console.log('[MANIFEST] Empty file detected, attempting recovery from backup...');
        return recoverFromBackup();
      }

      const manifest = JSON.parse(content);

      // Self-healing: ensure all phase entries exist
      if (ensurePhaseEntries(manifest)) {
        writeManifest(manifest);
      }

      return manifest;
    }
  } catch (err) {
    // JSON parse failed - file is corrupt
    console.log('[MANIFEST] Corrupt file detected: ' + err.message);
    return recoverFromBackup();
  }
  return null;
}

// Attempt to recover manifest from backup file
function recoverFromBackup() {
  const backupPath = MANIFEST_PATH + '.backup';
  try {
    if (fs.existsSync(backupPath)) {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      if (backupContent && backupContent.trim().length > 0) {
        const manifest = JSON.parse(backupContent);
        console.log('[MANIFEST] Successfully recovered from backup!');

        // Restore the main file from backup (using atomic write)
        const tempPath = MANIFEST_PATH + '.tmp';
        fs.writeFileSync(tempPath, backupContent);
        fs.renameSync(tempPath, MANIFEST_PATH);

        return manifest;
      }
    }
  } catch (backupErr) {
    console.log('[MANIFEST] Backup recovery failed: ' + backupErr.message);
  }
  console.log('[MANIFEST] No valid backup found');
  return null;
}

function writeManifest(manifest) {
  try {
    // Create backup of current manifest before writing (if it exists and is valid)
    if (fs.existsSync(MANIFEST_PATH)) {
      try {
        const currentContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
        if (currentContent.trim().length > 0) {
          JSON.parse(currentContent); // Validate it's valid JSON
          fs.writeFileSync(MANIFEST_PATH + '.backup', currentContent);
        }
      } catch (backupErr) {
        // Current file is corrupt/empty, don't backup
      }
    }

    // Atomic write: write to temp file, then rename
    const tempPath = MANIFEST_PATH + '.tmp';
    const content = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, MANIFEST_PATH);
    return true;
  } catch (err) {
    console.log('[MANIFEST] Write error: ' + err.message);
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

    // Calculate per-todo breakdown using window-based approach
    // Each window is the time between consecutive TodoWrite calls
    // All todos marked "completed" in a window split that window's cost evenly
    const todoBreakdown = [];
    const processedTodos = {};  // Track which todos have already been added

    for (let i = 0; i < todoChanges.length; i++) {
      const change = todoChanges[i];
      const changeTime = new Date(change.timestamp);

      // Find all todos marked "completed" that haven't been processed yet
      const completedTodos = change.todos.filter(t =>
        t.status === 'completed' && !processedTodos[t.content]
      );

      if (completedTodos.length > 0) {
        // Window start is previous TodoWrite timestamp (or session start if first)
        const windowStart = i === 0 ? startTime : new Date(todoChanges[i - 1].timestamp);
        const windowEnd = changeTime;
        const windowDurationMs = windowEnd - windowStart;

        // Get tokens/cost in this window
        let todoRegTok = 0, todoCacheTok = 0, todoRegCost = 0, todoCacheCost = 0;
        for (const entry of usageEntries) {
          const entryTime = new Date(entry.timestamp);
          if (entryTime >= windowStart && entryTime <= windowEnd) {
            const p = PRICING[entry.model] || PRICING['default'];
            todoRegTok += entry.inputTokens + entry.outputTokens;
            todoCacheTok += entry.cacheReadTokens + entry.cacheWrite5mTokens + entry.cacheWrite1hTokens;
            todoRegCost += (entry.inputTokens / 1000000) * p.input + (entry.outputTokens / 1000000) * p.output;
            todoCacheCost += (entry.cacheWrite5mTokens / 1000000) * p.cacheWrite5m +
                            (entry.cacheWrite1hTokens / 1000000) * p.cacheWrite1h +
                            (entry.cacheReadTokens / 1000000) * p.cacheRead;
          }
        }

        // Split cost evenly among all completed todos in this window
        const splitCount = completedTodos.length;
        const perTodoDurationMs = Math.floor(windowDurationMs / splitCount);
        const perTodoTokens = Math.floor((todoRegTok + todoCacheTok) / splitCount);
        const perTodoRegTok = Math.floor(todoRegTok / splitCount);
        const perTodoCacheTok = Math.floor(todoCacheTok / splitCount);
        const perTodoCost = Math.round((todoRegCost + todoCacheCost) / splitCount * 10000) / 10000;
        const perTodoRegCost = Math.round(todoRegCost / splitCount * 10000) / 10000;
        const perTodoCacheCost = Math.round(todoCacheCost / splitCount * 10000) / 10000;

        for (const todo of completedTodos) {
          todoBreakdown.push({
            content: todo.content,
            durationMs: perTodoDurationMs,
            tokens: perTodoTokens,
            regularTokens: perTodoRegTok,
            cachedTokens: perTodoCacheTok,
            cost: perTodoCost,
            regularCost: perTodoRegCost,
            cachedCost: perTodoCacheCost
          });
          // Mark as processed
          processedTodos[todo.content] = true;
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

  const analyzerKey = `${type}-${number}`;

  // Check if analyzer already running for this phase/epic
  if (runningAnalyzers.has(analyzerKey)) {
    const existing = runningAnalyzers.get(analyzerKey);
    // Verify process is actually still running
    if (existing.conhostPid && isProcessRunning(existing.conhostPid)) {
      console.log(`[ANALYSIS-WORKER] Analyzer already running for ${analyzerKey}, skipping`);
      return;
    } else {
      // Process is dead but entry is stale - clean it up
      console.log(`[ANALYSIS-WORKER] Stale analyzer entry for ${analyzerKey} (process dead) - removing`);
      runningAnalyzers.delete(analyzerKey);
    }
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
    const output = data.toString().trim();
    console.log(`[ANALYSIS-WORKER] ${output}`);

    // Parse ANALYSIS_WORKER_INFO to capture PIDs
    if (output.includes('ANALYSIS_WORKER_INFO:')) {
      try {
        const jsonStr = output.split('ANALYSIS_WORKER_INFO:')[1];
        const info = JSON.parse(jsonStr);
        runningAnalyzers.set(analyzerKey, {
          conhostPid: info.conhostPid,
          workerPid: info.workerPid,
          sessionId: sessionId,
          startedAt: Date.now()
        });
        console.log(`[ANALYSIS-WORKER] Tracking ${analyzerKey} with conhostPid=${info.conhostPid}`);
      } catch (e) {
        console.log(`[ANALYSIS-WORKER] Failed to parse worker info: ${e.message}`);
      }
    }
  });
  proc.stderr.on('data', (data) => {
    console.log(`[ANALYSIS-WORKER] ERROR: ${data.toString().trim()}`);
  });
  proc.on('close', (code) => {
    console.log(`[ANALYSIS-WORKER] Spawn script completed with code ${code}`);
  });
}

// Kill an analyzer worker by its key (e.g., "phase-3" or "epic-1")
function killAnalyzer(analyzerKey) {
  const analyzer = runningAnalyzers.get(analyzerKey);
  if (!analyzer) {
    console.log(`[ANALYSIS-WORKER] No running analyzer found for ${analyzerKey}`);
    return false;
  }

  console.log(`[ANALYSIS-WORKER] Killing analyzer ${analyzerKey} (conhostPid=${analyzer.conhostPid})`);

  try {
    // Use taskkill with /T to kill the process tree (conhost + cmd + claude)
    const proc = spawn('taskkill', ['/F', '/T', '/PID', String(analyzer.conhostPid)], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    proc.unref();

    runningAnalyzers.delete(analyzerKey);
    console.log(`[ANALYSIS-WORKER] Analyzer ${analyzerKey} killed and removed from tracking`);
    return true;
  } catch (err) {
    console.log(`[ANALYSIS-WORKER] Failed to kill analyzer ${analyzerKey}: ${err.message}`);
    return false;
  }
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

  renderAndTrack();
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
  if (usd === undefined || usd === null) return '$-.---';
  return '$' + parseFloat(usd).toFixed(3);
}

function formatTokens(tokens) {
  if (tokens === undefined || tokens === null) return "-.--M";
  const millions = tokens / 1000000;
  if (millions >= 1) return millions.toFixed(1) + "M";
  const thousands = tokens / 1000;
  return thousands.toFixed(0) + "K";
}

function formatPercent(pct) {
  if (pct === undefined || pct === null) return "--.--%";
  if (pct < 0.001) return "<.001%";
  if (pct < 1) return pct.toFixed(3) + "%";
  return pct.toFixed(2) + "%";
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

// ASCII Art Logo (simple centered line)
const LOGO = [
  '━━ PIPELINE ━━'
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
const DIM_SEP = C.dim + '│';  // Dim separator for within-column splits (no reset, expects color after)

// Center a string in a given width
function centerStr(s, w) {
  const len = s.length;
  if (len >= w) return s.slice(0, w);
  const left = Math.floor((w - len) / 2);
  const right = w - len - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

// Format data column with dim separators between tok/pct/cost (all values centered)
// SUB mode: tok│%│$ (5│5│6 = 18 chars), API mode: tok│$ (8│9 = 18 chars)
// Returns string with embedded color codes
function formatDataCol(tok, pct, cost, color, isSubMode, colWidth = 18, suffix = '') {
  let content;
  if (isSubMode) {
    // SUB: 5│5│6 = 18 chars (centered values)
    content = centerStr(tok, 5) + DIM_SEP + color + centerStr(pct, 5) + DIM_SEP + color + centerStr(cost, 6);
  } else {
    // API: 8│9 = 18 chars (centered values, uses full width)
    content = centerStr(tok, 8) + DIM_SEP + color + centerStr(cost, 9);
  }
  // Add suffix if provided (e.g., "(3)" for todo count)
  return color + content + suffix + C.reset;
}

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

// Double-line section separator for major sections (PHASES/EPICS/WORKERS/TOTAL)
function sectionSeparator(W, nameColWidth) {
  const cross = '╪';
  const line = '═';
  const namePart = line.repeat(nameColWidth);
  const timePart = line.repeat(COL.TIME);
  const regPart = line.repeat(COL.REG);
  const cachePart = line.repeat(COL.CACHE);
  const totalPart = line.repeat(COL.TOTAL);
  const inner = namePart + cross + timePart + cross + regPart + cross + cachePart + cross + totalPart;
  const needed = W - 2;
  const content = inner.length >= needed ? inner.slice(0, needed) : inner + line.repeat(needed - inner.length);
  return C.cyan + '╠' + C.dim + content + C.cyan + '╣' + C.reset;
}

function clearScreen() {
  // \x1B[H = cursor home, \x1B[J = clear from cursor to end
  process.stdout.write('\x1B[H\x1B[J');
}

function enterAlternateScreen() {
  // \x1B[?1049h = enter alternate screen buffer
  // \x1B[?25l = hide cursor for cleaner TUI
  process.stdout.write('\x1B[?1049h\x1B[?25l');
}

function exitAlternateScreen() {
  // \x1B[?25h = show cursor
  // \x1B[?1049l = exit alternate screen buffer (restores main buffer)
  process.stdout.write('\x1B[?25h\x1B[?1049l');
}


function closeOwnWindow() {
  // Close the dashboard window by killing the parent cmd.exe process tree
  // Process chain: conhost.exe → cmd.exe → node.exe (us)
  // When we just process.exit(0), cmd.exe /k keeps the window open
  // This function kills cmd.exe which closes the conhost window

  exitAlternateScreen();
  saveActiveMs();

  // Get parent PID (cmd.exe) NOW while we're still running
  const cmdPid = process.ppid;

  if (cmdPid) {
    // Use taskkill with /T to kill the process tree (cmd.exe + conhost.exe)
    // Spawn detached so it continues after we exit
    const proc = spawn('taskkill', ['/F', '/T', '/PID', String(cmdPid)], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    proc.unref();
  }

  // Exit immediately - taskkill will close the window
  process.exit(0);
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

  // Header with ASCII art logo (centered)
  lines.push(C.cyan + '╔' + '═'.repeat(W-2) + '╗' + C.reset);

  // Render ASCII logo (cyan color, centered) with version on last line only
  for (let i = 0; i < LOGO.length; i++) {
    const logoLine = LOGO[i];
    const version = (i === LOGO.length - 1) ? '  ' + C.dim + 'v9.0' + C.reset : '';
    const logoWidth = logoLine.length;
    const versionWidth = (i === LOGO.length - 1) ? 8 : 0; // "  v9.0" visible width
    const totalWidth = logoWidth + versionWidth;
    const padding = Math.max(0, Math.floor((W - 2 - totalWidth) / 2));
    lines.push(line(''.padStart(padding) + C.cyan + logoLine + C.reset + version, W));
  }
  lines.push(line('', W));

  // Project info, timer, and heartbeat on same line
  const timerStr = formatTime(activeMs);
  const onboardingLevel = manifest.onboarding || 'minimal';
  const onboardingColor = onboardingLevel === 'full' ? C.green : (onboardingLevel === 'none' ? C.dim : C.yellow);
  let headerLine = '  ' + C.bold + 'Project:' + C.reset + ' ' + projectName.slice(0, 20) + '  ' + C.dim + '│' + C.reset + '  ' + C.bold + 'Mode:' + C.reset + ' ' + mode + '  ' + C.dim + '│' + C.reset + '  ' + C.bold + '📚' + C.reset + ' ' + onboardingColor + onboardingLevel + C.reset + '  ' + C.dim + '│' + C.reset + '  ' + C.bold + '⏱' + C.reset + ' ' + timerStr;

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
  // Excel-like column layout: Name fills space │ time(10) │ regular(18) │ cached(18) │ total(18)
  const nameColWidth = W - 2 - DATA_COLS_WIDTH - 4; // -2 for borders, -4 for 4 separators

  // Pricing mode header - big centered label spanning data columns
  const pricingModeLabel = pricingMode === 'sub' ? '══ SUB MODE ══' : '══ API MODE ══';
  const dataColsWidth = COL.REG + 1 + COL.CACHE + 1 + COL.TOTAL; // 56 chars (3 cols + 2 seps)
  const pricingModeLeftPad = Math.floor((dataColsWidth - pricingModeLabel.length) / 2);
  const pricingModeRightPad = dataColsWidth - pricingModeLabel.length - pricingModeLeftPad;
  const pricingModeHeader = ''.padEnd(pricingModeLeftPad) + C.bold + C.white + pricingModeLabel + C.reset + ''.padEnd(pricingModeRightPad);
  lines.push(line(''.padEnd(nameColWidth) + COL_SEP + ''.padEnd(COL.TIME) + COL_SEP + pricingModeHeader, W));

  const headerLeft = '  ' + C.bold + C.white + 'PHASES' + C.reset + '  ' + navHint;
  const headerLeftVisible = 2 + 6 + 2 + 6; // '  ' + 'PHASES' + '  ' + '↑↓ Tab'
  // Center header text in each column
  const centerIn = (s, w) => { const pad = Math.floor((w - s.length) / 2); return ''.padEnd(pad) + s + ''.padEnd(w - pad - s.length); };
  const headerRight = COL_SEP + C.dim + centerIn('time', COL.TIME) + C.reset + COL_SEP + C.yellow + centerIn('regular', COL.REG) + C.reset + COL_SEP + C.cyan + centerIn('cached', COL.CACHE) + C.reset + COL_SEP + C.green + centerIn('total', COL.TOTAL) + C.reset;
  const headerPadding = Math.max(0, nameColWidth - headerLeftVisible);
  lines.push(line(headerLeft + ''.padEnd(headerPadding) + headerRight, W));
  // Sub-header row showing column structure with labels centered in each sub-column
  // SUB: tok(5)│%(5)│$(6) = 18, API: tok(8)│$(9) = 18
  const subHeaderCol = pricingMode === 'sub'
    ? centerStr('tok', 5) + C.dim + '│' + C.reset + centerStr('%', 5) + C.dim + '│' + C.reset + centerStr('$', 6)
    : centerStr('tok', 8) + C.dim + '│' + C.reset + centerStr('$', 9);
  const subHeaderRight = COL_SEP + C.dim + ''.padStart(COL.TIME) + C.reset + COL_SEP + subHeaderCol + COL_SEP + subHeaderCol + COL_SEP + subHeaderCol;
  lines.push(line(''.padEnd(nameColWidth) + subHeaderRight, W));
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

      // Regular column: tok│%│$ (SUB mode) or tok│$ (API mode)
      const regTok = phaseData.regularTokens ? formatTokens(phaseData.regularTokens) : '--';
      const regPctStr = pricingMode === 'sub' && regPct !== null ? formatPercent(regPct) : '';
      const subRegCost = getSubCost(regPct);
      const regCost = phaseData.regularCost !== undefined ? formatCost(pricingMode === 'sub' && subRegCost !== null ? subRegCost : phaseData.regularCost) : '$--';
      stats += COL_SEP + formatDataCol(regTok, regPctStr, regCost, C.yellow, pricingMode === 'sub', COL.REG);

      // Cached column: tok│%│$ (SUB mode) or tok│$ (API mode)
      const cacheTok = phaseData.cachedTokens ? formatTokens(phaseData.cachedTokens) : '--';
      const cachePctStr = pricingMode === 'sub' && cachePct !== null ? formatPercent(cachePct) : '';
      const subCacheCost = getSubCost(cachePct);
      const cacheCost = phaseData.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && subCacheCost !== null ? subCacheCost : phaseData.cachedCost) : '$--';
      stats += COL_SEP + formatDataCol(cacheTok, cachePctStr, cacheCost, C.cyan, pricingMode === 'sub', COL.CACHE);

      // Total column: tok│%│$ (SUB mode) or tok│$ (API mode)
      const totTok = phaseData.tokens ? formatTokens(phaseData.tokens) : '--';
      const totPctStr = pricingMode === 'sub' && usageDelta !== undefined ? formatPercent(usageDelta) : '';
      const phaseDisplayCost = getDisplayCost(phaseData.cost, phaseData.usageDelta);
      const totCost = phaseDisplayCost !== undefined && phaseDisplayCost !== null ? formatCost(phaseDisplayCost) : '$--';
      const todoSuffix = todoCount > 0 ? C.dim + '(' + todoCount + ')' : '';
      stats += COL_SEP + formatDataCol(totTok, totPctStr, totCost, C.green, pricingMode === 'sub', COL.TOTAL, todoSuffix);
    } else if (status === 'running') {
      stats = COL_SEP + C.yellow + 'running'.padStart(COL.TIME) + C.reset + COL_SEP + ''.padEnd(COL.REG) + COL_SEP + ''.padEnd(COL.CACHE) + COL_SEP + ''.padEnd(COL.TOTAL);
    } else {
      stats = COL_SEP + C.dim + '--'.padStart(COL.TIME) + COL_SEP + '  --    --  '.padStart(COL.REG) + COL_SEP + '  --    --  '.padStart(COL.CACHE) + COL_SEP + '  --    --  '.padStart(COL.TOTAL) + C.reset;
    }

    // Name fills available space until column separator
    const cursor = isCursor(phase) ? C.cyan + '>' + C.reset + ' ' : '  ';
    // Warning indicator for complete phases without sessionId (can't analyze)
    const noSessionWarning = (status === 'complete' && !phaseData.sessionId) ? ' ' + C.yellow + '⚠' + C.reset : '';
    const noSessionWidth = visibleLength(noSessionWarning); // auto-calculate width
    // Analysis status indicator: ⏳ = running, 📊 = complete
    const analyzerKey = `phase-${phase}`;
    const isAnalyzing = runningAnalyzers.has(analyzerKey);
    const analysisComplete = phaseData.analysis?.status === 'complete';
    const analysisIndicator = isAnalyzing ? ' ' + C.cyan + '⏳' + C.reset : (analysisComplete ? ' ' + C.magenta + '📊' + C.reset : '');
    const analysisWidth = visibleLength(analysisIndicator); // auto-calculate width
    // Truncate name to fit: prefix is cursor(2) + icon(1) + spaces(2) + phase#(3) + expand(2) + warning + analysis = 10 + indicators
    const maxNameLen = Math.max(5, nameColWidth - 10 - noSessionWidth - analysisWidth);
    const displayName = truncate(name, maxNameLen);
    const leftPart = cursor + icon + '  ' + phase + '. ' + expandIcon + rowColor + displayName + C.reset + analysisIndicator + noSessionWarning;
    // Pad name to fill nameColWidth (calculated from W - data columns - separators)
    const leftVisible = 2 + 1 + 2 + 3 + 2 + displayName.length + analysisWidth + noSessionWidth; // cursor + icon + spaces + phase# + expand + name + analysis + warning
    const leftPadding = Math.max(0, nameColWidth - leftVisible);
    lines.push(line(leftPart + ''.padEnd(leftPadding) + stats, W));

    // Expanded todo breakdown with token/cost breakdown - right-aligned same as parent
    if (isExpanded && (hasTodos || phaseData.analysis?.summary)) {
      const todos = phaseData.todoBreakdown;
      const analysis = phaseData.analysis;

      // Phase-level analysis summary (if available)
      if (analysis && analysis.summary) {
        const sum = analysis.summary;
        const boxWidth = Math.min(W - 4, 70);
        const indent = '    ';

        // Top border
        lines.push(line(indent + C.dim + '╭' + '─'.repeat(boxWidth - 2) + '╮' + C.reset, W));

        // Summary header
        lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' EXECUTION SUMMARY' + C.reset + ''.padEnd(boxWidth - 20) + C.dim + '│' + C.reset, W));

        // Health counts
        const healthLine = ` Tasks: ${C.green}${sum.clean || 0} clean${C.reset}, ${C.yellow}${sum.minorFriction || 0} friction${C.reset}, ${C.red}${sum.struggled || 0} struggled${C.reset}`;
        lines.push(line(indent + C.dim + '│' + C.reset + healthLine + ''.padEnd(Math.max(0, boxWidth - 50)) + C.dim + '│' + C.reset, W));

        // Waste metrics if available
        if (sum.timeWastedMs || sum.costWasted) {
          const wasteTime = sum.timeWastedMs ? formatTime(sum.timeWastedMs) : '--';
          const wasteCost = sum.costWasted ? `$${sum.costWasted.toFixed(2)}` : '--';
          const wasteLine = ` Time wasted: ${wasteTime} (${wasteCost})`;
          lines.push(line(indent + C.dim + '│' + C.reset + wasteLine + ''.padEnd(Math.max(0, boxWidth - wasteLine.length - 1)) + C.dim + '│' + C.reset, W));
        }

        // What went well
        if (analysis.whatWentWell && analysis.whatWentWell.length > 0) {
          lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' What Went Well:' + C.reset + ''.padEnd(boxWidth - 18) + C.dim + '│' + C.reset, W));
          for (const item of analysis.whatWentWell.slice(0, 3)) {
            const itemText = ` ${C.green}✓${C.reset} ${item}`.slice(0, boxWidth - 4);
            lines.push(line(indent + C.dim + '│' + C.reset + itemText + ''.padEnd(Math.max(0, boxWidth - itemText.length + 8)) + C.dim + '│' + C.reset, W));
          }
        }

        // Issues found
        if (analysis.issuesFound && analysis.issuesFound.length > 0) {
          lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' Issues Found:' + C.reset + ''.padEnd(boxWidth - 15) + C.dim + '│' + C.reset, W));
          for (const issue of analysis.issuesFound.slice(0, 3)) {
            const recovered = issue.recovered ? C.green + '✓' : C.red + '✗';
            const issueText = ` ${C.yellow}⚠${C.reset} ${issue.issue} (${issue.count}x) ${recovered}${C.reset}`.slice(0, boxWidth - 4);
            lines.push(line(indent + C.dim + '│' + C.reset + issueText + ''.padEnd(Math.max(0, boxWidth - issueText.length + 16)) + C.dim + '│' + C.reset, W));
          }
        }

        // Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' Recommendations:' + C.reset + ''.padEnd(boxWidth - 18) + C.dim + '│' + C.reset, W));
          for (const rec of analysis.recommendations.slice(0, 2)) {
            const priority = rec.priority === 'high' ? C.red + '!' : rec.priority === 'medium' ? C.yellow + '◦' : C.dim + '·';
            const recText = ` ${priority}${C.reset} ${rec.title}`.slice(0, boxWidth - 4);
            lines.push(line(indent + C.dim + '│' + C.reset + recText + ''.padEnd(Math.max(0, boxWidth - recText.length + 8)) + C.dim + '│' + C.reset, W));
          }
        }

        // Bottom border
        lines.push(line(indent + C.dim + '╰' + '─'.repeat(boxWidth - 2) + '╯' + C.reset, W));
        lines.push(line('', W)); // Spacer
      }

      // Todo breakdown (only if we have todos)
      if (hasTodos) {
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

        // Check if this todo has analysis data (new todoDetails or legacy todoSummaries)
        const todoAnalysis = phaseData.analysis?.todoDetails?.[i] || phaseData.analysis?.todoSummaries?.[i];
        const hasAnalysis = !!todoAnalysis;
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
        todoStats += COL_SEP + formatDataCol(todoRegTok, todoRegPctStr, todoRegCost, C.yellow, pricingMode === 'sub', COL.REG);
        todoStats += COL_SEP + formatDataCol(todoCacheTok, todoCachePctStr, todoCacheCost, C.cyan, pricingMode === 'sub', COL.CACHE);
        todoStats += COL_SEP + formatDataCol(todoTotTok, todoTotPctStr, todoTotCost, C.green, pricingMode === 'sub', COL.TOTAL);

        // Cursor for todo
        const todoCursor = isCursor(todoKey) ? C.cyan + '>' + C.reset + ' ' : '  ';

        // Name fills space: cursor(2) + indent(4) + prefix(2) + expand(2) + name
        const maxTodoLen = Math.max(5, nameColWidth - 11);
        const displayTodoContent = truncate(todo.content, maxTodoLen);
        const todoLeft = todoCursor + '    ' + C.dim + prefix + C.reset + ' ' + todoExpandIcon + displayTodoContent;
        const todoLeftVisible = 2 + 4 + 2 + 1 + 2 + displayTodoContent.length;
        const todoPadding = Math.max(0, nameColWidth - todoLeftVisible);
        lines.push(line(todoLeft + ''.padEnd(todoPadding) + todoStats, W));

        // Show analysis if todo is expanded
        if (isTodoExpanded && todoAnalysis) {
          const boxIndent = '          ';
          const boxWidth = Math.min(W - 12, 60);

          // Health indicator
          const healthIcon = todoAnalysis.health === 'clean' ? C.green + '✓' + C.reset
            : todoAnalysis.health === 'minor-friction' || todoAnalysis.health === 'minor_friction' ? C.yellow + '⚡' + C.reset
            : todoAnalysis.health === 'struggled' ? C.red + '⚠' + C.reset
            : C.dim + '?' + C.reset;

          // Simple case: clean task - just show summary
          if (todoAnalysis.health === 'clean') {
            const summaryText = todoAnalysis.summary || 'Completed smoothly';
            lines.push(line(boxIndent + healthIcon + ' ' + C.dim + summaryText.slice(0, boxWidth - 4) + C.reset, W));
          } else {
            // Struggle case: show rich card
            lines.push(line(boxIndent + C.dim + '╭' + '─'.repeat(boxWidth - 2) + '╮' + C.reset, W));

            // Root cause header
            const rootCause = todoAnalysis.rootCause || 'UNKNOWN';
            const rootCauseColor = rootCause === 'EXTERNAL_ISSUE' ? C.blue : rootCause === 'INSTRUCTION_GAP' ? C.magenta : C.yellow;
            lines.push(line(boxIndent + C.dim + '│' + C.reset + ' ' + healthIcon + ' ROOT CAUSE: ' + rootCauseColor + rootCause + C.reset + ''.padEnd(Math.max(0, boxWidth - rootCause.length - 16)) + C.dim + '│' + C.reset, W));

            // Error message if available
            if (todoAnalysis.errorMessage) {
              const errText = ` Error: ${todoAnalysis.errorMessage}`.slice(0, boxWidth - 4);
              lines.push(line(boxIndent + C.dim + '│' + C.reset + C.red + errText + C.reset + ''.padEnd(Math.max(0, boxWidth - errText.length - 1)) + C.dim + '│' + C.reset, W));
            }

            // Retry sequence if available
            if (todoAnalysis.retrySequence && todoAnalysis.retrySequence.length > 0) {
              lines.push(line(boxIndent + C.dim + '│ Retry Sequence:' + ''.padEnd(boxWidth - 17) + '│' + C.reset, W));
              for (const step of todoAnalysis.retrySequence.slice(0, 4)) {
                const resultIcon = step.result === 'SUCCESS' ? C.green + '✓' : C.red + '✗';
                const behaviorIcon = step.behavior === 'BLIND_RETRY' ? C.red + '❌' :
                  step.behavior === 'ADAPTIVE' ? C.green + '✓' :
                  step.behavior === 'RESEARCHED' ? C.cyan + '?' : '';
                const stepText = ` ${step.attempt}. ${step.action}`.slice(0, boxWidth - 12);
                lines.push(line(boxIndent + C.dim + '│' + C.reset + stepText + ' ' + resultIcon + C.reset + ' ' + behaviorIcon + C.reset + ''.padEnd(Math.max(0, boxWidth - stepText.length - 8)) + C.dim + '│' + C.reset, W));
              }
            }

            // Waste metrics
            if (todoAnalysis.timeWastedMs || todoAnalysis.costWasted) {
              const wasteTime = todoAnalysis.timeWastedMs ? formatTime(todoAnalysis.timeWastedMs) : '--';
              const wasteCost = todoAnalysis.costWasted ? `$${todoAnalysis.costWasted.toFixed(2)}` : '--';
              lines.push(line(boxIndent + C.dim + '│' + C.reset + ` Wasted: ${wasteTime} (${wasteCost})` + ''.padEnd(Math.max(0, boxWidth - 25)) + C.dim + '│' + C.reset, W));
            }

            // AI behavior summary
            if (todoAnalysis.aiBehavior) {
              const behaviorIcon = todoAnalysis.aiBehavior === 'BLIND_RETRY' ? C.red + '❌ Bad' :
                todoAnalysis.aiBehavior === 'ADAPTIVE' ? C.green + '✓ Good' :
                todoAnalysis.aiBehavior === 'RESEARCHED' ? C.green + '✓ Good' :
                todoAnalysis.aiBehavior === 'PIVOTED' ? C.green + '✓ Good' : C.dim + '?';
              const recovered = todoAnalysis.recovered ? C.green + ' (recovered)' : C.red + ' (failed)';
              lines.push(line(boxIndent + C.dim + '│' + C.reset + ` AI: ${behaviorIcon}${C.reset}${recovered}${C.reset}` + ''.padEnd(Math.max(0, boxWidth - 30)) + C.dim + '│' + C.reset, W));
            }

            // Recommendation
            if (todoAnalysis.recommendation) {
              lines.push(line(boxIndent + C.dim + '│' + C.reset + C.cyan + ' 💡 ' + todoAnalysis.recommendation.slice(0, boxWidth - 6) + C.reset + ''.padEnd(Math.max(0, boxWidth - todoAnalysis.recommendation.length - 5)) + C.dim + '│' + C.reset, W));
            }

            // Bottom border
            lines.push(line(boxIndent + C.dim + '╰' + '─'.repeat(boxWidth - 2) + '╯' + C.reset, W));
          }
        }
      }
      } // end hasTodos
    }

  }

  // Epics section (shown after all phases, only if epics exist)
  if (manifest.epics && manifest.epics.length > 0) {
    lines.push(sectionSeparator(W, nameColWidth));
    // Excel-like column headers with separators
    const epicHeaderLeft = '  ' + C.bold + C.white + 'EPICS' + C.reset + '   ' + navHint;
    const epicHeaderLeftVisible = 2 + 5 + 3 + 6; // '  ' + 'EPICS' + '   ' + '↑↓ Tab'
    const epicHeaderRight = COL_SEP + C.dim + centerIn('time', COL.TIME) + C.reset + COL_SEP + C.yellow + centerIn('regular', COL.REG) + C.reset + COL_SEP + C.cyan + centerIn('cached', COL.CACHE) + C.reset + COL_SEP + C.green + centerIn('total', COL.TOTAL) + C.reset;
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

        // Regular column: tok│%│$ (SUB mode) or tok│$ (API mode)
        const eRegTok = epic.regularTokens ? formatTokens(epic.regularTokens) : '--';
        const eRegPctStr = pricingMode === 'sub' && eRegPct !== null ? formatPercent(eRegPct) : '';
        const eSubRegCost = getSubCost(eRegPct);
        const eRegCost = epic.regularCost !== undefined ? formatCost(pricingMode === 'sub' && eSubRegCost !== null ? eSubRegCost : epic.regularCost) : '$--';
        epicStats += COL_SEP + formatDataCol(eRegTok, eRegPctStr, eRegCost, C.yellow, pricingMode === 'sub', COL.REG);

        // Cached column: tok│%│$ (SUB mode) or tok│$ (API mode)
        const eCacheTok = epic.cachedTokens ? formatTokens(epic.cachedTokens) : '--';
        const eCachePctStr = pricingMode === 'sub' && eCachePct !== null ? formatPercent(eCachePct) : '';
        const eSubCacheCost = getSubCost(eCachePct);
        const eCacheCost = epic.cachedCost !== undefined ? formatCost(pricingMode === 'sub' && eSubCacheCost !== null ? eSubCacheCost : epic.cachedCost) : '$--';
        epicStats += COL_SEP + formatDataCol(eCacheTok, eCachePctStr, eCacheCost, C.cyan, pricingMode === 'sub', COL.CACHE);

        // Total column: tok│%│$ (SUB mode) or tok│$ (API mode)
        const eTotTok = epic.tokens ? formatTokens(epic.tokens) : '--';
        const eTotPctStr = pricingMode === 'sub' && epicUsageDelta !== undefined ? formatPercent(epicUsageDelta) : '';
        const epicDisplayCost = getDisplayCost(epic.cost, epic.usageDelta);
        const eTotCost = epicDisplayCost !== undefined && epicDisplayCost !== null ? formatCost(epicDisplayCost) : '$--';
        const epicTodoSuffix = epic.todoBreakdown ? C.dim + '(' + epic.todoBreakdown.length + ')' : '';
        epicStats += COL_SEP + formatDataCol(eTotTok, eTotPctStr, eTotCost, C.green, pricingMode === 'sub', COL.TOTAL, epicTodoSuffix);
      } else {
        epicStats = COL_SEP + C.dim + '--'.padStart(COL.TIME) + COL_SEP + '  --    --  '.padStart(COL.REG) + COL_SEP + '  --    --  '.padStart(COL.CACHE) + COL_SEP + '  --    --  '.padStart(COL.TOTAL) + C.reset;
      }

      // Name fills available space until column separator
      const epicCursor = isCursor(epic.id) ? C.cyan + '>' + C.reset + ' ' : '  ';
      // Warning indicator for complete epics without sessionId (can't analyze)
      const epicNoSessionWarning = (epic.status === 'complete' && !epic.sessionId) ? ' ' + C.yellow + '⚠' + C.reset : '';
      const epicNoSessionWidth = visibleLength(epicNoSessionWarning); // auto-calculate width
      // Analysis status indicator: ⏳ = running, 📊 = complete
      const epicAnalyzerKey = `epic-${epic.id}`;
      const isEpicAnalyzing = runningAnalyzers.has(epicAnalyzerKey);
      const epicAnalysisComplete = epic.analysis?.status === 'complete';
      const epicAnalysisIndicator = isEpicAnalyzing ? ' ' + C.cyan + '⏳' + C.reset : (epicAnalysisComplete ? ' ' + C.magenta + '📊' + C.reset : '');
      const epicAnalysisWidth = visibleLength(epicAnalysisIndicator); // auto-calculate width
      // Truncate epic name to fit: prefix is cursor(2) + icon(1) + spaces(2) + key#(3) + expand(1) + space(1) + warning + analysis = 10 + indicators
      const maxEpicNameLen = Math.max(5, nameColWidth - 10 - epicNoSessionWidth - epicAnalysisWidth);
      const displayEpicName = truncate(epic.name, maxEpicNameLen);
      const epicLeftPart = epicCursor + epicIcon + '  ' + epicKey + '. ' + expandIndicator + ' ' + epicRowColor + displayEpicName + C.reset + epicAnalysisIndicator + epicNoSessionWarning;
      const epicLeftVisible = 2 + 1 + 2 + 3 + 1 + 1 + displayEpicName.length + epicAnalysisWidth + epicNoSessionWidth; // cursor + icon + spaces + key# + expand + space + name + analysis + warning
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

        // Epic-level analysis summary (if available)
        const epicAnalysis = epic.analysis;
        if (epicAnalysis && epicAnalysis.summary) {
          const sum = epicAnalysis.summary;
          const boxWidth = Math.min(W - 4, 70);
          const indent = '    ';

          // Top border
          lines.push(line(indent + C.dim + '╭' + '─'.repeat(boxWidth - 2) + '╮' + C.reset, W));

          // Summary header
          lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' EXECUTION SUMMARY' + C.reset + ''.padEnd(boxWidth - 20) + C.dim + '│' + C.reset, W));

          // Health counts
          const healthLine = ` Tasks: ${C.green}${sum.clean || 0} clean${C.reset}, ${C.yellow}${sum.minorFriction || 0} friction${C.reset}, ${C.red}${sum.struggled || 0} struggled${C.reset}`;
          lines.push(line(indent + C.dim + '│' + C.reset + healthLine + ''.padEnd(Math.max(0, boxWidth - 50)) + C.dim + '│' + C.reset, W));

          // Waste metrics if available
          if (sum.timeWastedMs || sum.costWasted) {
            const wasteTime = sum.timeWastedMs ? formatTime(sum.timeWastedMs) : '--';
            const wasteCost = sum.costWasted ? `$${sum.costWasted.toFixed(2)}` : '--';
            const wasteLine = ` Time wasted: ${wasteTime} (${wasteCost})`;
            lines.push(line(indent + C.dim + '│' + C.reset + wasteLine + ''.padEnd(Math.max(0, boxWidth - wasteLine.length - 1)) + C.dim + '│' + C.reset, W));
          }

          // What went well
          if (epicAnalysis.whatWentWell && epicAnalysis.whatWentWell.length > 0) {
            lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' What Went Well:' + C.reset + ''.padEnd(boxWidth - 18) + C.dim + '│' + C.reset, W));
            for (const item of epicAnalysis.whatWentWell.slice(0, 3)) {
              const itemText = ` ${C.green}✓${C.reset} ${item}`.slice(0, boxWidth - 4);
              lines.push(line(indent + C.dim + '│' + C.reset + itemText + ''.padEnd(Math.max(0, boxWidth - itemText.length + 8)) + C.dim + '│' + C.reset, W));
            }
          }

          // Issues found
          if (epicAnalysis.issuesFound && epicAnalysis.issuesFound.length > 0) {
            lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' Issues Found:' + C.reset + ''.padEnd(boxWidth - 15) + C.dim + '│' + C.reset, W));
            for (const issue of epicAnalysis.issuesFound.slice(0, 3)) {
              const recovered = issue.recovered ? C.green + '✓' : C.red + '✗';
              const issueText = ` ${C.yellow}⚠${C.reset} ${issue.issue} (${issue.count}x) ${recovered}${C.reset}`.slice(0, boxWidth - 4);
              lines.push(line(indent + C.dim + '│' + C.reset + issueText + ''.padEnd(Math.max(0, boxWidth - issueText.length + 16)) + C.dim + '│' + C.reset, W));
            }
          }

          // Recommendations
          if (epicAnalysis.recommendations && epicAnalysis.recommendations.length > 0) {
            lines.push(line(indent + C.dim + '│' + C.reset + C.bold + ' Recommendations:' + C.reset + ''.padEnd(boxWidth - 18) + C.dim + '│' + C.reset, W));
            for (const rec of epicAnalysis.recommendations.slice(0, 2)) {
              const priority = rec.priority === 'high' ? C.red + '!' : rec.priority === 'medium' ? C.yellow + '◦' : C.dim + '·';
              const recText = ` ${priority}${C.reset} ${rec.title}`.slice(0, boxWidth - 4);
              lines.push(line(indent + C.dim + '│' + C.reset + recText + ''.padEnd(Math.max(0, boxWidth - recText.length + 8)) + C.dim + '│' + C.reset, W));
            }
          }

          // Bottom border
          lines.push(line(indent + C.dim + '╰' + '─'.repeat(boxWidth - 2) + '╯' + C.reset, W));
          lines.push(line('', W)); // Spacer
        }

        for (let i = 0; i < epic.todoBreakdown.length; i++) {
          const todo = epic.todoBreakdown[i];
          const todoKey = `epic-${epic.id}-todo-${i}`;
          const isLast = i === epic.todoBreakdown.length - 1;
          const prefix = isLast ? '└─' : '├─';

          // Check if this todo has analysis data (new todoDetails or legacy todoSummaries)
          const epicTodoAnalysis = epic.analysis?.todoDetails?.[i] || epic.analysis?.todoSummaries?.[i];
          const hasAnalysis = !!epicTodoAnalysis;
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
          todoStats += COL_SEP + formatDataCol(todoRegTok, todoRegPctStr, todoRegCost, C.yellow, pricingMode === 'sub', COL.REG);
          todoStats += COL_SEP + formatDataCol(todoCacheTok, todoCachePctStr, todoCacheCost, C.cyan, pricingMode === 'sub', COL.CACHE);
          todoStats += COL_SEP + formatDataCol(todoTotTok, todoTotPctStr, todoTotCost, C.green, pricingMode === 'sub', COL.TOTAL);

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

          // Show analysis if epic todo is expanded
          if (isTodoExpanded && epicTodoAnalysis) {
            const boxIndent = '          ';
            const boxWidth = Math.min(W - 12, 60);

            // Health indicator
            const healthIcon = epicTodoAnalysis.health === 'clean' ? C.green + '✓' + C.reset
              : epicTodoAnalysis.health === 'minor-friction' || epicTodoAnalysis.health === 'minor_friction' ? C.yellow + '⚡' + C.reset
              : epicTodoAnalysis.health === 'struggled' ? C.red + '⚠' + C.reset
              : C.dim + '?' + C.reset;

            // Simple case: clean task - just show summary
            if (epicTodoAnalysis.health === 'clean') {
              const summaryText = epicTodoAnalysis.summary || 'Completed smoothly';
              lines.push(line(boxIndent + healthIcon + ' ' + C.dim + summaryText.slice(0, boxWidth - 4) + C.reset, W));
            } else {
              // Struggle case: show rich card
              lines.push(line(boxIndent + C.dim + '╭' + '─'.repeat(boxWidth - 2) + '╮' + C.reset, W));

              // Root cause header
              const rootCause = epicTodoAnalysis.rootCause || 'UNKNOWN';
              const rootCauseColor = rootCause === 'EXTERNAL_ISSUE' ? C.blue : rootCause === 'INSTRUCTION_GAP' ? C.magenta : C.yellow;
              lines.push(line(boxIndent + C.dim + '│' + C.reset + ' ' + healthIcon + ' ROOT CAUSE: ' + rootCauseColor + rootCause + C.reset + ''.padEnd(Math.max(0, boxWidth - rootCause.length - 16)) + C.dim + '│' + C.reset, W));

              // Error message if available
              if (epicTodoAnalysis.errorMessage) {
                const errText = ` Error: ${epicTodoAnalysis.errorMessage}`.slice(0, boxWidth - 4);
                lines.push(line(boxIndent + C.dim + '│' + C.reset + C.red + errText + C.reset + ''.padEnd(Math.max(0, boxWidth - errText.length - 1)) + C.dim + '│' + C.reset, W));
              }

              // Retry sequence if available
              if (epicTodoAnalysis.retrySequence && epicTodoAnalysis.retrySequence.length > 0) {
                lines.push(line(boxIndent + C.dim + '│ Retry Sequence:' + ''.padEnd(boxWidth - 17) + '│' + C.reset, W));
                for (const step of epicTodoAnalysis.retrySequence.slice(0, 4)) {
                  const resultIcon = step.result === 'SUCCESS' ? C.green + '✓' : C.red + '✗';
                  const behaviorIcon = step.behavior === 'BLIND_RETRY' ? C.red + '❌' :
                    step.behavior === 'ADAPTIVE' ? C.green + '✓' :
                    step.behavior === 'RESEARCHED' ? C.cyan + '?' : '';
                  const stepText = ` ${step.attempt}. ${step.action}`.slice(0, boxWidth - 12);
                  lines.push(line(boxIndent + C.dim + '│' + C.reset + stepText + ' ' + resultIcon + C.reset + ' ' + behaviorIcon + C.reset + ''.padEnd(Math.max(0, boxWidth - stepText.length - 8)) + C.dim + '│' + C.reset, W));
                }
              }

              // Waste metrics
              if (epicTodoAnalysis.timeWastedMs || epicTodoAnalysis.costWasted) {
                const wasteTime = epicTodoAnalysis.timeWastedMs ? formatTime(epicTodoAnalysis.timeWastedMs) : '--';
                const wasteCost = epicTodoAnalysis.costWasted ? `$${epicTodoAnalysis.costWasted.toFixed(2)}` : '--';
                lines.push(line(boxIndent + C.dim + '│' + C.reset + ` Wasted: ${wasteTime} (${wasteCost})` + ''.padEnd(Math.max(0, boxWidth - 25)) + C.dim + '│' + C.reset, W));
              }

              // AI behavior summary
              if (epicTodoAnalysis.aiBehavior) {
                const behaviorIcon = epicTodoAnalysis.aiBehavior === 'BLIND_RETRY' ? C.red + '❌ Bad' :
                  epicTodoAnalysis.aiBehavior === 'ADAPTIVE' ? C.green + '✓ Good' :
                  epicTodoAnalysis.aiBehavior === 'RESEARCHED' ? C.green + '✓ Good' :
                  epicTodoAnalysis.aiBehavior === 'PIVOTED' ? C.green + '✓ Good' : C.dim + '?';
                const recovered = epicTodoAnalysis.recovered ? C.green + ' (recovered)' : C.red + ' (failed)';
                lines.push(line(boxIndent + C.dim + '│' + C.reset + ` AI: ${behaviorIcon}${C.reset}${recovered}${C.reset}` + ''.padEnd(Math.max(0, boxWidth - 30)) + C.dim + '│' + C.reset, W));
              }

              // Recommendation
              if (epicTodoAnalysis.recommendation) {
                lines.push(line(boxIndent + C.dim + '│' + C.reset + C.cyan + ' 💡 ' + epicTodoAnalysis.recommendation.slice(0, boxWidth - 6) + C.reset + ''.padEnd(Math.max(0, boxWidth - epicTodoAnalysis.recommendation.length - 5)) + C.dim + '│' + C.reset, W));
              }

              // Bottom border
              lines.push(line(boxIndent + C.dim + '╰' + '─'.repeat(boxWidth - 2) + '╯' + C.reset, W));
            }
          }
        }
      }
    }
  }

  lines.push(line('', W));

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
  const hasSupervisorData = true; // Always show ORCHESTRATOR row

  // Calculate analyzer costs from phase/epic analysis.analyzerCost fields
  let analyzerTokens = 0;
  let analyzerRegularTokens = 0;
  let analyzerCachedTokens = 0;
  let analyzerRegularCost = 0;
  let analyzerCachedCost = 0;
  let analyzerUsageDelta = 0;
  const hasAnalyzerData = true; // Always show ANALYZERS row

  if (manifest.phases) {
    for (const p of Object.values(manifest.phases)) {
      if (p.analysis && p.analysis.analyzerCost) {
        const ac = p.analysis.analyzerCost;
        if (ac.tokens) analyzerTokens += ac.tokens;
        if (ac.regularTokens) analyzerRegularTokens += ac.regularTokens;
        if (ac.cachedTokens) analyzerCachedTokens += ac.cachedTokens;
        if (ac.regularCost) analyzerRegularCost += ac.regularCost;
        if (ac.cachedCost) analyzerCachedCost += ac.cachedCost;
        if (ac.usageDelta) analyzerUsageDelta += ac.usageDelta;
      }
    }
  }
  if (manifest.epics) {
    for (const e of manifest.epics) {
      if (e.analysis && e.analysis.analyzerCost) {
        const ac = e.analysis.analyzerCost;
        if (ac.tokens) analyzerTokens += ac.tokens;
        if (ac.regularTokens) analyzerRegularTokens += ac.regularTokens;
        if (ac.cachedTokens) analyzerCachedTokens += ac.cachedTokens;
        if (ac.regularCost) analyzerRegularCost += ac.regularCost;
        if (ac.cachedCost) analyzerCachedCost += ac.cachedCost;
        if (ac.usageDelta) analyzerUsageDelta += ac.usageDelta;
      }
    }
  }
  const analyzerApiCost = analyzerRegularCost + analyzerCachedCost;
  const analyzerSubCost = getSubCost(analyzerUsageDelta);

  // Grand totals (workers + analyzers + supervisor)
  const grandTokens = totalTokens + analyzerTokens + supervisorTokens;
  const grandRegularTokens = totalRegularTokens + analyzerRegularTokens + supervisorRegularTokens;
  const grandCachedTokens = totalCachedTokens + analyzerCachedTokens + supervisorCachedTokens;
  const grandRegularCost = totalRegularCost + analyzerRegularCost + supervisorRegularCost;
  const grandCachedCost = totalCachedCost + analyzerCachedCost + supervisorCachedCost;
  const grandUsageDelta = totalUsageDelta + analyzerUsageDelta + supervisorUsageDelta;
  const grandApiCost = workersApiCost + analyzerApiCost + supervisorApiCost;
  const grandSubCost = getSubCost(grandUsageDelta);
  const grandDisplayCost = pricingMode === 'sub' && grandSubCost !== null ? grandSubCost : grandApiCost;

  // Section separator before WORKERS
  lines.push(sectionSeparator(W, nameColWidth));

  // WORKERS line - shows only phase + epic costs
  const workersLeft = '  ' + C.bold + C.white + 'WORKERS' + C.reset;
  const workersLeftVisible = 9; // "  WORKERS"

  // Calculate proportional percentages for regular and cached (workers)
  const workersRegPct = (totalUsageDelta && workersApiCost > 0) ? totalUsageDelta * (totalRegularCost / workersApiCost) : null;
  const workersCachePct = (totalUsageDelta && workersApiCost > 0) ? totalUsageDelta * (totalCachedCost / workersApiCost) : null;

  // Regular: tok│%│$ in SUB mode (yellow)
  const workersRegTok = formatTokens(totalRegularTokens);
  const workersRegPctStr = pricingMode === 'sub' && workersRegPct !== null ? formatPercent(workersRegPct) : '';
  const workersSubRegCost = getSubCost(workersRegPct);
  const workersRegCostVal = formatCost(pricingMode === 'sub' && workersSubRegCost !== null ? workersSubRegCost : totalRegularCost);

  // Cached: tok│%│$ in SUB mode (cyan)
  const workersCacheTok = formatTokens(totalCachedTokens);
  const workersCachePctStr = pricingMode === 'sub' && workersCachePct !== null ? formatPercent(workersCachePct) : '';
  const workersSubCacheCost = getSubCost(workersCachePct);
  const workersCacheCostVal = formatCost(pricingMode === 'sub' && workersSubCacheCost !== null ? workersSubCacheCost : totalCachedCost);

  // Total: tok│%│$ in SUB mode (green)
  const workersTotTok = formatTokens(totalTokens);
  const workersTotPctStr = pricingMode === 'sub' && totalUsageDelta > 0 ? formatPercent(totalUsageDelta) : '';
  const workersTotCostVal = formatCost(workersDisplayCost);

  // Build stats with proper column separators (matching phase/epic rows)
  let workersStats = COL_SEP + ''.padStart(COL.TIME); // empty time column
  workersStats += COL_SEP + formatDataCol(workersRegTok, workersRegPctStr, workersRegCostVal, C.yellow, pricingMode === 'sub', COL.REG);
  workersStats += COL_SEP + formatDataCol(workersCacheTok, workersCachePctStr, workersCacheCostVal, C.cyan, pricingMode === 'sub', COL.CACHE);
  workersStats += COL_SEP + formatDataCol(workersTotTok, workersTotPctStr, workersTotCostVal, C.green, pricingMode === 'sub', COL.TOTAL);

  const workersPadding = ''.padEnd(Math.max(0, nameColWidth - workersLeftVisible));
  lines.push(line(workersLeft + workersPadding + workersStats, W));

  // ANALYZERS line - shows analysis worker costs (if analyzer data exists)
  if (hasAnalyzerData) {
    const anaLeft = '  ' + C.bold + C.blue + 'ANALYZERS' + C.reset;
    const anaLeftVisible = 11; // "  ANALYZERS"

    // Calculate proportional percentages for regular and cached (analyzers)
    const anaRegPct = (analyzerUsageDelta && analyzerApiCost > 0) ? analyzerUsageDelta * (analyzerRegularCost / analyzerApiCost) : null;
    const anaCachePct = (analyzerUsageDelta && analyzerApiCost > 0) ? analyzerUsageDelta * (analyzerCachedCost / analyzerApiCost) : null;

    // Regular: tok│%│$ in SUB mode (yellow)
    const anaRegTok = formatTokens(analyzerRegularTokens);
    const anaRegPctStr = pricingMode === 'sub' && anaRegPct !== null ? formatPercent(anaRegPct) : '';
    const anaSubRegCost = getSubCost(anaRegPct);
    const anaRegCostVal = formatCost(pricingMode === 'sub' && anaSubRegCost !== null ? anaSubRegCost : analyzerRegularCost);

    // Cached: tok│%│$ in SUB mode (cyan)
    const anaCacheTok = formatTokens(analyzerCachedTokens);
    const anaCachePctStr = pricingMode === 'sub' && anaCachePct !== null ? formatPercent(anaCachePct) : '';
    const anaSubCacheCost = getSubCost(anaCachePct);
    const anaCacheCostVal = formatCost(pricingMode === 'sub' && anaSubCacheCost !== null ? anaSubCacheCost : analyzerCachedCost);

    // Total: tok│%│$ in SUB mode (blue)
    const anaTotTok = formatTokens(analyzerTokens);
    const anaTotPctStr = pricingMode === 'sub' && analyzerUsageDelta > 0 ? formatPercent(analyzerUsageDelta) : '';
    const anaDisplayCost = pricingMode === 'sub' && analyzerSubCost !== null ? analyzerSubCost : analyzerApiCost;
    const anaTotCostVal = formatCost(anaDisplayCost);

    // Build stats with proper column separators
    let anaStats = COL_SEP + ''.padStart(COL.TIME); // empty time column
    anaStats += COL_SEP + formatDataCol(anaRegTok, anaRegPctStr, anaRegCostVal, C.yellow, pricingMode === 'sub', COL.REG);
    anaStats += COL_SEP + formatDataCol(anaCacheTok, anaCachePctStr, anaCacheCostVal, C.cyan, pricingMode === 'sub', COL.CACHE);
    anaStats += COL_SEP + formatDataCol(anaTotTok, anaTotPctStr, anaTotCostVal, C.blue, pricingMode === 'sub', COL.TOTAL);

    const anaPadding = ''.padEnd(Math.max(0, nameColWidth - anaLeftVisible));
    lines.push(line(anaLeft + anaPadding + anaStats, W));
  }

  // ORCHESTRATOR line - shows orchestrator cost
  if (hasSupervisorData) {
    const supLeft = '  ' + C.bold + C.magenta + 'ORCHESTRATOR' + C.reset;
    const supLeftVisible = 14; // "  ORCHESTRATOR"

    // Calculate proportional percentages for regular and cached (supervisor)
    const supRegPct = (supervisorUsageDelta && supervisorApiCost > 0) ? supervisorUsageDelta * (supervisorRegularCost / supervisorApiCost) : null;
    const supCachePct = (supervisorUsageDelta && supervisorApiCost > 0) ? supervisorUsageDelta * (supervisorCachedCost / supervisorApiCost) : null;

    // Regular: tok│%│$ in SUB mode (yellow)
    const supRegTok = formatTokens(supervisorRegularTokens);
    const supRegPctStr = pricingMode === 'sub' && supRegPct !== null ? formatPercent(supRegPct) : '';
    const supSubRegCost = getSubCost(supRegPct);
    const supRegCostVal = formatCost(pricingMode === 'sub' && supSubRegCost !== null ? supSubRegCost : supervisorRegularCost);

    // Cached: tok│%│$ in SUB mode (cyan)
    const supCacheTok = formatTokens(supervisorCachedTokens);
    const supCachePctStr = pricingMode === 'sub' && supCachePct !== null ? formatPercent(supCachePct) : '';
    const supSubCacheCost = getSubCost(supCachePct);
    const supCacheCostVal = formatCost(pricingMode === 'sub' && supSubCacheCost !== null ? supSubCacheCost : supervisorCachedCost);

    // Total: tok│%│$ in SUB mode (magenta)
    const supTotTok = formatTokens(supervisorTokens);
    const supTotPctStr = pricingMode === 'sub' && supervisorUsageDelta > 0 ? formatPercent(supervisorUsageDelta) : '';
    const supDisplayCost = pricingMode === 'sub' && supervisorSubCost !== null ? supervisorSubCost : supervisorApiCost;
    const supTotCostVal = formatCost(supDisplayCost);

    // Build stats with proper column separators
    let supStats = COL_SEP + ''.padStart(COL.TIME); // empty time column
    supStats += COL_SEP + formatDataCol(supRegTok, supRegPctStr, supRegCostVal, C.yellow, pricingMode === 'sub', COL.REG);
    supStats += COL_SEP + formatDataCol(supCacheTok, supCachePctStr, supCacheCostVal, C.cyan, pricingMode === 'sub', COL.CACHE);
    supStats += COL_SEP + formatDataCol(supTotTok, supTotPctStr, supTotCostVal, C.magenta, pricingMode === 'sub', COL.TOTAL);

    const supPadding = ''.padEnd(Math.max(0, nameColWidth - supLeftVisible));
    lines.push(line(supLeft + supPadding + supStats, W));
  }

  // Section separator before TOTAL
  lines.push(sectionSeparator(W, nameColWidth));

  // GRAND TOTAL line (workers + analyzers + supervisor)
  const grandLeft = '  ' + C.bold + C.white + 'TOTAL' + C.reset;
  const grandLeftVisible = 7; // "  TOTAL"
  let grandStats = COL_SEP + ''.padStart(COL.TIME); // empty time column

  // If supervisor data exists, show combined totals; otherwise same as workers
  if (hasSupervisorData) {
    // Calculate proportional percentages for regular and cached (grand total)
    const grandRegPct = (grandUsageDelta && grandApiCost > 0) ? grandUsageDelta * (grandRegularCost / grandApiCost) : null;
    const grandCachePct = (grandUsageDelta && grandApiCost > 0) ? grandUsageDelta * (grandCachedCost / grandApiCost) : null;

    // Regular: tok│%│$ in SUB mode (yellow)
    const grandRegTok = formatTokens(grandRegularTokens);
    const grandRegPctStr = pricingMode === 'sub' && grandRegPct !== null ? formatPercent(grandRegPct) : '';
    const grandSubRegCost = getSubCost(grandRegPct);
    const grandRegCostVal = formatCost(pricingMode === 'sub' && grandSubRegCost !== null ? grandSubRegCost : grandRegularCost);
    grandStats += COL_SEP + formatDataCol(grandRegTok, grandRegPctStr, grandRegCostVal, C.yellow, pricingMode === 'sub', COL.REG);

    // Cached: tok│%│$ in SUB mode (cyan)
    const grandCacheTok = formatTokens(grandCachedTokens);
    const grandCachePctStr = pricingMode === 'sub' && grandCachePct !== null ? formatPercent(grandCachePct) : '';
    const grandSubCacheCost = getSubCost(grandCachePct);
    const grandCacheCostVal = formatCost(pricingMode === 'sub' && grandSubCacheCost !== null ? grandSubCacheCost : grandCachedCost);
    grandStats += COL_SEP + formatDataCol(grandCacheTok, grandCachePctStr, grandCacheCostVal, C.cyan, pricingMode === 'sub', COL.CACHE);

    // Total: tok│%│$ in SUB mode (green)
    const grandTotTok = formatTokens(grandTokens);
    const grandTotPctStr = pricingMode === 'sub' && grandUsageDelta > 0 ? formatPercent(grandUsageDelta) : '';
    const grandTotCostVal = formatCost(grandDisplayCost);
    grandStats += COL_SEP + formatDataCol(grandTotTok, grandTotPctStr, grandTotCostVal, C.green, pricingMode === 'sub', COL.TOTAL);
  } else {
    // No supervisor data - grand total = workers total (reuse workers values)
    grandStats += COL_SEP + formatDataCol(workersRegTok, workersRegPctStr, workersRegCostVal, C.yellow, pricingMode === 'sub', COL.REG);
    grandStats += COL_SEP + formatDataCol(workersCacheTok, workersCachePctStr, workersCacheCostVal, C.cyan, pricingMode === 'sub', COL.CACHE);
    grandStats += COL_SEP + formatDataCol(workersTotTok, workersTotPctStr, workersTotCostVal, C.green, pricingMode === 'sub', COL.TOTAL);
  }

  const grandPadding = ''.padEnd(Math.max(0, nameColWidth - grandLeftVisible));
  lines.push(line(grandLeft + grandPadding + grandStats, W));
  lines.push(line('', W));

  // Worker progress section (moved after TOTALS for continuity)
  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);
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
  lines.push(line('', W));

  // QUALITY AUDIT section (v9.0) - only show if audit data exists
  const qualityAudit = manifest.phases?.['5']?.qualityAudit;
  if (qualityAudit || manifest.gates) {
    const qualityLabel = ' QUALITY ';
    const qualityLeftPad = Math.floor((W - 2 - qualityLabel.length) / 2);
    const qualityRightPad = W - 2 - qualityLabel.length - qualityLeftPad;
    lines.push(C.cyan + '╠' + '═'.repeat(qualityLeftPad) + C.bold + C.white + qualityLabel + C.reset + C.cyan + '═'.repeat(qualityRightPad) + '╣' + C.reset);

    // Gate Status Display
    if (manifest.gates) {
      const gate1 = manifest.gates.gate1;
      const gate2 = manifest.gates.gate2;
      const gate1Status = gate1?.status || 'pending';
      const gate2Status = gate2?.status || 'pending';
      const gate1Icon = gate1Status === 'pass' ? C.green + '✓' + C.reset : (gate1Status === 'fail' ? C.red + '✗' + C.reset : C.dim + '○' + C.reset);
      const gate2Icon = gate2Status === 'pass' ? C.green + '✓' + C.reset : (gate2Status === 'fail' ? C.red + '✗' + C.reset : C.dim + '○' + C.reset);
      const gate1Color = gate1Status === 'pass' ? C.green : (gate1Status === 'fail' ? C.red : C.dim);
      const gate2Color = gate2Status === 'pass' ? C.green : (gate2Status === 'fail' ? C.red : C.dim);
      lines.push(line('  ' + C.bold + 'GATES' + C.reset + '         ' + gate1Icon + ' ' + gate1Color + 'Gate 1 (Post-Bootstrap)' + C.reset + '     ' + gate2Icon + ' ' + gate2Color + 'Gate 2 (Post-Finalize)' + C.reset, W));
    }

    // Quality Audit Layers (3 layers from Phase 5)
    if (qualityAudit) {
      const layer1 = qualityAudit.layer1 || 'pending';
      const layer2 = qualityAudit.layer2 || 'pending';
      const layer3 = qualityAudit.layer3 || 'pending';
      const l1Icon = layer1 === 'pass' ? C.green + '✓' + C.reset : (layer1 === 'fail' ? C.red + '✗' + C.reset : C.dim + '○' + C.reset);
      const l2Icon = layer2 === 'pass' ? C.green + '✓' + C.reset : (layer2 === 'fail' ? C.red + '✗' + C.reset : C.dim + '○' + C.reset);
      const l3Icon = layer3 === 'pass' ? C.green + '✓' + C.reset : (layer3 === 'fail' ? C.red + '✗' + C.reset : C.dim + '○' + C.reset);
      const l1Color = layer1 === 'pass' ? C.green : (layer1 === 'fail' ? C.red : C.dim);
      const l2Color = layer2 === 'pass' ? C.green : (layer2 === 'fail' ? C.red : C.dim);
      const l3Color = layer3 === 'pass' ? C.green : (layer3 === 'fail' ? C.red : C.dim);

      lines.push(line('  ' + C.bold + 'AUDIT' + C.reset + '         ' + l1Icon + ' ' + l1Color + 'Layer 1 (Automated)' + C.reset + '         ' + l2Icon + ' ' + l2Color + 'Layer 2 (Smoke)' + C.reset + '         ' + l3Icon + ' ' + l3Color + 'Layer 3 (Nielsen)' + C.reset, W));

      // Issue counts
      const majorIssues = qualityAudit.majorIssues || 0;
      const minorIssues = qualityAudit.minorIssues || 0;
      const majorColor = majorIssues > 0 ? C.red : C.green;
      const minorColor = minorIssues > 0 ? C.yellow : C.green;
      lines.push(line('  ' + C.bold + 'ISSUES' + C.reset + '        ' + majorColor + majorIssues + ' major' + C.reset + '     ' + minorColor + minorIssues + ' minor' + C.reset, W));
    } else {
      // Show placeholder if Phase 5 hasn't run yet
      lines.push(line('  ' + C.bold + 'AUDIT' + C.reset + '         ' + C.dim + '(Phase 5 not complete - audit pending)' + C.reset, W));
    }
    lines.push(line('', W));
  }

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

  // Footer with hotkey hints (two lines)
  lines.push(C.cyan + '╠' + '═'.repeat(W-2) + '╣' + C.reset);
  const modeLabel = pricingMode === 'api' ? 'API' : 'SUB';
  const modeColor = pricingMode === 'api' ? C.green : C.magenta;
  // Line 1: Navigation and general controls
  const autoAnalysisEnabled = !(manifest.autoAnalysis && manifest.autoAnalysis.enabled === false);
  const autoAnalysisLabel = autoAnalysisEnabled ? 'Auto' : C.yellow + 'Manual' + C.reset;
  lines.push(line('  ' + C.yellow + '[↑↓]' + C.reset + ' Nav   ' + C.yellow + '[Tab]' + C.reset + ' Expand   ' + C.yellow + '[Space]' + C.reset + ' ' + modeColor + modeLabel + C.reset + '   ' + C.dim + '│' + C.reset + '   ' + C.yellow + '[r]' + C.reset + ' Analyze  ' + C.yellow + '[A]' + C.reset + ' ' + autoAnalysisLabel, W));
  // Line 2: Heartbeat controls
  const heartbeatEnabled = !(manifest.heartbeat && manifest.heartbeat.enabled === false);
  const intervalMs = manifest.heartbeat?.intervalMs || DEFAULT_HEARTBEAT_INTERVAL;
  const intervalMin = Math.round(intervalMs / 60000);
  const pauseLabel = heartbeatEnabled ? 'Pause' : C.yellow + 'Paused' + C.reset;
  const intervalLabel = C.green + intervalMin + 'm' + C.reset;
  lines.push(line('  ' + C.red + '💗' + C.reset + ' ' + C.yellow + '[P]' + C.reset + ' ' + pauseLabel + '   ' + C.yellow + '[±]' + C.reset + ' ' + intervalLabel + '   ' + C.yellow + '[Enter]' + C.reset + ' Ping   ' + C.dim + '│' + C.reset + '   ' + C.yellow + '[Q]' + C.reset + ' Quit', W));
  lines.push(C.cyan + '╚' + '═'.repeat(W-2) + '╝' + C.reset);

  // Render - limit to terminal height to prevent header scrolling off-screen
  const terminalHeight = process.stdout.rows || 40;

  if (lines.length > terminalHeight) {
    // Truncate content, keep header visible
    // Reserve last line for truncation indicator
    const visibleLines = lines.slice(0, terminalHeight - 1);
    const hiddenCount = lines.length - terminalHeight + 1;
    visibleLines.push(C.dim + '  ... ' + hiddenCount + ' more lines (collapse sections to see more)' + C.reset);
    clearScreen();
    console.log(visibleLines.join('\n'));
  } else {
    clearScreen();
    console.log(lines.join('\n'));
  }
}
// Compute hash of render-relevant state (excludes timer which changes every second)
function computeRenderHash() {
  const manifest = readManifest();
  const state = {
    manifest: manifest ? JSON.stringify(manifest) : '',
    expanded: [...expandedPhases].sort().join(',') + '|' + [...expandedEpics].sort().join(',') + '|' + [...expandedTodos].sort().join(','),
    cursor: cursorIndex,
    subscription: subscriptionUsage ? JSON.stringify(subscriptionUsage) : '',
    heartbeat: heartbeatCount
  };
  return JSON.stringify(state);
}

let lastRenderTime = 0;
const IDLE_RENDER_INTERVAL = 5000; // Only update timer every 5s when idle

// Render and update tracking (use this for user-triggered renders)
function renderAndTrack() {
  render();
  lastRenderTime = Date.now();
  lastRenderHash = computeRenderHash();
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

  // Only re-render if content changed OR 5 seconds passed (for timer update)
  const currentHash = computeRenderHash();
  const now = Date.now();
  if (currentHash !== lastRenderHash || (now - lastRenderTime) >= IDLE_RENDER_INTERVAL) {
    lastRenderHash = currentHash;
    lastRenderTime = now;
    render();
  }
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

# Step 1: Send /clear
Write-Output "Sending /clear..."
$r1 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/clear")
Start-Sleep -Milliseconds 800
$r1e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Clear result: text=$r1, enter=$r1e"

# Step 2: Wait 5 seconds
Write-Output "Waiting 5 seconds..."
Start-Sleep -Seconds 5

# Step 3: Send /orchestrator-desktop-v8.0 AUTO-RESUME-NO-QUESTION
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
      closeOwnWindow();
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

$r1 = [ConsoleInjector]::SendString(${ORCHESTRATOR_PID}, "HEARTBEAT: Read worker console, extract todo progress (X/Y), update manifest.phases[phase].workerProgress", $false)
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

      // Phase started running - record usageBefore
      // NOTE: sessionId capture removed - handled by onSessionInfoChange() which
      // properly guards with !data.sessionId to prevent analyzer session overwrites
      if (currentStatus === 'running' && previousStatus !== 'running') {
        console.log(`
[METRICS] Phase ${phase} started - fetching usage before...`);

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

        // Spawn analysis worker to profile execution patterns (if auto-analysis enabled)
        const autoAnalysisEnabled = manifest.autoAnalysis?.enabled !== false;
        if (autoAnalysisEnabled) {
          spawnAnalysisWorker(data.sessionId, 'phase', phase);
        } else {
          console.log(`[ANALYSIS] Auto-analysis paused - skipping phase ${phase} (use [r] for manual)`);
        }

        // Delay event message to avoid race condition with analysis worker's console injection
        // Analysis worker needs ~4s to start Claude and inject command
        if (ORCHESTRATOR_PID) {
          setTimeout(() => {
            sendEventMessage('PHASE COMPLETE: Metrics calculated automatically. Spawn next phase worker.');
          }, 6000);
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

      // Epic started running - record usageBefore
      // NOTE: sessionId capture removed - handled by onSessionInfoChange() which
      // properly guards with !epic.sessionId to prevent analyzer session overwrites
      if (currentStatus === 'running' && previousStatus !== 'running') {
        console.log(`
[METRICS] Epic ${epic.id} started - fetching usage before...`);

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

        // Spawn analysis worker to profile execution patterns (if auto-analysis enabled)
        const epicAutoAnalysisEnabled = manifest.autoAnalysis?.enabled !== false;
        if (epicAutoAnalysisEnabled) {
          spawnAnalysisWorker(epic.sessionId, 'epic', epic.id.toString());
        } else {
          console.log(`[ANALYSIS] Auto-analysis paused - skipping epic ${epic.id} (use [r] for manual)`);
        }

        // Delay event message to avoid race condition with analysis worker's console injection
        // Analysis worker needs ~4s to start Claude and inject command
        if (ORCHESTRATOR_PID) {
          setTimeout(() => {
            sendEventMessage('EPIC COMPLETE: Metrics calculated automatically. Spawn next epic worker.');
          }, 6000);
        }
      }

      lastEpicStatuses[epic.id] = currentStatus;
    }
  }

  // Check for analysis completion and auto-kill analyzers
  // This runs every tick to detect when analysis workers finish
  if (runningAnalyzers.size > 0) {
    // Check phase analysis status
    if (manifest.phases) {
      for (const [phase, data] of Object.entries(manifest.phases)) {
        const analyzerKey = `phase-${phase}`;
        if (!runningAnalyzers.has(analyzerKey)) continue;

        const currentAnalysisStatus = data.analysis?.status;
        const previousAnalysisStatus = lastAnalysisStatuses[analyzerKey];

        // Analysis just completed - kill the analyzer window
        if (currentAnalysisStatus === 'complete' && previousAnalysisStatus !== 'complete') {
          console.log(`\n[ANALYSIS-WORKER] Phase ${phase} analysis complete - auto-killing analyzer window`);
          killAnalyzer(analyzerKey);
        }

        lastAnalysisStatuses[analyzerKey] = currentAnalysisStatus;
      }
    }

    // Check epic analysis status
    if (manifest.epics) {
      for (const epic of manifest.epics) {
        const analyzerKey = `epic-${epic.id}`;
        if (!runningAnalyzers.has(analyzerKey)) continue;

        const currentAnalysisStatus = epic.analysis?.status;
        const previousAnalysisStatus = lastAnalysisStatuses[analyzerKey];

        // Analysis just completed - kill the analyzer window
        if (currentAnalysisStatus === 'complete' && previousAnalysisStatus !== 'complete') {
          console.log(`\n[ANALYSIS-WORKER] Epic ${epic.id} analysis complete - auto-killing analyzer window`);
          killAnalyzer(analyzerKey);
        }

        lastAnalysisStatuses[analyzerKey] = currentAnalysisStatus;
      }
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
      exitAlternateScreen();
      console.log('Dashboard closed. Timer saved.');
      process.exit(0);
    }

    // Navigation: Arrow Up
    if (key.name === 'up') {
      if (cursorIndex > 0) {
        cursorIndex--;
        renderAndTrack();
      }
      return;
    }

    // Navigation: Arrow Down
    if (key.name === 'down') {
      if (cursorIndex < navItems.length - 1) {
        cursorIndex++;
        renderAndTrack();
      }
      return;
    }

    // Toggle expand/collapse: Tab
    if (key.name === 'tab') {
      toggleExpansion();
      renderAndTrack();
      return;
    }

    // Toggle pricing mode: Space
    if (str === ' ') {
      pricingMode = pricingMode === 'api' ? 'sub' : 'api';
      renderAndTrack();
      return;
    }

    // Manual heartbeat: Enter
    if (key.name === 'return') {
      sendHeartbeat();
      return;
    }

    // Toggle heartbeat pause/resume: P
    if (str === 'p' || str === 'P') {
      const manifest = readManifest();
      if (manifest) {
        manifest.heartbeat = manifest.heartbeat || {};
        manifest.heartbeat.enabled = manifest.heartbeat.enabled === false ? true : false;
        writeManifest(manifest);
        renderAndTrack();
      }
      return;
    }

    // Increase heartbeat interval: +
    if (str === '+' || str === '=') {
      const manifest = readManifest();
      if (manifest) {
        manifest.heartbeat = manifest.heartbeat || {};
        const currentInterval = manifest.heartbeat.intervalMs || DEFAULT_HEARTBEAT_INTERVAL;
        manifest.heartbeat.intervalMs = currentInterval + 60000; // +1 minute
        writeManifest(manifest);
        // Reschedule next heartbeat with new interval
        if (ORCHESTRATOR_PID) {
          const newInterval = manifest.heartbeat.intervalMs;
          nextHeartbeatTime = Date.now() + newInterval;
        }
        renderAndTrack();
      }
      return;
    }

    // Decrease heartbeat interval: -
    if (str === '-' || str === '_') {
      const manifest = readManifest();
      if (manifest) {
        manifest.heartbeat = manifest.heartbeat || {};
        const currentInterval = manifest.heartbeat.intervalMs || DEFAULT_HEARTBEAT_INTERVAL;
        const newInterval = Math.max(60000, currentInterval - 60000); // min 1 minute
        manifest.heartbeat.intervalMs = newInterval;
        writeManifest(manifest);
        // Reschedule next heartbeat with new interval
        if (ORCHESTRATOR_PID) {
          nextHeartbeatTime = Date.now() + newInterval;
        }
        renderAndTrack();
      }
      return;
    }

    // Run analysis on selected phase/epic: 'r'
    if (str === 'r') {
      console.log('[DEBUG] r key pressed, cursorIndex=' + cursorIndex + ', navItems.length=' + navItems.length);
      if (navItems[cursorIndex]) {
        console.log('[DEBUG] Selected item type=' + navItems[cursorIndex].type + ', id=' + navItems[cursorIndex].id);
      }
      runSelectedAnalysis();
      return;
    }

    // Toggle auto-analysis pause/resume: A
    if (str === 'a' || str === 'A') {
      const manifest = readManifest();
      if (manifest) {
        manifest.autoAnalysis = manifest.autoAnalysis || {};
        manifest.autoAnalysis.enabled = manifest.autoAnalysis.enabled === false ? true : false;
        writeManifest(manifest);
        renderAndTrack();
      }
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

    // Analyze orchestrator sessions at startup (for ORCHESTRATOR cost line)
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

  // Handle exit - save timer and restore main screen
  process.on('SIGINT', () => { saveActiveMs(); exitAlternateScreen(); process.exit(0); });
  process.on('SIGTERM', () => { saveActiveMs(); exitAlternateScreen(); process.exit(0); });

  // Enter alternate screen buffer for clean TUI
  enterAlternateScreen();
  renderAndTrack();
}

main();
