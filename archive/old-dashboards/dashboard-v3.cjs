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

const PROJECT_PATH = process.argv[2] || process.cwd();
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

// UI State
let expandedPhases = new Set();
let expandedEpics = new Set();

// Timer State
let activeMs = 0;
let lastSaveTime = Date.now();

// Heartbeat State
let heartbeatCount = 0;
let nextHeartbeatTime = null;

// Output Style Injection State
let outputStyleCountdown = null; // ms remaining until output style injection

// ============ MANIFEST HELPERS ============

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
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

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

// Strip ANSI escape codes to get visible length
function visibleLength(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
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

// ============ RENDER ============

function render() {
  const manifest = readManifest();
  if (!manifest) {
    clearScreen();
    console.log('Waiting for manifest...');
    return;
  }

  const lines = [];
  const W = process.stdout.columns || 80;

  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  // Header
  lines.push('\x1b[36m╔' + '═'.repeat(W-2) + '╗\x1b[0m');
  lines.push(line('  \x1b[1mPIPELINE DASHBOARD\x1b[0m', W));
  lines.push(line('  Project: ' + projectName.slice(0,20) + '  │  Mode: ' + mode, W));
  lines.push('\x1b[36m╠' + '═'.repeat(W-2) + '╣\x1b[0m');

  // Timer line
  const timerStr = formatTime(activeMs);
  lines.push(line('  \x1b[1m⏱  Active: ' + timerStr + '\x1b[0m', W));
  lines.push(line('', W));

  // Phases header
  const isFeatureMode = manifest.mode === 'feature';
  const phases = isFeatureMode ? ['1', '2', '3'] : ['1', '2', '3', '4', '5'];
  const phaseHint = isFeatureMode ? '(Press 1-3 to expand)' : '(Press 1-5 to expand)';
  lines.push(line('  \x1b[1mPHASES\x1b[0m  \x1b[90m' + phaseHint + '\x1b[0m', W));

  // Phases
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[phase];
    const isExpanded = expandedPhases.has(phase);
    const hasTodos = phaseData.todoBreakdown && phaseData.todoBreakdown.length > 0;

    // Status icon
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

    // Expand indicator
    let expandIcon = '  ';
    if (hasTodos) {
      expandIcon = isExpanded ? '\x1b[90m▼\x1b[0m ' : '\x1b[90m►\x1b[0m ';
    }

    // Stats
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      const todoCount = phaseData.todoBreakdown ? phaseData.todoBreakdown.length : 0;
      stats = formatTime(phaseData.duration) + '   ' + formatCost(phaseData.cost) + '   ' + formatTokens(phaseData.tokens);
      if (todoCount > 0) stats += '  (' + todoCount + ' todos)';
    } else if (status === 'running' && phaseData.startedAt) {
      const elapsed = Date.now() - new Date(phaseData.startedAt).getTime();
      stats = formatTime(elapsed);
    }

    const phaseLine = icon + ' ' + phase + '. ' + expandIcon + color + name + '\x1b[0m ' + stats;
    lines.push(line('  ' + phaseLine, W));

    // Expanded todo breakdown
    if (isExpanded && hasTodos) {
      const todos = phaseData.todoBreakdown;
      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const isLast = i === todos.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const todoName = truncate(todo.content, 28);
        const todoDur = formatTime(todo.durationMs).padStart(8);
        const todoCost = formatCost(todo.cost).padStart(6);
        lines.push(line('      \x1b[90m' + prefix + '\x1b[0m ' + todoName.padEnd(28) + ' \x1b[90m' + todoDur + '  ' + todoCost + '\x1b[0m', W));
      }
    }

    // Epics under phase 4
    if (phase === '4' && manifest.epics && manifest.epics.length > 0 && !isExpanded) {
      for (const epic of manifest.epics) {
        let epicIcon = '[ ]';
        if (epic.status === 'complete') epicIcon = '\x1b[32m[✓]\x1b[0m';
        else if (epic.status === 'running') epicIcon = '\x1b[33m[>]\x1b[0m';
        else if (epic.status === 'verifying') epicIcon = '\x1b[34m[?]\x1b[0m';

        const epicKey = String.fromCharCode(96 + epic.id);
        const isEpicExpanded = expandedEpics.has(epic.id);
        const hasEpicData = epic.cost || epic.duration || (epic.todoBreakdown && epic.todoBreakdown.length > 0);
        const expandIndicator = hasEpicData ? (isEpicExpanded ? '▼' : '►') : ' ';

        let epicSummary = '';
        if (epic.duration) epicSummary += formatTime(epic.duration) + '   ';
        if (epic.cost) epicSummary += formatCost(epic.cost) + '   ' + formatTokens(epic.tokens);
        if (epic.todoBreakdown) epicSummary += '  (' + epic.todoBreakdown.length + ' todos)';

        const epicName = 'Epic ' + epic.id + ': ' + epic.name;
        const epicLine = epicIcon + ' ' + expandIndicator + ' ' + epicName + ' ' + epicSummary + '  \x1b[90m[' + epicKey + ']\x1b[0m';
        lines.push(line('      ' + epicLine, W));

        // Expanded epic details
        if (isEpicExpanded && epic.todoBreakdown && epic.todoBreakdown.length > 0) {
          for (let i = 0; i < epic.todoBreakdown.length; i++) {
            const todo = epic.todoBreakdown[i];
            const isLast = i === epic.todoBreakdown.length - 1;
            const prefix = isLast ? '└─' : '├─';
            const todoName = truncate(todo.content || '', 28);
            const todoDur = todo.durationMs ? formatTime(todo.durationMs).padStart(8) : '   --:--';
            const todoCost = todo.cost ? formatCost(todo.cost).padStart(6) : ' $-.--';
            lines.push(line('          \x1b[90m' + prefix + '\x1b[0m ' + todoName.padEnd(28) + ' \x1b[90m' + todoDur + '  ' + todoCost + '\x1b[0m', W));
          }
        }
      }
    }
  }

  lines.push(line('', W));

  // Worker progress
  lines.push(line('  \x1b[1mWORKER PROGRESS\x1b[0m', W));

  const currentPhase = manifest.currentPhase;
  const workerProgress = manifest.phases?.[currentPhase]?.workerProgress;

  if (!workerProgress || workerProgress.total === 0) {
    lines.push(line('  \x1b[90m(Waiting for worker...)\x1b[0m', W));
  } else {
    const pct = Math.round((workerProgress.completed / workerProgress.total) * 100);
    const bar = renderProgressBar(workerProgress.completed, workerProgress.total);
    lines.push(line('  [' + bar + '] ' + pct + '%  (' + workerProgress.completed + '/' + workerProgress.total + ' todos)', W));
    if (workerProgress.currentTask) {
      const task = truncate(workerProgress.currentTask, W-8);
      lines.push(line('  \x1b[90m' + task + '\x1b[0m', W));
    }
  }

  lines.push(line('', W));

  // Cost & Tokens
  let totalTokens = 0;
  if (manifest.phases) {
    for (const p of Object.values(manifest.phases)) {
      if (p.tokens) totalTokens += p.tokens;
    }
  }
  if (manifest.epics) {
    for (const e of manifest.epics) {
      if (e.tokens) totalTokens += e.tokens;
    }
  }
  lines.push(line('  [1mCOST & TOKENS[0m', W));
  lines.push(line('  This run: ' + formatCost(manifest.totalCost || 0) + '   ' + formatTokens(totalTokens), W));
  lines.push(line('', W));

  // Heartbeat status
  if (manifest.status !== 'complete') {
    const heartbeatEnabled = !(manifest.heartbeat && manifest.heartbeat.enabled === false);
    if (ORCHESTRATOR_PID) {
      if (heartbeatEnabled && nextHeartbeatTime) {
        const countdown = nextHeartbeatTime - Date.now();
        const countdownStr = countdown > 0 ? formatCountdown(countdown) : 'NOW';
        const intervalMs = getHeartbeatInterval(manifest);
        const intervalStr = Math.round(intervalMs / 1000) + 's';
        const currentCount = manifest.heartbeat?.count || 0;
        const refreshEvery = manifest.heartbeat?.refreshEvery || 5;
        const refreshStr = currentCount + '/' + refreshEvery;
        lines.push(line('  \x1b[1mHEARTBEAT\x1b[0m  Next: ' + countdownStr + ' (every ' + intervalStr + ')  \x1b[90mRefresh: ' + refreshStr + '\x1b[0m', W));
      } else if (!heartbeatEnabled) {
        lines.push(line('  \x1b[1mHEARTBEAT\x1b[0m  \x1b[33mPAUSED\x1b[0m (Phase 1 interactive)', W));
      }
    } else {
      lines.push(line('  \x1b[1mHEARTBEAT\x1b[0m  \x1b[90mNo orchestrator\x1b[0m', W));
    }
    lines.push(line('', W));
  }

  // Output style countdown
  if (outputStyleCountdown !== null && outputStyleCountdown > 0) {
    const countdownStr = formatCountdown(outputStyleCountdown);
    const styleLabel = manifest.outputStyle || 'unknown';
    lines.push(line('  \x1b[1mOUTPUT STYLE\x1b[0m  Setting "' + styleLabel + '" in ' + countdownStr, W));
    lines.push(line('', W));
  }

  // Footer
  lines.push('\x1b[36m╚' + '═'.repeat(W-2) + '╝\x1b[0m');
  lines.push('');
  lines.push('\x1b[90mPress 1-5 phases │ A-I epics │ Space heartbeat │ Q quit\x1b[0m');

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
Start-Sleep -Milliseconds 300

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

function triggerContextRefresh() {
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

# Step 1: Send /clear (text, wait 300ms, enter)
Write-Output "Sending /clear..."
$r1 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/clear")
Start-Sleep -Milliseconds 300
$r1e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Clear result: text=$r1, enter=$r1e"

# Step 2: Wait 3 seconds for clear to complete
Write-Output "Waiting 3 seconds for clear..."
Start-Sleep -Seconds 3

# Step 3: Send /orchestrator AUTO-RESUME-NO-QUESTION (text, wait 300ms, enter)
Write-Output "Sending /orchestrator AUTO-RESUME-NO-QUESTION..."
$r2 = [RefreshInjector]::SendText(${ORCHESTRATOR_PID}, "/orchestrator AUTO-RESUME-NO-QUESTION")
Start-Sleep -Milliseconds 300
$r2e = [RefreshInjector]::SendEnter(${ORCHESTRATOR_PID})
Write-Output "Orchestrator result: text=$r2, enter=$r2e"
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
  const refreshEvery = manifest.heartbeat?.refreshEvery || 5;
  const needsRefresh = currentCount >= refreshEvery;

  if (needsRefresh) {
    console.log('\n[HEARTBEAT ' + heartbeatCount + '] Context refresh needed (' + currentCount + '/' + refreshEvery + ')');
    console.log('[HEARTBEAT ' + heartbeatCount + '] Triggering /clear + /orchestrator AUTO-RESUME-NO-QUESTION...');
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

$r1 = [ConsoleInjector]::SendString(${ORCHESTRATOR_PID}, "HEARTBEAT", $false)
Start-Sleep -Milliseconds 300
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

// ============ INPUT HANDLING ============

function setupKeypress() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      saveActiveMs();
      console.log('\nDashboard closed. Timer saved.');
      process.exit(0);
    }

    if (['1', '2', '3', '4', '5'].includes(str)) {
      if (expandedPhases.has(str)) {
        expandedPhases.delete(str);
      } else {
        expandedPhases.add(str);
      }
      render();
    }

    // Epic expansion: a-i for epics 1-9
    if (str >= 'a' && str <= 'i') {
      const epicNum = str.charCodeAt(0) - 96; // a=1, b=2, ..., i=9
      if (expandedEpics.has(epicNum)) {
        expandedEpics.delete(epicNum);
      } else {
        expandedEpics.add(epicNum);
      }
      render();
    }

    // Manual heartbeat: Space key
    if (str === ' ') {
      sendHeartbeat();
    }

  });

  process.stdin.resume();
}

// ============ MAIN ============

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
  if (ORCHESTRATOR_PID) {
    setOrchestratorOutputStyle();
  }

  // Start heartbeat if orchestrator PID provided
  if (ORCHESTRATOR_PID) {
    nextHeartbeatTime = Date.now() + 5000;
    setTimeout(sendHeartbeat, 5000);
  }

  // Handle exit - save timer
  process.on('SIGINT', () => { saveActiveMs(); process.exit(0); });
  process.on('SIGTERM', () => { saveActiveMs(); process.exit(0); });

  render();
}

main();
