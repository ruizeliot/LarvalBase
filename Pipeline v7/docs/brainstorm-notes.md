# Pipeline v7 - Brainstorm Notes

**Date:** 2025-12-07
**Type:** Terminal/TUI Application
**Framework:** Ink v5 (React for CLI)
**Testing:** CLET + node-pty

---

## Problem Statement

Pipeline v6 has critical bugs that make orchestration unreliable:

1. **Worker Identification Bug**: Uses `taskkill /IM claude*` wildcard, killing ALL Claude processes including unrelated ones
2. **Todo Tracking Bug**: Grabs todo files from wrong workers (no project/session scoping)
3. **Cost/Duration Bug**: Tracking breaks on pipeline resume, doesn't recalculate from ccusage
4. **Architecture Issue**: Supervisor and workers in separate terminals is complex and error-prone

---

## Solution: Pipeline v7

A complete rewrite as a single TUI application that:
- Runs orchestrator and worker in one split-view terminal
- Tracks workers by session ID (not process name wildcards)
- Scopes todos to specific project/worker sessions
- Recalculates costs from ccusage on resume
- Uses Mock Claude for fast, free, reproducible E2E tests

---

## Target Users

- Developers using the pipeline system
- Single user at a time (not multi-user)
- Windows, macOS, Linux support

---

## Core Features

### 1. Global CLI Installation
```bash
npm install -g @imt/pipeline
pipeline                    # Launch TUI
pipeline new /path/to/proj  # Quick start
pipeline resume /path       # Resume existing
```

### 2. Split-View TUI
- Left pane: Orchestrator (status, epics, controls)
- Right pane: Worker output (normal Claude CLI output)
- Keyboard shortcuts for navigation
- F11 or `f` to fullscreen worker pane

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
- Pause anytime with `p` or Ctrl+C
- Resume from exact point
- Recalculate costs from ccusage sessions

---

## TUI Mockups

### Launcher Screen
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PIPELINE v7                                         │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  📁 Project Path: /home/user/my-project                    [...]  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   Pipeline Type:                                                             │
│     ○ Desktop (Tauri)                                                        │
│     ● Terminal (Ink)                                                         │
│                                                                              │
│   Mode:                                                                      │
│     ● New Project                                                            │
│     ○ Add Feature                                                            │
│     ○ Fix Bug                                                                │
│                                                                              │
│                                                                              │
│   ┌─────────────────┐                                                        │
│   │   ▶ START       │                                                        │
│   └─────────────────┘                                                        │
│                                                                              │
│   [Tab] Navigate  [Enter] Select  [q] Quit  [?] Help                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Resume Screen
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         RESUME PIPELINE                                       │
│                                                                              │
│   Project: my-awesome-app                                                    │
│   Path: /home/user/my-project                                               │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  Last State                                                        │    │
│   ├────────────────────────────────────────────────────────────────────┤    │
│   │  Phase: 4 - Implement                                              │    │
│   │  Epic: 3/6 - User Authentication                                   │    │
│   │  Progress: 45%                                                     │    │
│   │  Last Activity: 2 hours ago                                        │    │
│   │                                                                    │    │
│   │  Cost (from ccusage):                                              │    │
│   │    Previous sessions: $4.23                                        │    │
│   │    This resume: $0.00                                              │    │
│   │    Total: $4.23                                                    │    │
│   │                                                                    │    │
│   │  Duration: 1h 23m                                                  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌─────────────────┐   ┌─────────────────┐                                 │
│   │   ▶ RESUME      │   │   ✕ CANCEL      │                                 │
│   └─────────────────┘   └─────────────────┘                                 │
│                                                                              │
│   [Enter] Resume  [Esc] Cancel  [d] Delete & Start Fresh                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Split View (Main Pipeline Screen)
```
┌────────────────────────────────┬─────────────────────────────────────────────┐
│ ORCHESTRATOR                   │ WORKER                                      │
├────────────────────────────────┤─────────────────────────────────────────────┤
│                                │                                             │
│ Project: my-app                │ $ claude                                    │
│ Phase: 4 - Implement           │                                             │
│ Epic: 2/4 - Navigation         │ > I'll implement the navigation component  │
│                                │   based on the user stories...             │
│ ┌────────────────────────────┐ │                                             │
│ │ Progress          ████░ 67%│ │ Creating src/components/Nav.tsx            │
│ └────────────────────────────┘ │                                             │
│                                │ ```typescript                               │
│ Todos:                         │ import { Box, Text } from 'ink';            │
│ ✓ Read manifest                │ import { useInput } from 'ink';             │
│ ✓ Plan implementation          │                                             │
│ ● Implement components         │ export function Nav() {                     │
│ ○ Run E2E tests                │   const [selected, setSelected] = ...      │
│ ○ Fix failures                 │ }                                           │
│ ○ Commit                       │ ```                                         │
│                                │                                             │
│ Epics:                         │ Running: npm run build                      │
│ ✓ 1. App Shell                 │ ✓ Compiled successfully                     │
│ ● 2. Navigation                │                                             │
│ ○ 3. Settings                  │ Running: npm test                           │
│ ○ 4. Pipeline Runner           │ PASS tests/nav.test.ts                      │
│                                │                                             │
│ Cost: $2.45  Duration: 34m     │                                             │
│                                │                                             │
├────────────────────────────────┴─────────────────────────────────────────────┤
│ [p] Pause  [f] Fullscreen Worker  [←→] Resize  [q] Quit  [?] Help            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Worker Fullscreen Mode
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ WORKER (Fullscreen)                                            [Esc] Exit   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ $ claude                                                                     │
│                                                                              │
│ > I'll implement the navigation component based on the user stories...      │
│                                                                              │
│ Creating src/components/Nav.tsx                                              │
│                                                                              │
│ ```typescript                                                                │
│ import { Box, Text } from 'ink';                                             │
│ import { useInput } from 'ink';                                              │
│                                                                              │
│ export function Nav() {                                                      │
│   const [selected, setSelected] = useState(0);                               │
│   const items = ['Home', 'Projects', 'Settings'];                            │
│                                                                              │
│   useInput((input, key) => {                                                 │
│     if (key.upArrow) setSelected(s => Math.max(0, s - 1));                  │
│     if (key.downArrow) setSelected(s => Math.min(items.length - 1, s + 1)); │
│   });                                                                        │
│                                                                              │
│   return (                                                                   │
│     <Box flexDirection="column">                                             │
│       {items.map((item, i) => (                                              │
│         <Text key={item} inverse={i === selected}>{item}</Text>              │
│       ))}                                                                    │
│     </Box>                                                                   │
│   );                                                                         │
│ }                                                                            │
│ ```                                                                          │
│                                                                              │
│ Running: npm run build                                                       │
│ ✓ Compiled successfully                                                      │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 4 Epic 2/4  Progress: 67%  Cost: $2.45  Duration: 34m                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Complete Screen
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         ✓ PIPELINE COMPLETE                                 │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  Project: my-awesome-app                                           │    │
│   │  Type: Terminal (Ink)                                              │    │
│   │  Mode: New Project                                                 │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  Summary                                                           │    │
│   ├────────────────────────────────────────────────────────────────────┤    │
│   │  Phases Completed: 5/5                                             │    │
│   │  Epics Completed: 4/4                                              │    │
│   │  E2E Tests: 47/47 passing                                          │    │
│   │                                                                    │    │
│   │  Total Cost: $12.45                                                │    │
│   │  Total Duration: 2h 15m                                            │    │
│   │                                                                    │    │
│   │  Git Commits: 6                                                    │    │
│   │  Files Created: 34                                                 │    │
│   │  Lines of Code: 2,847                                              │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   Deliverables:                                                              │
│   • npm package ready: npm publish                                           │
│   • GitLab repo: https://gitlab.com/.../my-awesome-app                      │
│                                                                              │
│   ┌─────────────────┐   ┌─────────────────┐                                 │
│   │   ▶ NEW PROJECT │   │   ✕ EXIT        │                                 │
│   └─────────────────┘   └─────────────────┘                                 │
│                                                                              │
│   [Enter] New Project  [q] Exit                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Help Screen (Overlay)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              KEYBOARD SHORTCUTS                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Navigation                          Pipeline Control                        │
│  ──────────                          ────────────────                        │
│  Tab        Next field               p         Pause pipeline               │
│  Shift+Tab  Previous field           r         Resume (when paused)         │
│  ↑/↓        Navigate lists           Ctrl+C    Emergency stop               │
│  Enter      Select/Confirm                                                   │
│  Esc        Back/Cancel              View                                    │
│                                      ────                                    │
│  Global                              f/F11     Fullscreen worker            │
│  ──────                              ←/→       Resize panes                 │
│  q          Quit                     l         Toggle log view              │
│  ?          Show this help                                                   │
│  Ctrl+L     Clear screen                                                     │
│                                                                              │
│  Launcher                            Split View                              │
│  ────────                            ──────────                              │
│  n          New project              1-5       Jump to phase                │
│  o          Open existing            e         Focus epics                  │
│  h          History                  t         Focus todos                  │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                            [Esc] Close Help                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Navigation

### Global Keys
| Key | Action |
|-----|--------|
| `q` | Quit application |
| `?` | Show help overlay |
| `Ctrl+L` | Clear/refresh screen |
| `Ctrl+C` | Emergency stop (with confirmation) |

### Launcher Screen
| Key | Action |
|-----|--------|
| `Tab` | Next field |
| `Shift+Tab` | Previous field |
| `↑/↓` | Navigate options |
| `Enter` | Select/Start |
| `n` | New project |
| `o` | Open existing |
| `h` | Show history |

### Split View (Pipeline Running)
| Key | Action |
|-----|--------|
| `p` | Pause pipeline |
| `r` | Resume (when paused) |
| `f` / `F11` | Fullscreen worker |
| `←/→` | Resize panes |
| `1-5` | Jump to phase section |
| `e` | Focus epics list |
| `t` | Focus todos list |
| `l` | Toggle log view |

### Worker Fullscreen
| Key | Action |
|-----|--------|
| `Esc` | Exit fullscreen |
| `Ctrl+L` | Clear buffer |

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
- Single TUI application with split view
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

**Testing**
- Mock Claude binary for E2E tests
- Mock PTY for terminal simulation
- Mock filesystem for isolation
- Fixture-based test data

**UI**
- Launcher screen
- Resume screen
- Split view (orchestrator + worker)
- Worker fullscreen mode
- Pipeline complete screen
- Help overlay

### Out of Scope (v2+)

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

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: UI Screens                                             │
│ (Launcher, SplitView, Resume, Complete, Help)                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Pipeline Orchestrator                                  │
│ (Phase progression, epic loops, todo monitoring, worker mgmt)   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Services                                               │
│ (Filesystem, Process, Cost)                                     │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Data Layer                                             │
│ (State stores: manifest, project, session, todos, cost)         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Foundation                                             │
│ (TUI framework, test infrastructure)                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

**Foundation (Epic 1-2)**
- Ink v5 components (Box, Text, Input, Select, etc.)
- Keyboard handling with useInput
- Screen navigation system
- Mock Claude binary
- Mock PTY emulator
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
- ProcessService: Worker spawn/kill, output capture, PID tracking
- CostService: ccusage integration, duration, recalculation

**Orchestrator (Epic 7)**
- Phase progression logic
- Todo completion detection
- Epic loop management
- Worker lifecycle management
- Resume/pause logic

**UI (Epic 8)**
- LauncherScreen
- ResumeScreen
- SplitViewScreen
- WorkerFullscreenScreen
- CompleteScreen
- HelpOverlay

---

## Data Flow

```
User Input → UI Screen → Orchestrator → Service → Store → Filesystem
                ↑                                          ↓
                └──────────── State Updates ───────────────┘
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
| 1 | TUI Framework | 30 | Foundation | None |
| 2 | Test Infrastructure | 40 | Foundation | Epic 1 |
| 3 | State Management | 47 | Data | Epic 1, 2 |
| 4 | Filesystem Service | 34 | Services | Epic 3 |
| 5 | Process Service | 29 | Services | Epic 3 |
| 6 | Cost Service | 22 | Services | Epic 3 |
| 7 | Pipeline Orchestrator | 36 | Logic | Epic 4, 5, 6 |
| 8 | UI Screens | 48 | UI | Epic 7 |
| **Total** | | **286** | | |

---

## Mock Claude Pattern

Tests NEVER call real Claude CLI. Instead:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MOCK CLAUDE TEST PATTERN                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Test Code                Mock Claude Binary              Fixture File     │
│   ─────────                ──────────────────              ────────────     │
│   ┌─────────┐              ┌──────────────┐               ┌───────────┐    │
│   │  CLET   │  spawns      │ mock-claude  │   reads       │ phase-4   │    │
│   │  test   │──────────────│    .js       │───────────────│ -success  │    │
│   │         │              │              │               │  .json    │    │
│   └────┬────┘              └──────┬───────┘               └───────────┘    │
│        │                          │                                         │
│        │ waits for stdout         │ streams output                          │
│        │ asserts content          │ writes todo files                       │
│        │ checks exit code         │ exits with code                         │
│        ▼                          ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      TEST ASSERTIONS                                │  │
│   │  - stdout matches expected patterns                                 │  │
│   │  - todo files created/updated correctly                             │  │
│   │  - exit code is expected value                                      │  │
│   │  - timing matches expected delays                                   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fixture Format
```json
{
  "output": [
    "[TODO] Reading manifest",
    "[PROGRESS] {\"phase\": 4, \"epic\": 2, \"percent\": 25}",
    "[TODO] Implementing components",
    "[PROGRESS] {\"phase\": 4, \"epic\": 2, \"percent\": 75}",
    "[TODO] Epic complete"
  ],
  "todoStates": [
    {
      "timestamp": 100,
      "todos": [
        {"content": "Read manifest", "status": "completed"},
        {"content": "Implement", "status": "in_progress"}
      ]
    }
  ],
  "finalState": {
    "exitCode": 0
  }
}
```

---

## Success Criteria

1. **Global installation works**: `npm install -g @imt/pipeline && pipeline` launches TUI
2. **Split view functional**: Orchestrator and worker visible simultaneously
3. **Worker tracking correct**: Session-scoped, no wildcard kills
4. **Todo tracking correct**: Project/session scoped, no cross-contamination
5. **Resume works**: Picks up from exact state, recalculates costs
6. **All E2E tests pass**: Using mock Claude (fast, free, reproducible)
7. **Both pipeline types work**: Desktop (Tauri) and Terminal (Ink)

---

## Notes

- Windows is primary development platform (user's environment)
- ccusage binary must be available for cost tracking
- Git must be available for commits
- Node.js 18+ required
