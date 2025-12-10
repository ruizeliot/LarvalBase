param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$PhaseNumber,

    [Parameter(Mandatory=$true)]
    [string]$PhaseCommand
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$title = "Worker-Phase-$PhaseNumber"
$sessionInfoPath = Join-Path $ProjectPath ".pipeline\session-info.txt"

Write-Host "Spawning worker for phase $PhaseNumber"

# Clear session-info.txt before spawning (hook will write new session ID)
if (Test-Path $sessionInfoPath) {
    Remove-Item $sessionInfoPath -Force
    Write-Host "Cleared previous session-info.txt"
}

# Spawn conhost with cmd running claude (no command argument - we'll inject it)
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $title && cd /d `"$ProjectPath`" && `"$claudePath`" --dangerously-skip-permissions" -PassThru

Write-Host "Worker conhost PID: $($proc.Id)"

# Wait for Claude to start up
Start-Sleep -Seconds 5

# Find the cmd.exe child process - THIS is what we need for WriteConsoleInput
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

# First inject the text (without Enter)
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
