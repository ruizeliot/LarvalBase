# Console Injector for Pipeline v11
# Injects text into a target process's console input buffer
#
# Usage: powershell -File console-injector.ps1 -TargetPid <pid> -Text "message" [-SendEnter]

param(
    [Parameter(Mandatory=$true)]
    [int]$TargetPid,

    [Parameter(Mandatory=$true)]
    [AllowEmptyString()]
    [string]$Text,

    [switch]$SendEnter
)

Add-Type @'
using System;
using System.Runtime.InteropServices;

public class ConsoleInjector
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
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WriteConsoleInput(
        IntPtr hConsoleInput, INPUT_RECORD[] lpBuffer,
        uint nLength, out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

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

    public static string SendString(int targetPid, string text, bool sendEnter)
    {
        FreeConsole();
        if (!AttachConsole(targetPid)) return "AttachConsole failed: " + Marshal.GetLastWin32Error();

        IntPtr hInput = CreateFile("CONIN$", GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);

        if (hInput == IntPtr.Zero || hInput == new IntPtr(-1))
        {
            FreeConsole();
            return "CreateFile failed";
        }

        int extraEvents = sendEnter ? 2 : 0;
        INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2 + extraEvents];

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = 1;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = c;

            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = 0;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = c;
        }

        if (sendEnter)
        {
            int idx = text.Length * 2;
            // Key down for Enter - need VirtualKeyCode AND ScanCode for control keys
            records[idx].EventType = KEY_EVENT;
            records[idx].KeyEvent.bKeyDown = 1;
            records[idx].KeyEvent.wRepeatCount = 1;
            records[idx].KeyEvent.wVirtualKeyCode = 0x0D;  // VK_RETURN
            records[idx].KeyEvent.wVirtualScanCode = 0x1C; // Enter scan code
            records[idx].KeyEvent.UnicodeChar = (char)13;  // CR
            records[idx].KeyEvent.dwControlKeyState = 0;

            // Key up for Enter
            records[idx + 1].EventType = KEY_EVENT;
            records[idx + 1].KeyEvent.bKeyDown = 0;
            records[idx + 1].KeyEvent.wRepeatCount = 1;
            records[idx + 1].KeyEvent.wVirtualKeyCode = 0x0D;
            records[idx + 1].KeyEvent.wVirtualScanCode = 0x1C;
            records[idx + 1].KeyEvent.UnicodeChar = (char)13;
            records[idx + 1].KeyEvent.dwControlKeyState = 0;
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);

        CloseHandle(hInput);
        FreeConsole();

        if (result)
        {
            return string.Format("OK: {0} events written (text={1}, enter={2})",
                written, text.Length, sendEnter);
        }
        return "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
    }
}
'@

$result = [ConsoleInjector]::SendString($TargetPid, $Text, $SendEnter.IsPresent)
Write-Output $result
