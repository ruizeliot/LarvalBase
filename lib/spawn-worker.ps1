param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$PhaseNumber,

    [Parameter(Mandatory=$true)]
    [string]$PhaseCommand,

    [Parameter(Mandatory=$false)]
    [string]$OutputStyle = "",

    [Parameter(Mandatory=$false)]
    [string]$Position = "right",  # left, right, or "X,Y,W,H"

    [Parameter(Mandatory=$false)]
    [int]$WidthPercent = 50
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$title = "Worker-Phase-$PhaseNumber"
$sessionInfoPath = Join-Path $ProjectPath ".pipeline\session-info.txt"

Write-Host "Spawning worker for phase $PhaseNumber"
Write-Host "Position: $Position, Width: $WidthPercent%"

# Clear session-info.txt before spawning (hook will write new session ID)
if (Test-Path $sessionInfoPath) {
    Remove-Item $sessionInfoPath -Force
    Write-Host "Cleared previous session-info.txt"
}

# Add Win32 API types for window manipulation (using AttachConsole approach)
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WorkerWindowManager {
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
$screenWidth = [WorkerWindowManager]::GetScreenWidth()
$screenHeight = [WorkerWindowManager]::GetScreenHeight()
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
    # Default to right
    $windowWidth = [math]::Floor($screenWidth * $WidthPercent / 100)
    $windowX = $screenWidth - $windowWidth
    $windowY = 0
}

Write-Host "Window placement: X=$windowX, Y=$windowY, W=$windowWidth, H=$windowHeight"

# Spawn conhost with cmd running claude (no command argument - we'll inject it)
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $title && cd /d `"$ProjectPath`" && `"$claudePath`" --dangerously-skip-permissions" -PassThru

Write-Host "Worker conhost PID: $($proc.Id)"

# Wait for child cmd.exe process to start
Start-Sleep -Seconds 1

# Find the cmd.exe child process - needed for both window positioning and WriteConsoleInput
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
$moveResult = [WorkerWindowManager]::MoveWindowByPid($childPid, $windowX, $windowY, $windowWidth, $windowHeight)
Write-Host "MoveWindow result: $moveResult"

if ($moveResult.StartsWith("OK")) {
    Write-Host "Worker window positioned successfully"
} else {
    Write-Host "WARNING: Could not position worker window"
}

# Wait for Claude to start up
Start-Sleep -Seconds 3

# Now inject the slash command using WriteConsoleInput
Write-Host "Injecting command: $PhaseCommand"

$injectCode = @"
using System;
using System.Runtime.InteropServices;

public class ConsoleInjector {
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

    [StructLayout(LayoutKind.Sequential)]
    public struct COORD {
        public short X;
        public short Y;
    }

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

        // Build input records for each character (NO Enter)
        var records = new INPUT_RECORD[text.Length * 2];
        int idx = 0;

        foreach (char c in text) {
            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 1;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = c;
            records[idx].KeyEvent.wVirtualKeyCode = 0;
            records[idx].KeyEvent.wVirtualScanCode = 0;
            records[idx].KeyEvent.dwControlKeyState = 0;
            idx++;

            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 0;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.UnicodeChar = c;
            records[idx].KeyEvent.wVirtualKeyCode = 0;
            records[idx].KeyEvent.wVirtualScanCode = 0;
            records[idx].KeyEvent.dwControlKeyState = 0;
            idx++;
        }

        uint written;
        bool success = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        if (success) {
            return "OK:" + written;
        }
        return "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
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
        records[0].KeyEvent.dwControlKeyState = 0;

        records[1].EventType = KEY_EVENT;
        records[1].KeyEvent.bKeyDown = 0;
        records[1].KeyEvent.wRepeatCount = 1;
        records[1].KeyEvent.UnicodeChar = (char)13;
        records[1].KeyEvent.wVirtualKeyCode = 0x0D;
        records[1].KeyEvent.wVirtualScanCode = 0x1C;
        records[1].KeyEvent.dwControlKeyState = 0;

        uint written;
        bool success = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        if (success) {
            return "OK:" + written;
        }
        return "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
    }
}
"@

Add-Type -TypeDefinition $injectCode -Language CSharp

# If OutputStyle specified, inject it first
if ($OutputStyle -ne "") {
    Write-Host "Setting output style: $OutputStyle"
    $styleCmd = "/output-style $OutputStyle"
    $styleResult = [ConsoleInjector]::InjectText($childPid, $styleCmd)
    Write-Host "Style text injection: $styleResult"
    Start-Sleep -Milliseconds 500
    $styleEnter = [ConsoleInjector]::InjectEnter($childPid)
    Write-Host "Style enter injection: $styleEnter"
    # Wait for style to apply
    Start-Sleep -Seconds 2
}

# Now inject the phase command (without Enter)
$result = [ConsoleInjector]::InjectText($childPid, $PhaseCommand)
Write-Host "Text injection result: $result"

# Wait for Claude to process the autocomplete
Start-Sleep -Milliseconds 500

# Now inject just Enter
$enterResult = [ConsoleInjector]::InjectEnter($childPid)
Write-Host "Enter injection result: $enterResult"

# Wait for Claude to start and SessionStart hook to fire
Write-Host "Waiting for session ID from hook..."
Start-Sleep -Seconds 3

# Read session ID from hook output
$sessionId = $null
if (Test-Path $sessionInfoPath) {
    $sessionJson = Get-Content $sessionInfoPath -Raw | ConvertFrom-Json
    $sessionId = $sessionJson.session_id
    Write-Host "Session ID captured: $sessionId"
} else {
    Write-Host "WARNING: session-info.txt not found - hook may not have fired"
}

# Output JSON for easy parsing - workerPid is the CMD process (for reading console buffer)
$result = @{
    conhostPid = $proc.Id
    workerPid = $childPid
    phase = $PhaseNumber
    command = $PhaseCommand
    sessionId = $sessionId
} | ConvertTo-Json -Compress

Write-Host "WORKER_INFO:$result"
