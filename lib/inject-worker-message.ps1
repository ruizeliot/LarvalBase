# Inject message into worker console
# Used by orchestrator to communicate with workers proactively
#
# Usage: .\inject-worker-message.ps1 -WorkerPID 12345 -Message "continue"
#        .\inject-worker-message.ps1 -WorkerPID 12345 -Message "/compact" -Interrupt
#
# Parameters:
#   -WorkerPID         Target process ID
#   -Message           Text to inject
#   -NoEnter           Don't send Enter after message
#   -Interrupt         Send Escape first to interrupt busy worker, wait 1s, then send message
#   -InterruptDelayMs  Delay after Escape (default: 1000ms)
#
# Common messages for worker recovery:
#   "continue"  - Resume after error/pause
#   "yes"       - Confirm prompt
#   "no"        - Decline prompt
#   "skip"      - Skip current task
#   "/compact"  - Compact context if running low (use -Interrupt if worker is busy)

param(
    [Parameter(Mandatory=$true)]
    [int]$WorkerPID,

    [Parameter(Mandatory=$true)]
    [string]$Message,

    [Parameter(Mandatory=$false)]
    [switch]$NoEnter,

    [Parameter(Mandatory=$false)]
    [int]$DelayBeforeEnterMs = 200,

    [Parameter(Mandatory=$false)]
    [switch]$Interrupt,

    [Parameter(Mandatory=$false)]
    [int]$InterruptDelayMs = 1000
)

Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WorkerInjector
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const ushort KEY_EVENT = 0x0001;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr CreateFile(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr hConsoleInput,
        INPUT_RECORD[] lpBuffer,
        uint nLength,
        out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll")]
    private static extern int GetLastError();

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD
    {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct KEY_EVENT_RECORD
    {
        [FieldOffset(0)] public int bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static string SendText(int targetPid, string text)
    {
        FreeConsole();

        if (!AttachConsole(targetPid))
        {
            int err = GetLastError();
            return "ERROR:AttachConsole failed:" + err;
        }

        IntPtr hInput = CreateFile(
            "CONIN$",
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            0,
            IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            int err = GetLastError();
            FreeConsole();
            return "ERROR:CreateFile failed:" + err;
        }

        INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2];

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];

            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = 1;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = c;
            records[i * 2].KeyEvent.wVirtualKeyCode = 0;
            records[i * 2].KeyEvent.wVirtualScanCode = 0;
            records[i * 2].KeyEvent.dwControlKeyState = 0;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
            records[i * 2 + 1].KeyEvent.wVirtualKeyCode = 0;
            records[i * 2 + 1].KeyEvent.wVirtualScanCode = 0;
            records[i * 2 + 1].KeyEvent.dwControlKeyState = 0;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        int lastErr = GetLastError();

        CloseHandle(hInput);
        FreeConsole();

        if (result)
        {
            return "OK:text:" + written;
        }
        else
        {
            return "ERROR:WriteConsoleInput failed:" + lastErr;
        }
    }

    public static string SendEnter(int targetPid)
    {
        FreeConsole();

        if (!AttachConsole(targetPid))
        {
            int err = GetLastError();
            return "ERROR:AttachConsole failed:" + err;
        }

        IntPtr hInput = CreateFile(
            "CONIN$",
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            0,
            IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            int err = GetLastError();
            FreeConsole();
            return "ERROR:CreateFile failed:" + err;
        }

        INPUT_RECORD[] records = new INPUT_RECORD[2];

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
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        int lastErr = GetLastError();

        CloseHandle(hInput);
        FreeConsole();

        if (result)
        {
            return "OK:enter:" + written;
        }
        else
        {
            return "ERROR:WriteConsoleInput failed:" + lastErr;
        }
    }

    public static string SendEscape(int targetPid)
    {
        FreeConsole();

        if (!AttachConsole(targetPid))
        {
            int err = GetLastError();
            return "ERROR:AttachConsole failed:" + err;
        }

        IntPtr hInput = CreateFile(
            "CONIN$",
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            0,
            IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            int err = GetLastError();
            FreeConsole();
            return "ERROR:CreateFile failed:" + err;
        }

        INPUT_RECORD[] records = new INPUT_RECORD[2];

        // VK_ESCAPE = 0x1B, scan code = 0x01
        records[0].EventType = KEY_EVENT;
        records[0].KeyEvent.bKeyDown = 1;
        records[0].KeyEvent.wRepeatCount = 1;
        records[0].KeyEvent.UnicodeChar = (char)27;
        records[0].KeyEvent.wVirtualKeyCode = 0x1B;
        records[0].KeyEvent.wVirtualScanCode = 0x01;
        records[0].KeyEvent.dwControlKeyState = 0;

        records[1].EventType = KEY_EVENT;
        records[1].KeyEvent.bKeyDown = 0;
        records[1].KeyEvent.wRepeatCount = 1;
        records[1].KeyEvent.UnicodeChar = (char)27;
        records[1].KeyEvent.wVirtualKeyCode = 0x1B;
        records[1].KeyEvent.wVirtualScanCode = 0x01;
        records[1].KeyEvent.dwControlKeyState = 0;

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        int lastErr = GetLastError();

        CloseHandle(hInput);
        FreeConsole();

        if (result)
        {
            return "OK:escape:" + written;
        }
        else
        {
            return "ERROR:WriteConsoleInput failed:" + lastErr;
        }
    }
}
'@

# If -Interrupt flag is set, send Escape first to stop current operation
if ($Interrupt) {
    $escResult = [WorkerInjector]::SendEscape($WorkerPID)
    if ($escResult.StartsWith("ERROR")) {
        Write-Host $escResult
        exit 1
    }
    Write-Host "Sent Escape to interrupt worker"
    Start-Sleep -Milliseconds $InterruptDelayMs
}

# Send text
$textResult = [WorkerInjector]::SendText($WorkerPID, $Message)

if ($textResult.StartsWith("ERROR")) {
    Write-Host $textResult
    exit 1
}

# Optionally send Enter
if (-not $NoEnter) {
    Start-Sleep -Milliseconds $DelayBeforeEnterMs
    $enterResult = [WorkerInjector]::SendEnter($WorkerPID)

    if ($enterResult.StartsWith("ERROR")) {
        Write-Host $enterResult
        exit 1
    }

    if ($Interrupt) {
        Write-Host "OK:interrupted + injected '$Message' + Enter to PID $WorkerPID"
    } else {
        Write-Host "OK:injected '$Message' + Enter to PID $WorkerPID"
    }
} else {
    if ($Interrupt) {
        Write-Host "OK:interrupted + injected '$Message' to PID $WorkerPID (no Enter)"
    } else {
        Write-Host "OK:injected '$Message' to PID $WorkerPID (no Enter)"
    }
}
