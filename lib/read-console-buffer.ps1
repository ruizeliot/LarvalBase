# Read console buffer from another process by PID
# Uses AttachConsole + ReadConsoleOutput Win32 APIs
#
# Usage: .\read-console-buffer.ps1 -PID 12345 [-Lines 50]
#
# Sources:
# - https://learn.microsoft.com/en-us/windows/console/attachconsole
# - https://learn.microsoft.com/en-us/windows/console/readconsoleoutput
# - https://www.pinvoke.net/default.aspx/kernel32/AttachConsole,.html

param(
    [Parameter(Mandatory=$true)]
    [Alias("PID")]
    [int]$ProcessId,

    [int]$Lines = 50
)

$ErrorActionPreference = "Stop"

# Add the C# code for console reading
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class ConsoleBufferReader
{
    // Constants
    private const uint GENERIC_READ = 0x80000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;

    // Structs
    [StructLayout(LayoutKind.Sequential)]
    public struct COORD
    {
        public short X;
        public short Y;

        public COORD(short x, short y)
        {
            X = x;
            Y = y;
        }
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

    // P/Invoke declarations
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

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetConsoleScreenBufferInfo(
        IntPtr hConsoleOutput,
        out CONSOLE_SCREEN_BUFFER_INFO lpConsoleScreenBufferInfo);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool ReadConsoleOutput(
        IntPtr hConsoleOutput,
        [Out] CHAR_INFO[] lpBuffer,
        COORD dwBufferSize,
        COORD dwBufferCoord,
        ref SMALL_RECT lpReadRegion);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll")]
    private static extern int GetLastError();

    public static string ReadBuffer(int targetPid, int lineCount, out string errorMsg)
    {
        errorMsg = null;
        IntPtr hOutput = IntPtr.Zero;

        // First, detach from our current console
        FreeConsole();

        // Attach to target process's console
        if (!AttachConsole(targetPid))
        {
            int err = GetLastError();
            errorMsg = "AttachConsole failed with error " + err +
                (err == 5 ? " (ACCESS_DENIED - process may have higher privileges)" :
                 err == 6 ? " (INVALID_HANDLE - process has no console)" :
                 err == 87 ? " (INVALID_PARAMETER - PID invalid or no console)" : "");
            return null;
        }

        try
        {
            // Open CONOUT$ to get handle to screen buffer
            hOutput = CreateFile(
                "CONOUT$",
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                IntPtr.Zero,
                OPEN_EXISTING,
                0,
                IntPtr.Zero);

            if (hOutput == IntPtr.Zero || hOutput == new IntPtr(-1))
            {
                int err = GetLastError();
                errorMsg = "CreateFile(CONOUT$) failed with error " + err;
                return null;
            }

            // Get screen buffer info
            CONSOLE_SCREEN_BUFFER_INFO csbi;
            if (!GetConsoleScreenBufferInfo(hOutput, out csbi))
            {
                int err = GetLastError();
                errorMsg = "GetConsoleScreenBufferInfo failed with error " + err;
                return null;
            }

            int width = csbi.dwSize.X;
            int totalHeight = csbi.dwSize.Y;
            int cursorY = csbi.dwCursorPosition.Y;

            // Calculate which rows to read (last N lines up to cursor)
            int startRow = Math.Max(0, cursorY - lineCount + 1);
            int rowsToRead = Math.Min(lineCount, cursorY + 1);

            if (rowsToRead <= 0)
            {
                return ""; // Nothing to read
            }

            // Prepare buffer and read region
            CHAR_INFO[] buffer = new CHAR_INFO[width * rowsToRead];
            COORD bufferSize = new COORD((short)width, (short)rowsToRead);
            COORD bufferCoord = new COORD(0, 0);
            SMALL_RECT readRegion = new SMALL_RECT
            {
                Left = 0,
                Top = (short)startRow,
                Right = (short)(width - 1),
                Bottom = (short)(startRow + rowsToRead - 1)
            };

            // Read the console output
            if (!ReadConsoleOutput(hOutput, buffer, bufferSize, bufferCoord, ref readRegion))
            {
                int err = GetLastError();
                errorMsg = "ReadConsoleOutput failed with error " + err;
                return null;
            }

            // Convert to string
            StringBuilder result = new StringBuilder();
            for (int row = 0; row < rowsToRead; row++)
            {
                StringBuilder line = new StringBuilder();
                for (int col = 0; col < width; col++)
                {
                    char c = buffer[row * width + col].UnicodeChar;
                    line.Append(c == '\0' ? ' ' : c);
                }
                // Trim trailing spaces from each line
                result.AppendLine(line.ToString().TrimEnd());
            }

            return result.ToString();
        }
        finally
        {
            if (hOutput != IntPtr.Zero && hOutput != new IntPtr(-1))
            {
                CloseHandle(hOutput);
            }
            FreeConsole();
        }
    }
}
"@

# Run the reader
$errorMessage = $null
$output = [ConsoleBufferReader]::ReadBuffer($ProcessId, $Lines, [ref]$errorMessage)

if ($errorMessage) {
    Write-Error $errorMessage
    exit 1
}

# Output the result
Write-Output $output
