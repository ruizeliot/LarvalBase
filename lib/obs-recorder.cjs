#!/usr/bin/env node
/**
 * OBS Recording Automation for Pipeline v9.0
 *
 * Automatically records pipeline phases and epics:
 * - Starts recording when a phase/epic begins
 * - Stops recording, waits 10s, starts new recording on phase/epic change
 * - Stops final recording when pipeline completes
 *
 * Usage:
 *   node obs-recorder.cjs /path/to/project
 *
 * Environment:
 *   OBS_PASSWORD - WebSocket password (from OBS Tools > WebSocket Server Settings)
 *   OBS_HOST     - WebSocket host (default: ws://localhost:4455)
 */

const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============

const CONFIG = {
  OBS_HOST: process.env.OBS_HOST || 'ws://localhost:4455',
  OBS_PASSWORD: process.env.OBS_PASSWORD || '',
  DELAY_BETWEEN_RECORDINGS: 10000,  // 10 seconds
  MANIFEST_POLL_INTERVAL: 1000,     // 1 second
  RECONNECT_INTERVAL: 5000,         // 5 seconds
  RECORDING_PREFIX: 'Pipeline_',
};

const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

const PROJECT_PATH = path.resolve(process.argv[2] || process.cwd());
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');

// ============ ANSI COLORS ============

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// ============ STATE ============

let obs = null;
let isConnected = false;
let isRecording = false;
let isTransitioning = false;
let currentRecordingLabel = null;

// State tracking
let lastPhaseStatuses = {};
let lastEpicStatuses = {};
let lastPipelineStatus = null;

// Recording history
let recordings = [];

// ============ LOGGING ============

function log(level, message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = {
    'info': C.cyan + '[OBS]' + C.reset,
    'success': C.green + '[OBS]' + C.reset,
    'warn': C.yellow + '[OBS]' + C.reset,
    'error': C.red + '[OBS]' + C.reset,
    'record': C.red + C.bold + '● REC' + C.reset,
    'stop': C.dim + '○ STOP' + C.reset,
  }[level] || '[OBS]';

  console.log(`${C.dim}${timestamp}${C.reset} ${prefix} ${message}`);
}

// ============ OBS WEBSOCKET ============

let OBSWebSocket;

async function loadOBSWebSocket() {
  try {
    // Try ESM import first (obs-websocket-js v5+)
    const module = await import('obs-websocket-js');
    OBSWebSocket = module.default || module.OBSWebSocket;
    return true;
  } catch (err) {
    try {
      // Fallback to CommonJS require
      OBSWebSocket = require('obs-websocket-js').default;
      return true;
    } catch (err2) {
      log('error', 'obs-websocket-js not found. Install with: npm install obs-websocket-js');
      return false;
    }
  }
}

async function connectOBS() {
  if (!OBSWebSocket) {
    const loaded = await loadOBSWebSocket();
    if (!loaded) return false;
  }

  try {
    obs = new OBSWebSocket();

    // Set up event handlers
    obs.on('ConnectionClosed', () => {
      log('warn', 'Connection closed');
      isConnected = false;
      scheduleReconnect();
    });

    obs.on('ConnectionError', (err) => {
      log('error', `Connection error: ${err.message}`);
      isConnected = false;
    });

    obs.on('RecordStateChanged', (data) => {
      if (data.outputActive) {
        isRecording = true;
        log('record', `Recording active: ${data.outputPath || 'unknown'}`);
      } else {
        isRecording = false;
        log('stop', `Recording stopped: ${data.outputPath || 'unknown'}`);
      }
    });

    // Connect
    log('info', `Connecting to ${CONFIG.OBS_HOST}...`);
    await obs.connect(CONFIG.OBS_HOST, CONFIG.OBS_PASSWORD || undefined);

    isConnected = true;
    log('success', 'Connected to OBS Studio');

    // Check current recording status
    try {
      const status = await obs.call('GetRecordStatus');
      isRecording = status.outputActive;
      if (isRecording) {
        log('info', 'OBS is already recording');
      }
    } catch (err) {
      // Ignore - might not have recording output configured
    }

    return true;
  } catch (err) {
    log('error', `Connection failed: ${err.message}`);
    if (err.message.includes('Authentication')) {
      log('error', 'Check OBS_PASSWORD environment variable');
    }
    isConnected = false;
    return false;
  }
}

let reconnectTimeout = null;

function scheduleReconnect() {
  if (reconnectTimeout) return;

  log('info', `Reconnecting in ${CONFIG.RECONNECT_INTERVAL / 1000}s...`);
  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = null;
    await connectOBS();
  }, CONFIG.RECONNECT_INTERVAL);
}

async function startRecording(label) {
  if (!isConnected) {
    log('warn', 'Not connected to OBS');
    return false;
  }

  if (isRecording) {
    log('warn', 'Already recording');
    return false;
  }

  try {
    await obs.call('StartRecord');
    currentRecordingLabel = label;
    isRecording = true;

    recordings.push({
      label,
      startedAt: new Date().toISOString(),
      stoppedAt: null,
      path: null,
    });

    log('record', `Started: ${label}`);
    return true;
  } catch (err) {
    log('error', `Start recording failed: ${err.message}`);
    return false;
  }
}

async function stopRecording() {
  if (!isConnected) {
    log('warn', 'Not connected to OBS');
    return null;
  }

  if (!isRecording) {
    log('info', 'No active recording to stop');
    return null;
  }

  try {
    const result = await obs.call('StopRecord');
    const outputPath = result?.outputPath || null;

    isRecording = false;

    // Update last recording entry
    if (recordings.length > 0) {
      const last = recordings[recordings.length - 1];
      last.stoppedAt = new Date().toISOString();
      last.path = outputPath;
    }

    log('stop', `Stopped: ${currentRecordingLabel || 'unknown'} → ${outputPath || 'default location'}`);
    currentRecordingLabel = null;

    return outputPath;
  } catch (err) {
    if (err.message.includes('not active')) {
      isRecording = false;
      return null;
    }
    log('error', `Stop recording failed: ${err.message}`);
    return null;
  }
}

async function checkRecordingStatus() {
  if (!isConnected || !obs) return false;

  try {
    const status = await obs.call('GetRecordStatus');
    isRecording = status.outputActive;
    return isRecording;
  } catch (err) {
    return false;
  }
}

// ============ MANIFEST ============

function readManifest() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return null;
    }
    const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function writeManifest(manifest) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  } catch (err) {
    log('error', `Failed to write manifest: ${err.message}`);
  }
}

function updateManifestRecordings() {
  const manifest = readManifest();
  if (!manifest) return;

  manifest.recordings = recordings;
  writeManifest(manifest);
}

// ============ HELPERS ============

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRecordingLabel(type, id, name) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);

  const safeName = (name || 'Unknown')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 30);

  if (type === 'phase') {
    return `Phase${id}_${safeName}_${timestamp}`;
  } else if (type === 'epic') {
    return `Epic${id}_${safeName}_${timestamp}`;
  }
  return `Pipeline_${timestamp}`;
}

// ============ STATE TRANSITIONS ============

async function handleTransition(newType, newId, newName) {
  if (isTransitioning) {
    log('warn', 'Transition already in progress, skipping...');
    return;
  }

  isTransitioning = true;

  try {
    // 1. Stop current recording if active
    await checkRecordingStatus();
    if (isRecording) {
      log('info', 'Stopping current recording...');
      await stopRecording();
      updateManifestRecordings();

      // 2. Wait before starting new recording
      log('info', `Waiting ${CONFIG.DELAY_BETWEEN_RECORDINGS / 1000}s before next recording...`);
      await sleep(CONFIG.DELAY_BETWEEN_RECORDINGS);
    }

    // 3. Start new recording with label
    const label = getRecordingLabel(newType, newId, newName);
    await startRecording(label);
    updateManifestRecordings();

  } finally {
    isTransitioning = false;
  }
}

async function handlePipelineComplete() {
  if (isTransitioning) {
    await sleep(1000);
  }

  log('info', C.bold + 'Pipeline complete - stopping final recording' + C.reset);
  await stopRecording();
  updateManifestRecordings();

  // Print summary
  console.log('\n' + C.bold + '═══════════════════════════════════════════════════' + C.reset);
  console.log(C.bold + '  RECORDING SUMMARY' + C.reset);
  console.log(C.bold + '═══════════════════════════════════════════════════' + C.reset);

  for (const rec of recordings) {
    const duration = rec.stoppedAt && rec.startedAt
      ? Math.round((new Date(rec.stoppedAt) - new Date(rec.startedAt)) / 1000)
      : '?';
    console.log(`  ${C.green}✓${C.reset} ${rec.label}`);
    console.log(`    ${C.dim}Duration: ${duration}s${C.reset}`);
    if (rec.path) {
      console.log(`    ${C.dim}File: ${rec.path}${C.reset}`);
    }
  }

  console.log(C.bold + '═══════════════════════════════════════════════════' + C.reset + '\n');
}

async function checkStateTransitions() {
  if (!isConnected) return;

  const manifest = readManifest();
  if (!manifest) return;

  // Check pipeline complete
  if (manifest.status === 'complete' && lastPipelineStatus !== 'complete') {
    await handlePipelineComplete();
    lastPipelineStatus = manifest.status;
    return;
  }
  lastPipelineStatus = manifest.status;

  // Check phase transitions
  if (manifest.phases) {
    for (const [phase, data] of Object.entries(manifest.phases)) {
      const currentStatus = data.status;
      const previousStatus = lastPhaseStatuses[phase];

      // Phase started running
      if (currentStatus === 'running' && previousStatus !== 'running') {
        const phaseName = PHASE_NAMES[phase] || `Phase${phase}`;
        log('info', `Phase ${phase} (${phaseName}) started`);
        await handleTransition('phase', phase, phaseName);
      }

      lastPhaseStatuses[phase] = currentStatus;
    }
  }

  // Check epic transitions (Phase 4)
  if (manifest.epics && manifest.epics.length > 0) {
    for (const epic of manifest.epics) {
      const currentStatus = epic.status;
      const previousStatus = lastEpicStatuses[epic.id];

      // Epic started running
      if (currentStatus === 'running' && previousStatus !== 'running') {
        log('info', `Epic ${epic.id} (${epic.name}) started`);
        await handleTransition('epic', epic.id, epic.name);
      }

      lastEpicStatuses[epic.id] = currentStatus;
    }
  }
}

// ============ DISPLAY ============

function printBanner() {
  console.log('\n' + C.red + C.bold);
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║     OBS RECORDING AUTOMATION v1.0         ║');
  console.log('  ║     Pipeline Phase/Epic Recorder          ║');
  console.log('  ╚═══════════════════════════════════════════╝' + C.reset);
  console.log();
}

function printStatus() {
  const status = isConnected
    ? C.green + '● Connected' + C.reset
    : C.red + '○ Disconnected' + C.reset;

  const recStatus = isRecording
    ? C.red + C.bold + '● RECORDING' + C.reset + ` (${currentRecordingLabel || 'unknown'})`
    : C.dim + '○ Standby' + C.reset;

  console.log(`  ${C.dim}OBS:${C.reset} ${status}  ${C.dim}|${C.reset}  ${recStatus}`);
  console.log(`  ${C.dim}Project:${C.reset} ${path.basename(PROJECT_PATH)}`);
  console.log(`  ${C.dim}Manifest:${C.reset} ${fs.existsSync(MANIFEST_PATH) ? C.green + 'Found' + C.reset : C.yellow + 'Waiting...' + C.reset}`);
  console.log();
}

// ============ MAIN ============

async function main() {
  printBanner();

  log('info', `Project: ${PROJECT_PATH}`);
  log('info', `Manifest: ${MANIFEST_PATH}`);

  // Check if manifest exists
  if (!fs.existsSync(MANIFEST_PATH)) {
    log('warn', 'Manifest not found - waiting for pipeline to start...');
  }

  // Connect to OBS
  const connected = await connectOBS();
  if (!connected) {
    log('warn', 'Could not connect to OBS. Will retry...');
    scheduleReconnect();
  }

  // Initialize state from current manifest
  const manifest = readManifest();
  if (manifest) {
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

    // Restore recordings from manifest if present
    if (manifest.recordings) {
      recordings = manifest.recordings;
    }

    log('success', 'Initialized state from manifest');

    // Check if any phase/epic is ALREADY running - start recording immediately
    if (isConnected && !isRecording) {
      let alreadyRunning = null;

      // Check phases
      if (manifest.phases) {
        for (const [phase, data] of Object.entries(manifest.phases)) {
          if (data.status === 'running') {
            const phaseName = PHASE_NAMES[phase] || `Phase${phase}`;
            alreadyRunning = { type: 'phase', id: phase, name: phaseName };
            break;
          }
        }
      }

      // Check epics (only if no phase is running)
      if (!alreadyRunning && manifest.epics) {
        for (const epic of manifest.epics) {
          if (epic.status === 'running') {
            alreadyRunning = { type: 'epic', id: epic.id, name: epic.name };
            break;
          }
        }
      }

      // Start recording for already-running phase/epic
      if (alreadyRunning) {
        log('info', `Found already-running ${alreadyRunning.type} ${alreadyRunning.id} (${alreadyRunning.name})`);
        const label = getRecordingLabel(alreadyRunning.type, alreadyRunning.id, alreadyRunning.name);
        await startRecording(label);
        updateManifestRecordings();
      }
    }
  }

  printStatus();

  log('info', 'Watching for state transitions... (Ctrl+C to quit)');
  console.log();

  // Start polling loop
  setInterval(async () => {
    try {
      await checkStateTransitions();
    } catch (err) {
      log('error', `Transition check error: ${err.message}`);
    }
  }, CONFIG.MANIFEST_POLL_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n');
    log('info', 'Shutting down...');

    if (isRecording) {
      log('info', 'Stopping active recording...');
      await stopRecording();
      updateManifestRecordings();
    }

    if (obs) {
      obs.disconnect();
    }

    log('success', 'Goodbye!');
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    log('error', `Uncaught exception: ${err.message}`);
  });

  process.on('unhandledRejection', (err) => {
    log('error', `Unhandled rejection: ${err.message}`);
  });
}

// Run
main().catch(err => {
  log('error', `Fatal error: ${err.message}`);
  process.exit(1);
});
