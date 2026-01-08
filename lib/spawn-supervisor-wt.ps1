param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [int]$DeveloperPid,

    [Parameter(Mandatory=$false)]
    [string]$WorkerSessionId = ""  # Worker session ID for hook filtering
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$title = "Supervisor"

Write-Host "=========================================="
Write-Host "  spawn-supervisor-wt.ps1"
Write-Host "  Spawning Supervisor (Haiku) via WT"
Write-Host "=========================================="

# Create Supervisor CLAUDE.md in project
$claudeDir = Join-Path $ProjectPath ".claude"
$supervisorMdSource = "$pipelineOffice\lib\supervisor-claude.md"
$supervisorMdDest = Join-Path $claudeDir "supervisor-CLAUDE.md"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

# Copy supervisor instructions
if (Test-Path $supervisorMdSource) {
    $content = Get-Content $supervisorMdSource -Raw
    $content = $content -replace '\{\{DEVELOPER_PID\}\}', $DeveloperPid
    $content | Out-File -FilePath $supervisorMdDest -Encoding utf8
    Write-Host "Created supervisor-CLAUDE.md with Developer PID: $DeveloperPid"
} else {
    Write-Host "ERROR: Supervisor CLAUDE.md not found: $supervisorMdSource"
    exit 1
}

# Store supervisor config for hook to use
$supervisorConfig = @{
    developerPid = $DeveloperPid
    developerConhostPid = $DeveloperPid  # In WT mode, same as developerPid
    workerSessionId = $WorkerSessionId
    projectPath = $ProjectPath
    transcriptTracking = "$ProjectPath\.pipeline\todo-tracking.json"
    wtMode = $true
} | ConvertTo-Json

$supervisorConfigPath = Join-Path $ProjectPath ".pipeline\supervisor-config.json"
$supervisorConfig | Out-File -FilePath $supervisorConfigPath -Encoding utf8
Write-Host "Wrote supervisor config to: $supervisorConfigPath"
Write-Host "  Worker session ID: $WorkerSessionId"
Write-Host "  Developer PID: $DeveloperPid"

# Build the command that runs inside the WT pane
$psCommand = @"
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$title'
& '$claudePath' --model haiku --dangerously-skip-permissions
"@

# Encode the command in Base64 for safe passing
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psCommand)
$encodedCommand = [Convert]::ToBase64String($bytes)

# Get PowerShell PIDs before spawning
$beforePids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
Write-Host "PowerShell PIDs before spawn: $($beforePids -join ', ')"

# Read window name from manifest
$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
$wtWindowName = "Pipeline"  # fallback
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.wtWindowName) {
        $wtWindowName = $manifest.wtWindowName
    }
}

# Add Supervisor pane to EXISTING Windows Terminal window using named window
# Split horizontally (-H) to create bottom pane below worker
Write-Host "Adding Supervisor pane to window '$wtWindowName'..."
$wtArgs = @(
    "--window", $wtWindowName,
    "split-pane",
    "-H",
    "-s", "0.35",
    "--title", $title,
    "powershell.exe", "-NoExit", "-EncodedCommand", $encodedCommand
)
Start-Process wt.exe -ArgumentList $wtArgs

# Wait for PowerShell process to start
Start-Sleep -Seconds 2

# Get PowerShell PIDs after spawning
$afterPids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
Write-Host "PowerShell PIDs after spawn: $($afterPids -join ', ')"

# Find the new PID (the one that wasn't there before)
$newPids = $afterPids | Where-Object { $_ -notin $beforePids }
Write-Host "New PowerShell PIDs: $($newPids -join ', ')"

$supervisorPid = $null
if ($newPids.Count -eq 1) {
    $supervisorPid = $newPids[0]
    Write-Host "Supervisor PowerShell PID: $supervisorPid"
} elseif ($newPids.Count -gt 1) {
    # Multiple new PIDs - take the most recent one
    $supervisorPid = $newPids[-1]
    Write-Host "Multiple new PIDs found, using most recent: $supervisorPid"
} else {
    Write-Host "WARNING: Could not identify supervisor PowerShell PID"
}

# Wait for Claude to be ready
Write-Host "Waiting for Supervisor Claude to be ready..."
Start-Sleep -Seconds 8

# Inject startup message
Write-Host "Injecting Supervisor instructions..."

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class SupervisorInjectorWT {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateFile(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool WriteConsoleInput(
        IntPtr hConsoleInput,
        INPUT_RECORD[] lpBuffer,
        uint nLength,
        out uint lpNumberOfEventsWritten);

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
        if (!AttachConsole(pid)) {
            return "AttachConsole failed: " + Marshal.GetLastWin32Error();
        }

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
        if (!AttachConsole(pid)) {
            return "AttachConsole failed: " + Marshal.GetLastWin32Error();
        }

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
        records[0].KeyEvent.wVirtualScanCode = 0x1C;

        records[1].EventType = KEY_EVENT;
        records[1].KeyEvent.bKeyDown = 0;
        records[1].KeyEvent.wRepeatCount = 1;
        records[1].KeyEvent.UnicodeChar = (char)13;
        records[1].KeyEvent.wVirtualKeyCode = 0x0D;
        records[1].KeyEvent.wVirtualScanCode = 0x1C;

        uint written;
        bool success = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        return success ? "OK:" + written : "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
    }
}
"@

# Inject startup message (text first, then Enter)
$startupMsg = @"
You are a Code Reviewer in a development pipeline. Your teammate will receive feedback from you.

When you see 'CHECK TODO' messages, review the transcript for these issues:
- V1: Claiming limitations without searching documentation first
- V2: Saying 'manual testing confirms' without evidence
- V3: Using dispatchEvent instead of real user actions
- V4: Changing what tests verify instead of fixing code
- V5: Empty handlers like onClick={() => {}}
- V6: Asking user questions during autonomous work

IF ISSUE FOUND: Send feedback to your teammate by running:
powershell.exe -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/inject-message.ps1" -TargetPid $DeveloperPid -Message "REVIEW FEEDBACK: [describe the issue]"

IF NO ISSUES: Say 'Looks good' and wait.

You and your teammate are both part of this pipeline. Say 'Reviewer ready' to confirm.
"@

$textResult = [SupervisorInjectorWT]::InjectText($supervisorPid, $startupMsg)
Write-Host "Text injection: $textResult"

Start-Sleep -Milliseconds 300

$enterResult = [SupervisorInjectorWT]::InjectEnter($supervisorPid)
Write-Host "Enter injection: $enterResult"

# Store Supervisor info
$supervisorInfo = @{
    supervisorPid = $supervisorPid
    developerPid = $DeveloperPid
    workerSessionId = $WorkerSessionId
    wtMode = $true
} | ConvertTo-Json

$supervisorInfoPath = Join-Path $ProjectPath ".pipeline\supervisor-info.json"
$supervisorInfo | Out-File -FilePath $supervisorInfoPath -Encoding utf8

Write-Host "Supervisor ready. PID: $supervisorPid"
Write-Host ""
Write-Host "RESULT_JSON:$supervisorInfo"
