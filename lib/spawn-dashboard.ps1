param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$OrchestratorPID,

    [Parameter(Mandatory=$false)]
    [string]$Position = "left",  # left, right, or "X,Y,W,H"

    [Parameter(Mandatory=$false)]
    [int]$WidthPercent = 50
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

Write-Host "Spawning dashboard for: $ProjectPath"
Write-Host "Orchestrator PID: $OrchestratorPID (will use WriteConsoleInput for heartbeat)"
Write-Host "Position: $Position, Width: $WidthPercent%"

# Add Win32 API types for window manipulation (using AttachConsole approach)
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class DashboardWindowManager {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetConsoleWindow();

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
    public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public const int SM_CXSCREEN = 0;
    public const int SM_CYSCREEN = 1;

    const uint GENERIC_READ = 0x80000000;
    const uint GENERIC_WRITE = 0x40000000;
    const uint FILE_SHARE_READ = 0x00000001;
    const uint FILE_SHARE_WRITE = 0x00000002;
    const uint OPEN_EXISTING = 3;
    const uint ENABLE_QUICK_EDIT_MODE = 0x0040;
    const uint ENABLE_EXTENDED_FLAGS = 0x0080;

    public static int GetScreenWidth() {
        return GetSystemMetrics(SM_CXSCREEN);
    }

    public static int GetScreenHeight() {
        return GetSystemMetrics(SM_CYSCREEN);
    }

    public static string DisableQuickEdit(int pid) {
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

        uint mode;
        if (!GetConsoleMode(hInput, out mode)) {
            CloseHandle(hInput);
            FreeConsole();
            return "GetConsoleMode failed: " + Marshal.GetLastWin32Error();
        }

        // Disable Quick Edit Mode, enable extended flags
        mode &= ~ENABLE_QUICK_EDIT_MODE;
        mode |= ENABLE_EXTENDED_FLAGS;

        bool success = SetConsoleMode(hInput, mode);
        CloseHandle(hInput);
        FreeConsole();

        return success ? "OK:QuickEdit disabled" : "SetConsoleMode failed: " + Marshal.GetLastWin32Error();
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
$screenWidth = [DashboardWindowManager]::GetScreenWidth()
$screenHeight = [DashboardWindowManager]::GetScreenHeight()
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
    # Default to left
    $windowX = 0
    $windowY = 0
    $windowWidth = [math]::Floor($screenWidth * $WidthPercent / 100)
}

Write-Host "Window placement: X=$windowX, Y=$windowY, W=$windowWidth, H=$windowHeight"

$dashboardTitle = "Pipeline-Dashboard"

# Convert backslashes to forward slashes to avoid escape sequence issues when passing through cmd.exe to node
$ForwardSlashPath = $ProjectPath -replace '\\', '/'

# Use central dashboard from Pipeline-Office/lib/ (not local .pipeline/ copy)
$dashboardScript = Join-Path $PSScriptRoot "dashboard-v2.cjs"
$dashboardScriptForward = $dashboardScript.Replace('\', '/')

# Use conhost for consistency (WriteConsoleInput requires traditional console)
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $dashboardTitle && cd /d `"$ProjectPath`" && node `"$dashboardScriptForward`" `"$ForwardSlashPath`" $OrchestratorPID" -PassThru

Write-Host "Dashboard conhost PID: $($proc.Id)"

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

# Position window using AttachConsole + GetConsoleWindow (reliable method)
Write-Host "Positioning window using PID: $childPid"
$moveResult = [DashboardWindowManager]::MoveWindowByPid($childPid, $windowX, $windowY, $windowWidth, $windowHeight)
Write-Host "MoveWindow result: $moveResult"

if ($moveResult.StartsWith("OK")) {
    Write-Host "Dashboard window positioned successfully"
} else {
    Write-Host "WARNING: Could not position dashboard window"
}

# Disable Quick Edit Mode to prevent freeze on click
$quickEditResult = [DashboardWindowManager]::DisableQuickEdit($childPid)
Write-Host "Quick Edit disable result: $quickEditResult"

Write-Host "Dashboard spawned"
