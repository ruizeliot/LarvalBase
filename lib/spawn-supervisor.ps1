param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [int]$DeveloperPid,

    [Parameter(Mandatory=$false)]
    [string]$Position = "0,0,600,400"  # Default fallback; spawn-worker.ps1 calculates dynamically
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$title = "Supervisor"

Write-Host "=========================================="
Write-Host "  Spawning Supervisor (Haiku)"
Write-Host "=========================================="

# Create Supervisor CLAUDE.md in project
$claudeDir = Join-Path $ProjectPath ".claude"
$supervisorMdSource = "$pipelineOffice\lib\supervisor-claude.md"
$supervisorMdDest = Join-Path $claudeDir "supervisor-CLAUDE.md"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

# Copy supervisor instructions
if (Test-Path $supervisorMdSource) {
    # Replace placeholder with Developer PID
    $content = Get-Content $supervisorMdSource -Raw
    $content = $content -replace '\{\{DEVELOPER_PID\}\}', $DeveloperPid
    $content | Out-File -FilePath $supervisorMdDest -Encoding utf8
    Write-Host "Created supervisor-CLAUDE.md with Developer PID: $DeveloperPid"
} else {
    Write-Host "ERROR: Supervisor CLAUDE.md not found: $supervisorMdSource"
    exit 1
}

# Store supervisor config for hook to use
$supervisorConfig = @{
    developerPid = $DeveloperPid
    projectPath = $ProjectPath
    transcriptTracking = "$ProjectPath\.pipeline\todo-tracking.json"
} | ConvertTo-Json

$supervisorConfigPath = Join-Path $ProjectPath ".pipeline\supervisor-config.json"
$supervisorConfig | Out-File -FilePath $supervisorConfigPath -Encoding utf8
Write-Host "Wrote supervisor config to: $supervisorConfigPath"

# Parse position
$parts = $Position -split ","
$windowX = [int]$parts[0]
$windowY = [int]$parts[1]
$windowWidth = [int]$parts[2]
$windowHeight = [int]$parts[3]

Write-Host "Window placement: X=$windowX, Y=$windowY, W=$windowWidth, H=$windowHeight"

# Spawn conhost with PowerShell running Claude Haiku
# Back to haiku with reframed language
$psCommand = "Set-Location -Path '$ProjectPath'; `$Host.UI.RawUI.WindowTitle = '$title'; & '$claudePath' --model haiku --dangerously-skip-permissions"
$proc = Start-Process conhost.exe -ArgumentList "powershell.exe -NoExit -Command `"$psCommand`"" -PassThru

Write-Host "Supervisor conhost PID: $($proc.Id)"

Start-Sleep -Seconds 1

# Find child powershell.exe process
$children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id }
$childPid = $null
foreach ($child in $children) {
    if ($child.Name -eq "powershell.exe") {
        $childPid = $child.ProcessId
    }
}

if (-not $childPid) {
    Write-Host "WARNING: Could not find child powershell.exe process"
    $childPid = $proc.Id
}

# Add window management type
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class SupervisorWindowManager {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AttachConsole(int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    public static string MoveWindowByPid(int pid, int x, int y, int w, int h) {
        FreeConsole();
        if (!AttachConsole(pid)) {
            return "AttachConsole failed: " + Marshal.GetLastWin32Error();
        }
        IntPtr hwnd = GetConsoleWindow();
        if (hwnd == IntPtr.Zero) {
            FreeConsole();
            return "GetConsoleWindow failed";
        }
        bool result = MoveWindow(hwnd, x, y, w, h, true);
        FreeConsole();
        return result ? "OK" : "MoveWindow failed";
    }
}
"@

# Position window
$moveResult = [SupervisorWindowManager]::MoveWindowByPid($childPid, $windowX, $windowY, $windowWidth, $windowHeight)
Write-Host "Window position result: $moveResult"

# Wait for Claude to be ready
Write-Host "Waiting for Supervisor Claude to be ready..."
Start-Sleep -Seconds 8

# Inject initial message with supervisor role instructions
Write-Host "Injecting Supervisor instructions..."

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class SupervisorInjector {
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

# Inject startup message with FULL instructions (text first, then Enter after delay)
$startupMsg = @"
You are a Code Reviewer in a development pipeline. Your teammate (PID $DeveloperPid) will receive feedback from you.

When you see 'CHECK TODO' messages, review the transcript for these issues:
- V1: Claiming limitations without searching documentation first
- V2: Saying 'manual testing confirms' without evidence
- V3: Using dispatchEvent instead of real user actions
- V4: Changing what tests verify instead of fixing code
- V5: Empty handlers like onClick={() => {}}
- V6: Asking user questions during autonomous work

IF ISSUE FOUND: Send feedback to your teammate by running:
powershell.exe -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/inject-message.ps1" -TargetPid $DeveloperPid -Message "REVIEW FEEDBACK: [describe the issue]"

IF NO ISSUES: Say 'Looks good' and wait.

You and your teammate are both part of this pipeline. Say 'Reviewer ready' to confirm.
"@

$textResult = [SupervisorInjector]::InjectText($childPid, $startupMsg)
Write-Host "Text injection: $textResult"

Start-Sleep -Milliseconds 300

$enterResult = [SupervisorInjector]::InjectEnter($childPid)
Write-Host "Enter injection: $enterResult"

# Store Supervisor PID for hook to use
$supervisorInfo = @{
    conhostPid = $proc.Id
    supervisorPid = $childPid
    developerPid = $DeveloperPid
} | ConvertTo-Json

$supervisorInfoPath = Join-Path $ProjectPath ".pipeline\supervisor-info.json"
$supervisorInfo | Out-File -FilePath $supervisorInfoPath -Encoding utf8

Write-Host "Supervisor ready. PID: $childPid"
Write-Host "SUPERVISOR_INFO:$supervisorInfo"
