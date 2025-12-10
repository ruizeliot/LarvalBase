#!/usr/bin/env node
/**
 * Pipeline v7.0 Dashboard
 *
 * DISPLAY ONLY - reads from manifest.json and renders UI.
 * Sends HEARTBEAT to orchestrator to wake it up.
 *
 * The orchestrator is responsible for:
 * - Reading worker terminal content
 * - Parsing progress information
 * - Writing all data to manifest.json
 *
 * The dashboard just displays what's in manifest.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============ CONFIGURATION ============

const PROJECT_PATH = process.argv[2] || process.cwd();
const ORCHESTRATOR_HWND = process.argv[3] || null;
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const REFRESH_INTERVAL = 2000; // 2 seconds
const HEARTBEAT_INTERVAL = 3 * 60 * 1000; // 3 minutes

const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

let heartbeatCount = 0;

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    }
  } catch (err) {}
  return null;
}

function formatTime(ms) {
  if (!ms || ms < 0) return '--:--';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + 'm ' + s.toString().padStart(2, '0') + 's';
}

function formatCost(usd) {
  if (usd === undefined || usd === null) return '$-.--';
  return '$' + parseFloat(usd).toFixed(2);
}

function renderProgressBar(completed, total, width = 20) {
  if (total === 0) return '.'.repeat(width);
  const filled = Math.floor((completed / total) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function render() {
  const manifest = readManifest();
  if (!manifest) {
    console.log('Waiting for manifest...');
    return;
  }

  clearScreen();

  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  console.log('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  PIPELINE DASHBOARD                                  \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  Project: ' + projectName.padEnd(15).slice(0, 15) + '  │  Mode: ' + mode.padEnd(10).slice(0, 10) + '   \x1b[36m║\x1b[0m');
  console.log('\x1b[36m╠══════════════════════════════════════════════════════╣\x1b[0m');
  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  \x1b[1mPHASES\x1b[0m                                              \x1b[36m║\x1b[0m');

  const phases = ['1', '2', '3', '4', '5'];
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[phase];

    let icon = '[ ]';
    let color = '';
    if (status === 'complete') {
      icon = '\x1b[32m[✓]\x1b[0m';
    } else if (status === 'running') {
      icon = '\x1b[33m[>]\x1b[0m';
      color = '\x1b[33m';
    } else if (status === 'failed') {
      icon = '\x1b[31m[X]\x1b[0m';
    }

    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      stats = '  ' + formatTime(phaseData.duration) + '   ' + formatCost(phaseData.cost);
    } else if (status === 'running' && phaseData.startedAt) {
      const elapsed = Date.now() - new Date(phaseData.startedAt).getTime();
      stats = '  ' + formatTime(elapsed);
    }

    console.log('\x1b[36m║\x1b[0m  ' + icon + ' ' + phase + '. ' + color + name.padEnd(12) + '\x1b[0m' + stats.padEnd(30).slice(0, 30) + ' \x1b[36m║\x1b[0m');

    if (phase === '4' && manifest.epics && manifest.epics.length > 0) {
      for (const epic of manifest.epics) {
        let epicIcon = '[ ]';
        if (epic.status === 'complete') epicIcon = '\x1b[32m[✓]\x1b[0m';
        else if (epic.status === 'running') epicIcon = '\x1b[33m[>]\x1b[0m';
        const epicName = ('Epic ' + epic.id + ': ' + epic.name).slice(0, 40);
        console.log('\x1b[36m║\x1b[0m      ' + epicIcon + ' ' + epicName.padEnd(42) + ' \x1b[36m║\x1b[0m');
      }
    }
  }

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  \x1b[1mWORKER PROGRESS\x1b[0m                                     \x1b[36m║\x1b[0m');

  const currentPhase = manifest.currentPhase;
  const workerProgress = manifest.phases?.[currentPhase]?.workerProgress;

  if (!workerProgress || workerProgress.total === 0) {
    console.log('\x1b[36m║\x1b[0m  \x1b[90m(Waiting for orchestrator update...)\x1b[0m               \x1b[36m║\x1b[0m');
  } else {
    const pct = Math.round((workerProgress.completed / workerProgress.total) * 100);
    const bar = renderProgressBar(workerProgress.completed, workerProgress.total);
    console.log('\x1b[36m║\x1b[0m  [' + bar + '] ' + pct + '%  (' + workerProgress.completed + '/' + workerProgress.total + ' todos)       \x1b[36m║\x1b[0m');
    if (workerProgress.currentTask) {
      const task = workerProgress.currentTask.slice(0, 44);
      console.log('\x1b[36m║\x1b[0m  \x1b[90m' + task.padEnd(44) + '\x1b[0m     \x1b[36m║\x1b[0m');
    }
  }

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  \x1b[1mCOST\x1b[0m                                                \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  This run: ' + formatCost(manifest.totalCost || 0) + '                                  \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');

  if (manifest.status === 'complete') {
    console.log('\n\x1b[32m  ✓ PIPELINE COMPLETE\x1b[0m');
  } else if (manifest.status === 'paused') {
    console.log('\n\x1b[33m  ⏸ PIPELINE PAUSED\x1b[0m');
  }
}

function sendHeartbeat() {
  if (!ORCHESTRATOR_HWND) return;
  const manifest = readManifest();
  if (!manifest || manifest.status === 'complete' || manifest.status === 'paused') return;

  heartbeatCount++;
  console.log('\n[HEARTBEAT ' + heartbeatCount + '] Pinging orchestrator...');

  try {
    const scriptPath = path.join(PROJECT_PATH, '.pipeline', 'sendkeys.ps1');
    const psScript = `Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
Add-Type -AssemblyName System.Windows.Forms
try {
    \$hwnd = [IntPtr]${ORCHESTRATOR_HWND}
    if (\$hwnd -ne [IntPtr]::Zero) {
        \$activated = [Win32]::SetForegroundWindow(\$hwnd)
        if (\$activated) {
            Start-Sleep -Milliseconds 300
            [System.Windows.Forms.SendKeys]::SendWait('HEARTBEAT')
            [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
        }
    }
} catch {}`;

    fs.writeFileSync(scriptPath, psScript);
    spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdio: 'pipe', detached: false, shell: false
    }).on('close', (code) => {
      console.log('[HEARTBEAT ' + heartbeatCount + '] Done (exit ' + code + ')');
    });
  } catch (err) {}
}

function main() {
  console.log('Pipeline Dashboard v7.0');
  console.log('========================');
  console.log('Project: ' + PROJECT_PATH);
  console.log('Mode: Display only (orchestrator writes progress)');
  if (ORCHESTRATOR_HWND) console.log('Heartbeat: every 3min to HWND ' + ORCHESTRATOR_HWND);
  console.log('');

  render();
  setInterval(render, REFRESH_INTERVAL);

  if (ORCHESTRATOR_HWND) {
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    setTimeout(sendHeartbeat, 5 * 1000);
  }

  process.on('SIGINT', function() {
    console.log('\nDashboard stopped.');
    process.exit(0);
  });
}

main();
