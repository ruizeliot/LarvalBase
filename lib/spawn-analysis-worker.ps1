param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$SessionId,

    [Parameter(Mandatory=$true)]
    [string]$Type,  # "phase" or "epic"

    [Parameter(Mandatory=$true)]
    [string]$Number  # Phase number (1-5) or epic ID
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$title = "Analysis-$Type-$Number"

Write-Host "Spawning analysis worker for $Type $Number"
Write-Host "Session ID: $SessionId"

# Build the command to inject
$analysisCommand = "/analyze-worker-transcript `"$ProjectPath`" `"$SessionId`" `"$Type`" `"$Number`""
Write-Host "Analysis command: $analysisCommand"

# Spawn conhost with cmd running claude (no window repositioning)
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $title && cd /d `"$ProjectPath`" && `"$claudePath`" --dangerously-skip-permissions" -WindowStyle Minimized -PassThru

Write-Host "Analysis worker conhost PID: $($proc.Id)"

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

# Wait for Claude to start up
Start-Sleep -Seconds 3

# Inject the slash command using WriteConsoleInput
Write-Host "Injecting command: $analysisCommand"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class AnalysisInjector {
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

# Inject the command text
$textResult = [AnalysisInjector]::InjectText($childPid, $analysisCommand)
Write-Host "Text injection result: $textResult"

# Wait for autocomplete
Start-Sleep -Milliseconds 500

# Inject Enter
$enterResult = [AnalysisInjector]::InjectEnter($childPid)
Write-Host "Enter injection result: $enterResult"

# Output JSON for easy parsing
$result = @{
    conhostPid = $proc.Id
    workerPid = $childPid
    type = $Type
    number = $Number
    sessionId = $SessionId
    command = $analysisCommand
} | ConvertTo-Json -Compress

Write-Host "ANALYSIS_WORKER_INFO:$result"
