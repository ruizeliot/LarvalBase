param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineDir = Join-Path $ProjectPath ".pipeline"

# Read window name
$windowNameFile = Join-Path $pipelineDir "wt-window-name.txt"
if (-not (Test-Path $windowNameFile)) {
    Write-Host "ERROR: Window name file not found. Run orchestrator first." -ForegroundColor Red
    exit 1
}
$windowName = (Get-Content $windowNameFile).Trim()

# Write project path to temp file for SessionStart hook
$tempProjectFile = Join-Path $env:TEMP "pipeline-current-project.txt"
$ProjectPath | Out-File -FilePath $tempProjectFile -Encoding ASCII -NoNewline

# PID file
$supervisorPidFile = Join-Path $pipelineDir "supervisor-powershell-pid.txt"
if (Test-Path $supervisorPidFile) { Remove-Item $supervisorPidFile -Force }

# Supervisor command (uses Haiku model)
$supervisorCmd = @"
`$PID | Out-File -FilePath '$supervisorPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Supervisor'
& '$claudePath' --model haiku --dangerously-skip-permissions
"@
$supervisorBytes = [System.Text.Encoding]::Unicode.GetBytes($supervisorCmd)
$supervisorEncoded = [Convert]::ToBase64String($supervisorBytes)

Write-Host "Adding Supervisor pane to window: $windowName"

# Focus on the worker pane (index 2) before splitting
# Layout at this point:
#   Pane 0: Orchestrator (top-left)
#   Pane 1: Dashboard (right, full height)
#   Pane 2: Worker (bottom-left)
$focusArgs = @(
    "--window", $windowName,
    "focus-pane",
    "--target", "2"
)
Start-Process wt.exe -ArgumentList $focusArgs -Wait
Start-Sleep -Milliseconds 500

# Split worker pane horizontally - supervisor appears BELOW worker
# After this: [Orch (top-left)       | Dashboard (right, full height)]
#             [Worker (middle-left)  |                               ]
#             [Supervisor (bot-left) |                               ]
$wtArgs = @(
    "--window", $windowName,
    "split-pane",
    "-H",
    "-s", "0.5",
    "--title", "Supervisor",
    "powershell.exe", "-NoExit", "-EncodedCommand", $supervisorEncoded
)
Start-Process wt.exe -ArgumentList $wtArgs

Start-Sleep -Seconds 2

# Wait for supervisor PID
$maxWait = 10
$waited = 0
while (-not (Test-Path $supervisorPidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

$supervisorPid = $null
if (Test-Path $supervisorPidFile) {
    $supervisorPid = [int](Get-Content $supervisorPidFile).Trim()
    Write-Host "Supervisor PID: $supervisorPid"
}

# Wait for Claude to be ready (SessionStart hook creates this file)
$supervisorReadyFile = Join-Path $pipelineDir "supervisor-ready.txt"
if (Test-Path $supervisorReadyFile) { Remove-Item $supervisorReadyFile -Force }

Write-Host "Waiting for Supervisor Claude to be ready..."
$maxWait = 60
$waited = 0
while (-not (Test-Path $supervisorReadyFile) -and $waited -lt $maxWait) {
    Start-Sleep -Milliseconds 500
    $waited++
    if ($waited % 10 -eq 0) {
        $ready = if (Test-Path $supervisorReadyFile) { "YES" } else { "no" }
        Write-Host "  Waiting... Supervisor ready: $ready"
    }
}

# Small delay for UI to stabilize
Start-Sleep -Seconds 1

# Cleanup ready file
Remove-Item -Path $supervisorReadyFile -Force -ErrorAction SilentlyContinue

# Create signal file for supervisor
$supervisorSignalFile = Join-Path $pipelineDir "supervisor-begin.txt"
"BEGIN" | Out-File -FilePath $supervisorSignalFile -Encoding ASCII -NoNewline

# Add injection code
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class SupervisorInjector {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateFile(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool WriteConsoleInput(
        IntPtr hConsoleInput, INPUT_RECORD[] lpBuffer,
        uint nLength, out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct KEY_EVENT_RECORD {
        [FieldOffset(0)] public int bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    const uint GENERIC_READ = 0x80000000;
    const uint GENERIC_WRITE = 0x40000000;
    const uint FILE_SHARE_READ = 0x00000001;
    const uint FILE_SHARE_WRITE = 0x00000002;
    const uint OPEN_EXISTING = 3;
    const ushort KEY_EVENT = 0x0001;

    public static string InjectText(int pid, string text) {
        FreeConsole();
        if (!AttachConsole(pid)) return "AttachConsole failed: " + Marshal.GetLastWin32Error();

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == new IntPtr(-1)) {
            FreeConsole();
            return "CreateFile failed: " + Marshal.GetLastWin32Error();
        }

        var records = new INPUT_RECORD[text.Length * 2];
        int idx = 0;

        foreach (char c in text) {
            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 1;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = c;
            idx++;

            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 0;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = c;
            idx++;
        }

        uint written;
        bool success = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        CloseHandle(hInput);
        FreeConsole();

        return success ? "OK:" + written : "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
    }

    public static string InjectEnter(int pid) {
        FreeConsole();
        if (!AttachConsole(pid)) return "AttachConsole failed: " + Marshal.GetLastWin32Error();

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == new IntPtr(-1)) {
            FreeConsole();
            return "CreateFile failed: " + Marshal.GetLastWin32Error();
        }

        var records = new INPUT_RECORD[2];
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
        bool success = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        CloseHandle(hInput);
        FreeConsole();

        return success ? "OK:" + written : "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
    }
}
"@

# Inject supervisor instructions
if ($supervisorPid) {
    Write-Host "Injecting instructions into Supervisor (PID $supervisorPid)"
    $supervisorMsg = @"
You are a Pipeline Supervisor (v11). Monitor the Worker for rule violations.

VIOLATION CODES:
- V1: Mocking system APIs (jest.mock, vi.mock on @tauri-apps)
- V2: Claiming limitation without WebSearch first
- V3: Synthetic events in E2E (dispatchEvent, fake events)
- V4: Test cheating (changing what test verifies)
- V5: Empty handlers (onClick={() => {}})
- V6: Using AskUserQuestion in phases 2-5

When you detect a violation, write to .pipeline/violation.json:
{"code":"V1","description":"...","severity":"high"}

Say 'Supervisor ready' to confirm.
"@
    $textResult = [SupervisorInjector]::InjectText($supervisorPid, $supervisorMsg)
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [SupervisorInjector]::InjectEnter($supervisorPid)
    Write-Host "  Enter: $enterResult"
}

Write-Host "Supervisor pane added"
Write-Output "PID:$supervisorPid"
