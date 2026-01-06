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

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleScreenBufferSize(IntPtr hConsoleOutput, COORD dwSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleWindowInfo(IntPtr hConsoleOutput, bool bAbsolute, ref SMALL_RECT lpConsoleWindow);

    [StructLayout(LayoutKind.Sequential)]
    public struct COORD {
        public short X;
        public short Y;
        public COORD(short x, short y) { X = x; Y = y; }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct SMALL_RECT {
        public short Left;
        public short Top;
        public short Right;
        public short Bottom;
    }

    public const int SM_CXSCREEN = 0;
    public const int SM_CYSCREEN = 1;
    public const int STD_OUTPUT_HANDLE = -11;

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

    // Set console buffer and window size in character dimensions
    // This prevents the window from shrinking after MoveWindow
    public static string SetConsoleSizeByPid(int pid, short cols, short rows) {
        FreeConsole();
        if (!AttachConsole(pid)) {
            int err = Marshal.GetLastWin32Error();
            return "AttachConsole failed: " + err;
        }

        IntPtr hOutput = GetStdHandle(STD_OUTPUT_HANDLE);
        if (hOutput == IntPtr.Zero || hOutput == new IntPtr(-1)) {
            FreeConsole();
            return "GetStdHandle failed";
        }

        // First shrink window to minimum to allow buffer resize
        SMALL_RECT minWindow = new SMALL_RECT();
        minWindow.Left = 0;
        minWindow.Top = 0;
        minWindow.Right = 1;
        minWindow.Bottom = 1;
        SetConsoleWindowInfo(hOutput, true, ref minWindow);

        // Set buffer size
        COORD bufferSize = new COORD(cols, rows);
        if (!SetConsoleScreenBufferSize(hOutput, bufferSize)) {
            FreeConsole();
            return "SetConsoleScreenBufferSize failed: " + Marshal.GetLastWin32Error();
        }

        // Set window size to match buffer (0-indexed, so subtract 1)
        SMALL_RECT windowSize = new SMALL_RECT();
        windowSize.Left = 0;
        windowSize.Top = 0;
        windowSize.Right = (short)(cols - 1);
        windowSize.Bottom = (short)(rows - 1);
        bool result = SetConsoleWindowInfo(hOutput, true, ref windowSize);

        FreeConsole();
        return result ? "OK:size=" + cols + "x" + rows : "SetConsoleWindowInfo failed: " + Marshal.GetLastWin32Error();
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

# Use central dashboard from Pipeline-Office/lib/ (not local .pipeline/ copy)
$dashboardScript = Join-Path $PSScriptRoot "dashboard-v3.cjs"

# Use conhost with PowerShell for consistency (WriteConsoleInput requires traditional console)
$psCommand = "Set-Location -Path '$ProjectPath'; `$Host.UI.RawUI.WindowTitle = '$dashboardTitle'; node '$dashboardScript' '$ProjectPath' $OrchestratorPID"
$proc = Start-Process conhost.exe -ArgumentList "powershell.exe -NoExit -Command `"$psCommand`"" -PassThru

Write-Host "Dashboard conhost PID: $($proc.Id)"

# Wait for child powershell.exe process to start
Start-Sleep -Seconds 1

# Find the powershell.exe child process
$children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id }
$childPid = $null
foreach ($child in $children) {
    Write-Host "  Child process: $($child.Name) (PID: $($child.ProcessId))"
    if ($child.Name -eq "powershell.exe") {
        $childPid = $child.ProcessId
    }
}

if (-not $childPid) {
    Write-Host "WARNING: Could not find child powershell.exe process"
    $childPid = $proc.Id
}

# Position window using AttachConsole + GetConsoleWindow (reliable method)
Write-Host "Positioning window using PID: $childPid"
$moveResult = [DashboardWindowManager]::MoveWindowByPid($childPid, $windowX, $windowY, $windowWidth, $windowHeight)
Write-Host "MoveWindow result: $moveResult"

if ($moveResult.StartsWith("OK")) {
    Write-Host "Dashboard window positioned successfully"

    # Calculate character dimensions from pixel size
    # Account for window decorations: title bar (~30px), borders (~8px total)
    # Typical console font: ~8px wide, ~16px tall
    $decorationHeight = 38  # title bar + borders
    $decorationWidth = 8    # left + right borders
    $fontWidth = 8
    $fontHeight = 16

    $cols = [math]::Floor(($windowWidth - $decorationWidth) / $fontWidth)
    $rows = [math]::Floor(($windowHeight - $decorationHeight) / $fontHeight)

    # Ensure minimum reasonable size
    if ($cols -lt 80) { $cols = 80 }
    if ($rows -lt 24) { $rows = 24 }

    Write-Host "Setting console size: ${cols}x${rows} characters"
    $sizeResult = [DashboardWindowManager]::SetConsoleSizeByPid($childPid, $cols, $rows)
    Write-Host "SetConsoleSize result: $sizeResult"
} else {
    Write-Host "WARNING: Could not position dashboard window"
}

# Disable Quick Edit Mode to prevent freeze on click
$quickEditResult = [DashboardWindowManager]::DisableQuickEdit($childPid)
Write-Host "Quick Edit disable result: $quickEditResult"

Write-Host "Dashboard spawned"

# NOTE: OBS recording is now controlled by the orchestrator directly
# via lib/obs-control.cjs (not spawned as a background watcher)
