#!/usr/bin/env node
/**
 * Analysis Pipeline Dashboard v6.0
 *
 * Orchestrates the 3-phase analysis pipeline:
 *   Phase A: Initial Analysis (metrics extraction, AI diagnosis)
 *   Phase B: Improvement Testing (isolated test runs)
 *   Phase C: Validation & Auto-Apply
 *
 * Usage:
 *   node dashboard-analysis.cjs <project-path>              # Run all phases
 *   node dashboard-analysis.cjs <project-path> --phase A    # Run specific phase
 *   node dashboard-analysis.cjs <project-path> --resume     # Resume from last phase
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPT_DIR = __dirname;

// ============ CONFIGURATION ============

const PHASES = ['A', 'B', 'C'];

const PHASE_SCRIPTS = {
  A: 'run-analysis-phase-a.cjs',
  B: 'run-analysis-phase-b.cjs',
  C: 'run-analysis-phase-c.cjs'
};

const PHASE_NAMES = {
  A: 'Initial Analysis',
  B: 'Improvement Testing',
  C: 'Validation & Apply'
};

const PHASE_COMPLETION_MARKERS = {
  A: 'ANALYSIS:PHASE-A-COMPLETE',
  B: 'ANALYSIS:PHASE-B-COMPLETE',
  C: 'ANALYSIS:COMPLETE'
};

// ============ STATE ============

let projectPath = null;
let projectName = null;
let runId = null;
let analysisDir = null;
let currentPhase = 'A';
let phaseStatus = { A: 'pending', B: 'pending', C: 'pending' };
let startTime = Date.now();
let displayInterval = null;
let activeProcess = null;
let logFile = null;
let lastOutput = [];

// ============ DISPLAY ============

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function renderDashboard() {
  clearScreen();
  const elapsed = Date.now() - startTime;

  console.log('\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[36m  ANALYSIS PIPELINE DASHBOARD v6.0\x1b[0m');
  console.log('\x1b[36m  Project: ' + projectName + '\x1b[0m');
  console.log('\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m\n');

  // Phase checklist
  for (const phase of PHASES) {
    let icon = '[ ]';
    let color = '';
    if (phaseStatus[phase] === 'complete') {
      icon = '\x1b[32m[x]\x1b[0m';
    } else if (phaseStatus[phase] === 'running') {
      icon = '\x1b[33m[>]\x1b[0m';
      color = '\x1b[33m';
    } else if (phaseStatus[phase] === 'failed') {
      icon = '\x1b[31m[X]\x1b[0m';
    }
    console.log(`  ${icon} Phase ${phase}: ${PHASE_NAMES[phase]}${color ? color + ' [Running]' + '\x1b[0m' : ''}`);
  }

  console.log('');
  console.log('\x1b[36m───────────────────────────────────────────────────────────────\x1b[0m');
  console.log(`  Run ID: ${runId}`);
  console.log(`  Current Phase: \x1b[33m${currentPhase} - ${PHASE_NAMES[currentPhase]}\x1b[0m`);
  console.log(`  Elapsed: ${formatTime(elapsed)}`);
  console.log('\x1b[36m───────────────────────────────────────────────────────────────\x1b[0m\n');

  // Recent output
  console.log('\x1b[36m  RECENT OUTPUT:\x1b[0m');
  const recentLines = lastOutput.slice(-10);
  if (recentLines.length === 0) {
    console.log('  \x1b[90m(Waiting for output...)\x1b[0m');
  } else {
    for (const line of recentLines) {
      const truncated = line.length > 70 ? line.substring(0, 67) + '...' : line;
      console.log(`  ${truncated}`);
    }
  }

  console.log('\n\x1b[36m───────────────────────────────────────────────────────────────\x1b[0m');
  console.log(`  \x1b[90mLog: ${logFile}\x1b[0m`);
  console.log('\x1b[36m───────────────────────────────────────────────────────────────\x1b[0m');
}

function startDisplayLoop() {
  if (!displayInterval) {
    displayInterval = setInterval(renderDashboard, 2000);
    renderDashboard();
  }
}

function stopDisplayLoop() {
  if (displayInterval) {
    clearInterval(displayInterval);
    displayInterval = null;
  }
}

// ============ LOGGING ============

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (logFile) {
    fs.appendFileSync(logFile, line + '\n');
  }
  lastOutput.push(msg);
  if (lastOutput.length > 50) {
    lastOutput.shift();
  }
}

// ============ PHASE EXECUTION ============

function spawnPhase(phase) {
  const script = PHASE_SCRIPTS[phase];
  const scriptPath = path.join(SCRIPT_DIR, script);

  log(`Starting Phase ${phase}: ${PHASE_NAMES[phase]}`);
  phaseStatus[phase] = 'running';
  currentPhase = phase;

  const args = [scriptPath, projectPath, '--run-id', runId];

  // Add auto-apply for Phase C
  if (phase === 'C') {
    args.push('--auto-apply');
  }

  activeProcess = spawn('node', args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  activeProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      log(line);

      // Check for completion marker
      const marker = PHASE_COMPLETION_MARKERS[phase];
      if (line.includes(marker)) {
        onPhaseComplete(phase);
      }
    }
  });

  activeProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      log(`[STDERR] ${line}`);
    }
  });

  activeProcess.on('exit', (code) => {
    if (code !== 0 && phaseStatus[phase] !== 'complete') {
      log(`Phase ${phase} exited with code ${code}`);
      phaseStatus[phase] = 'failed';
      onPipelineError(phase);
    }
  });
}

function onPhaseComplete(phase) {
  phaseStatus[phase] = 'complete';
  log(`Phase ${phase} complete`);

  // Find next phase
  const idx = PHASES.indexOf(phase);
  if (idx < PHASES.length - 1) {
    const nextPhase = PHASES[idx + 1];
    log(`Starting next phase: ${nextPhase}`);
    setTimeout(() => spawnPhase(nextPhase), 2000);
  } else {
    onPipelineComplete();
  }
}

function onPipelineComplete() {
  stopDisplayLoop();
  renderDashboard();

  console.log('\n\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[32m  ANALYSIS PIPELINE COMPLETE!\x1b[0m');
  console.log('\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m\n');

  console.log(`Results: ${analysisDir}`);
  console.log(`Summary: ${path.join(analysisDir, 'final-summary.md')}\n`);

  process.exit(0);
}

function onPipelineError(phase) {
  stopDisplayLoop();
  renderDashboard();

  console.log('\n\x1b[31m═══════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`\x1b[31m  ANALYSIS PIPELINE FAILED AT PHASE ${phase}\x1b[0m`);
  console.log('\x1b[31m═══════════════════════════════════════════════════════════════\x1b[0m\n');

  console.log(`Check log: ${logFile}\n`);

  process.exit(1);
}

// ============ MANIFEST ============

function getManifestState() {
  const manifestPath = path.join(analysisDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  return null;
}

function saveManifestState() {
  const manifestPath = path.join(analysisDir, 'manifest.json');
  const state = {
    version: '6.0',
    project: projectName,
    run_id: runId,
    current_phase: currentPhase,
    phase_status: phaseStatus,
    started_at: new Date(startTime).toISOString(),
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(manifestPath, JSON.stringify(state, null, 2));
}

// ============ ARGUMENT PARSING ============

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    projectPath: null,
    phase: null,
    resume: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) {
      result.phase = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === '--resume') {
      result.resume = true;
    } else if (!result.projectPath) {
      result.projectPath = path.resolve(args[i]);
    }
  }

  return result;
}

// ============ MAIN ============

function main() {
  const args = parseArgs();

  if (!args.projectPath) {
    console.log('Analysis Pipeline Dashboard v6.0');
    console.log('');
    console.log('Usage:');
    console.log('  node dashboard-analysis.cjs <project-path>');
    console.log('  node dashboard-analysis.cjs <project-path> --phase A|B|C');
    console.log('  node dashboard-analysis.cjs <project-path> --resume');
    console.log('');
    console.log('Phases:');
    console.log('  A - Initial Analysis (metrics, AI diagnosis)');
    console.log('  B - Improvement Testing (isolated test runs)');
    console.log('  C - Validation & Auto-Apply');
    process.exit(1);
  }

  projectPath = args.projectPath;
  projectName = path.basename(projectPath);
  runId = `analysis-${Date.now()}`;
  analysisDir = path.join(projectPath, '.pipeline', 'analysis', runId);

  // Create analysis directory
  fs.mkdirSync(analysisDir, { recursive: true });

  // Setup logging
  logFile = path.join(analysisDir, 'dashboard.log');

  log('Analysis Pipeline Dashboard started');
  log(`Project: ${projectPath}`);
  log(`Run ID: ${runId}`);

  // Handle resume
  if (args.resume) {
    // Find most recent analysis directory
    const analysisRoot = path.join(projectPath, '.pipeline', 'analysis');
    if (fs.existsSync(analysisRoot)) {
      const dirs = fs.readdirSync(analysisRoot)
        .filter(d => d.startsWith('analysis-'))
        .sort()
        .reverse();

      if (dirs.length > 0) {
        runId = dirs[0];
        analysisDir = path.join(analysisRoot, runId);
        logFile = path.join(analysisDir, 'dashboard.log');

        const state = getManifestState();
        if (state) {
          phaseStatus = state.phase_status || phaseStatus;
          log(`Resuming from phase ${state.current_phase}`);
        }
      }
    }
  }

  // Determine starting phase
  let startPhase = 'A';
  if (args.phase) {
    startPhase = args.phase;
  } else if (args.resume) {
    // Find first incomplete phase
    for (const phase of PHASES) {
      if (phaseStatus[phase] !== 'complete') {
        startPhase = phase;
        break;
      }
    }
  }

  // Mark previous phases as complete if starting later
  const startIdx = PHASES.indexOf(startPhase);
  for (let i = 0; i < startIdx; i++) {
    phaseStatus[PHASES[i]] = 'complete';
  }

  // Save initial state
  saveManifestState();

  // Start display
  startDisplayLoop();

  // Start first phase
  setTimeout(() => spawnPhase(startPhase), 1000);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  log('Interrupted by user');
  stopDisplayLoop();
  if (activeProcess) {
    activeProcess.kill();
  }
  process.exit(130);
});

main();
