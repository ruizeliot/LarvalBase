# Pipeline v7 - Brainstorm Notes

**Date:** 2025-12-08
**Type:** Terminal/TUI Application (Two-Window Architecture)
**Framework:** Ink v5 (React for CLI)
**Testing:** CLET + node-pty

---

## Problem Statement

Pipeline v6 has critical bugs that make orchestration unreliable:

1. **Worker Identification Bug**: Uses `taskkill /IM claude*` wildcard, killing ALL Claude processes including unrelated ones
2. **Todo Tracking Bug**: Grabs todo files from wrong workers (no project/session scoping)
3. **Cost/Duration Bug**: Tracking breaks on pipeline resume, doesn't recalculate from ccusage
4. **Architecture Issue**: Single TUI with embedded worker never loads properly on Windows

---

## Solution: Pipeline v7 (Two-Window Architecture)

A complete rewrite using **two separate Windows Terminal windows**:

1. **Dashboard Window**: TUI showing pipeline status, epics, todos, cost/duration
2. **Worker Window**: Standard Claude CLI running in its own Windows Terminal tab/window

This separation:
- Avoids PTY conflicts that caused the single-window approach to fail
- Lets Claude CLI run naturally with full terminal capabilities
- Dashboard monitors worker via file-based communication (manifest, todo files)
- Uses Windows Terminal's `wt.exe` to spawn worker in new tab/window

---

## Target Users

- Developers using the pipeline system
- Single user at a time (not multi-user)
- Windows primary (using Windows Terminal), with macOS/Linux support

---

## Core Features

### 1. Global CLI Installation
```bash
npm install -g @imt/pipeline
pipeline                    # Launch dashboard TUI
pipeline new /path/to/proj  # Quick start
pipeline resume /path       # Resume existing
```

### 2. Two-Window Architecture

**Dashboard Window (TUI):**
- Orchestrator status display
- Epic and todo tracking
- Cost/duration display
- Keyboard controls (pause, resume, advance)
- Spawns worker via `wt.exe` (Windows Terminal)

**Worker Window (Separate):**
- Standard Claude CLI session
- Runs pipeline phase commands
- Writes to manifest and todo files
- Dashboard monitors these files

### 3. Pipeline Types (v1)
- **Desktop**: Tauri 2.0 apps (WebdriverIO + tauri-driver tests)
- **Terminal**: Ink v5 apps (CLET + node-pty tests)

### 4. Phases (1-5)
1. Brainstorm (Interactive)
2. E2E Specs (Autonomous)
3. Bootstrap (Autonomous)
4. Implement (Autonomous, loops per epic)
5. Finalize (Autonomous)

### 5. Resume Capability
- Pause anytime with `p`
- Resume from exact point
- Recalculate costs from ccusage sessions

---

## TUI Mockups

### Launcher Screen
```
+------------------------------------------------------------------------------+
|                           PIPELINE v7                                        |
|                                                                              |
|   +--------------------------------------------------------------------+    |
|   |  Project Path: /home/user/my-project                    [...]      |    |
|   +--------------------------------------------------------------------+    |
|                                                                              |
|   Pipeline Type:                                                             |
|     ( ) Desktop (Tauri)                                                      |
|     (*) Terminal (Ink)                                                       |
|                                                                              |
|   Mode:                                                                      |
|     (*) New Project                                                          |
|     ( ) Add Feature                                                          |
|     ( ) Fix Bug                                                              |
|                                                                              |
|                                                                              |
|   +-----------------+                                                        |
|   |   > START       |                                                        |
|   +-----------------+                                                        |
|                                                                              |
|   [Tab] Navigate  [Enter] Select  [q] Quit  [?] Help                        |
+------------------------------------------------------------------------------+
```

### Dashboard Screen (Main - Worker in Separate Window)
```
+------------------------------------------------------------------------------+
| PIPELINE v7 DASHBOARD                                          [Worker: OK]  |
+------------------------------------------------------------------------------+
|                                                                              |
| Project: my-app                        Cost: $2.45                           |
| Type: Terminal (Ink)                   Duration: 34m                         |
| Phase: 4 - Implement                                                         |
|                                                                              |
| +------------------------------+  +--------------------------------------+   |
| | Progress         [####--] 67%|  | Todos                                |   |
| +------------------------------+  +--------------------------------------+   |
|                                   | [x] Read manifest                    |   |
| Epics:                            | [x] Plan implementation              |   |
| [x] 1. App Shell                  | [>] Implement components             |   |
| [>] 2. Navigation                 | [ ] Run E2E tests                    |   |
| [ ] 3. Settings                   | [ ] Fix failures                     |   |
| [ ] 4. Pipeline Runner            | [ ] Commit                           |   |
|                                   +--------------------------------------+   |
|                                                                              |
| Worker Status: Running (PID: 12345, Session: abc123)                         |
|                                                                              |
+------------------------------------------------------------------------------+
| [p] Pause  [r] Resume  [a] Advance  [w] Focus Worker  [q] Quit  [?] Help    |
+------------------------------------------------------------------------------+
```

### Resume Screen
```
+------------------------------------------------------------------------------+
|                         RESUME PIPELINE                                      |
|                                                                              |
|   Project: my-awesome-app                                                    |
|   Path: /home/user/my-project                                               |
|                                                                              |
|   +--------------------------------------------------------------------+    |
|   |  Last State                                                        |    |
|   +--------------------------------------------------------------------+    |
|   |  Phase: 4 - Implement                                              |    |
|   |  Epic: 3/6 - User Authentication                                   |    |
|   |  Progress: 45%                                                     |    |
|   |  Last Activity: 2 hours ago                                        |    |
|   |                                                                    |    |
|   |  Cost (from ccusage):                                              |    |
|   |    Previous sessions: $4.23                                        |    |
|   |    This resume: $0.00                                              |    |
|   |    Total: $4.23                                                    |    |
|   |                                                                    |    |
|   |  Duration: 1h 23m                                                  |    |
|   +--------------------------------------------------------------------+    |
|                                                                              |
|   +-----------------+   +-----------------+                                  |
|   |   > RESUME      |   |   x CANCEL      |                                  |
|   +-----------------+   +-----------------+                                  |
|                                                                              |
|   [Enter] Resume  [Esc] Cancel  [d] Delete & Start Fresh                    |
+------------------------------------------------------------------------------+
```

### Pipeline Complete Screen
```
+------------------------------------------------------------------------------+
|                                                                              |
|                         [OK] PIPELINE COMPLETE                               |
|                                                                              |
|   +--------------------------------------------------------------------+    |
|   |  Project: my-awesome-app                                           |    |
|   |  Type: Terminal (Ink)                                              |    |
|   |  Mode: New Project                                                 |    |
|   +--------------------------------------------------------------------+    |
|                                                                              |
|   +--------------------------------------------------------------------+    |
|   |  Summary                                                           |    |
|   +--------------------------------------------------------------------+    |
|   |  Phases Completed: 5/5                                             |    |
|   |  Epics Completed: 4/4                                              |    |
|   |  E2E Tests: 47/47 passing                                          |    |
|   |                                                                    |    |
|   |  Total Cost: $12.45                                                |    |
|   |  Total Duration: 2h 15m                                            |    |
|   |                                                                    |    |
|   |  Git Commits: 6                                                    |    |
|   |  Files Created: 34                                                 |    |
|   |  Lines of Code: 2,847                                              |    |
|   +--------------------------------------------------------------------+    |
|                                                                              |
|   Deliverables:                                                              |
|   - npm package ready: npm publish                                           |
|   - GitLab repo: https://gitlab.com/.../my-awesome-app                      |
|                                                                              |
|   +-----------------+   +-----------------+                                  |
|   |   > NEW PROJECT |   |   x EXIT        |                                  |
|   +-----------------+   +-----------------+                                  |
|                                                                              |
|   [Enter] New Project  [q] Exit                                              |
+------------------------------------------------------------------------------+
```

### Help Screen (Overlay)
```
+------------------------------------------------------------------------------+
|                              KEYBOARD SHORTCUTS                              |
+------------------------------------------------------------------------------+
|                                                                              |
|  Navigation                          Pipeline Control                        |
|  ----------                          ----------------                        |
|  Tab        Next field               p         Pause pipeline               |
|  Shift+Tab  Previous field           r         Resume (when paused)         |
|  Up/Down    Navigate lists           a         Advance phase (manual)       |
|  Enter      Select/Confirm           Ctrl+C    Emergency stop               |
|  Esc        Back/Cancel                                                     |
|                                      Worker Window                           |
|  Global                              -------------                           |
|  ------                              w         Focus worker window          |
|  q          Quit                                                            |
|  ?          Show this help                                                  |
|  Ctrl+L     Refresh screen                                                  |
|                                                                              |
|  Dashboard                                                                   |
|  ---------                                                                   |
|  1-5       Jump to phase info                                               |
|  e         Focus epics list                                                 |
|  t         Focus todos list                                                 |
|  l         Toggle log view                                                  |
|                                                                              |
+------------------------------------------------------------------------------+
|                            [Esc] Close Help                                  |
+------------------------------------------------------------------------------+
```

---

## Keyboard Navigation

### Global Keys
| Key | Action |
|-----|--------|
| `q` | Quit application |
| `?` | Show help overlay |
| `Ctrl+L` | Refresh screen |
| `Ctrl+C` | Emergency stop (with confirmation) |

### Launcher Screen
| Key | Action |
|-----|--------|
| `Tab` | Next field |
| `Shift+Tab` | Previous field |
| `Up/Down` | Navigate options |
| `Enter` | Select/Start |
| `n` | New project |
| `o` | Open existing |
| `h` | Show history |

### Dashboard Screen (Pipeline Running)
| Key | Action |
|-----|--------|
| `p` | Pause pipeline (saves state, keeps worker running) |
| `r` | Resume (when paused) |
| `a` | Advance to next phase (manual override) |
| `w` | Focus worker window (bring to front) |
| `1-5` | Jump to phase section |
| `e` | Focus epics list |
| `t` | Focus todos list |
| `l` | Toggle log view |

### Dialogs
| Key | Action |
|-----|--------|
| `Enter` | Confirm |
| `Esc` | Cancel |
| `Tab` | Switch buttons |

---

## Scope

### In Scope (v1)

**Core**
- Global CLI installation via npm
- Two-window architecture (dashboard + worker)
- Desktop (Tauri) pipeline type
- Terminal (Ink) pipeline type
- Phases 1-5 progression
- Epic-based implementation (Phase 4 loops)

**Orchestration**
- Session-scoped worker identification (UUID, not wildcards)
- Project-scoped todo tracking
- Atomic manifest writes (temp file + rename)
- Resume from any point
- Cost recalculation from ccusage on resume

**Worker Spawning**
- Windows Terminal (`wt.exe`) for worker window
- Fallback to new terminal tab on other platforms
- Worker runs standard Claude CLI
- Communication via manifest and todo files

**Testing**
- Mock Claude binary for E2E tests
- Mock Windows Terminal spawning
- Mock filesystem for isolation
- Fixture-based test data

**UI (Dashboard Only)**
- Launcher screen
- Resume screen
- Dashboard screen (monitoring, no worker output)
- Pipeline complete screen
- Help overlay

### Out of Scope (v2+)

- Embedded worker output in dashboard
- Split-pane view
- Unity pipeline type
- Multi-project dashboard
- Remote workers
- Team collaboration
- Cloud sync
- Plugin system
- Custom phase definitions
- Parallel epic execution
- Real-time collaboration
- Mobile companion app

---

## Architecture

### Two-Window Communication

```
+------------------+                    +------------------+
|    DASHBOARD     |                    |     WORKER       |
|   (Ink TUI)      |                    |  (Claude CLI)    |
+------------------+                    +------------------+
        |                                       |
        |  spawn via wt.exe                     |
        +-------------------------------------->|
        |                                       |
        |  reads manifest.json                  |
        |<--------------------------------------+  writes
        |                                       |
        |  reads todo files                     |
        |<--------------------------------------+  writes
        |                                       |
        |  reads ccusage data                   |
        |<--------------------------------------+  generates
        |                                       |
        |  kill signal (by PID)                 |
        +-------------------------------------->|  receives
        |                                       |
+------------------+                    +------------------+
|   .pipeline/     |                    |   ~/.claude/     |
|   manifest.json  |                    |   todos/         |
+------------------+                    +------------------+
```

### Layered Architecture

```
+---------------------------------------------------------------------+
| Layer 5: UI Screens                                                  |
| (Launcher, Dashboard, Resume, Complete, Help)                        |
+---------------------------------------------------------------------+
| Layer 4: Orchestrator                                                |
| (Phase progression, epic loops, todo monitoring, worker spawning)    |
+---------------------------------------------------------------------+
| Layer 3: Services                                                    |
| (Filesystem, Process, Cost, WindowsTerminal)                         |
+---------------------------------------------------------------------+
| Layer 2: Data Layer                                                  |
| (State stores: manifest, project, session, todos, cost)              |
+---------------------------------------------------------------------+
| Layer 1: Foundation                                                  |
| (TUI framework, test infrastructure)                                 |
+---------------------------------------------------------------------+
```

### Key Components

**Foundation (Epic 1-2)**
- Ink v5 components (Box, Text, Input, Select, etc.)
- Keyboard handling with useInput
- Screen navigation system
- Mock Claude binary
- Mock Windows Terminal
- Mock filesystem
- Test fixtures

**Data Layer (Epic 3)**
- ManifestStore: Pipeline state persistence
- ProjectStore: Project configuration
- SessionStore: Worker session tracking
- TodoStore: Todo state management
- CostStore: Cost/duration tracking

**Services (Epic 4-6)**
- FilesystemService: Project CRUD, manifest I/O, todo watching
- ProcessService: Worker spawn/kill via wt.exe, PID tracking
- CostService: ccusage integration, duration, recalculation
- WindowsTerminalService: wt.exe spawning, window management

**Orchestrator (Epic 7)**
- Phase progression logic
- Todo completion detection (via file watching)
- Epic loop management
- Worker lifecycle management (spawn/monitor/kill)
- Resume/pause logic

**UI (Epic 8)**
- LauncherScreen
- ResumeScreen
- DashboardScreen (no embedded worker)
- CompleteScreen
- HelpOverlay

---

## Data Flow

```
User Input -> Dashboard UI -> Orchestrator -> Service -> Store -> Filesystem
                  ^                                          |
                  +------------ File Watches -----------------+
```

### Worker Spawning Flow

```
1. User clicks START
2. Orchestrator creates session UUID
3. Orchestrator writes initial manifest
4. ProcessService spawns worker via:
   wt.exe -w 0 nt -d "project_path" claude --session-id UUID
5. Worker runs phase command
6. Worker writes todos and updates manifest
7. Dashboard watches files and updates UI
8. On phase complete, dashboard spawns next worker
```

### Manifest Structure
```json
{
  "version": "7.0.0",
  "project": {
    "name": "my-app",
    "path": "/path/to/project",
    "type": "terminal",
    "mode": "new"
  },
  "currentPhase": 4,
  "phases": {
    "1": { "status": "complete", "completedAt": "..." },
    "2": { "status": "complete", "completedAt": "..." },
    "3": { "status": "complete", "completedAt": "..." },
    "4": {
      "status": "in-progress",
      "currentEpic": 2,
      "epics": [
        { "id": 1, "name": "App Shell", "status": "complete" },
        { "id": 2, "name": "Navigation", "status": "in-progress" },
        { "id": 3, "name": "Settings", "status": "pending" }
      ]
    },
    "5": { "status": "pending" }
  },
  "workers": [
    {
      "sessionId": "uuid-1234",
      "phase": 4,
      "epic": 2,
      "pid": 12345,
      "startedAt": "...",
      "status": "running"
    }
  ],
  "cost": {
    "total": 4.23,
    "byPhase": { "1": 0.45, "2": 1.12, "3": 0.89, "4": 1.77 }
  },
  "duration": {
    "total": 4980,
    "byPhase": { "1": 300, "2": 1200, "3": 900, "4": 2580 }
  }
}
```

---

## Epic Summary

| Epic | Name | Stories | Layer | Dependencies |
|------|------|---------|-------|--------------|
| 1 | TUI Framework | ~25 | Foundation | None |
| 2 | Test Infrastructure | ~30 | Foundation | Epic 1 |
| 3 | State Management | ~35 | Data | Epic 1, 2 |
| 4 | Filesystem Service | ~25 | Services | Epic 3 |
| 5 | Process Service (wt.exe) | ~25 | Services | Epic 3 |
| 6 | Cost Service | ~20 | Services | Epic 3 |
| 7 | Pipeline Orchestrator | ~30 | Logic | Epic 4, 5, 6 |
| 8 | UI Screens (Dashboard) | ~35 | UI | Epic 7 |
| **Total** | | **~225** | | |

*Note: Story count reduced from 286 because we removed split-view complexity*

---

## Mock Claude Pattern

Tests NEVER call real Claude CLI. Instead:

```
+-----------------------------------------------------------------------------+
|                        MOCK CLAUDE TEST PATTERN                              |
+-----------------------------------------------------------------------------+
|                                                                              |
|   Test Code                Mock Claude Binary              Fixture File      |
|   ---------                ------------------              ------------      |
|   +---------+              +--------------+               +-----------+     |
|   |  CLET   |  spawns      | mock-claude  |   reads       | phase-4   |     |
|   |  test   |------------->|    .js       |-------------->| -success  |     |
|   |         |              |              |               |  .json    |     |
|   +----+----+              +------+-------+               +-----------+     |
|        |                          |                                          |
|        | waits for stdout         | streams output                           |
|        | asserts content          | writes todo files                        |
|        | checks exit code         | exits with code                          |
|        v                          v                                          |
|   +---------------------------------------------------------------------+   |
|   |                      TEST ASSERTIONS                                |   |
|   |  - stdout matches expected patterns                                 |   |
|   |  - todo files created/updated correctly                             |   |
|   |  - exit code is expected value                                      |   |
|   |  - timing matches expected delays                                   |   |
|   +---------------------------------------------------------------------+   |
|                                                                              |
+-----------------------------------------------------------------------------+
```

### Mock Windows Terminal

```javascript
// In tests, mock wt.exe spawning
mockWindowsTerminal.spawn.mockImplementation((args) => {
  // Instead of opening new window, spawn process directly
  return mockProcess({
    pid: 12345,
    stdout: fixtureOutput,
    exitCode: 0
  });
});
```

---

## Success Criteria

1. **Global installation works**: `npm install -g @imt/pipeline && pipeline` launches dashboard
2. **Two-window architecture works**: Dashboard spawns worker in separate Windows Terminal
3. **Worker tracking correct**: Session-scoped, no wildcard kills
4. **Todo tracking correct**: Project/session scoped, no cross-contamination
5. **Resume works**: Picks up from exact state, recalculates costs
6. **All E2E tests pass**: Using mock Claude and mock Windows Terminal (fast, free, reproducible)
7. **Both pipeline types work**: Desktop (Tauri) and Terminal (Ink)

---

## Notes

- Windows is primary development platform (user's environment)
- ccusage binary must be available for cost tracking
- Git must be available for commits
- Node.js 18+ required
- Windows Terminal (`wt.exe`) required for worker spawning
- Fallback to `start cmd` on systems without Windows Terminal
