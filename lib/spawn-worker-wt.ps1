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
    [string]$Model = ""  # Claude model: haiku, sonnet, opus (empty = default)
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$title = "Worker-Phase-$PhaseNumber"
$sessionInfoPath = Join-Path $ProjectPath ".pipeline\session-info.txt"

Write-Host "=========================================="
Write-Host "  spawn-worker-wt.ps1"
Write-Host "  Spawning Worker - Phase $PhaseNumber"
if ($Model -ne "") {
    Write-Host "  Model: $Model"
} else {
    Write-Host "  Model: (default)"
}
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

# Clear session-info.txt before spawning (hook will write new session ID)
if (Test-Path $sessionInfoPath) {
    Remove-Item $sessionInfoPath -Force
    Write-Host "Cleared previous session-info.txt"
}

# Build the command that runs inside the WT pane
$modelArg = if ($Model -ne "") { "--model $Model " } else { "" }
$psCommand = @"
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$title'
& '$claudePath' ${modelArg}--dangerously-skip-permissions
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
Write-Host "Reading manifest from: $manifestPath"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    Write-Host "Manifest wtWindowName: $($manifest.wtWindowName)"
    if ($manifest.wtWindowName) {
        $wtWindowName = $manifest.wtWindowName
    } else {
        Write-Host "WARNING: wtWindowName not found in manifest, using fallback"
    }
} else {
    Write-Host "WARNING: Manifest not found at $manifestPath"
}

# Add Worker pane to EXISTING Windows Terminal window using named window
# Split vertically (-V) to create right-side pane
Write-Host "Adding Worker pane to window '$wtWindowName'..."
$wtArgs = @(
    "--window", $wtWindowName,
    "split-pane",
    "-V",
    "-s", "0.5",
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

$workerPid = $null
if ($newPids.Count -eq 1) {
    $workerPid = $newPids[0]
    Write-Host "Worker PowerShell PID: $workerPid"
} elseif ($newPids.Count -gt 1) {
    # Multiple new PIDs - take the most recent one
    $workerPid = $newPids[-1]
    Write-Host "Multiple new PIDs found, using most recent: $workerPid"
} else {
    Write-Host "WARNING: Could not identify worker PowerShell PID"
}

# Wait for Claude to be ready (poll console buffer for prompt)
Write-Host "Waiting for Claude to be ready..."
$maxWaitSeconds = 30
$pollIntervalMs = 500
$startTime = Get-Date
$claudeReady = $false

# Add console buffer reader
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
        return content.Contains("\n> ") ||
               content.Contains("\r\n> ") ||
               content.EndsWith("> ") ||
               content.Contains("tip:") ||
               content.Contains("What would you like");
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
        $claudeReady = [ClaudeReadinessChecker]::IsClaudeReady($workerPid)
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

public class ConsoleInjectorWT {
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
    $styleResult = [ConsoleInjectorWT]::InjectText($workerPid, $styleCmd)
    Write-Host "Style text injection: $styleResult"
    Start-Sleep -Milliseconds 500
    $styleEnter = [ConsoleInjectorWT]::InjectEnter($workerPid)
    Write-Host "Style enter injection: $styleEnter"
    Start-Sleep -Seconds 2
}

# Now inject the phase command
$result = [ConsoleInjectorWT]::InjectText($workerPid, $PhaseCommand)
Write-Host "Text injection result: $result"

Start-Sleep -Milliseconds 500

$enterResult = [ConsoleInjectorWT]::InjectEnter($workerPid)
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

# Auto-detect OBS label from manifest
$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
$autoOBSLabel = ""

if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $phase = $manifest.currentPhase

    $phaseNames = @{
        "1" = "Brainstorm"
        "2" = "Technical"
        "3" = "Bootstrap"
        "4" = "Implement"
        "5" = "Finalize"
    }

    if ($phase -eq "4" -and $manifest.epics -and $manifest.currentEpic) {
        $epicIndex = [int]$manifest.currentEpic - 1
        if ($epicIndex -ge 0 -and $epicIndex -lt $manifest.epics.Count) {
            $epicName = $manifest.epics[$epicIndex].name -replace '[^a-zA-Z0-9]', ''
            $autoOBSLabel = "Epic$($manifest.currentEpic)_$epicName"
        }
    } elseif ($phaseNames.ContainsKey($phase)) {
        $autoOBSLabel = "Phase${phase}_$($phaseNames[$phase])"
    }
}

# Start OBS recording
if ($autoOBSLabel -ne "") {
    Write-Host "Starting OBS recording: $autoOBSLabel"
    $obsScript = Join-Path $PSScriptRoot "obs-control.cjs"
    $obsResult = & node $obsScript start $autoOBSLabel $ProjectPath 2>&1
    Write-Host "OBS result: $obsResult"
} else {
    Write-Host "OBS: No label available, skipping recording"
}

# Spawn Supervisor (Haiku) to watch Developer for rule violations
Write-Host ""
Write-Host "=========================================="
Write-Host "  Spawning Supervisor (Haiku) via WT"
Write-Host "=========================================="

$supervisorScript = Join-Path $pipelineOffice "lib\spawn-supervisor-wt.ps1"
$supervisorPid = $null

if (Test-Path $supervisorScript) {
    try {
        # Run spawn-supervisor-wt and capture its output
        $supervisorOutput = & $supervisorScript -ProjectPath $ProjectPath -DeveloperPid $workerPid -WorkerSessionId $sessionId 2>&1
        Write-Host $supervisorOutput

        # Extract Supervisor PID from output
        $supervisorInfoPath = Join-Path $ProjectPath ".pipeline\supervisor-info.json"
        if (Test-Path $supervisorInfoPath) {
            $supervisorInfo = Get-Content $supervisorInfoPath -Raw | ConvertFrom-Json
            $supervisorPid = $supervisorInfo.supervisorPid
            Write-Host "Supervisor spawned with PID: $supervisorPid"
        }
    } catch {
        Write-Host "WARNING: Failed to spawn Supervisor: $_"
    }
} else {
    Write-Host "WARNING: Supervisor script not found: $supervisorScript"
}

# Update manifest with PIDs
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $manifest.workerPid = $workerPid
        $manifest.supervisorPid = $supervisorPid
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
        Write-Host "Manifest updated with workerPid=$workerPid, supervisorPid=$supervisorPid"
    } catch {
        Write-Host "WARNING: Could not update manifest: $_"
    }
}

# Output JSON for easy parsing
$resultJson = @{
    workerPid = $workerPid
    phase = $PhaseNumber
    command = $PhaseCommand
    sessionId = $sessionId
    supervisorPid = $supervisorPid
    wtMode = $true
}

Write-Host ""
Write-Host "RESULT_JSON:$($resultJson | ConvertTo-Json -Compress)"
