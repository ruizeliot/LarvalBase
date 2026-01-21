param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$PhaseNumber = "1",

    [Parameter(Mandatory=$false)]
    [string]$Model = ""
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
$workerPidFile = Join-Path $pipelineDir "worker-powershell-pid.txt"
if (Test-Path $workerPidFile) { Remove-Item $workerPidFile -Force }

# Worker command
$modelArg = if ($Model -ne "") { "--model $Model " } else { "" }
$workerCmd = @"
`$PID | Out-File -FilePath '$workerPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Worker'
& '$claudePath' ${modelArg}--dangerously-skip-permissions
"@
$workerBytes = [System.Text.Encoding]::Unicode.GetBytes($workerCmd)
$workerEncoded = [Convert]::ToBase64String($workerBytes)

Write-Host "Adding Worker pane to window: $windowName"

# First, focus on the orchestrator pane (index 0) before splitting
# This ensures we split the orchestrator pane, not the dashboard
$focusArgs = @(
    "--window", $windowName,
    "focus-pane",
    "--target", "0"
)
Start-Process wt.exe -ArgumentList $focusArgs -Wait
Start-Sleep -Milliseconds 500

# Split orchestrator pane horizontally - worker appears BELOW orchestrator
# After this: [Orch (top-left) | Dashboard (right)]
#             [Worker (bottom-left) |            ]
$wtArgs = @(
    "--window", $windowName,
    "split-pane",
    "-H",
    "-s", "0.67",
    "--title", "Worker",
    "powershell.exe", "-NoExit", "-EncodedCommand", $workerEncoded
)
Start-Process wt.exe -ArgumentList $wtArgs

Start-Sleep -Seconds 2

# Wait for worker PID
$maxWait = 10
$waited = 0
while (-not (Test-Path $workerPidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

$workerPid = $null
if (Test-Path $workerPidFile) {
    $workerPid = [int](Get-Content $workerPidFile).Trim()
    Write-Host "Worker PID: $workerPid"
}

# Wait for Claude to be ready (SessionStart hook creates this file)
$workerReadyFile = Join-Path $pipelineDir "worker-ready.txt"
if (Test-Path $workerReadyFile) { Remove-Item $workerReadyFile -Force }

Write-Host "Waiting for Worker Claude to be ready..."
$maxWait = 60
$waited = 0
while (-not (Test-Path $workerReadyFile) -and $waited -lt $maxWait) {
    Start-Sleep -Milliseconds 500
    $waited++
    if ($waited % 10 -eq 0) {
        $ready = if (Test-Path $workerReadyFile) { "YES" } else { "no" }
        Write-Host "  Waiting... Worker ready: $ready"
    }
}

# Small delay for UI to stabilize
Start-Sleep -Seconds 1

# Cleanup ready file
Remove-Item -Path $workerReadyFile -Force -ErrorAction SilentlyContinue

# Create signal file for worker
$workerSignalFile = Join-Path $pipelineDir "worker-begin.txt"
"BEGIN" | Out-File -FilePath $workerSignalFile -Encoding ASCII -NoNewline

# Add injection code
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WorkerInjector {
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

# Inject BEGIN into Worker
if ($workerPid) {
    Write-Host "Injecting BEGIN into Worker (PID $workerPid)"
    $textResult = [WorkerInjector]::InjectText($workerPid, "BEGIN")
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [WorkerInjector]::InjectEnter($workerPid)
    Write-Host "  Enter: $enterResult"
}

Write-Host "Worker pane added"
Write-Output "PID:$workerPid"
