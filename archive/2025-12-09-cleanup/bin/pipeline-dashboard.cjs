#!/usr/bin/env node
/**
 * pipeline-dashboard.cjs - Global Pipeline Dashboard Launcher
 *
 * Run from any project folder: node ~/Documents/IMT\ Claude/Pipeline-Office/bin/pipeline-dashboard.cjs
 * Or add to PATH and run: pipeline-dashboard
 *
 * Auto-initializes .pipeline folder if it doesn't exist.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get project path (current working directory)
const PROJECT_PATH = process.cwd();
const PIPELINE_DIR = path.join(PROJECT_PATH, '.pipeline');
const DASHBOARD_FILE = path.join(PIPELINE_DIR, 'dashboard.cjs');

// Source dashboard location
const PIPELINE_OFFICE = path.resolve(__dirname, '..');
const SOURCE_DASHBOARD = path.join(PIPELINE_OFFICE, 'lib', 'dashboard-template.cjs');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  Pipeline Dashboard Launcher\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('  Project: ' + PROJECT_PATH);
console.log('');

// Step 1: Create .pipeline folder if needed
if (!fs.existsSync(PIPELINE_DIR)) {
  console.log('\x1b[33m[INIT] Creating .pipeline folder...\x1b[0m');
  fs.mkdirSync(PIPELINE_DIR, { recursive: true });
}

// Step 2: Copy/update dashboard.cjs if needed
if (!fs.existsSync(DASHBOARD_FILE)) {
  console.log('\x1b[33m[INIT] Installing dashboard.cjs...\x1b[0m');

  // Check if template exists
  if (fs.existsSync(SOURCE_DASHBOARD)) {
    fs.copyFileSync(SOURCE_DASHBOARD, DASHBOARD_FILE);
    console.log('\x1b[32m[OK] Dashboard installed from template.\x1b[0m');
  } else {
    // Create minimal dashboard inline
    console.log('\x1b[33m[INIT] Creating minimal dashboard...\x1b[0m');
    createMinimalDashboard(DASHBOARD_FILE, PROJECT_PATH);
    console.log('\x1b[32m[OK] Minimal dashboard created.\x1b[0m');
  }
}

// Step 3: Ensure pipeline-run-tracker.cjs exists
const TRACKER_SOURCE = path.join(PIPELINE_OFFICE, 'lib', 'pipeline-run-tracker.cjs');
if (!fs.existsSync(TRACKER_SOURCE)) {
  console.log('\x1b[33m[INIT] Creating pipeline-run-tracker.cjs...\x1b[0m');
  createMinimalTracker(TRACKER_SOURCE);
}

// Step 4: Create manifest.json if needed
const MANIFEST_FILE = path.join(PIPELINE_DIR, 'manifest.json');
if (!fs.existsSync(MANIFEST_FILE)) {
  console.log('\x1b[33m[INIT] Creating manifest.json...\x1b[0m');
  const manifest = {
    projectId: path.basename(PROJECT_PATH),
    projectPath: PROJECT_PATH,
    currentPhase: '1',
    status: 'pending',
    createdAt: new Date().toISOString(),
    phases: {
      '1': { status: 'pending' },
      '2': { status: 'pending' },
      '3': { status: 'pending' },
      '4': { status: 'pending' },
      '5': { status: 'pending' }
    }
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log('\x1b[32m[OK] Manifest created.\x1b[0m');
}

// Step 5: Create pipeline-runs.json if needed
const RUNS_FILE = path.join(PIPELINE_DIR, 'pipeline-runs.json');
if (!fs.existsSync(RUNS_FILE)) {
  fs.writeFileSync(RUNS_FILE, JSON.stringify({ runs: [] }, null, 2));
}

console.log('');
console.log('\x1b[32m[OK] Pipeline initialized. Starting dashboard...\x1b[0m');
console.log('');

// Step 6: Run the dashboard
try {
  // Pass through any arguments
  const args = process.argv.slice(2).join(' ');
  execSync(`node "${DASHBOARD_FILE}" ${args}`, {
    cwd: PROJECT_PATH,
    stdio: 'inherit'
  });
} catch (err) {
  // Dashboard exited (normal or error)
  process.exit(err.status || 0);
}

// Helper: Create minimal tracker if missing
function createMinimalTracker(trackerPath) {
  const trackerDir = path.dirname(trackerPath);
  if (!fs.existsSync(trackerDir)) {
    fs.mkdirSync(trackerDir, { recursive: true });
  }

  const trackerCode = `
/**
 * pipeline-run-tracker.cjs - Tracks pipeline runs for analysis
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getRunsFile(projectPath) {
  return path.join(projectPath, '.pipeline', 'pipeline-runs.json');
}

function readRuns(projectPath) {
  const file = getRunsFile(projectPath);
  if (!fs.existsSync(file)) return { runs: [] };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { runs: [] };
  }
}

function writeRuns(projectPath, data) {
  const file = getRunsFile(projectPath);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function startRun(projectPath, type, projectId) {
  const data = readRuns(projectPath);
  const runId = type + '-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
  data.runs.push({
    id: runId,
    type,
    projectId,
    startedAt: new Date().toISOString(),
    status: 'running',
    phases: {},
    sessions: []
  });
  writeRuns(projectPath, data);
  return runId;
}

function getCurrentRunId(projectPath) {
  const data = readRuns(projectPath);
  const running = data.runs.find(r => r.status === 'running');
  return running ? running.id : null;
}

function logPhaseSession(projectPath, runId, phase, sessionId, metadata) {
  const data = readRuns(projectPath);
  const run = data.runs.find(r => r.id === runId);
  if (run) {
    run.sessions.push({ phase, sessionId, ...metadata });
    writeRuns(projectPath, data);
  }
}

function completePhase(projectPath, runId, phase) {
  const data = readRuns(projectPath);
  const run = data.runs.find(r => r.id === runId);
  if (run) {
    run.phases[phase] = { status: 'complete', completedAt: new Date().toISOString() };
    writeRuns(projectPath, data);
  }
}

function completeRun(projectPath, runId, status) {
  const data = readRuns(projectPath);
  const run = data.runs.find(r => r.id === runId);
  if (run) {
    run.status = status;
    run.completedAt = new Date().toISOString();
    writeRuns(projectPath, data);
  }
}

module.exports = { startRun, getCurrentRunId, logPhaseSession, completePhase, completeRun };
`;
  fs.writeFileSync(trackerPath, trackerCode.trim());
}

// Helper: Create minimal dashboard if template not found
function createMinimalDashboard(dashboardPath, projectPath) {
  const projectId = path.basename(projectPath);

  // Read the full dashboard from counter-desktop-test-2 as template
  const existingDashboard = path.join(
    path.dirname(__dirname),
    'test-projects',
    'counter-desktop-test-2',
    '.pipeline',
    'dashboard.cjs'
  );

  if (fs.existsSync(existingDashboard)) {
    // Copy and fix the PIPELINE_OFFICE path
    let content = fs.readFileSync(existingDashboard, 'utf8');

    // Replace PIPELINE_OFFICE with absolute path
    // Handles multiple patterns:
    // - path.resolve(__dirname, '..', '..', '...');
    // - 'C:/some/hardcoded/path';
    const pipelineOfficePath = PIPELINE_OFFICE.replace(/\\/g, '/');

    // Pattern 1: path.resolve(...) call
    content = content.replace(
      /const PIPELINE_OFFICE = path\.resolve\(__dirname[^;]+\);/,
      `const PIPELINE_OFFICE = '${pipelineOfficePath}';`
    );

    // Pattern 2: String literal (single or double quotes)
    content = content.replace(
      /const PIPELINE_OFFICE = ['"][^'"]+['"];/,
      `const PIPELINE_OFFICE = '${pipelineOfficePath}';`
    );

    // Also fix PROJECT_ID to use actual project name
    content = content.replace(
      /const PROJECT_ID = ['"][^'"]*['"];/,
      `const PROJECT_ID = '${projectId}';`
    );

    fs.writeFileSync(dashboardPath, content);
  } else {
    // Absolute minimal fallback
    const minimalCode = `#!/usr/bin/env node
console.log('Dashboard not fully initialized.');
console.log('Please copy dashboard.cjs from Pipeline-Office/test-projects/counter-desktop-test-2/.pipeline/');
process.exit(1);
`;
    fs.writeFileSync(dashboardPath, minimalCode);
  }
}
