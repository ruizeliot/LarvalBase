param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$OrchestratorPID,

    [Parameter(Mandatory=$true)]
    [string]$PhaseNumber,

    [Parameter(Mandatory=$true)]
    [string]$PhaseCommand,

    [Parameter(Mandatory=$false)]
    [string]$OutputStyle = "",

    [Parameter(Mandatory=$false)]
    [string]$Model = "",

    [Parameter(Mandatory=$false)]
    [double]$WorkerSplit = 0.5,

    [Parameter(Mandatory=$false)]
    [double]$SupervisorSplit = 0.5
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$dashboardScript = Join-Path $pipelineOffice "lib\dashboard-v3.cjs"

Write-Host "=========================================="
Write-Host "  spawn-wt-tabs.ps1 (v10.2)"
Write-Host "  Creating Split-Pane Layout"
Write-Host "=========================================="
Write-Host "Project: $ProjectPath"
Write-Host "Phase: $PhaseNumber"
Write-Host "Command: $PhaseCommand"

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
$workerBaseSource = "$env:USERPROFILE\.claude\commands\worker-base-desktop-v9.0.md"
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
# TAB 1: Main (Dashboard + Worker + Supervisor)
# ============================================

Write-Host ""
Write-Host "--- Creating Tab 1: Main (Split View) ---"

# Dashboard command for Tab 1 (Main)
$dashboardCmd = @"
`$PID | Out-File -FilePath '$dashboardPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Dashboard'
node '$dashboardScript' '$ProjectPath' $OrchestratorPID
"@
$dashboardBytes = [System.Text.Encoding]::Unicode.GetBytes($dashboardCmd)
$dashboardEncoded = [Convert]::ToBase64String($dashboardBytes)

# Worker command
$modelArg = if ($Model -ne "") { "--model $Model " } else { "" }
$workerCmd = @"
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Worker'
& '$claudePath' ${modelArg}--dangerously-skip-permissions
"@
$workerBytes = [System.Text.Encoding]::Unicode.GetBytes($workerCmd)
$workerEncoded = [Convert]::ToBase64String($workerBytes)

# Supervisor command
$supervisorCmd = @"
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

# Split Tab 1: Add Worker pane (right side, 50% width)
Write-Host "Adding Worker pane to Main tab..."
$wtArgs = @(
    "--window", $wtWindowName,
    "split-pane",
    "-V",
    "-s", "$WorkerSplit",
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
    "-s", "$SupervisorSplit",
    "--title", "Supervisor",
    "powershell.exe", "-NoExit", "-EncodedCommand", $supervisorEncoded
)
Start-Process wt.exe -ArgumentList $wtArgs
Start-Sleep -Seconds 2


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

# Find Worker and Supervisor PIDs by looking for new PowerShell processes
$allPwsh = Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
Write-Host "PowerShell processes: $($allPwsh -join ', ')"

# Update manifest
$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $manifest.wtMode = $true
        $manifest.wtWindowName = $wtWindowName
        $manifest.dashboardPid = $dashboardPid
        $manifest.layout = "4-tab"
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
        Write-Host "Manifest updated"
    } catch {
        Write-Host "WARNING: Could not update manifest: $_"
    }
}

# ============================================
# Wait for Claude to be ready, then inject command
# ============================================

Write-Host ""
Write-Host "--- Waiting for Claude to be ready ---"
Start-Sleep -Seconds 8

# Find the Worker PowerShell process (most recent one with "Worker" in window title)
# For now, we'll use a simple approach - inject into most recent powershell
$recentPwsh = Get-Process -Name powershell -ErrorAction SilentlyContinue |
    Sort-Object StartTime -Descending |
    Select-Object -First 5

Write-Host "Recent PowerShell processes:"
foreach ($p in $recentPwsh) {
    Write-Host "  PID $($p.Id) - Started $($p.StartTime)"
}

# Inject the phase command into the Worker
# We need to find the right PID - for now use the second-newest (newest is likely supervisor)
$workerPid = $null
$supervisorPid = $null

if ($recentPwsh.Count -ge 2) {
    # Assuming order: newest = supervisor, second = worker
    $supervisorPid = $recentPwsh[0].Id
    $workerPid = $recentPwsh[1].Id
    Write-Host "Assuming Worker PID: $workerPid, Supervisor PID: $supervisorPid"
}

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

# Inject phase command into Worker
if ($workerPid) {
    Write-Host "Injecting command into Worker (PID $workerPid): $PhaseCommand"
    $textResult = [TabInjector]::InjectText($workerPid, $PhaseCommand)
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [TabInjector]::InjectEnter($workerPid)
    Write-Host "  Enter: $enterResult"
}

# Inject supervisor instructions
if ($supervisorPid) {
    Write-Host "Injecting instructions into Supervisor (PID $supervisorPid)"
    $supervisorMsg = "You are a Code Reviewer. Watch for rule violations in the Worker's output. Say 'Reviewer ready' to confirm."
    $textResult = [TabInjector]::InjectText($supervisorPid, $supervisorMsg)
    Write-Host "  Text: $textResult"
    Start-Sleep -Milliseconds 500
    $enterResult = [TabInjector]::InjectEnter($supervisorPid)
    Write-Host "  Enter: $enterResult"
}

# Update manifest with PIDs
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $manifest.workerPid = $workerPid
        $manifest.supervisorPid = $supervisorPid
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
        Write-Host "Manifest updated with Worker/Supervisor PIDs"
    } catch {
        Write-Host "WARNING: Could not update manifest: $_"
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  Pipeline Window Created!"
Write-Host "=========================================="
Write-Host "  Layout: Dashboard | Worker + Supervisor"
Write-Host "=========================================="

# Output result
$result = @{
    wtWindowName = $wtWindowName
    dashboardPid = $dashboardPid
    workerPid = $workerPid
    supervisorPid = $supervisorPid
    layout = "split-pane"
}
Write-Host "RESULT_JSON:$($result | ConvertTo-Json -Compress)"
