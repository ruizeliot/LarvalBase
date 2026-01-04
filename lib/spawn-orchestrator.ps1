param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$Position = "left",  # left, right, or "X,Y,W,H"

    [Parameter(Mandatory=$false)]
    [int]$WidthPercent = 50
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$claudeMdSource = "$pipelineOffice\claude-md\orchestrator.md"
$title = "Orchestrator"

Write-Host "=========================================="
Write-Host "  Pipeline Launcher v10.0"
Write-Host "=========================================="
Write-Host ""
Write-Host "Project: $ProjectPath"
Write-Host ""

# Ensure .claude directory exists
$claudeDir = Join-Path $ProjectPath ".claude"
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
    Write-Host "Created .claude directory"
}

# Copy orchestrator CLAUDE.md
$claudeMdDest = Join-Path $claudeDir "CLAUDE.md"
Copy-Item $claudeMdSource $claudeMdDest -Force
Write-Host "Copied orchestrator.md to .claude/CLAUDE.md"

# Add Win32 API types for window manipulation
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class OrchestratorWindowManager {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public const int SM_CXSCREEN = 0;
    public const int SM_CYSCREEN = 1;

    public static int GetScreenWidth() {
        return GetSystemMetrics(SM_CXSCREEN);
    }

    public static int GetScreenHeight() {
        return GetSystemMetrics(SM_CYSCREEN);
    }

    public static string MoveWindowByPid(int pid, int x, int y, int w, int h) {
        FreeConsole();
        if (!AttachConsole(pid)) {
            int err = Marshal.GetLastWin32Error();
            return "AttachConsole failed: " + err;
        }
        IntPtr hwnd = GetConsoleWindow();
        if (hwnd == IntPtr.Zero) {
            FreeConsole();
            return "GetConsoleWindow failed";
        }
        bool result = MoveWindow(hwnd, x, y, w, h, true);
        FreeConsole();
        return result ? "OK:hwnd=" + hwnd : "MoveWindow failed";
    }
}
"@

# Calculate window position
$screenWidth = [OrchestratorWindowManager]::GetScreenWidth()
$screenHeight = [OrchestratorWindowManager]::GetScreenHeight()
$windowHeight = $screenHeight - 40  # Leave space for taskbar

if ($Position -match "^\d+,\d+,\d+,\d+$") {
    # Custom position: X,Y,W,H
    $parts = $Position -split ","
    $windowX = [int]$parts[0]
    $windowY = [int]$parts[1]
    $windowWidth = [int]$parts[2]
    $windowHeight = [int]$parts[3]
} elseif ($Position -eq "left") {
    $windowX = 0
    $windowY = 0
    $windowWidth = [math]::Floor($screenWidth * $WidthPercent / 100)
} elseif ($Position -eq "right") {
    $windowWidth = [math]::Floor($screenWidth * $WidthPercent / 100)
    $windowX = $screenWidth - $windowWidth
    $windowY = 0
} else {
    # Default to left for orchestrator
    $windowX = 0
    $windowY = 0
    $windowWidth = [math]::Floor($screenWidth * $WidthPercent / 100)
}

Write-Host "Window placement: X=$windowX, Y=$windowY, W=$windowWidth, H=$windowHeight"

# Spawn conhost with cmd running claude
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $title && cd /d `"$ProjectPath`" && `"$claudePath`" --dangerously-skip-permissions" -PassThru

Write-Host "Orchestrator conhost PID: $($proc.Id)"

# Wait for child cmd.exe process to start
Start-Sleep -Seconds 1

# Find the cmd.exe child process
$children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id }
$childPid = $null
foreach ($child in $children) {
    Write-Host "  Child process: $($child.Name) (PID: $($child.ProcessId))"
    if ($child.Name -eq "cmd.exe") {
        $childPid = $child.ProcessId
    }
}

if (-not $childPid) {
    Write-Host "WARNING: Could not find child cmd.exe process"
    $childPid = $proc.Id
}

# Position window
Write-Host "Positioning window using PID: $childPid"
$moveResult = [OrchestratorWindowManager]::MoveWindowByPid($childPid, $windowX, $windowY, $windowWidth, $windowHeight)
Write-Host "MoveWindow result: $moveResult"

Write-Host ""
Write-Host "=========================================="
Write-Host "  Orchestrator spawned successfully"
Write-Host "=========================================="
Write-Host ""
Write-Host "The orchestrator window is now open."
Write-Host "It will read its instructions from .claude/CLAUDE.md"
Write-Host ""
Write-Host "To start the pipeline, type in the orchestrator window:"
Write-Host "  /orchestrator-desktop-v9.0"
Write-Host ""

# Output JSON for easy parsing
$result = @{
    conhostPid = $proc.Id
    orchestratorPid = $childPid
    projectPath = $ProjectPath
    claudeMd = $claudeMdDest
} | ConvertTo-Json -Compress

Write-Host "ORCHESTRATOR_INFO:$result"
