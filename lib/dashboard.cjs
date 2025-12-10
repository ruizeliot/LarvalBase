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
const ORCHESTRATOR_PID = process.argv[3] || null;
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const REFRESH_INTERVAL = 2000; // 2 seconds
const DEFAULT_HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes (default)

const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

let heartbeatCount = 0;
let lastHeartbeatTime = null;
let nextHeartbeatTime = null;

function writeManifest(manifest) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to write manifest:', err.message);
    return false;
  }
}

function handleResume() {
  const manifest = readManifest();
  if (!manifest) return;

  // Check if we're resuming from a pause
  if (manifest.pausedAt) {
    const pausedAt = new Date(manifest.pausedAt).getTime();
    const now = Date.now();
    const pauseDuration = now - pausedAt;

    // Add pause duration to total
    manifest.totalPausedMs = (manifest.totalPausedMs || 0) + pauseDuration;
    manifest.pausedAt = null;
    manifest.dashboardAlive = true;

    writeManifest(manifest);
    console.log('Resumed from pause. Added ' + formatTime(pauseDuration) + ' to paused time.');
    console.log('Total paused time: ' + formatTime(manifest.totalPausedMs));
  } else {
    // Mark dashboard as alive
    manifest.dashboardAlive = true;
    writeManifest(manifest);
  }
}

function handlePause() {
  const manifest = readManifest();
  if (!manifest) return;

  // Only record pause if pipeline is still running
  if (manifest.status !== 'complete' && manifest.status !== 'paused') {
    manifest.pausedAt = new Date().toISOString();
    manifest.dashboardAlive = false;
    writeManifest(manifest);
    console.log('Dashboard stopping. Recorded pause time.');
  }
}

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

function formatDate(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return day + ' ' + month + ' ' + year;
}

function formatCountdown(ms) {
  if (!ms || ms <= 0) return '0:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + ':' + s.toString().padStart(2, '0');
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
    clearScreen();
    console.log('Waiting for manifest...');
    return;
  }

  // Build output first, then clear and print
  const lines = [];

  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  lines.push('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  PIPELINE DASHBOARD                                  \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  Project: ' + projectName.padEnd(15).slice(0, 15) + '  │  Mode: ' + mode.padEnd(10).slice(0, 10) + '   \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m╠══════════════════════════════════════════════════════╣\x1b[0m');

  // Duration and start date (active time, excluding pauses)
  let durationLine = '';
  if (manifest.createdAt) {
    const startDate = formatDate(manifest.createdAt);
    const totalElapsed = Date.now() - new Date(manifest.createdAt).getTime();
    const pausedMs = manifest.totalPausedMs || 0;
    const activeMs = totalElapsed - pausedMs;
    const duration = formatTime(activeMs);
    durationLine = 'Started: ' + startDate + '  │  Active: ' + duration;
  }
  lines.push('\x1b[36m║\x1b[0m  ' + durationLine.padEnd(52).slice(0, 52) + '\x1b[36m║\x1b[0m');

  // PIDs line
  const orchPid = manifest.orchestratorPid || '--';
  const workerPid = manifest.workerPid || '--';
  const pidsLine = 'Orchestrator: ' + orchPid + '  │  Worker: ' + workerPid;
  lines.push('\x1b[36m║\x1b[0m  ' + pidsLine.padEnd(52).slice(0, 52) + '\x1b[36m║\x1b[0m');

  lines.push('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mPHASES\x1b[0m                                              \x1b[36m║\x1b[0m');

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

    lines.push('\x1b[36m║\x1b[0m  ' + icon + ' ' + phase + '. ' + color + name.padEnd(12) + '\x1b[0m' + stats.padEnd(30).slice(0, 30) + ' \x1b[36m║\x1b[0m');

    if (phase === '4' && manifest.epics && manifest.epics.length > 0) {
      for (const epic of manifest.epics) {
        let epicIcon = '[ ]';
        let epicSuffix = '';
        if (epic.status === 'complete' && epic.e2eVerified) {
          epicIcon = '\x1b[32m[✓]\x1b[0m';
          epicSuffix = ' \x1b[32m(verified)\x1b[0m';
        } else if (epic.status === 'complete' && !epic.e2eVerified) {
          epicIcon = '\x1b[33m[?]\x1b[0m';
          epicSuffix = ' \x1b[33m(unverified)\x1b[0m';
        } else if (epic.status === 'verifying') {
          epicIcon = '\x1b[36m[~]\x1b[0m';
          epicSuffix = ' \x1b[36m(testing...)\x1b[0m';
        } else if (epic.status === 'failed') {
          epicIcon = '\x1b[31m[X]\x1b[0m';
          epicSuffix = ' \x1b[31m(fix #' + (epic.fixAttempts || 1) + ')\x1b[0m';
        } else if (epic.status === 'running') {
          epicIcon = '\x1b[33m[>]\x1b[0m';
        }
        const epicName = ('Epic ' + epic.id + ': ' + epic.name).slice(0, 30);
        lines.push('\x1b[36m║\x1b[0m      ' + epicIcon + ' ' + epicName + epicSuffix.padEnd(20).slice(0, 20) + ' \x1b[36m║\x1b[0m');
      }
    }
  }

  lines.push('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mWORKER PROGRESS\x1b[0m                                     \x1b[36m║\x1b[0m');

  const currentPhase = manifest.currentPhase;
  const workerProgress = manifest.phases?.[currentPhase]?.workerProgress;

  if (!workerProgress || workerProgress.total === 0) {
    lines.push('\x1b[36m║\x1b[0m  \x1b[90m(Waiting for orchestrator update...)\x1b[0m               \x1b[36m║\x1b[0m');
  } else {
    const pct = Math.round((workerProgress.completed / workerProgress.total) * 100);
    const bar = renderProgressBar(workerProgress.completed, workerProgress.total);
    lines.push('\x1b[36m║\x1b[0m  [' + bar + '] ' + pct + '%  (' + workerProgress.completed + '/' + workerProgress.total + ' todos)       \x1b[36m║\x1b[0m');
    if (workerProgress.currentTask) {
      const task = workerProgress.currentTask.slice(0, 44);
      lines.push('\x1b[36m║\x1b[0m  \x1b[90m' + task.padEnd(44) + '\x1b[0m     \x1b[36m║\x1b[0m');
    }
  }

  lines.push('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  \x1b[1mCOST\x1b[0m                                                \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m  This run: ' + formatCost(manifest.totalCost || 0) + '                                  \x1b[36m║\x1b[0m');
  lines.push('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');

  // Heartbeat status
  if (ORCHESTRATOR_PID && manifest.status !== 'complete' && manifest.status !== 'paused') {
    const heartbeatEnabled = !(manifest.heartbeat && manifest.heartbeat.enabled === false);
    if (heartbeatEnabled && nextHeartbeatTime) {
      const countdown = nextHeartbeatTime - Date.now();
      const countdownStr = countdown > 0 ? formatCountdown(countdown) : 'NOW';
      const intervalMs = getHeartbeatInterval(manifest);
      const intervalStr = Math.round(intervalMs / 1000) + 's';
      lines.push('\x1b[36m║\x1b[0m  \x1b[1mHEARTBEAT\x1b[0m  Next: ' + countdownStr + ' (every ' + intervalStr + ')'.padEnd(20) + ' \x1b[36m║\x1b[0m');
    } else {
      lines.push('\x1b[36m║\x1b[0m  \x1b[1mHEARTBEAT\x1b[0m  \x1b[33mPAUSED\x1b[0m (Phase 1 interactive)          \x1b[36m║\x1b[0m');
    }
    lines.push('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  }

  lines.push('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');

  if (manifest.status === 'complete') {
    lines.push('\n\x1b[32m  ✓ PIPELINE COMPLETE\x1b[0m');
  } else if (manifest.status === 'paused') {
    lines.push('\n\x1b[33m  ⏸ PIPELINE PAUSED\x1b[0m');
  }

  // Now clear and print in one go
  clearScreen();
  console.log(lines.join('\n'));
}

function getHeartbeatInterval(manifest) {
  if (manifest && manifest.heartbeat && manifest.heartbeat.intervalMs) {
    return manifest.heartbeat.intervalMs;
  }
  return DEFAULT_HEARTBEAT_INTERVAL;
}

function scheduleNextHeartbeat() {
  if (!ORCHESTRATOR_PID) return;
  const manifest = readManifest();
  const interval = getHeartbeatInterval(manifest);
  nextHeartbeatTime = Date.now() + interval;
  setTimeout(sendHeartbeat, interval);
}

function sendHeartbeat() {
  if (!ORCHESTRATOR_PID) return;
  const manifest = readManifest();

  // Always schedule next heartbeat first (so it keeps running)
  scheduleNextHeartbeat();

  // Then check if we should actually send this one
  if (!manifest || manifest.status === 'complete' || manifest.status === 'paused') return;

  // Check if heartbeat is enabled (orchestrator controls this)
  if (manifest.heartbeat && manifest.heartbeat.enabled === false) return;

  const interval = getHeartbeatInterval(manifest);
  heartbeatCount++;
  lastHeartbeatTime = Date.now();
  console.log('\n[HEARTBEAT ' + heartbeatCount + '] Pinging orchestrator PID ' + ORCHESTRATOR_PID + '...');

  try {
    const scriptPath = path.join(PROJECT_PATH, '.pipeline', 'inject-heartbeat.ps1');
    // WriteConsoleInput approach - works without focus, requires conhost.exe (plain PowerShell)
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
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr hConsoleInput,
        INPUT_RECORD[] lpBuffer,
        uint nLength,
        out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll")]
    private static extern int GetLastError();

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

        if (!AttachConsole(targetPid))
        {
            int err = GetLastError();
            return "AttachConsole failed with error: " + err;
        }

        IntPtr hInput = CreateFile(
            "CONIN$",
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            0,
            IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            int err = GetLastError();
            FreeConsole();
            return "CreateFile(CONIN$) failed with error: " + err;
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
            records[i * 2].KeyEvent.wVirtualKeyCode = 0;
            records[i * 2].KeyEvent.wVirtualScanCode = 0;
            records[i * 2].KeyEvent.dwControlKeyState = 0;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
            records[i * 2 + 1].KeyEvent.wVirtualKeyCode = 0;
            records[i * 2 + 1].KeyEvent.wVirtualScanCode = 0;
            records[i * 2 + 1].KeyEvent.dwControlKeyState = 0;
        }

        // Add Enter key event (VK_RETURN = 0x0D)
        if (sendEnter)
        {
            int idx = text.Length * 2;
            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 1;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = (char)13;
            records[idx].KeyEvent.wVirtualKeyCode = 0x0D;
            records[idx].KeyEvent.wVirtualScanCode = 0x1C;
            records[idx].KeyEvent.dwControlKeyState = 0;

            records[idx + 1].EventType = KEY_EVENT;
            records[idx + 1].KeyEvent.bKeyDown = 0;
            records[idx + 1].KeyEvent.wRepeatCount = 1;
            records[idx + 1].KeyEvent.UnicodeChar = (char)13;
            records[idx + 1].KeyEvent.wVirtualKeyCode = 0x0D;
            records[idx + 1].KeyEvent.wVirtualScanCode = 0x1C;
            records[idx + 1].KeyEvent.dwControlKeyState = 0;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        int lastErr = GetLastError();

        CloseHandle(hInput);
        FreeConsole();

        if (result)
        {
            return "Success! Wrote " + written + " events";
        }
        else
        {
            return "WriteConsoleInput failed with error: " + lastErr;
        }
    }
}
'@

# Send text first
$result1 = [ConsoleInjector]::SendString(${ORCHESTRATOR_PID}, "HEARTBEAT", $false)
Write-Output "Text: $result1"

# Wait 1 second
Start-Sleep -Seconds 1

# Send Enter key
$result2 = [ConsoleInjector]::SendString(${ORCHESTRATOR_PID}, "", $true)
Write-Output "Enter: $result2"
`;

    fs.writeFileSync(scriptPath, psScript);
    const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'], detached: false, shell: false
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      console.log('[HEARTBEAT ' + heartbeatCount + '] Result: ' + output.trim() + ' (exit ' + code + ')');
    });
  } catch (err) {
    console.log('[HEARTBEAT ' + heartbeatCount + '] Error: ' + err.message);
  }
}

function main() {
  console.log('Pipeline Dashboard v7.0');
  console.log('========================');
  console.log('Project: ' + PROJECT_PATH);
  console.log('Mode: Display only (orchestrator writes progress)');
  if (ORCHESTRATOR_PID) console.log('Heartbeat: every 5min to PID ' + ORCHESTRATOR_PID + ' (WriteConsoleInput)');
  console.log('');

  // Handle resume from pause (updates totalPausedMs if needed)
  handleResume();

  render();
  setInterval(render, REFRESH_INTERVAL);

  if (ORCHESTRATOR_PID) {
    // Schedule first heartbeat after 5 seconds (give orchestrator time to settle)
    nextHeartbeatTime = Date.now() + 5000;
    setTimeout(sendHeartbeat, 5000);
    // Subsequent heartbeats are scheduled dynamically by sendHeartbeat()
    // Interval can be controlled via manifest.heartbeat.intervalMs
    // Enable/disable via manifest.heartbeat.enabled
  }

  // Handle graceful shutdown - record pause time
  process.on('SIGINT', function() {
    handlePause();
    console.log('\nDashboard stopped.');
    process.exit(0);
  });

  process.on('SIGTERM', function() {
    handlePause();
    console.log('\nDashboard terminated.');
    process.exit(0);
  });

  // Handle uncaught exceptions - still record pause
  process.on('uncaughtException', function(err) {
    console.error('\nDashboard error:', err.message);
    handlePause();
    process.exit(1);
  });
}

main();
