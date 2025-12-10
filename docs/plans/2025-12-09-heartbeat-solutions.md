# Heartbeat Solutions Research

> Research conducted 2025-12-09 for Pipeline v7.0 dashboard-to-orchestrator communication

---

## Problem Statement

The dashboard needs to send "HEARTBEAT" messages to the orchestrator (running in a separate Windows Terminal window). The current implementation uses `SetForegroundWindow` + `SendKeys`, which fails because Windows blocks background processes from stealing focus.

---

## Solution 1: Robust SendKeys with ForceForegroundWindow

**Status:** WORKS but requires brief focus steal

### How It Works

Uses a three-stage approach to force window focus:
1. **AttachThreadInput** - Attach to the blocking thread, then BringWindowToTop
2. **SystemParametersInfo** - Temporarily set foreground lock timeout to 0
3. **Delay before SendKeys** - Wait 300-500ms after focus to ensure window is ready

### Sources

- [powershell.one - Complete C# FocusWindow implementation](https://powershell.one/powershell-internals/extending-powershell/vbscript-and-csharp)
- [Shlomio - ForceForegroundWindow solution](https://shlomio.wordpress.com/2012/09/04/solved-setforegroundwindow-win32-api-not-always-works/)
- [Microsoft - SendKeys timing issues](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.sendkeys?view=windowsdesktop-9.0)
- [CodeProject - BringWindowToTop](https://www.codeproject.com/Tips/76427/How-to-Bring-Window-to-Top-with-SetForegroundWindo)

### Implementation

```powershell
# Force focus using AttachThreadInput + SystemParametersInfo fallback
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class FocusWindow {
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, IntPtr lpdwProcessId);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);

    const uint SPI_SETFOREGROUNDLOCKTIMEOUT = 0x2001;
    const int SPIF_SENDCHANGE = 0x2;
    const int SW_SHOW = 5;

    public static bool Focus(IntPtr hWnd) {
        uint foreThread = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
        uint appThread = GetCurrentThreadId();

        if (foreThread != appThread) {
            AttachThreadInput(foreThread, appThread, true);
            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);
            ShowWindow(hWnd, SW_SHOW);
            AttachThreadInput(foreThread, appThread, false);
        } else {
            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);
        }

        // Fallback: disable lock timeout temporarily
        if (GetForegroundWindow() != hWnd) {
            SystemParametersInfo(SPI_SETFOREGROUNDLOCKTIMEOUT, 0, IntPtr.Zero, SPIF_SENDCHANGE);
            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);
            ShowWindow(hWnd, SW_SHOW);
        }

        return GetForegroundWindow() == hWnd;
    }
}
'@

$hwnd = [IntPtr]$args[0]
$focused = [FocusWindow]::Focus($hwnd)

if ($focused) {
    Start-Sleep -Milliseconds 500
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait('HEARTBEAT')
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
}
```

### Pros
- Works reliably once focus is achieved
- Uses standard Windows APIs
- No additional infrastructure needed

### Cons
- **Requires focus steal** - Window flashes to front briefly
- Disruptive if user is working in another application
- May fail in some edge cases (UAC elevation differences)

---

## Solution 2: WriteConsoleInput (Focus-Free Console Injection)

**Status:** DOES NOT WORK with Windows Terminal

### How It Works (in theory)

Uses Windows Console APIs to inject keystrokes directly into another process's console input buffer:
1. `FreeConsole()` - Detach from current console
2. `AttachConsole(targetPID)` - Attach to target process's console
3. `GetStdHandle(STD_INPUT_HANDLE)` - Get console input buffer handle
4. `WriteConsoleInput()` - Inject INPUT_RECORD (key events) into buffer
5. `FreeConsole()` - Detach

### Sources

- [Microsoft - WriteConsoleInput](https://learn.microsoft.com/en-us/windows/console/writeconsoleinput)
- [Microsoft - AttachConsole](https://learn.microsoft.com/en-us/windows/console/attachconsole)
- [pinvoke.net - WriteConsoleInput](https://www.pinvoke.net/default.aspx/kernel32/WriteConsoleInput.html)
- [DaniWeb - Inject characters with WriteConsoleInput](https://www.daniweb.com/programming/software-development/threads/101205/inject-characters-with-writeconsoleinput)

### Implementation (C#)

```csharp
using System;
using System.Runtime.InteropServices;

public class ConsoleInputInjector
{
    private const int STD_INPUT_HANDLE = -10;
    private const ushort KEY_EVENT = 0x0001;

    [DllImport("kernel32.dll")] static extern bool FreeConsole();
    [DllImport("kernel32.dll")] static extern bool AttachConsole(uint dwProcessId);
    [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int nStdHandle);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern bool WriteConsoleInput(IntPtr hConsoleInput, INPUT_RECORD[] lpBuffer,
        uint nLength, out uint lpNumberOfEventsWritten);

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct KEY_EVENT_RECORD {
        [FieldOffset(0)] public bool bKeyDown;
        [FieldOffset(4)] public ushort wRepeatCount;
        [FieldOffset(6)] public ushort wVirtualKeyCode;
        [FieldOffset(8)] public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static bool SendStringToProcess(uint processId, string text) {
        FreeConsole();
        if (!AttachConsole(processId)) return false;

        IntPtr hInput = GetStdHandle(STD_INPUT_HANDLE);
        var records = new INPUT_RECORD[text.Length * 2];

        for (int i = 0; i < text.Length; i++) {
            // Key down
            records[i * 2].EventType = KEY_EVENT;
            records[i * 2].KeyEvent.bKeyDown = true;
            records[i * 2].KeyEvent.wRepeatCount = 1;
            records[i * 2].KeyEvent.UnicodeChar = text[i];
            // Key up
            records[i * 2 + 1].EventType = KEY_EVENT;
            records[i * 2 + 1].KeyEvent.bKeyDown = false;
            records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
            records[i * 2 + 1].KeyEvent.UnicodeChar = text[i];
        }

        uint written;
        bool result = WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        FreeConsole();
        return result;
    }
}
```

### Why It DOESN'T Work with Windows Terminal

**Windows Terminal uses ConPTY (Pseudoconsole)**, which is fundamentally different from traditional consoles:

1. **No direct console attachment** - ConPTY doesn't expose traditional console APIs
2. **AttachConsole fails** - You cannot attach to a pseudoconsole session
3. **Different architecture** - ConPTY uses pipes internally, not the console input buffer

From [Microsoft ConPTY documentation](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/):
> "There is no way provided to call the console APIs on a conpty you create."

### Verdict

**This approach is a dead end for Windows Terminal.** It only works with traditional `conhost.exe` consoles (like cmd.exe opened directly, not through Windows Terminal).

---

## Solution 2b: WM_COPYDATA (Focus-Free Window Message)

**Status:** DOES NOT WORK for console apps

### How It Works (in theory)

Uses Windows messages to send data to another window without focus:
1. `FindWindow()` - Find target window by title/class
2. `SendMessage(hwnd, WM_COPYDATA, ...)` - Send data structure to window

### Why It DOESN'T Work

Console applications (including Claude Code running in a terminal) don't have a traditional Windows message loop. The terminal window is owned by Windows Terminal (or conhost), not by the Claude process itself.

From research:
> "Console windows don't process WM_COPYDATA the same way GUI apps do. The console host handles the window, not your application."

### Verdict

**Dead end** - Console apps can't receive WM_COPYDATA messages directly

---

## Solution 3: Named Pipes IPC

**Status:** VIABLE but requires architecture change

### How It Works

- Dashboard creates a named pipe and writes heartbeat messages
- Orchestrator would need to read from the pipe
- No focus manipulation required, works across processes

### Sources

- [Node.js net module - IPC](https://nodejs.org/api/net.html) - "supports IPC with named pipes on Windows"
- [Named Pipes IPC - Python/PowerShell](https://majornetwork.net/2021/05/inter-process-communication-with-named-pipes-between-python-and-powershell/)
- [node-ipc npm package](https://www.npmjs.com/package/node-ipc)

### Implementation (Node.js Dashboard as Server)

```javascript
// Dashboard creates pipe server
const net = require('net');
const PIPE_PATH = '\\\\.\\pipe\\pipeline-heartbeat';

const server = net.createServer((socket) => {
  console.log('Orchestrator connected');

  // Send heartbeat every 3 minutes
  setInterval(() => {
    socket.write('HEARTBEAT\n');
  }, 3 * 60 * 1000);
});

server.listen(PIPE_PATH);
```

### The Problem

**Claude Code (orchestrator) cannot run a background listener.** Claude is a request-response system - it responds to user input, runs tools, and waits. It cannot:
- Run a background thread listening to a pipe
- Poll a pipe while waiting for user input
- Receive async notifications

The only way Claude "receives" input is through:
1. User typing in the terminal
2. Tool outputs

### Verdict

**Named pipes would work technically**, but Claude Code's architecture doesn't support background listeners. We'd need to fundamentally change how the orchestrator works (e.g., make it a Node.js process that controls Claude, rather than Claude itself being the orchestrator)

---

## Solution 4: File-Based Signaling

**Status:** SIMPLEST BACKUP

### How It Works

- Dashboard writes timestamp to `.pipeline/heartbeat`
- Orchestrator polls this file periodically
- If timestamp is recent, orchestrator knows dashboard is alive

### Pros
- Extremely simple
- No Windows API complexity
- Works with any process

### Cons
- Polling-based (not event-driven)
- Orchestrator needs to actively check (but it already does periodic checks)

---

## Summary Table

| Solution | Focus Required? | Works with Windows Terminal? | Complexity |
|----------|-----------------|------------------------------|------------|
| 1. ForceForegroundWindow + SendKeys | YES (brief) | YES | Medium |
| 2. WriteConsoleInput | No | NO (ConPTY limitation) | High |
| 2b. WM_COPYDATA | No | NO (console apps) | Medium |
| 3. Named Pipes | No | YES but Claude can't listen | High |
| 4. File-Based | No | YES | Low |

---

## Recommendation

### For keeping SendKeys approach: Use Solution 1

The **ForceForegroundWindow** approach (Solution 1) is the only SendKeys-based solution that works reliably. It will cause a brief window flash when heartbeat fires, but it's the most direct path.

**Trade-off:** User may notice window switching every 3 minutes.

### For focus-free: Use Solution 4 (File-Based)

If focus stealing is unacceptable, **file-based signaling** is the simplest reliable alternative:

1. Dashboard writes timestamp to `.pipeline/heartbeat.json`
2. Orchestrator checks the file when it needs to (already does periodic checks)
3. No Windows API complexity, no focus issues

**Implementation:**
```javascript
// Dashboard writes heartbeat
fs.writeFileSync('.pipeline/heartbeat.json', JSON.stringify({
  timestamp: Date.now(),
  dashboardPid: process.pid
}));
```

```bash
# Orchestrator checks heartbeat
HEARTBEAT=$(cat .pipeline/heartbeat.json | jq -r '.timestamp')
NOW=$(date +%s%3N)
AGE=$((NOW - HEARTBEAT))
if [ $AGE -lt 180000 ]; then  # Less than 3 minutes old
  echo "Dashboard alive"
fi
```

### Key Insight

The original heartbeat design assumed we could "wake up" Claude from outside. But **Claude Code doesn't sleep** - it's always waiting for user input. The heartbeat was really just a way to trigger periodic checks.

**Alternative approach:** Instead of dashboard pinging orchestrator, have the orchestrator set its own timer and check dashboard/worker status proactively. The orchestrator is already supposed to check every 2-3 minutes - it doesn't need an external trigger.

---

## FINAL SOLUTION: WriteConsoleInput with Plain PowerShell

**Status:** IMPLEMENTED AND WORKING

### The Key Discovery

WriteConsoleInput **DOES work** - but only with traditional consoles (conhost.exe), not Windows Terminal (ConPTY).

**Solution:** Run the orchestrator in **conhost.exe** (`Win+R` → `conhost.exe powershell.exe -NoExit`) instead of Windows Terminal.

**Important:** Even `Win+R` → `powershell` may open Windows Terminal if it's configured as the default console. You must explicitly use `conhost.exe powershell.exe` to force the legacy console.

### Why This Works

1. Plain PowerShell runs in conhost.exe (traditional console)
2. `AttachConsole(PID)` succeeds for conhost processes
3. `CreateFile("CONIN$")` returns a valid handle to the console input buffer
4. `WriteConsoleInput()` injects keystrokes directly - **no focus required!**

### Implementation

**Orchestrator:**
- Runs in plain PowerShell (not Windows Terminal)
- Gets its own PID with `$PID` or `echo $$`
- Passes PID to dashboard when spawning

**Dashboard:**
- Uses WriteConsoleInput to inject "HEARTBEAT\r" into orchestrator's console
- No focus stealing, no window flash
- Works even when user is working in another application

### Tested and Verified

```powershell
# Test from separate PowerShell:
.\test-inject.ps1 -TargetPID 37712
# Result: "Success! Wrote 20 events"
# HEARTBEAT appeared in target PowerShell without any focus change
```

### Files Updated

- `orchestrator.md` - Changed HWND to PID, added PowerShell requirement
- `dashboard.cjs` - Replaced SendKeys with WriteConsoleInput
- `spawn-dashboard.ps1` - Changed -OrchestratorHwnd to -OrchestratorPID

### Trade-offs

| Aspect | Before (SendKeys) | After (WriteConsoleInput) |
|--------|-------------------|---------------------------|
| Focus required | YES (disruptive) | NO |
| Works in Windows Terminal | YES | NO |
| Works in plain PowerShell | YES | YES |
| Complexity | Low | Medium (C# interop) |

**Verdict:** Acceptable trade-off. User must start orchestrator in plain PowerShell, but gets focus-free heartbeats.
