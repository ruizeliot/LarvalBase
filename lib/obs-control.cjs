#!/usr/bin/env node
/**
 * OBS Control CLI for Pipeline v9.0
 *
 * Simple synchronous CLI to control OBS recording from orchestrator.
 *
 * Usage:
 *   node obs-control.cjs start "Phase3_Bootstrap"  - Start recording with label
 *   node obs-control.cjs stop                      - Stop recording
 *   node obs-control.cjs status                    - Check OBS status (JSON output)
 *
 * Environment:
 *   OBS_PASSWORD - WebSocket password (optional)
 *   OBS_HOST     - WebSocket host (default: ws://localhost:4455)
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (connection failed, OBS not running, etc.)
 */

const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============

const CONFIG = {
  OBS_HOST: process.env.OBS_HOST || 'ws://localhost:4455',
  OBS_PASSWORD: process.env.OBS_PASSWORD || '',
  CONNECT_TIMEOUT: 2000,  // 2 seconds max to detect OBS
};

// ============ MAIN ============

const action = process.argv[2];
const label = process.argv[3];
const projectPath = process.argv[4] || process.cwd();

const MANIFEST_PATH = path.join(projectPath, '.pipeline', 'manifest.json');

function log(msg) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] [OBS] ${msg}`);
}

function logError(msg) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.error(`[${timestamp}] [OBS] ERROR: ${msg}`);
}

function readManifest() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    return null;
  }
}

function writeManifest(manifest) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  } catch (err) {
    logError(`Failed to write manifest: ${err.message}`);
  }
}

function addRecordingToManifest(label) {
  const manifest = readManifest();
  if (!manifest) return;

  if (!manifest.recordings) manifest.recordings = [];
  manifest.recordings.push({
    label,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    path: null,
  });
  writeManifest(manifest);
}

function updateLastRecording(outputPath) {
  const manifest = readManifest();
  if (!manifest || !manifest.recordings || manifest.recordings.length === 0) return;

  const last = manifest.recordings[manifest.recordings.length - 1];
  last.stoppedAt = new Date().toISOString();
  last.path = outputPath;
  writeManifest(manifest);
}

async function main() {
  if (!action || !['start', 'stop', 'status'].includes(action)) {
    console.log('Usage:');
    console.log('  node obs-control.cjs start "Phase3_Bootstrap" [projectPath]');
    console.log('  node obs-control.cjs stop [projectPath]');
    console.log('  node obs-control.cjs status');
    process.exit(1);
  }

  // Load OBS WebSocket
  let OBSWebSocket;
  try {
    const module = await import('obs-websocket-js');
    OBSWebSocket = module.default || module.OBSWebSocket;
  } catch (err) {
    try {
      OBSWebSocket = require('obs-websocket-js').default;
    } catch (err2) {
      logError('obs-websocket-js not found. Install with: npm install obs-websocket-js');
      process.exit(1);
    }
  }

  // Connect to OBS with timeout
  const obs = new OBSWebSocket();

  // Race between connection and timeout
  const connectWithTimeout = () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONFIG.CONNECT_TIMEOUT);

      obs.connect(CONFIG.OBS_HOST, CONFIG.OBS_PASSWORD || undefined)
        .then(() => {
          clearTimeout(timeout);
          resolve(true);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  };

  try {
    await connectWithTimeout();
  } catch (err) {
    // OBS not available - skip silently (exit 0, not error)
    if (action === 'status') {
      console.log(JSON.stringify({ available: false, connected: false, recording: false }));
    } else {
      log(`OBS not running - skipping recording`);
      console.log('OBS_NOT_AVAILABLE');
    }
    process.exit(0);  // Success - orchestrator continues
  }

  try {
    switch (action) {
      case 'start': {
        if (!label) {
          logError('Label required for start. Usage: node obs-control.cjs start "Phase3_Bootstrap"');
          process.exit(1);
        }

        // Check if already recording
        const status = await obs.call('GetRecordStatus');
        if (status.outputActive) {
          log('Already recording - stopping first...');
          await obs.call('StopRecord');
          // Brief pause
          await new Promise(r => setTimeout(r, 1000));
        }

        // Start recording
        await obs.call('StartRecord');
        log(`Recording started: ${label}`);

        // Save to manifest
        addRecordingToManifest(label);

        // Output for bash capture
        console.log(`RECORDING_STARTED:${label}`);
        break;
      }

      case 'stop': {
        const status = await obs.call('GetRecordStatus');
        if (!status.outputActive) {
          log('No active recording to stop');
          console.log('RECORDING_STOPPED:none');
          break;
        }

        const result = await obs.call('StopRecord');
        const outputPath = result?.outputPath || 'unknown';
        log(`Recording stopped: ${outputPath}`);

        // Update manifest
        updateLastRecording(outputPath);

        // Output for bash capture
        console.log(`RECORDING_STOPPED:${outputPath}`);
        break;
      }

      case 'status': {
        const status = await obs.call('GetRecordStatus');
        const result = {
          available: true,
          connected: true,
          recording: status.outputActive,
          duration: status.outputDuration || 0,
          bytes: status.outputBytes || 0,
        };
        console.log(JSON.stringify(result));
        break;
      }
    }
  } catch (err) {
    logError(`OBS command failed: ${err.message}`);
    process.exit(1);
  } finally {
    obs.disconnect();
  }

  process.exit(0);
}

main();
