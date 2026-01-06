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
    [string]$OBSLabel = "",  # DEPRECATED: Auto-detected from manifest now

    [Parameter(Mandatory=$false)]
    [string]$Position = "right",  # left, right, or "X,Y,W,H"

    [Parameter(Mandatory=$false)]
    [int]$WidthPercent = 50
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$title = "Worker-Phase-$PhaseNumber"
$sessionInfoPath = Join-Path $ProjectPath ".pipeline\session-info.txt"

Write-Host "=========================================="
Write-Host "  Spawning Worker - Phase $PhaseNumber"
Write-Host "=========================================="

# Copy phase-specific CLAUDE.md + append worker-base (v10.1 - single source of truth)
$claudeMdSource = "$pipelineOffice\claude-md\phase-$PhaseNumber.md"
$workerBaseSource = "$env:USERPROFILE\.claude\commands\worker-base-desktop-v9.0.md"
$claudeDir = Join-Path $ProjectPath ".claude"
$claudeMdDest = Join-Path $claudeDir "CLAUDE.md"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

# Start with phase-specific content
if (Test-Path $claudeMdSource) {
    Copy-Item $claudeMdSource $claudeMdDest -Force
    Write-Host "Copied phase-$PhaseNumber.md to .claude/CLAUDE.md"
} else {
    Write-Host "WARNING: Phase CLAUDE.md not found: $claudeMdSource"
    # Create empty file to append to
    "" | Out-File -FilePath $claudeMdDest -Encoding utf8
}

# Append worker-base rules (single source of truth)
if (Test-Path $workerBaseSource) {
    Add-Content -Path $claudeMdDest -Value "`n`n---`n`n# Worker Base Rules (Appended)`n"
    Get-Content $workerBaseSource | Add-Content -Path $claudeMdDest
    Write-Host "Appended worker-base-desktop-v9.0.md to .claude/CLAUDE.md"
} else {
    Write-Host "WARNING: Worker base not found: $workerBaseSource"
}

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

# Spawn conhost with PowerShell running claude
# Using conhost.exe directly ensures we get a traditional console (not Windows Terminal)
# PowerShell -NoExit keeps the window open after claude exits
$psCommand = "Set-Location -Path '$ProjectPath'; `$Host.UI.RawUI.WindowTitle = '$title'; & '$claudePath' --dangerously-skip-permissions"
$proc = Start-Process conhost.exe -ArgumentList "powershell.exe -NoExit -Command `"$psCommand`"" -PassThru

Write-Host "Worker conhost PID: $($proc.Id)"

# Wait for child powershell.exe process to start
Start-Sleep -Seconds 1

# Find the powershell.exe child process - needed for both window positioning and WriteConsoleInput
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
$moveResult = [WorkerWindowManager]::MoveWindowByPid($childPid, $windowX, $windowY, $windowWidth, $windowHeight)
Write-Host "MoveWindow result: $moveResult"

if ($moveResult.StartsWith("OK")) {
    Write-Host "Worker window positioned successfully"

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
    $sizeResult = [WorkerWindowManager]::SetConsoleSizeByPid($childPid, $cols, $rows)
    Write-Host "SetConsoleSize result: $sizeResult"
} else {
    Write-Host "WARNING: Could not position worker window"
}

# Disable Quick Edit Mode to prevent freeze on click
$quickEditResult = [WorkerWindowManager]::DisableQuickEdit($childPid)
Write-Host "Quick Edit disable result: $quickEditResult"

# Wait for Claude to be ready (poll console buffer for prompt)
Write-Host "Waiting for Claude to be ready..."
$maxWaitSeconds = 30
$pollIntervalMs = 500
$startTime = Get-Date
$claudeReady = $false

# Add console buffer reader inline (same as read-console-buffer.ps1)
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class ClaudeReadinessChecker
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;

    [StructLayout(LayoutKind.Sequential)]
    public struct COORD
    {
        public short X;
        public short Y;
        public COORD(short x, short y) { X = x; Y = y; }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct SMALL_RECT
    {
        public short Left;
        public short Top;
        public short Right;
        public short Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct CONSOLE_SCREEN_BUFFER_INFO
    {
        public COORD dwSize;
        public COORD dwCursorPosition;
        public ushort wAttributes;
        public SMALL_RECT srWindow;
        public COORD dwMaximumWindowSize;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct CHAR_INFO
    {
        [FieldOffset(0)] public char UnicodeChar;
        [FieldOffset(0)] public byte AsciiChar;
        [FieldOffset(2)] public ushort Attributes;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess,
        uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetConsoleScreenBufferInfo(IntPtr hConsoleOutput,
        out CONSOLE_SCREEN_BUFFER_INFO lpConsoleScreenBufferInfo);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool ReadConsoleOutput(IntPtr hConsoleOutput,
        [Out] CHAR_INFO[] lpBuffer, COORD dwBufferSize, COORD dwBufferCoord,
        ref SMALL_RECT lpReadRegion);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    public static string ReadLastLines(int pid, int lineCount)
    {
        FreeConsole();
        if (!AttachConsole(pid)) return null;

        try
        {
            IntPtr hOutput = CreateFile("CONOUT$", GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

            if (hOutput == IntPtr.Zero || hOutput == new IntPtr(-1)) return null;

            try
            {
                CONSOLE_SCREEN_BUFFER_INFO csbi;
                if (!GetConsoleScreenBufferInfo(hOutput, out csbi)) return null;

                int width = csbi.dwSize.X;
                int cursorY = csbi.dwCursorPosition.Y;
                int startRow = Math.Max(0, cursorY - lineCount + 1);
                int rowsToRead = Math.Min(lineCount, cursorY + 1);

                if (rowsToRead <= 0) return "";

                CHAR_INFO[] buffer = new CHAR_INFO[width * rowsToRead];
                COORD bufferSize = new COORD((short)width, (short)rowsToRead);
                COORD bufferCoord = new COORD(0, 0);
                SMALL_RECT readRegion = new SMALL_RECT
                {
                    Left = 0, Top = (short)startRow,
                    Right = (short)(width - 1), Bottom = (short)(startRow + rowsToRead - 1)
                };

                if (!ReadConsoleOutput(hOutput, buffer, bufferSize, bufferCoord, ref readRegion))
                    return null;

                StringBuilder result = new StringBuilder();
                for (int row = 0; row < rowsToRead; row++)
                {
                    StringBuilder line = new StringBuilder();
                    for (int col = 0; col < width; col++)
                    {
                        char c = buffer[row * width + col].UnicodeChar;
                        line.Append(c == '\0' ? ' ' : c);
                    }
                    result.AppendLine(line.ToString().TrimEnd());
                }
                return result.ToString();
            }
            finally { CloseHandle(hOutput); }
        }
        finally { FreeConsole(); }
    }

    public static bool IsClaudeReady(int pid)
    {
        string content = ReadLastLines(pid, 10);
        if (content == null) return false;

        // Claude is ready when we see the ">" prompt at the start of a line
        // or other indicators that Claude CLI is waiting for input
        return content.Contains("\n> ") ||
               content.Contains("\r\n> ") ||
               content.EndsWith("> ") ||
               content.Contains("tip:") ||  // Claude shows tips when ready
               content.Contains("What would you like");  // Claude greeting
    }
}
"@ -ErrorAction SilentlyContinue

while (-not $claudeReady) {
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    if ($elapsed -ge $maxWaitSeconds) {
        Write-Host "WARNING: Timeout waiting for Claude prompt after ${maxWaitSeconds}s - proceeding anyway"
        break
    }

    try {
        $claudeReady = [ClaudeReadinessChecker]::IsClaudeReady($childPid)
        if ($claudeReady) {
            Write-Host "Claude is ready (detected prompt after $([math]::Round($elapsed, 1))s)"
        } else {
            Write-Host "  Waiting... ($([math]::Round($elapsed, 1))s)"
            Start-Sleep -Milliseconds $pollIntervalMs
        }
    } catch {
        Write-Host "  Check failed: $_"
        Start-Sleep -Milliseconds $pollIntervalMs
    }
}

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

# v10.0: BaseRules removed - rules are now in .claude/CLAUDE.md which stays in system prompt

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

# Auto-detect OBS label from manifest if not provided (v9.0+)
$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
$autoOBSLabel = ""

if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $phase = $manifest.currentPhase

    # Build label based on phase
    $phaseNames = @{
        "1" = "Brainstorm"
        "2" = "Technical"
        "3" = "Bootstrap"
        "4" = "Implement"
        "5" = "Finalize"
    }

    if ($phase -eq "4" -and $manifest.epics -and $manifest.currentEpic) {
        # Phase 4: Use epic name
        $epicIndex = [int]$manifest.currentEpic - 1
        if ($epicIndex -ge 0 -and $epicIndex -lt $manifest.epics.Count) {
            $epicName = $manifest.epics[$epicIndex].name -replace '[^a-zA-Z0-9]', ''
            $autoOBSLabel = "Epic$($manifest.currentEpic)_$epicName"
        }
    } elseif ($phaseNames.ContainsKey($phase)) {
        $autoOBSLabel = "Phase${phase}_$($phaseNames[$phase])"
    }
}

# Use provided label or auto-detected one
$finalOBSLabel = if ($OBSLabel -ne "") { $OBSLabel } else { $autoOBSLabel }

# Start OBS recording
if ($finalOBSLabel -ne "") {
    Write-Host "Starting OBS recording: $finalOBSLabel"
    $obsScript = Join-Path $PSScriptRoot "obs-control.cjs"
    $obsResult = & node $obsScript start $finalOBSLabel $ProjectPath 2>&1
    Write-Host "OBS result: $obsResult"
} else {
    Write-Host "OBS: No label available, skipping recording"
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
