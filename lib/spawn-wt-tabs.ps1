param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$OrchestratorPID = "",

    [Parameter(Mandatory=$false)]
    [string]$PhaseNumber = "1",

    [Parameter(Mandatory=$false)]
    [string]$PhaseCommand = "",

    [Parameter(Mandatory=$false)]
    [string]$OutputStyle = "",

    [Parameter(Mandatory=$false)]
    [string]$Model = "",

    [Parameter(Mandatory=$false)]
    [double]$DashboardSplit = 0.5,

    [Parameter(Mandatory=$false)]
    [double]$OrchestratorSplit = 0.67,

    [Parameter(Mandatory=$false)]
    [double]$WorkerSplit = 0.5,

    [Parameter(Mandatory=$false)]
    [ValidateSet("v9", "v10", "v11", "auto")]
    [string]$DashboardVersion = "auto",

    [Parameter(Mandatory=$false)]
    [switch]$IncludeOrchestrator
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"

# Dashboard script mapping by version
$dashboardScripts = @{
    "v9" = "dashboard-v2.cjs"
    "v10" = "dashboard-v3.cjs"
    "v11" = "dashboard-runner-v11.cjs"
}

# Auto-detect version from manifest if needed
if ($DashboardVersion -eq "auto") {
    $manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
    if (Test-Path $manifestPath) {
        try {
            $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
            $manifestVersion = $manifest.version
            if ($manifestVersion -match "^11") {
                $DashboardVersion = "v11"
            } elseif ($manifestVersion -match "^10") {
                $DashboardVersion = "v10"
            } else {
                $DashboardVersion = "v9"
            }
        } catch {
            $DashboardVersion = "v11"  # Default to v11
        }
    } else {
        $DashboardVersion = "v11"  # Default to v11 for new projects
    }
}

$dashboardScriptName = $dashboardScripts[$DashboardVersion]
$dashboardScript = Join-Path $pipelineOffice "lib\$dashboardScriptName"
Write-Host "Dashboard version: $DashboardVersion -> $dashboardScriptName"

Write-Host "=========================================="
Write-Host "  spawn-wt-tabs.ps1 (v11.1)"
Write-Host "  Creating Split-Pane Layout"
Write-Host "=========================================="
Write-Host "Project: $ProjectPath"
Write-Host "Phase: $PhaseNumber"
Write-Host "Command: $PhaseCommand"
Write-Host "Include Orchestrator: $IncludeOrchestrator"

# Create .pipeline directory if needed
$pipelineDir = Join-Path $ProjectPath ".pipeline"
if (-not (Test-Path $pipelineDir)) {
    New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null
}

# PID file for dashboard
$dashboardPidFile = Join-Path $pipelineDir "dashboard-pid.txt"
if (Test-Path $dashboardPidFile) { Remove-Item $dashboardPidFile -Force }

# Session info file for worker
$sessionInfoPath = Join-Path $pipelineDir "session-info.txt"
if (Test-Path $sessionInfoPath) { Remove-Item $sessionInfoPath -Force }

# Copy phase-specific CLAUDE.md
$claudeMdSource = "$pipelineOffice\claude-md\phase-$PhaseNumber.md"
# v11: Worker base rules are in Pipeline-Office/claude-md/_worker-base.md
$workerBaseSource = "$pipelineOffice\claude-md\_worker-base.md"
$claudeDir = Join-Path $ProjectPath ".claude"
$claudeMdDest = Join-Path $claudeDir "CLAUDE.md"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

if (Test-Path $claudeMdSource) {
    Copy-Item $claudeMdSource $claudeMdDest -Force
    Write-Host "Copied phase-$PhaseNumber.md"
}

if (Test-Path $workerBaseSource) {
    Add-Content -Path $claudeMdDest -Value "`n`n---`n`n# Worker Base Rules`n"
    Get-Content $workerBaseSource | Add-Content -Path $claudeMdDest
    Write-Host "Appended worker-base rules"
}

# Generate unique window name
$wtWindowName = "Pipeline-$OrchestratorPID"

# ============================================
# TAB 1: Main (Dashboard + Orchestrator + Worker + Supervisor)
# Layout: Dashboard (left 50%) | Orchestrator/Worker/Supervisor (right 50%, 3 layers)
# ============================================

Write-Host ""
Write-Host "--- Creating Tab 1: Main (Split View) ---"

# Generate OrchestratorPID if not provided (for new launches)
if (-not $OrchestratorPID) {
    $OrchestratorPID = [System.Diagnostics.Process]::GetCurrentProcess().Id
}

# Dashboard command for Tab 1 (Main)
$dashboardCmd = @"
`$PID | Out-File -FilePath '$dashboardPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Dashboard'
node '$dashboardScript' '$ProjectPath' $OrchestratorPID
"@
$dashboardBytes = [System.Text.Encoding]::Unicode.GetBytes($dashboardCmd)
$dashboardEncoded = [Convert]::ToBase64String($dashboardBytes)

# PID files for orchestrator, worker and supervisor
$orchestratorPidFile = Join-Path $pipelineDir "orchestrator-powershell-pid.txt"
$workerPidFile = Join-Path $pipelineDir "worker-powershell-pid.txt"
$supervisorPidFile = Join-Path $pipelineDir "supervisor-powershell-pid.txt"
if (Test-Path $orchestratorPidFile) { Remove-Item $orchestratorPidFile -Force }
if (Test-Path $workerPidFile) { Remove-Item $workerPidFile -Force }
if (Test-Path $supervisorPidFile) { Remove-Item $supervisorPidFile -Force }

# Orchestrator command (saves PID first)
$orchestratorCmd = @"
`$PID | Out-File -FilePath '$orchestratorPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Orchestrator'
& '$claudePath' --dangerously-skip-permissions
"@
$orchestratorBytes = [System.Text.Encoding]::Unicode.GetBytes($orchestratorCmd)
$orchestratorEncoded = [Convert]::ToBase64String($orchestratorBytes)

# Worker command (saves PID first)
$modelArg = if ($Model -ne "") { "--model $Model " } else { "" }
$workerCmd = @"
`$PID | Out-File -FilePath '$workerPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Worker'
& '$claudePath' ${modelArg}--dangerously-skip-permissions
"@
$workerBytes = [System.Text.Encoding]::Unicode.GetBytes($workerCmd)
$workerEncoded = [Convert]::ToBase64String($workerBytes)

# Supervisor command (saves PID first)
$supervisorCmd = @"
`$PID | Out-File -FilePath '$supervisorPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Supervisor'
& '$claudePath' --model haiku --dangerously-skip-permissions
"@
$supervisorBytes = [System.Text.Encoding]::Unicode.GetBytes($supervisorCmd)
$supervisorEncoded = [Convert]::ToBase64String($supervisorBytes)

# Create new WT window with Tab 1 containing Dashboard
Write-Host "Creating WT window with Dashboard..."
$wtCmd = "wt.exe -w $wtWindowName --title `"Main`" -p `"Windows PowerShell`" powershell.exe -NoExit -EncodedCommand $dashboardEncoded"
cmd /c $wtCmd

Start-Sleep -Seconds 2

# Create signal files (hook will create ready files)
$orchestratorSignalFile = Join-Path $pipelineDir "orchestrator-begin.txt"
$workerSignalFile = Join-Path $pipelineDir "worker-begin.txt"
$supervisorSignalFile = Join-Path $pipelineDir "supervisor-begin.txt"
$orchestratorReadyFile = Join-Path $pipelineDir "orchestrator-ready.txt"
$workerReadyFile = Join-Path $pipelineDir "worker-ready.txt"
$supervisorReadyFile = Join-Path $pipelineDir "supervisor-ready.txt"
if (Test-Path $orchestratorReadyFile) { Remove-Item $orchestratorReadyFile -Force }
if (Test-Path $workerReadyFile) { Remove-Item $workerReadyFile -Force }
if (Test-Path $supervisorReadyFile) { Remove-Item $supervisorReadyFile -Force }
"BEGIN" | Out-File -FilePath $orchestratorSignalFile -Encoding ASCII -NoNewline
"BEGIN" | Out-File -FilePath $workerSignalFile -Encoding ASCII -NoNewline
"BEGIN" | Out-File -FilePath $supervisorSignalFile -Encoding ASCII -NoNewline

if ($IncludeOrchestrator) {
    # Layout: Dashboard | Orchestrator / Worker / Supervisor (3 layers on right)

    # Split Tab 1: Add Orchestrator pane (right side, 50% width)
    Write-Host "Adding Orchestrator pane to Main tab (right side)..."
    $wtArgs = @(
        "--window", $wtWindowName,
        "split-pane",
        "-V",
        "-s", "$DashboardSplit",
        "--title", "Orchestrator",
        "powershell.exe", "-NoExit", "-EncodedCommand", $orchestratorEncoded
    )
    Start-Process wt.exe -ArgumentList $wtArgs
    Start-Sleep -Seconds 2

    # Split Orchestrator pane: Add Worker below (67% of orchestrator area -> Orch gets 33%, Worker+Super get 67%)
    Write-Host "Adding Worker pane below Orchestrator..."
    $wtArgs = @(
        "--window", $wtWindowName,
        "split-pane",
        "-H",
        "-s", "$OrchestratorSplit",
        "--title", "Worker",
        "powershell.exe", "-NoExit", "-EncodedCommand", $workerEncoded
    )
    Start-Process wt.exe -ArgumentList $wtArgs
    Start-Sleep -Seconds 2

    # Split Worker pane: Add Supervisor below (50% of worker area -> Worker gets 50%, Super gets 50%)
    Write-Host "Adding Supervisor pane below Worker..."
    $wtArgs = @(
        "--window", $wtWindowName,
        "split-pane",
        "-H",
        "-s", "$WorkerSplit",
        "--title", "Supervisor",
        "powershell.exe", "-NoExit", "-EncodedCommand", $supervisorEncoded
    )
    Start-Process wt.exe -ArgumentList $wtArgs
    Start-Sleep -Seconds 2

} else {
    # Legacy layout: Dashboard | Worker / Supervisor (2 layers on right)

    # Split Tab 1: Add Worker pane (right side, 50% width)
    Write-Host "Adding Worker pane to Main tab..."
    $wtArgs = @(
        "--window", $wtWindowName,
        "split-pane",
        "-V",
        "-s", "$DashboardSplit",
        "--title", "Worker",
        "powershell.exe", "-NoExit", "-EncodedCommand", $workerEncoded
    )
    Start-Process wt.exe -ArgumentList $wtArgs
    Start-Sleep -Seconds 2

    # Split Worker pane: Add Supervisor below (50% of worker area)
    Write-Host "Adding Supervisor pane below Worker..."
    $wtArgs = @(
        "--window", $wtWindowName,
        "split-pane",
        "-H",
        "-s", "$WorkerSplit",
        "--title", "Supervisor",
        "powershell.exe", "-NoExit", "-EncodedCommand", $supervisorEncoded
    )
    Start-Process wt.exe -ArgumentList $wtArgs
    Start-Sleep -Seconds 2
}


# ============================================
# Wait for processes and get PIDs
# ============================================

Write-Host ""
Write-Host "--- Collecting PIDs ---"

# Wait for dashboard PID
$maxWait = 15
$waited = 0
while (-not (Test-Path $dashboardPidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

$dashboardPid = $null
if (Test-Path $dashboardPidFile) {
    $dashboardPid = [int](Get-Content $dashboardPidFile).Trim()
    Write-Host "Dashboard PID: $dashboardPid"
}

# Find PowerShell processes
$allPwsh = Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
Write-Host "PowerShell processes: $($allPwsh -join ', ')"

# Update manifest (v11 schema)
$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        # v11 schema uses nested workers object
        if (-not $manifest.workers) {
            $manifest | Add-Member -NotePropertyName "workers" -NotePropertyValue @{} -Force
        }
        if (-not $manifest.workers.current) {
            $manifest.workers | Add-Member -NotePropertyName "current" -NotePropertyValue @{} -Force
        }
        $manifest.workers.current | Add-Member -NotePropertyName "wtWindowName" -NotePropertyValue $wtWindowName -Force
        $manifest.workers.current | Add-Member -NotePropertyName "dashboardPid" -NotePropertyValue $dashboardPid -Force
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
        Write-Host "Manifest updated (v11 schema)"
    } catch {
        Write-Host "WARNING: Could not update manifest: $_"
    }
}

# ============================================
# Wait for Claude instances to be ready (via SessionStart hook)
# ============================================

Write-Host ""
if ($IncludeOrchestrator) {
    Write-Host "--- Waiting for Orchestrator, Worker, and Supervisor to be ready ---"
} else {
    Write-Host "--- Waiting for Worker and Supervisor to be ready ---"
}

$maxWait = 60  # 30 seconds max
$waited = 0

if ($IncludeOrchestrator) {
    while ((-not (Test-Path $orchestratorReadyFile) -or -not (Test-Path $workerReadyFile) -or -not (Test-Path $supervisorReadyFile)) -and $waited -lt $maxWait) {
        Start-Sleep -Milliseconds 500
        $waited++
        if ($waited % 10 -eq 0) {
            $oReady = if (Test-Path $orchestratorReadyFile) { "YES" } else { "no" }
            $wReady = if (Test-Path $workerReadyFile) { "YES" } else { "no" }
            $sReady = if (Test-Path $supervisorReadyFile) { "YES" } else { "no" }
            Write-Host "  Waiting... Orchestrator: $oReady, Worker: $wReady, Supervisor: $sReady"
        }
    }
} else {
    while ((-not (Test-Path $workerReadyFile) -or -not (Test-Path $supervisorReadyFile)) -and $waited -lt $maxWait) {
        Start-Sleep -Milliseconds 500
        $waited++
        if ($waited % 10 -eq 0) {
            $wReady = if (Test-Path $workerReadyFile) { "YES" } else { "no" }
            $sReady = if (Test-Path $supervisorReadyFile) { "YES" } else { "no" }
            Write-Host "  Waiting... Worker: $wReady, Supervisor: $sReady"
        }
    }
}

# Small delay for UI to stabilize after ready signal
Start-Sleep -Seconds 2

# Read PIDs from files (saved by PowerShell commands)
$orchestratorPid = $null
$workerPid = $null
$supervisorPid = $null

if ($IncludeOrchestrator -and (Test-Path $orchestratorPidFile)) {
    $orchestratorPid = [int](Get-Content $orchestratorPidFile).Trim()
    Write-Host "Orchestrator PID: $orchestratorPid (from file)"
} elseif ($IncludeOrchestrator) {
    Write-Host "WARNING: Orchestrator PID file not found"
}

if (Test-Path $workerPidFile) {
    $workerPid = [int](Get-Content $workerPidFile).Trim()
    Write-Host "Worker PID: $workerPid (from file)"
} else {
    Write-Host "WARNING: Worker PID file not found"
}

if (Test-Path $supervisorPidFile) {
    $supervisorPid = [int](Get-Content $supervisorPidFile).Trim()
    Write-Host "Supervisor PID: $supervisorPid (from file)"
} else {
    Write-Host "WARNING: Supervisor PID file not found"
}

# Cleanup ready files
Remove-Item -Path $orchestratorReadyFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $workerReadyFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $supervisorReadyFile -Force -ErrorAction SilentlyContinue

# Add injection code
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class TabInjector {
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

# Inject BEGIN into Orchestrator (if included)
if ($IncludeOrchestrator -and $orchestratorPid) {
    Write-Host "Injecting BEGIN into Orchestrator (PID $orchestratorPid)"
    $textResult = [TabInjector]::InjectText($orchestratorPid, "BEGIN")
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [TabInjector]::InjectEnter($orchestratorPid)
    Write-Host "  Enter: $enterResult"
}

# Inject BEGIN into Worker (v11: Worker reads instructions from CLAUDE.md)
if ($workerPid) {
    Write-Host "Injecting BEGIN into Worker (PID $workerPid)"
    Write-Host "  (CLAUDE.md contains phase-$PhaseNumber instructions)"
    $textResult = [TabInjector]::InjectText($workerPid, "BEGIN")
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [TabInjector]::InjectEnter($workerPid)
    Write-Host "  Enter: $enterResult"
}

# Inject supervisor instructions (v11: Rule violation monitor)
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
    $textResult = [TabInjector]::InjectText($supervisorPid, $supervisorMsg)
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [TabInjector]::InjectEnter($supervisorPid)
    Write-Host "  Enter: $enterResult"
}

# Update manifest with PIDs (v11 schema)
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        # v11 schema uses nested workers object
        if (-not $manifest.workers) {
            $manifest | Add-Member -NotePropertyName "workers" -NotePropertyValue @{} -Force
        }
        if (-not $manifest.workers.current) {
            $manifest.workers | Add-Member -NotePropertyName "current" -NotePropertyValue @{} -Force
        }
        if (-not $manifest.workers.supervisor) {
            $manifest.workers | Add-Member -NotePropertyName "supervisor" -NotePropertyValue @{} -Force
        }
        if ($IncludeOrchestrator) {
            if (-not $manifest.workers.orchestrator) {
                $manifest.workers | Add-Member -NotePropertyName "orchestrator" -NotePropertyValue @{} -Force
            }
            $manifest.workers.orchestrator | Add-Member -NotePropertyName "pid" -NotePropertyValue $orchestratorPid -Force
        }
        $manifest.workers.current | Add-Member -NotePropertyName "pid" -NotePropertyValue $workerPid -Force
        $manifest.workers.supervisor | Add-Member -NotePropertyName "pid" -NotePropertyValue $supervisorPid -Force
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
        Write-Host "Manifest updated with PIDs (v11 schema)"
    } catch {
        Write-Host "WARNING: Could not update manifest: $_"
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  Pipeline Window Created!"
Write-Host "=========================================="
if ($IncludeOrchestrator) {
    Write-Host "  Layout: Dashboard | Orchestrator / Worker / Supervisor"
} else {
    Write-Host "  Layout: Dashboard | Worker / Supervisor"
}
Write-Host "=========================================="

# Output result
$result = @{
    wtWindowName = $wtWindowName
    dashboardPid = $dashboardPid
    orchestratorPid = $orchestratorPid
    workerPid = $workerPid
    supervisorPid = $supervisorPid
    layout = if ($IncludeOrchestrator) { "4-pane" } else { "3-pane" }
}
Write-Host "RESULT_JSON:$($result | ConvertTo-Json -Compress)"
