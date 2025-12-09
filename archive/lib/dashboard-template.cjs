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
const PROJECT_ID = 'BeerGame-pipeline-v6';
// Claude Code stores todos globally, not per-project
const TODOS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'todos');
// Claude Code stores sessions per-project in ~/.claude/projects/{encoded-path}/
const CLAUDE_PROJECTS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects');

/**
 * Get the encoded project path that Claude Code uses for folder names
 * Example: C:\Users\ahunt\Documents\my project -> C--Users-ahunt-Documents-my-project
 */
function getEncodedProjectPath(projectPath) {
  // Normalize path separators to forward slashes first
  let encoded = projectPath.replace(/\\/g, '/');
  // Remove leading slash
  encoded = encoded.replace(/^\//, '');
  // Replace colons, slashes, and spaces with dashes
  encoded = encoded.replace(/:/g, '-').replace(/\//g, '-').replace(/ /g, '-');
  return encoded;
}

/**
 * Get all valid session IDs for this project from Claude's project folder
 * Returns a Set of session IDs that belong to this project
 */
function getProjectSessionIds() {
  const encodedPath = getEncodedProjectPath(PROJECT_PATH);
  const projectDir = path.join(CLAUDE_PROJECTS_DIR, encodedPath);
  const sessionIds = new Set();

  if (!fs.existsSync(projectDir)) {
    return sessionIds;
  }

  try {
    const files = fs.readdirSync(projectDir);
    for (const file of files) {
      // Session files are named: {uuid}.jsonl or agent-{shortid}.jsonl
      if (file.endsWith('.jsonl')) {
        // Extract session ID from filename
        const sessionId = file.replace('.jsonl', '');
        // UUID format: 8-4-4-4-12 hex chars
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(sessionId)) {
          sessionIds.add(sessionId);
        }
      }
    }
  } catch (err) {
    // Ignore errors reading project directory
  }

  return sessionIds;
}

// Cache of valid project session IDs (refreshed periodically)
let cachedProjectSessionIds = null;
let sessionIdsCacheTime = 0;
const SESSION_CACHE_TTL = 10000; // 10 seconds

function getValidProjectSessionIds() {
  const now = Date.now();
  if (!cachedProjectSessionIds || now - sessionIdsCacheTime > SESSION_CACHE_TTL) {
    cachedProjectSessionIds = getProjectSessionIds();
    sessionIdsCacheTime = now;
    log('[TODO] Refreshed project session cache: ' + cachedProjectSessionIds.size + ' sessions');
  }
  return cachedProjectSessionIds;
}

/**
 * Force refresh of the project session cache
 * Call this when spawning a new worker to pick up the new session
 */
function refreshProjectSessionCache() {
  cachedProjectSessionIds = null;
  sessionIdsCacheTime = 0;
}
// ============ DEPENDENCY CHECKS ============

function checkCommand(cmd) {
  try {
    // Windows uses 'where', Unix uses 'which'
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${checkCmd} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkNpxPackage(pkg) {
  try {
    execSync(`npx ${pkg} --version`, { stdio: 'ignore', timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

function checkJq() {
  // Check if jq is installed
  if (checkCommand('jq')) {
    return true;
  }

  // Try to install jq automatically
  console.log('\x1b[33m[INFO] jq not found. Installing...\x1b[0m');

  const homeDir = process.env.USERPROFILE || process.env.HOME;
  const binDir = path.join(homeDir, 'bin');

  try {
    // Create ~/bin if it doesn't exist
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    if (process.platform === 'win32') {
      // Download jq for Windows
      const jqPath = path.join(binDir, 'jq.exe');
      execSync(`curl -L -o "${jqPath}" "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-windows-amd64.exe"`, {
        stdio: 'inherit',
        timeout: 60000
      });
      console.log('\x1b[32m[OK] jq installed to ' + jqPath + '\x1b[0m');
      return true;
    } else {
      // On Unix, suggest package manager
      console.log('\x1b[33m[WARN] Please install jq manually:\x1b[0m');
      console.log('  macOS: brew install jq');
      console.log('  Ubuntu: apt install jq');
      return false;
    }
  } catch (err) {
    console.log('\x1b[33m[WARN] Failed to auto-install jq: ' + err.message + '\x1b[0m');
    return false;
  }
}

function checkDependencies() {
  console.log('\x1b[36mChecking dependencies...\x1b[0m');

  // Check Claude CLI (required)
  if (!checkCommand('claude')) {
    console.log('\x1b[33m[INFO] Claude CLI not found. Installing...\x1b[0m');
    try {
      execSync('npm install -g @anthropic-ai/claude-code', { stdio: 'inherit' });
      console.log('\x1b[32m[OK] Claude CLI installed successfully.\x1b[0m');
    } catch (err) {
      console.error('\x1b[31m[ERROR] Failed to install Claude CLI. Please install manually:\x1b[0m');
      console.error('  npm install -g @anthropic-ai/claude-code');
      process.exit(1);
    }
  } else {
    console.log('\x1b[32m[OK] Claude CLI found.\x1b[0m');
  }

  // Check jq (required for cost tracking)
  if (!checkJq()) {
    console.log('\x1b[90m  Cost tracking will be limited without jq.\x1b[0m');
  } else {
    console.log('\x1b[32m[OK] jq found.\x1b[0m');
  }

  // ccusage for cost tracking - uses npx, no global install needed
  console.log('\x1b[32m[OK] ccusage (via npx) for cost tracking.\x1b[0m');

  console.log('');
}

// Pipeline run tracker for analysis
const PIPELINE_OFFICE = 'C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office';
const tracker = require(path.join(PIPELINE_OFFICE, 'lib', 'pipeline-run-tracker.cjs'));
const workerLifecycle = require(path.join(PIPELINE_OFFICE, 'lib', 'worker-lifecycle.cjs'));

// Worker session ID - used to precisely identify the worker's todo file
let workerSessionId = null;
let pipelineRunId = null; // Track this pipeline run for analysis

// ccusage session ID - derived from project path (ccusage uses path-based IDs)
let ccusageSessionId = null;

// Starting token counts (to calculate delta for this pipeline run only)
let startingTokens = null;

function generateSessionId() {
  return crypto.randomUUID();
}

function generateCcusageSessionId(projectPath) {
  // ccusage encodes project path as session ID: /foo/bar -> -foo-bar
  // Windows: C:\foo\bar -> C--foo-bar
  // Spaces are also replaced with dashes
  const normalized = projectPath.replace(/\\/g, '/');
  return normalized.replace(/^\//, '').replace(/:/g, '-').replace(/\//g, '-').replace(/ /g, '-');
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

// Pipeline mode: 'new', 'feature', or 'fix'
let pipelineMode = 'new';

// Track active worker
let activeWorker = null;
let todoMonitorInterval = null;
let displayInterval = null;
let startTime = Date.now();
let currentPhase = '1';
let phaseStatus = { '1': 'pending', '2': 'pending', '3': 'pending', '4': 'pending', '5': 'pending' };
let phaseStats = { '1': null, '2': null, '3': null, '4': null, '5': null }; // { startTime, endTime, cost }
let phaseStartTime = null;  // Track when current phase started
let phaseStartCost = 0;     // Track cost when current phase started
let lastTodoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };
let lastCostData = { input: 0, output: 0, cost_usd: '0.00', error: null };

const logFile = path.join(__dirname, 'dashboard-v2.log');
function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  fs.appendFileSync(logFile, line + '\n');
}

// ============ COST TRACKING ============

let costMonitorInterval = null;

function formatCost(usd) {
  return '$' + parseFloat(usd || 0).toFixed(3);
}

function formatTokens(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return String(count);
}

// Opus 4.5 pricing per 1M tokens (Dec 2025)
const PRICING = {
  input: 5.00,        // $5/1M input
  output: 25.00,      // $25/1M output
  cacheWrite: 6.25,   // $6.25/1M cache write
  cacheRead: 0.50     // $0.50/1M cache read
};

function calculateCost(tokens) {
  const input = (tokens.input || 0) / 1000000 * PRICING.input;
  const output = (tokens.output || 0) / 1000000 * PRICING.output;
  const cacheWrite = (tokens.cacheWrite || 0) / 1000000 * PRICING.cacheWrite;
  const cacheRead = (tokens.cacheRead || 0) / 1000000 * PRICING.cacheRead;
  return input + output + cacheWrite + cacheRead;
}

// Get total project cost from ccusage
function getTotalProjectCost() {
  try {
    const sessionId = generateCcusageSessionId(PROJECT_PATH);
    const result = execSync('npx ccusage session --json', {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const parsed = JSON.parse(result);
    let sessions = parsed.sessions || parsed;
    if (!Array.isArray(sessions)) return null;

    const projectSession = sessions.find(s => s.sessionId === sessionId);
    if (!projectSession) return null;

    if (projectSession.costUSD) {
      return parseFloat(projectSession.costUSD);
    } else {
      const tokens = {
        input: projectSession.inputTokens || 0,
        output: projectSession.outputTokens || 0,
        cacheWrite: projectSession.cacheCreationTokens || 0,
        cacheRead: projectSession.cacheReadTokens || 0
      };
      return calculateCost(tokens);
    }
  } catch (err) {
    log('[COST] Total project cost fetch failed: ' + err.message);
    return null;
  }
}

// Calculate missing phase costs by distributing total cost proportionally by duration
function calculateMissingPhaseCosts(manifest, phaseStats) {
  // Get total project cost
  const totalCost = getTotalProjectCost();
  if (!totalCost) return;

  log('[COST] Total project cost from ccusage: $' + totalCost.toFixed(3));

  // Calculate total known cost and total duration
  let knownCost = 0;
  let unknownDuration = 0;
  let totalDuration = 0;

  for (const phase of PHASE_ORDER) {
    if (phaseStats[phase]) {
      const phaseCost = parseFloat(phaseStats[phase].cost) || 0;
      const phaseDuration = phaseStats[phase].duration || 0;

      if (phaseCost > 0 && phaseStats[phase].cost !== '(n/a)') {
        knownCost += phaseCost;
      } else if (phaseDuration > 0) {
        unknownDuration += phaseDuration;
      }
      totalDuration += phaseDuration;
    }
  }

  // Remaining cost to distribute
  const remainingCost = totalCost - knownCost;
  if (remainingCost <= 0 || unknownDuration <= 0) return;

  log('[COST] Distributing $' + remainingCost.toFixed(3) + ' across ' + formatTime(unknownDuration) + ' of unknown phases');

  // Distribute remaining cost proportionally by duration
  for (const phase of PHASE_ORDER) {
    if (phaseStats[phase] && phaseStats[phase].cost === '(n/a)' && phaseStats[phase].duration > 0) {
      const proportion = phaseStats[phase].duration / unknownDuration;
      const estimatedCost = remainingCost * proportion;
      phaseStats[phase].cost = '~' + estimatedCost.toFixed(3); // ~ indicates estimated
      log('[COST] Estimated phase ' + phase + ' cost: $' + estimatedCost.toFixed(3));
    }
  }
}

// Generate Pipeline Project Summary document
function generateProjectSummary(mode = 'new') {
  const manifest = readManifest();
  const summaryPath = path.join(PROJECT_PATH, 'docs', 'PIPELINE-PROJECT-SUMMARY.md');
  const now = new Date().toISOString();

  // Calculate totals
  let totalDuration = 0;
  let totalCost = 0;
  for (const phase of PHASE_ORDER) {
    if (phaseStats[phase]) {
      totalDuration += phaseStats[phase].duration || 0;
      const cost = parseFloat(String(phaseStats[phase].cost).replace('~', '')) || 0;
      totalCost += cost;
    }
  }

  // Get total tokens from ccusage
  let totalTokens = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  const projectCost = getTotalProjectCost();
  if (lastCostData && !lastCostData.error) {
    totalTokens = {
      input: (lastCostData.input || 0) + (startingTokens?.input || 0),
      output: (lastCostData.output || 0) + (startingTokens?.output || 0),
      cacheWrite: (lastCostData.cache_write || 0) + (startingTokens?.cacheWrite || 0),
      cacheRead: (lastCostData.cache_read || 0) + (startingTokens?.cacheRead || 0)
    };
  }

  // Read user stories
  let userStories = '';
  const userStoriesPath = path.join(PROJECT_PATH, 'docs', 'user-stories.md');
  if (fs.existsSync(userStoriesPath)) {
    userStories = fs.readFileSync(userStoriesPath, 'utf8');
  }

  // Read brainstorm notes for UI mockups
  let uiMockups = '';
  const brainstormPath = path.join(PROJECT_PATH, 'docs', 'brainstorm-notes.md');
  if (fs.existsSync(brainstormPath)) {
    const brainstorm = fs.readFileSync(brainstormPath, 'utf8');
    // Extract ASCII UI sections (look for code blocks with box-drawing chars)
    const asciiBlocks = brainstorm.match(/```[^\n]*\n[\s\S]*?[┌┐└┘│─╔╗╚╝║═\+\-\|][\s\S]*?```/g) || [];
    if (asciiBlocks.length > 0) {
      uiMockups = asciiBlocks.join('\n\n');
    }
  }

  // Build the summary document
  let content = `# Pipeline Project Summary

> Auto-generated by Pipeline Dashboard

## Project Info

| Field | Value |
|-------|-------|
| **Project ID** | ${PROJECT_ID} |
| **Run ID** | ${pipelineRunId || 'N/A'} |
| **Mode** | ${mode} |
| **Generated** | ${now} |

---

## Pipeline Metrics

### Duration & Cost

| Phase | Duration | Cost |
|-------|----------|------|
`;

  for (const phase of PHASE_ORDER) {
    if (phaseStats[phase]) {
      const time = formatTime(phaseStats[phase].duration);
      const cost = phaseStats[phase].cost || 'N/A';
      content += `| Phase ${phase} (${PHASE_NAMES[phase]}) | ${time} | $${cost} |\n`;
    } else if (phaseStatus[phase] === 'complete') {
      content += `| Phase ${phase} (${PHASE_NAMES[phase]}) | (not tracked) | (not tracked) |\n`;
    }
  }

  content += `| **TOTAL** | **${formatTime(totalDuration)}** | **$${totalCost.toFixed(3)}** |

### Token Usage

| Type | Count |
|------|-------|
| Input Tokens | ${formatTokens(totalTokens.input)} |
| Output Tokens | ${formatTokens(totalTokens.output)} |
| Cache Write | ${formatTokens(totalTokens.cacheWrite)} |
| Cache Read | ${formatTokens(totalTokens.cacheRead)} |
| **Total Tokens** | **${formatTokens(totalTokens.input + totalTokens.output + totalTokens.cacheWrite + totalTokens.cacheRead)}** |

---

## User Stories

${userStories || '*No user stories found in docs/user-stories.md*'}

---

## UI Mockups (ASCII)

${uiMockups || '*No ASCII UI mockups found in docs/brainstorm-notes.md*'}

---

## Run History

`;

  // Check if file exists and append run history
  if (fs.existsSync(summaryPath)) {
    const existing = fs.readFileSync(summaryPath, 'utf8');
    // Extract existing run history
    const historyMatch = existing.match(/## Run History\n\n([\s\S]*?)(?=\n---|\n## |$)/);
    if (historyMatch) {
      content += historyMatch[1];
    }
  }

  // Add this run to history
  content += `
### ${mode.toUpperCase()} - ${now.slice(0, 10)}

- **Run ID:** ${pipelineRunId || 'N/A'}
- **Duration:** ${formatTime(totalDuration)}
- **Cost:** $${totalCost.toFixed(3)}
- **Status:** Complete

`;

  // Ensure docs directory exists
  const docsDir = path.join(PROJECT_PATH, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Write the summary
  fs.writeFileSync(summaryPath, content, 'utf8');
  log('[SUMMARY] Generated Pipeline Project Summary: ' + summaryPath);
  return summaryPath;
}

function fetchCostData() {
  // Initialize ccusage session ID if not set
  if (!ccusageSessionId) {
    ccusageSessionId = generateCcusageSessionId(PROJECT_PATH);
    log('[COST] ccusage session ID: ' + ccusageSessionId);
  }

  try {
    // Use ccusage session command to get per-session data
    const result = execSync('npx ccusage session --json', {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const parsed = JSON.parse(result);

    // ccusage v17+ wraps data in { sessions: [...] } object
    let sessions;
    if (parsed && parsed.sessions && Array.isArray(parsed.sessions)) {
      sessions = parsed.sessions;
    } else if (Array.isArray(parsed)) {
      sessions = parsed;
    } else {
      log('[COST] Unexpected ccusage session format');
      return;
    }

    // Find our project's session by ccusage session ID (path-based)
    const projectSession = sessions.find(s => s.sessionId === ccusageSessionId);

    if (projectSession) {
      const currentTokens = {
        input: projectSession.inputTokens || 0,
        output: projectSession.outputTokens || 0,
        cacheWrite: projectSession.cacheCreationTokens || 0,
        cacheRead: projectSession.cacheReadTokens || 0
      };

      // Record starting tokens on first fetch (baseline for this pipeline run)
      if (!startingTokens) {
        // Check if baseline exists in manifest (for resume scenarios)
        const manifest = readManifest();
        if (manifest && manifest.costBaseline) {
          startingTokens = manifest.costBaseline;
          log('[COST] Restored baseline from manifest: ' + JSON.stringify(startingTokens));
        } else {
          startingTokens = { ...currentTokens };
          log('[COST] New baseline: ' + JSON.stringify(startingTokens));
          // Save baseline to manifest for resume
          updateManifest({ costBaseline: startingTokens });
        }
      }

      // Calculate delta (this pipeline run only)
      const deltaTokens = {
        input: currentTokens.input - startingTokens.input,
        output: currentTokens.output - startingTokens.output,
        cacheWrite: currentTokens.cacheWrite - startingTokens.cacheWrite,
        cacheRead: currentTokens.cacheRead - startingTokens.cacheRead
      };

      lastCostData = {
        input: deltaTokens.input,
        output: deltaTokens.output,
        cache_read: deltaTokens.cacheRead,
        cache_write: deltaTokens.cacheWrite,
        cost_usd: calculateCost(deltaTokens),
        error: null
      };
      log('[COST] Delta: ' + JSON.stringify(lastCostData));
    } else {
      // Session not found - list available for debugging
      const available = sessions.map(s => s.sessionId).slice(0, 5);
      log('[COST] Session not found. Looking for: ' + ccusageSessionId);
      log('[COST] Available sessions: ' + JSON.stringify(available));
    }
  } catch (err) {
    // ccusage not available or failed - fail silently
    if (!lastCostData.error) {
      log('[COST] ccusage error: ' + err.message);
      lastCostData.error = 'ccusage unavailable';
    }
  }
}

function startCostMonitor() {
  // Defer initial fetch by 5 seconds (don't block startup)
  setTimeout(() => {
    fetchCostData();
  }, 5000);

  // Update every 30 seconds after that
  costMonitorInterval = setInterval(() => {
    fetchCostData();
  }, 30000);
}

function stopCostMonitor() {
  if (costMonitorInterval) {
    clearInterval(costMonitorInterval);
    costMonitorInterval = null;
  }
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
  console.log('\x1b[36m  PIPELINE DASHBOARD (No Supervisor)\x1b[0m');
  console.log('\x1b[36m  Project: ' + PROJECT_ID + '\x1b[0m');
  console.log('\x1b[36m================================================================\x1b[0m\n');

  // Phase checklist
  const manifest = readManifest();
  const epicLoops = manifest && manifest.phases && manifest.phases['4'] && manifest.phases['4'].epicLoops;

  for (const phase of PHASE_ORDER) {
    let icon = '[ ]';
    let color = '';
    let stats = '';
    if (phaseStatus[phase] === 'complete') {
      icon = '\x1b[32m[x]\x1b[0m';
      // Show stats for completed phases
      if (phaseStats[phase]) {
        const time = formatTime(phaseStats[phase].duration);
        const cost = phaseStats[phase].cost;
        stats = ' \x1b[90m(' + time + ', $' + cost + ')\x1b[0m';
      }
    } else if (phaseStatus[phase] === 'running') {
      icon = '\x1b[33m[>]\x1b[0m';
      color = '\x1b[33m';
    } else if (phaseStatus[phase] === 'failed') {
      icon = '\x1b[31m[X]\x1b[0m';
    }
    const label = phase === '1' ? ' [Interactive]' : ' [Autonomous]';
    console.log('  ' + icon + ' Phase ' + phase + ': ' + PHASE_NAMES[phase] + color + label + '\x1b[0m' + stats);

    // Show epic sub-items for Phase 4 (Implement)
    if (phase === '4' && epicLoops && epicLoops.length > 0) {
      for (const epic of epicLoops) {
        let epicIcon = '[ ]';
        let epicColor = '\x1b[90m'; // dim by default
        if (epic.status === 'complete') {
          epicIcon = '\x1b[32m[x]\x1b[0m';
          epicColor = '\x1b[90m';
        } else if (currentEpic && currentEpic.id === epic.epic) {
          epicIcon = '\x1b[33m[>]\x1b[0m';
          epicColor = '\x1b[33m';
        }
        const epicName = epic.name.length > 35 ? epic.name.substring(0, 32) + '...' : epic.name;
        console.log('      ' + epicIcon + ' ' + epicColor + 'Epic ' + epic.epic + ': ' + epicName + '\x1b[0m');
      }
    }
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

  // Cost tracking section - per project session (from ccusage)
  console.log('\n\x1b[36m  COST (This Project):\x1b[0m');
  if (lastCostData.error) {
    console.log('  \x1b[90m(ccusage not available - run: npm install -g ccusage)\x1b[0m');
  } else {
    const costColor = parseFloat(lastCostData.cost_usd) > 5 ? '\x1b[33m' : '\x1b[32m';

    // Show input more intuitively: total processed = new input + cache read
    const totalInput = (lastCostData.input || 0) + (lastCostData.cache_read || 0);
    const cacheRead = lastCostData.cache_read || 0;
    const newInput = lastCostData.input || 0;

    if (cacheRead > 0) {
      // Show total with breakdown when cache is used
      console.log('  Input:  ' + formatTokens(totalInput) + ' processed (' + formatTokens(newInput) + ' new, ' + formatTokens(cacheRead) + ' cached)');
    } else {
      // Simple display when no cache
      console.log('  Input:  ' + formatTokens(newInput));
    }

    console.log('  Output: ' + formatTokens(lastCostData.output));

    if (lastCostData.cache_write > 0) {
      console.log('  Cache:  ' + formatTokens(lastCostData.cache_write) + ' written to cache');
    }

    console.log('  Cost:   ' + costColor + formatCost(lastCostData.cost_usd) + '\x1b[0m');
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
let lockedTodoFile = null;  // Once we find a good todo file, stick with it
let phaseStartTimeForTodos = Date.now();  // When current phase started (for filtering old todo files)

// Project-specific todo tracking: We track which todo files belong to THIS project
// by recording the file when we first see it after worker spawn
let knownProjectTodoFiles = new Set();  // Set of filenames that belong to this project

/**
 * Extract session ID from a todo filename
 * Format: {sessionId}-agent-{sessionId}.json
 */
function extractSessionIdFromTodoFile(filename) {
  const match = filename.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-agent-/);
  return match ? match[1] : null;
}

/**
 * Check if a todo file belongs to this project
 * Uses Claude's project folder to verify the session ID belongs to this project
 */
function isSessionFromThisProject(sessionId) {
  if (!sessionId) return false;
  const validSessionIds = getValidProjectSessionIds();
  return validSessionIds.has(sessionId);
}

/**
 * Check if a todo file likely belongs to this project's current phase
 * PRIMARY CHECK: Verify the session ID belongs to this project (via Claude's project folder)
 * SECONDARY CHECK: Time-based filtering for new sessions not yet in project folder
 */
function isLikelyOurTodoFile(filePath, fileData) {
  const filename = path.basename(filePath);

  // If we've explicitly locked a file for this phase, only that file is ours
  if (lockedTodoFile) {
    return filePath === lockedTodoFile;
  }

  // If we have a session ID, files matching it are definitely ours
  if (workerSessionId && filename.includes(workerSessionId)) {
    return true;
  }

  // If we've previously identified this file as ours, trust that
  if (knownProjectTodoFiles.has(filename)) {
    return true;
  }

  // CRITICAL CHECK: Extract session ID from filename and verify it belongs to THIS project
  const fileSessionId = extractSessionIdFromTodoFile(filename);
  if (fileSessionId) {
    // Check if this session ID exists in our project's Claude folder
    if (isSessionFromThisProject(fileSessionId)) {
      log('[TODO] Session ' + fileSessionId.substring(0, 8) + '... belongs to this project');
      return true;
    } else {
      // Session ID exists but doesn't belong to this project - REJECT
      log('[TODO] Session ' + fileSessionId.substring(0, 8) + '... belongs to DIFFERENT project - REJECTED');
      return false;
    }
  }

  // Fallback for files without valid session ID format (shouldn't happen normally)
  try {
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < phaseStartTimeForTodos) {
      return false;  // File predates our phase
    }

    // Very strict: only accept if modified within 30 seconds of phase start
    // This is a last resort and should rarely be needed
    const timeSincePhaseStart = stat.mtimeMs - phaseStartTimeForTodos;
    if (timeSincePhaseStart > 30000) {
      log('[TODO] Fallback rejected: file too old (' + Math.round(timeSincePhaseStart/1000) + 's after phase start)');
      return false;
    }

    if (Array.isArray(fileData) && fileData.length > 0) {
      log('[TODO] Fallback accepted: recent file with content');
      return true;
    }
  } catch (err) {
    return false;
  }

  return false;
}

function readWorkerTodos() {
  //// Method 1: Use locked todo file if we have one (prevents switching mid-phase)
  if (lockedTodoFile && fs.existsSync(lockedTodoFile)) {
    try {
      const content = fs.readFileSync(lockedTodoFile, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      // If locked file is empty, check for linked session files (resume creates new session)
      // Pattern: NEW-SESSION-agent-OLD-SESSION.json where OLD-SESSION matches our locked file
      const lockedBasename = path.basename(lockedTodoFile);
      const lockedSessionMatch = lockedBasename.match(/^([a-f0-9-]+)-agent-([a-f0-9-]+)\.json$/);
      if (lockedSessionMatch) {
        const originalSessionId = lockedSessionMatch[2]; // The "-agent-XXX" part
        // Look for files ending with "-agent-ORIGINAL.json" that have content
        const linkedFiles = fs.readdirSync(TODOS_DIR)
          .filter(f => f.endsWith('-agent-' + originalSessionId + '.json') && f !== lockedBasename)
          .map(f => {
            const fullPath = path.join(TODOS_DIR, f);
            const stat = fs.statSync(fullPath);
            return { name: f, path: fullPath, mtime: stat.mtimeMs, size: stat.size };
          })
          .filter(f => f.size > 2)
          .sort((a, b) => b.mtime - a.mtime);

        if (linkedFiles.length > 0) {
          const linkedFile = linkedFiles[0];
          log('[TODO] Found linked session file: ' + linkedFile.name);
          try {
            const linkedContent = fs.readFileSync(linkedFile.path, 'utf8');
            const linkedData = JSON.parse(linkedContent);
            if (Array.isArray(linkedData) && linkedData.length > 0) {
              // Switch lock to the new linked file
              lockedTodoFile = linkedFile.path;
              log('[TODO] Switched lock to linked file: ' + linkedFile.name);
              return linkedData;
            }
          } catch (err) {
            log('[TODO] Error reading linked file: ' + err.message);
          }
        }
      }
    } catch (err) {
      log('[TODO] Error reading locked file: ' + err.message);
    }
  }

  //// Method 2: Use session ID if we have one (exact match)
  const todoPath = getWorkerTodoFilePath();
  if (todoPath && fs.existsSync(todoPath)) {
    try {
      const content = fs.readFileSync(todoPath, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        // Lock this file for the phase
        if (!lockedTodoFile && data.length > 0) {
          lockedTodoFile = todoPath;
          log('[TODO] Locked todo file: ' + path.basename(todoPath));
        }
        return data;
      }
    } catch (err) {
      log('[TODO] Error reading todo file: ' + err.message);
    }
  }

  //// Method 3: Fallback - find todo files that belong to THIS project
  // Uses Claude's project folder to verify session ownership
  // IMPORTANT: This is now based on project ownership, not time-based heuristics
  if (!fs.existsSync(TODOS_DIR)) return null;

  // Get valid session IDs for this project
  const validSessionIds = getValidProjectSessionIds();
  log('[TODO] Fallback: project has ' + validSessionIds.size + ' known sessions');

  // Get list of files with modification times
  const files = fs.readdirSync(TODOS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const fullPath = path.join(TODOS_DIR, f);
      try {
        const stat = fs.statSync(fullPath);
        const sessionId = extractSessionIdFromTodoFile(f);
        return { name: f, path: fullPath, mtime: stat.mtimeMs, size: stat.size, sessionId };
      } catch (err) {
        return null;
      }
    })
    .filter(f => f !== null)
    .filter(f => {
      // CRITICAL FILTER: Only accept files whose session ID belongs to THIS project
      if (f.sessionId && validSessionIds.has(f.sessionId)) {
        return true;  // Session belongs to this project
      }

      // If we've already identified this file as ours, trust that
      if (knownProjectTodoFiles.has(f.name)) {
        return true;
      }

      // STRICT TIME FILTER: For files without valid session ID or unknown sessions
      // Only accept if modified AFTER our phase started AND very recent
      if (f.mtime <= phaseStartTimeForTodos) {
        return false;
      }

      // Very strict: only accept unknown files within 30 seconds of phase start
      const timeSincePhaseStart = f.mtime - phaseStartTimeForTodos;
      if (timeSincePhaseStart > 30000) {
        return false;
      }

      return true;
    })
    .filter(f => f.size > 2) // Skip empty files (just "[]" = 2 bytes)
    .sort((a, b) => b.mtime - a.mtime); // Most recent first

  if (files.length === 0) return null;

  // Use most recently modified file, but validate it first
  const mostRecent = files[0];

  try {
    const content = fs.readFileSync(mostRecent.path, 'utf8');
    const data = JSON.parse(content);

    if (Array.isArray(data) && data.length > 0) {
      // Validate that this looks like our file before accepting
      if (isLikelyOurTodoFile(mostRecent.path, data)) {
        log('[TODO] Fallback: validated file ' + mostRecent.name + ' (size: ' + mostRecent.size + ')');

        // Mark this file as belonging to our project
        knownProjectTodoFiles.add(mostRecent.name);

        // Lock this file for the phase (only if it has significant todos)
        if (!lockedTodoFile && data.length >= 5) {
          lockedTodoFile = mostRecent.path;
          log('[TODO] Locked fallback todo file: ' + mostRecent.name);
        }

        // Extract session ID from filename for future use
        const match = mostRecent.name.match(/^([a-f0-9-]+)-agent-/);
        if (match && !workerSessionId) {
          workerSessionId = match[1];
          log('[TODO] Discovered session ID from fallback: ' + workerSessionId);
        }

        return data;
      } else {
        log('[TODO] Fallback: rejected file ' + mostRecent.name + ' (not our project)');
      }
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

function startTodoMonitor(phase, resumeTodoFile = null) {
  let completionDetected = false;

  // Reset phase tracking
  phaseTodosLoaded = false;
  lastKnownTodoCount = 0;
  lastTodoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };

  // IMPORTANT: Reset known todo files for new phase (prevents cross-project pollution)
  // We keep existing known files only for resume scenarios
  if (!resumeTodoFile) {
    knownProjectTodoFiles.clear();
    log('[TODO] Cleared known todo files for new phase ' + phase);
  }

  // Track if this is a resume - prevents immediate 100% completion trigger
  let isResumeGracePeriod = false;
  let resumeGraceStartTime = null;
  let resumeInitialTodoHash = null;

  // For resume: use the saved todo file instead of looking for new ones
  if (resumeTodoFile && fs.existsSync(resumeTodoFile)) {
    lockedTodoFile = resumeTodoFile;
    phaseStartTimeForTodos = 0;  // Allow any file (but we're locked anyway)
    isResumeGracePeriod = true;
    resumeGraceStartTime = Date.now();
    // Mark the resume file as known
    knownProjectTodoFiles.add(path.basename(resumeTodoFile));
    // Capture initial state hash to detect changes
    try {
      const initialData = fs.readFileSync(resumeTodoFile, 'utf8');
      resumeInitialTodoHash = crypto.createHash('md5').update(initialData).digest('hex');
    } catch (err) {
      resumeInitialTodoHash = null;
    }
    log('[TODO] Resuming with locked todo file: ' + resumeTodoFile + ' (grace period active)');
  } else {
    lockedTodoFile = null;  // Reset lock for new phase
    phaseStartTimeForTodos = Date.now();  // Only look for todo files created after NOW
  }

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
    // BUT: During resume grace period, wait for todo file to CHANGE before allowing completion

    // Check if we should exit grace period
    if (isResumeGracePeriod) {
      const gracePeriodMs = 60000; // 60 second minimum grace period
      const elapsed = Date.now() - resumeGraceStartTime;

      // Check if todo file has changed (indicates Claude is working)
      let currentHash = null;
      if (lockedTodoFile && fs.existsSync(lockedTodoFile)) {
        try {
          const currentData = fs.readFileSync(lockedTodoFile, 'utf8');
          currentHash = crypto.createHash('md5').update(currentData).digest('hex');
        } catch (err) { /* ignore */ }
      }

      // Exit grace period if: file changed OR grace period expired
      if (currentHash && currentHash !== resumeInitialTodoHash) {
        isResumeGracePeriod = false;
        log('[TODO] Grace period ended: todo file changed');
      } else if (elapsed > gracePeriodMs) {
        // Still waiting - don't trigger completion yet, check again
        if (stats.completed === stats.total && stats.total > 0) {
          log('[TODO] Grace period: 100% complete detected but waiting for file change...');
        }
      }
    }

    if (!completionDetected && !isResumeGracePeriod) {
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
  // Use project-scoped window title from worker-lifecycle
  return workerLifecycle.generateWorkerWindowTitle(phase);
}

function killTerminalByTitle(title) {
  if (!title) return;
  log('Killing terminal: ' + title);
  // Use worker-lifecycle for reliable killing
  workerLifecycle.killWorkerByTitle(title);
}

function killWorker() {
  // Use both methods for reliability: title-based and PID-based
  if (activeWorker) {
    killTerminalByTitle(activeWorker.title);
    activeWorker = null;
  }
  // Also use worker lifecycle to kill by tracked PID
  workerLifecycle.cleanupAllWorkers(PROJECT_PATH);
  stopTodoMonitor();
}

function spawnWorker(phase, resumeSessionId = null, resumeTodoFile = null) {
  // CRITICAL: Kill previous workers before spawning new one
  const killedCount = workerLifecycle.killPreviousWorkers(PROJECT_PATH);
  if (killedCount > 0) {
    log('[WORKER] Killed ' + killedCount + ' previous worker(s) before spawn');
  }

  const title = generateTerminalTitle(phase);
  const cmd = WORKER_COMMANDS[phase];

  // Use existing session ID if resuming, otherwise generate new one
  if (resumeSessionId) {
    workerSessionId = resumeSessionId;
    log('Resuming worker: ' + title + ' with existing session ID: ' + workerSessionId);
  } else {
    workerSessionId = generateSessionId();
    log('Spawning worker: ' + title + ' with new session ID: ' + workerSessionId);
  }

  // Log session to pipeline run tracker for later analysis
  if (pipelineRunId && !resumeSessionId) {
    tracker.logPhaseSession(PROJECT_PATH, pipelineRunId, phase, workerSessionId, {
      command: cmd,
      spawnedAt: new Date().toISOString(),
      epicId: currentEpic ? currentEpic.id : null
    });
    log('[TRACKER] Logged session ' + workerSessionId + ' to run ' + pipelineRunId);
  }

  // Build Claude command
  // --continue tells Claude to resume the most recent conversation in this project
  // Without --continue, Claude starts fresh with the phase command
  let claudeCmd;
  if (resumeSessionId) {
    // Graceful resume: continue most recent conversation using --continue
    // Note: --session-id doesn't work reliably for resume, Claude uses its own internal session ID
    claudeCmd = 'claude --continue --dangerously-skip-permissions --max-turns 200';
  } else {
    // Fresh start: new conversation with phase command
    claudeCmd = 'claude "' + cmd + '" --dangerously-skip-permissions --max-turns 200';
  }

  const proc = spawn('cmd.exe', ['/c', 'start', 'wt.exe', '--title', title, '-d', PROJECT_PATH, 'cmd', '/k', claudeCmd],
    { detached: true, stdio: 'ignore' });
  proc.unref();

  activeWorker = { title, phase, sessionId: workerSessionId };

  // Store session ID in manifest so it can be resumed
  updateManifest({ workerSessionId: workerSessionId });
  startTodoMonitor(phase, resumeTodoFile);

  // Register worker for tracking (async - find PID after spawn completes)
  // Since wt.exe spawns claude asynchronously, poll briefly to find the new Claude process
  setTimeout(() => {
    try {
      const IS_WINDOWS = process.platform === 'win32';
      if (IS_WINDOWS) {
        // Find newest claude.exe PID
        const output = execSync('tasklist /FI "IMAGENAME eq claude.exe" /FO CSV 2>nul', {
          encoding: 'utf8',
          timeout: 5000
        });
        const lines = output.split('\n').filter(line => line.includes('claude'));
        if (lines.length > 0) {
          // Get the PID from the last line (newest process)
          const match = lines[lines.length - 1].match(/"claude\.exe","(\d+)"/);
          if (match) {
            const pid = parseInt(match[1]);
            workerLifecycle.registerWorker(pid, phase, { title, sessionId: workerSessionId }, PROJECT_PATH);
            log('[WORKER] Registered Claude PID: ' + pid);
          }
        }
      }
    } catch (err) {
      log('[WORKER] Could not detect Claude PID (non-critical): ' + err.message);
    }
  }, 3000); // Wait 3s for Windows Terminal to launch Claude
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

async function runPhase(phase, resumeSessionId = null, resumeTodoFile = null) {
  log('========================================');
  log('Starting phase: ' + phase + (resumeSessionId ? ' (graceful resume)' : ''));
  log('========================================');

  currentPhase = phase;
  phaseStatus[phase] = 'running';
  lastTodoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };

  // Track phase start time and cost (only if not resuming - resume already restored these)
  if (!resumeSessionId) {
    phaseStartTime = Date.now();
    phaseStartCost = parseFloat(lastCostData.cost_usd || '0');
  }
  // If resumeSessionId is set, phaseStartTime and phaseStartCost were already restored from manifest

  // Spawn worker (with session ID and todo file if graceful resume)
  spawnWorker(phase, resumeSessionId, resumeTodoFile);

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

        // Record phase stats (time and cost)
        const phaseEndTime = Date.now();
        const phaseDuration = phaseEndTime - (phaseStartTime || phaseEndTime);
        const phaseEndCost = parseFloat(lastCostData.cost_usd || '0');
        const phaseCost = Math.max(0, phaseEndCost - phaseStartCost);
        phaseStats[phase] = {
          duration: phaseDuration,
          cost: phaseCost.toFixed(3)
        };
        log('Phase ' + phase + ' stats: ' + formatTime(phaseDuration) + ', $' + phaseCost.toFixed(3));

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

// ============ GRACEFUL SHUTDOWN ============

let isShuttingDown = false;

function gracefulStop(reason) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log('Graceful stop requested: ' + reason);

  // Save current state to manifest
  const manifest = readManifest();
  if (manifest) {
    manifest.status = 'paused';
    manifest.pausedAt = new Date().toISOString();
    manifest.pauseReason = reason;
    // Save elapsed time for resume
    manifest.elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    // Save phase stats for resume
    manifest.phaseStats = phaseStats;
    // Save current phase timing for resume
    if (phaseStartTime) {
      manifest.currentPhaseElapsed = Math.floor((Date.now() - phaseStartTime) / 1000);
      manifest.currentPhaseCostStart = phaseStartCost;
    }
    // Save locked todo file path for resume (so we track the same todos)
    if (lockedTodoFile) {
      manifest.lockedTodoFile = lockedTodoFile;
      log('[GRACEFUL] Saved lockedTodoFile: ' + lockedTodoFile);
    }
    // Keep workerSessionId so we can potentially resume the Claude conversation
    fs.writeFileSync(path.join(PROJECT_PATH, '.pipeline', 'manifest.json'), JSON.stringify(manifest, null, 2));
    log('State saved to manifest (elapsed: ' + manifest.elapsedSeconds + 's)');
  }

  // Stop monitoring
  stopTodoMonitor();
  stopDisplayLoop();
  stopCostMonitor();

  // Kill worker gracefully (the worker's Claude session is saved via session ID)
  if (activeWorker) {
    log('Stopping worker: ' + activeWorker.title);
    killWorker();
  }

  // Final display
  console.log('\n');
  console.log('\x1b[33m  ⏸  Pipeline paused gracefully\x1b[0m');
  console.log('');
  console.log('  Current phase: ' + currentPhase);
  if (workerSessionId) {
    console.log('  Session ID: ' + workerSessionId);
  }
  console.log('');
  console.log('  \x1b[36mTo resume (continue conversation):\x1b[0m');
  console.log('    node .pipeline/dashboard.cjs --resume-session');
  console.log('');
  console.log('  \x1b[90mTo restart phase (fresh conversation):\x1b[0m');
  console.log('    node .pipeline/dashboard.cjs --resume');
  console.log('');

  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => gracefulStop('User pressed Ctrl+C'));
process.on('SIGTERM', () => gracefulStop('Process terminated'));

// ============ MAIN ============

async function main() {
  const args = process.argv.slice(2);

  // Check dependencies first
  checkDependencies();

  // Initialize worker lifecycle management (tracks PIDs, enables cleanup)
  workerLifecycle.initWorkerLifecycle(PROJECT_PATH);
  log('[WORKER] Worker lifecycle management initialized');

  // Clear log and cost baseline on fresh start (not on any resume)
  if (!args.includes('--resume') && !args.includes('--resume-session')) {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    // Clear cost baseline for new pipeline run
    const manifest = readManifest();
    if (manifest && manifest.costBaseline) {
      delete manifest.costBaseline;
      fs.writeFileSync(path.join(PROJECT_PATH, '.pipeline', 'manifest.json'), JSON.stringify(manifest, null, 2));
      log('[COST] Cleared baseline for new pipeline run');
    }
  }

  log('Dashboard v2 starting...');
  startTime = Date.now();

  // Determine start phase and resume mode
  let startPhase = '1';
  let resumeSessionId = null;  // Set if doing graceful resume
  let resumeTodoFile = null;   // Set if doing graceful resume (to track same todos)

  if (args.includes('--resume-session')) {
    // GRACEFUL RESUME: Continue exact Claude conversation
    const manifest = readManifest();
    if (manifest && manifest.currentPhase && manifest.currentPhase !== 'complete') {
      startPhase = manifest.currentPhase;
      resumeSessionId = manifest.workerSessionId;  // Resume exact session

      if (!resumeSessionId) {
        console.log('\x1b[31m[ERROR] No session ID found in manifest. Use --resume instead.\x1b[0m');
        process.exit(1);
      }

      log('Graceful resume from phase: ' + startPhase + ' with session: ' + resumeSessionId);
      console.log('\x1b[32m[GRACEFUL RESUME] Continuing Claude conversation...\x1b[0m');
      console.log('\x1b[90m  (Loading previous session context - this may take 30-60 seconds...)\x1b[0m');

      // Restore elapsed time - adjust startTime to account for previously elapsed time
      if (manifest.elapsedSeconds) {
        startTime = Date.now() - (manifest.elapsedSeconds * 1000);
        log('[RESUME] Restored elapsed time: ' + manifest.elapsedSeconds + 's');
      }

      // Restore cost baseline
      if (manifest.costBaseline) {
        startingTokens = manifest.costBaseline;
        log('[RESUME] Restored cost baseline: ' + JSON.stringify(startingTokens));
      }

      // Restore phase stats
      if (manifest.phaseStats) {
        phaseStats = manifest.phaseStats;
        log('[RESUME] Restored phase stats');
      }

      // Calculate missing phase stats from completedAt timestamps
      const startIdx = PHASE_ORDER.indexOf(startPhase);
      let prevEndTime = manifest.createdAt ? new Date(manifest.createdAt).getTime() : null;

      for (let i = 0; i < startIdx; i++) {
        const phase = PHASE_ORDER[i];
        const phaseData = manifest.phases && manifest.phases[phase];

        if ((!phaseStats[phase] || phaseStats[phase] === null) && phaseData && phaseData.completedAt) {
          const endTime = new Date(phaseData.completedAt).getTime();
          if (prevEndTime) {
            const duration = endTime - prevEndTime;
            phaseStats[phase] = {
              duration: duration,
              cost: '(n/a)'
            };
            log('[RESUME-SESSION] Calculated phase ' + phase + ' duration from timestamps: ' + formatTime(duration));
          }
          prevEndTime = endTime;
        } else if (phaseStats[phase] && phaseData && phaseData.completedAt) {
          prevEndTime = new Date(phaseData.completedAt).getTime();
        }
      }

      // Try to estimate missing phase costs from total project cost
      calculateMissingPhaseCosts(manifest, phaseStats);

      // Restore current phase timing
      if (manifest.currentPhaseElapsed) {
        phaseStartTime = Date.now() - (manifest.currentPhaseElapsed * 1000);
        phaseStartCost = manifest.currentPhaseCostStart || 0;
        log('[RESUME] Restored current phase timing: ' + manifest.currentPhaseElapsed + 's');
      }

      // Restore locked todo file path for tracking (ONLY for --resume-session)
      if (manifest.lockedTodoFile && fs.existsSync(manifest.lockedTodoFile)) {
        resumeTodoFile = manifest.lockedTodoFile;
        log('[RESUME-SESSION] Restored lockedTodoFile: ' + resumeTodoFile);
      }

      // Restore current epic for Phase 4 display
      if (startPhase === '4' && manifest.currentEpic) {
        const epicLoops = manifest.phases && manifest.phases['4'] && manifest.phases['4'].epicLoops;
        if (epicLoops) {
          const epicData = epicLoops.find(e => e.epic === manifest.currentEpic);
          if (epicData) {
            currentEpic = { id: epicData.epic, name: epicData.name };
            log('[RESUME-SESSION] Restored currentEpic: ' + currentEpic.id + ' - ' + currentEpic.name);
          }
        }
      }

      // Mark earlier phases as complete (reuse startIdx from above)
      for (let i = 0; i < startIdx; i++) {
        phaseStatus[PHASE_ORDER[i]] = 'complete';
      }
      // Get existing run ID
      pipelineRunId = manifest.pipelineRunId || tracker.getCurrentRunId(PROJECT_PATH);
      if (pipelineRunId) {
        log('[TRACKER] Resuming run ' + pipelineRunId);
      }
    } else {
      console.log('\x1b[31m[ERROR] No paused pipeline to resume. Use fresh start.\x1b[0m');
      process.exit(1);
    }
  } else if (args.includes('--resume')) {
    // NORMAL RESUME: New Claude session, but continue from saved phase
    const manifest = readManifest();
    if (manifest && manifest.currentPhase && manifest.currentPhase !== 'complete') {
      startPhase = manifest.currentPhase;
      log('Normal resume from phase: ' + startPhase + ' (new Claude session)');
      console.log('\x1b[33m[RESUME] Starting fresh Claude session at phase ' + startPhase + '\x1b[0m');

      // Restore elapsed time - adjust startTime to account for previously elapsed time
      if (manifest.elapsedSeconds) {
        startTime = Date.now() - (manifest.elapsedSeconds * 1000);
        log('[RESUME] Restored elapsed time: ' + manifest.elapsedSeconds + 's');
      }

      // Restore cost baseline
      if (manifest.costBaseline) {
        startingTokens = manifest.costBaseline;
        log('[RESUME] Restored cost baseline: ' + JSON.stringify(startingTokens));
      }

      // Restore phase stats
      if (manifest.phaseStats) {
        phaseStats = manifest.phaseStats;
        log('[RESUME] Restored phase stats');
      }

      // Calculate missing phase stats from completedAt timestamps
      const startIdx = PHASE_ORDER.indexOf(startPhase);
      let prevEndTime = manifest.createdAt ? new Date(manifest.createdAt).getTime() : null;

      for (let i = 0; i < startIdx; i++) {
        const phase = PHASE_ORDER[i];
        const phaseData = manifest.phases && manifest.phases[phase];

        if ((!phaseStats[phase] || phaseStats[phase] === null) && phaseData && phaseData.completedAt) {
          const endTime = new Date(phaseData.completedAt).getTime();
          if (prevEndTime) {
            const duration = endTime - prevEndTime;
            phaseStats[phase] = {
              duration: duration,
              cost: '(n/a)'
            };
            log('[RESUME] Calculated phase ' + phase + ' duration from timestamps: ' + formatTime(duration));
          }
          prevEndTime = endTime;
        } else if (phaseStats[phase] && phaseData && phaseData.completedAt) {
          prevEndTime = new Date(phaseData.completedAt).getTime();
        }
      }

      // Try to estimate missing phase costs from total project cost
      calculateMissingPhaseCosts(manifest, phaseStats);

      // Restore current phase timing
      if (manifest.currentPhaseElapsed) {
        phaseStartTime = Date.now() - (manifest.currentPhaseElapsed * 1000);
        phaseStartCost = manifest.currentPhaseCostStart || 0;
        log('[RESUME] Restored current phase timing: ' + manifest.currentPhaseElapsed + 's');
      }

      // Restore current epic for Phase 4 display
      if (startPhase === '4' && manifest.currentEpic) {
        const epicLoops = manifest.phases && manifest.phases['4'] && manifest.phases['4'].epicLoops;
        if (epicLoops) {
          const epicData = epicLoops.find(e => e.epic === manifest.currentEpic);
          if (epicData) {
            currentEpic = { id: epicData.epic, name: epicData.name };
            log('[RESUME] Restored currentEpic: ' + currentEpic.id + ' - ' + currentEpic.name);
          }
        }
      }

      // Mark earlier phases as complete
      for (let i = 0; i < startIdx; i++) {
        phaseStatus[PHASE_ORDER[i]] = 'complete';
      }
      // Get existing run ID
      pipelineRunId = manifest.pipelineRunId || tracker.getCurrentRunId(PROJECT_PATH);
      if (pipelineRunId) {
        log('[TRACKER] Resuming run ' + pipelineRunId);
      }
    }
  } else if (args.includes('--phase')) {
    const idx = args.indexOf('--phase');
    startPhase = args[idx + 1];
    log('Starting from phase: ' + startPhase);

    // Try to restore existing stats from manifest (for phases that already ran)
    const manifest = readManifest();
    if (manifest) {
      // Restore phase stats from previous runs
      if (manifest.phaseStats) {
        phaseStats = manifest.phaseStats;
        log('[PHASE] Restored phase stats from manifest');
      }

      // Calculate missing phase stats from completedAt timestamps
      // This fills in stats for phases that completed before stats tracking was added
      const startIdx = PHASE_ORDER.indexOf(startPhase);
      let prevEndTime = manifest.createdAt ? new Date(manifest.createdAt).getTime() : null;

      for (let i = 0; i < startIdx; i++) {
        const phase = PHASE_ORDER[i];
        const phaseData = manifest.phases && manifest.phases[phase];

        // If we don't have stats but we have timestamps, calculate duration
        if ((!phaseStats[phase] || phaseStats[phase] === null) && phaseData && phaseData.completedAt) {
          const endTime = new Date(phaseData.completedAt).getTime();
          if (prevEndTime) {
            const duration = endTime - prevEndTime;
            phaseStats[phase] = {
              duration: duration,
              cost: '(n/a)' // Cost not tracked for historical phases
            };
            log('[PHASE] Calculated phase ' + phase + ' duration from timestamps: ' + formatTime(duration));
          }
          prevEndTime = endTime;
        } else if (phaseStats[phase] && phaseData && phaseData.completedAt) {
          // Update prevEndTime even if we have stats
          prevEndTime = new Date(phaseData.completedAt).getTime();
        }
      }

      // Try to estimate missing phase costs from total project cost
      calculateMissingPhaseCosts(manifest, phaseStats);

      // Restore cost baseline
      if (manifest.costBaseline) {
        startingTokens = manifest.costBaseline;
        log('[PHASE] Restored cost baseline: ' + JSON.stringify(startingTokens));
      }
      // Restore elapsed time
      if (manifest.elapsedSeconds) {
        startTime = Date.now() - (manifest.elapsedSeconds * 1000);
        log('[PHASE] Restored elapsed time: ' + manifest.elapsedSeconds + 's');
      }
      // Restore run ID
      if (manifest.pipelineRunId) {
        pipelineRunId = manifest.pipelineRunId;
        log('[PHASE] Restored run ID: ' + pipelineRunId);
      }
      // Restore current epic for Phase 4 display
      if (startPhase === '4' && manifest.currentEpic) {
        // Find epic data from phases[4].epicLoops
        const epicLoops = manifest.phases && manifest.phases['4'] && manifest.phases['4'].epicLoops;
        if (epicLoops) {
          const epicData = epicLoops.find(e => e.epic === manifest.currentEpic);
          if (epicData) {
            currentEpic = { id: epicData.epic, name: epicData.name };
            log('[PHASE] Restored currentEpic: ' + currentEpic.id + ' - ' + currentEpic.name);
          }
        }
      }
    }

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

  // Start live display and cost monitoring
  startDisplayLoop();
  startCostMonitor();

  try {
    for (let i = startIndex; i < PHASE_ORDER.length; i++) {
      const phase = PHASE_ORDER[i];

      // Only use resumeSessionId for the FIRST phase after resume (then clear it)
      const useResumeSession = (i === startIndex) ? resumeSessionId : null;
      // Only use resumeTodoFile for the FIRST phase after resume (then clear it)
      const useResumeTodoFile = (i === startIndex) ? resumeTodoFile : null;

      // Phase 2 has epic looping
      if (phase === '2') {
        const epics = getEpicsFromManifest();
        if (epics.length > 0) {
          log('Phase 2 has ' + epics.length + ' epics to implement');

          // Loop through each epic
          let firstEpic = true;
          while (!allEpicsComplete()) {
            const epic = getNextEpic();
            if (!epic) break;

            currentEpic = epic;
            log('----------------------------------------');
            log('Starting Epic ' + epic.id + ': ' + epic.name);
            log('----------------------------------------');

            // Update manifest with current epic
            updateManifest({ currentEpic: epic.id });

            // Run phase 2 for this epic (only resume session on first epic)
            await runPhase(phase, firstEpic ? useResumeSession : null, firstEpic ? useResumeTodoFile : null);
            firstEpic = false;

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
          await runPhase(phase, useResumeSession, useResumeTodoFile);
        }
      } else {
        // Normal phase (1, 3, 4, 5)
        await runPhase(phase, useResumeSession, useResumeTodoFile);
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
    console.log('\n\x1b[32m  ✓ ALL PHASES COMPLETE!\x1b[0m');
    if (pipelineRunId) {
      console.log('\x1b[36m  Run ID: ' + pipelineRunId + ' (use for analysis)\x1b[0m');
    }

    // Calculate totals from phase stats
    let totalDuration = 0;
    let totalCost = 0;
    let trackedPhases = 0;
    for (const phase of PHASE_ORDER) {
      if (phaseStats[phase]) {
        totalDuration += phaseStats[phase].duration || 0;
        totalCost += parseFloat(phaseStats[phase].cost || 0);
        trackedPhases++;
      }
    }

    // Final summary
    console.log('');
    console.log('\x1b[36m  ════════════════════════════════════════\x1b[0m');
    console.log('\x1b[36m  PIPELINE SUMMARY\x1b[0m');
    console.log('\x1b[36m  ════════════════════════════════════════\x1b[0m');

    // Per-phase breakdown
    for (const phase of PHASE_ORDER) {
      if (phaseStats[phase]) {
        const time = formatTime(phaseStats[phase].duration);
        const cost = phaseStats[phase].cost;
        console.log('  Phase ' + phase + ' (' + PHASE_NAMES[phase] + '): ' + time + ', $' + cost);
      } else if (phaseStatus[phase] === 'complete') {
        console.log('  Phase ' + phase + ' (' + PHASE_NAMES[phase] + '): \x1b[90m(not tracked)\x1b[0m');
      }
    }

    console.log('\x1b[36m  ────────────────────────────────────────\x1b[0m');
    console.log('\x1b[32m  TOTAL TIME:  ' + formatTime(totalDuration) + '\x1b[0m');
    console.log('\x1b[32m  TOTAL COST:  $' + totalCost.toFixed(3) + '\x1b[0m');

    // Also show ccusage total if available
    if (!lastCostData.error) {
      console.log('\x1b[90m  (ccusage session: $' + formatCost(lastCostData.cost_usd) + ')\x1b[0m');
    }
    console.log('');

    // Generate Pipeline Project Summary document
    try {
      const summaryPath = generateProjectSummary(pipelineMode);
      console.log('\x1b[36m  📄 Project Summary: docs/PIPELINE-PROJECT-SUMMARY.md\x1b[0m');
      console.log('');
    } catch (summaryErr) {
      log('[SUMMARY] Error generating summary: ' + summaryErr.message);
    }

  } catch (err) {
    log('Pipeline stopped: ' + err.message);
    stopDisplayLoop();
    renderDashboard();
    console.log('\n\x1b[31m  Pipeline stopped: ' + err.message + '\x1b[0m');
    console.log('  Fix issues and run: node dashboard-v2.cjs --resume\n');
  } finally {
    killWorker();
    stopDisplayLoop();
    stopCostMonitor();
  }
}

main().catch(console.error);
