#!/usr/bin/env node
/**
 * Dashboard Runner v11
 *
 * Standalone runner for the v11 modular dashboard.
 * Uses the lib/dashboard module for rendering.
 *
 * Usage: node dashboard-runner-v11.cjs [projectPath] [orchestratorPID]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const dashboard = require('./dashboard/index.cjs');

// Configuration
const PROJECT_PATH = path.resolve(process.argv[2] || process.cwd());
const ORCHESTRATOR_PID = process.argv[3] || null;
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const REFRESH_INTERVAL = 1000;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Read manifest from disk
 * @returns {Object|null}
 */
function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Ignore parse errors, return null
  }
  return null;
}

/**
 * Send heartbeat message to orchestrator
 */
function sendHeartbeat() {
  if (!ORCHESTRATOR_PID) return;

  const heartbeatPath = path.join(PROJECT_PATH, '.pipeline', 'heartbeat.txt');
  const message = `HEARTBEAT from dashboard at ${new Date().toISOString()}`;

  try {
    fs.writeFileSync(heartbeatPath, message);
  } catch (err) {
    // Ignore write errors
  }
}

/**
 * Main dashboard loop
 */
function main() {
  console.log(`Dashboard Runner v11.0`);
  console.log(`Project: ${PROJECT_PATH}`);
  console.log(`Orchestrator PID: ${ORCHESTRATOR_PID || 'N/A'}`);
  console.log('');

  // Create dashboard controller
  const ctrl = dashboard.createDashboard({ refreshInterval: 0 });

  // Initial manifest read
  let manifest = readManifest();

  if (!manifest) {
    console.log(dashboard.colors.warning('Waiting for manifest...'));
  }

  // Hide cursor and clear screen
  dashboard.hideCursor();
  dashboard.clearScreen();

  // Render loop
  const renderLoop = setInterval(() => {
    manifest = readManifest();

    if (manifest) {
      dashboard.clearScreen();
      console.log(dashboard.render(manifest));
    }
  }, REFRESH_INTERVAL);

  // Heartbeat loop
  const heartbeatLoop = setInterval(() => {
    sendHeartbeat();
  }, HEARTBEAT_INTERVAL);

  // Send initial heartbeat
  sendHeartbeat();

  // Handle keyboard input
  const inputHandler = dashboard.createInputHandler({
    onQuit: () => {
      cleanup();
      process.exit(0);
    },
    onPause: () => {
      clearInterval(heartbeatLoop);
      console.log('Heartbeat paused');
    },
    onResume: () => {
      sendHeartbeat();
    },
    onKill: () => {
      // Kill worker - write message file
      const killPath = path.join(PROJECT_PATH, '.pipeline', 'kill-worker.txt');
      fs.writeFileSync(killPath, 'KILL');
      console.log('Kill signal sent');
    }
  });

  inputHandler.start();

  // Cleanup function
  function cleanup() {
    clearInterval(renderLoop);
    clearInterval(heartbeatLoop);
    inputHandler.stop();
    dashboard.showCursor();
  }

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
