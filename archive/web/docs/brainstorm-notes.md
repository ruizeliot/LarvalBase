# PipelineWebGUI - Brainstorm Notes

**Date:** 2025-11-28
**Status:** Design Updated (Feature Addition)

---

## Overview

Admin dashboard for the Pipeline Worker Agent System. Provides real-time visibility into workers, jobs, and pipelines with embedded terminal views.

---

## Core Features

### 1. Pipeline Management
- List all pipelines with status (in progress, queued, complete)
- Visual pipeline graph showing phases: 0a → 0b → 1 → 2 → 3
- Start new pipelines (new project or feature mode)
- Stop/restart pipelines
- Signal phase completion manually

### 2. Worker Management
- View connected workers (name, CPU, RAM, status)
- Generate connection tokens
- Download pre-built agent executables (Windows, Linux, macOS)
- Remove workers from registry

### 3. Terminal Views
- Real terminal emulation in browser (xterm.js)
- Worker view: see worker tmux session output
- Supervisor sidebar: overlay that shows supervisor session
- Send messages to worker or supervisor
- Full color/ANSI support, interactive scrolling

### 4. Authentication
- Simple password auth (stored in env var)
- JWT token for API/WebSocket authentication

---

## User Interface

### Navigation Flow

```
Pipelines List → Pipeline Graph → Worker View (click phase)
                      ↓
              [Supervisor Sidebar] (toggle, overlays any view)

Settings (accessible from nav)
```

### Views

1. **Pipelines List** - Main view, shows all projects
2. **Pipeline Graph** - Visual phase diagram, status info, [Supervisor] button
3. **Worker View** - Full terminal for worker session, send messages
4. **Supervisor Sidebar** - Slides in from right (~300px), shows supervisor terminal
5. **Settings** - Workers list, token generation, agent downloads, coordinator status

---

## Architecture

```
Browser (React + xterm.js)
         │
         │ WebSocket + REST
         ▼
Coordinator (extended)
├── HTTP API: /api/pipelines, /api/workers, /api/auth
├── WebSocket: real-time updates, terminal streaming
├── Terminal: node-pty spawns tmux attach
└── Worker registry (existing)
         │
         │ WebSocket
         ▼
Worker Agents (unchanged)
```

---

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.9 + Vite 7 + Tailwind 4
- **State:** Zustand
- **Terminal:** xterm.js + node-pty
- **Backend:** Extend existing coordinator.js
- **Auth:** Simple password → JWT

---

## Project Structure

```
/home/claude/IMT/Pipeline-Office/
├── agent/
│   ├── coordinator.js      # Extended with dashboard API
│   ├── worker-agent.js     # Unchanged
│   ├── dispatch.js         # Unchanged
│   └── dist/               # Pre-built agent binaries
│
├── web/                    # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── PipelineList.tsx
│   │   │   ├── PipelineGraph.tsx
│   │   │   ├── WorkerView.tsx
│   │   │   ├── SupervisorSidebar.tsx
│   │   │   ├── Terminal.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── pipeline                # CLI (unchanged)
└── lib/                    # Shared libs (unchanged)
```

---

## API Endpoints

### HTTP (REST)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | POST | Login, returns JWT |
| `/api/pipelines` | GET | List all pipelines |
| `/api/pipelines/:id` | GET | Pipeline details |
| `/api/pipelines` | POST | Start new pipeline |
| `/api/pipelines/:id/stop` | POST | Stop pipeline |
| `/api/pipelines/:id/signal` | POST | Signal phase complete |
| `/api/workers` | GET | List workers |
| `/api/tokens` | POST | Generate token |
| `/api/agent/:os` | GET | Download agent binary |

### WebSocket

| Type | Direction | Description |
|------|-----------|-------------|
| `auth` | →Server | Authenticate with JWT |
| `subscribe_pipelines` | →Server | Subscribe to updates |
| `pipeline_update` | ←Server | Pipeline status changed |
| `worker_update` | ←Server | Worker connect/disconnect |
| `terminal_attach` | →Server | Attach to tmux session |
| `terminal_data` | ↔ | Terminal I/O stream |
| `terminal_detach` | →Server | Detach from session |

---

## Commands → Buttons

### Pipeline Graph View
- [▶ Start] - Start/resume pipeline
- [⏹ Stop] - Stop pipeline
- [🔄 Restart Phase] - Restart from specific phase
- [📊 Status] - Refresh status
- [👁 Supervisor] - Toggle supervisor sidebar

### Worker View
- [Send...] - Send message to worker
- [✓ Signal Complete] - Manually signal phase done
- [⏹ Kill Worker] - Force kill worker
- [📋 Copy Output] - Copy terminal output

### Supervisor Sidebar
- [Send...] - Send to supervisor
- [🔄 Nudge] - Send "continue" message

### Settings
- [Generate New] - New worker token
- [Remove] - Remove worker
- [Download .exe/.linux/.macos] - Download agent
- [Restart Coordinator] - Restart service

---

## Agent Distribution

Pre-built standalone executables using `pkg`:
- `pipeline-agent-win.exe` - Windows
- `pipeline-agent-linux` - Linux
- `pipeline-agent-macos` - macOS

User flow:
1. Download agent for their OS from Settings
2. Run agent
3. Enter connection token (from dashboard)
4. Machine appears in Workers list

---

## Decisions Made

1. **Single coordinator** - Extend existing coordinator.js rather than separate backend
2. **xterm.js** - Real terminal emulation, not just text streaming
3. **Pipeline-centric UI** - Main view is pipelines, not workers
4. **Supervisor as sidebar** - Overlays other views, doesn't take full screen
5. **Simple auth** - Password in env var, JWT for sessions
6. **IMT stack** - React + TypeScript + Vite + Tailwind (consistent with other projects)

---

## Out of Scope (Future)

- External user registration (public sign-up)
- User accounts with roles
- Pipeline templates/presets
- Cost tracking / billing
- Mobile app

---

## Next Steps

1. Phase 0b: Write E2E test specs, finalize tech stack
2. Phase 1: Bootstrap React app with basic routing
3. Phase 2: Implement views and coordinator extensions
4. Phase 3: Polish, deploy, test with real pipelines

---

## Feature Addition: 2025-11-28

### New/Updated Features

1. **Delete Pipeline** - Remove pipelines and project folders from the interface
2. **Split Terminal View** - See Supervisor + Worker side-by-side on Pipeline Graph
3. **Drag & Drop Brainstorm Notes** - Upload existing notes when starting pipeline
4. **Fixed Input Bars** - Terminal inputs always visible at bottom of viewport

### UI Mockups

#### Pipelines List View (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PipelineWebGUI                                              [Settings]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Pipelines                                              [+ New Pipeline]    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  testGUI-Beer-Game          Phase: 0a    ● Running     [🗑 Delete]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  test-project-old           Phase: 3     ✓ Complete    [🗑 Delete]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  another-test               Phase: 1     ⏹ Stopped     [🗑 Delete]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Status values: ● Running (green), ✓ Complete (blue), ⏹ Stopped (gray)

#### New Pipeline Modal (with Drag & Drop)

```
┌────────────────────────────────────────────────────────────────┐
│  Start New Pipeline                                        [X] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Project Path:                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ /home/claude/IMT/my-new-project                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Mode:                                                         │
│  ○ New Project                                                 │
│  ○ Feature (add to existing)                                   │
│                                                                │
│  Start from phase: [0a ▼] (optional)                           │
│                                                                │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │                                                         │   │
│  │   📄 Drag & drop brainstorm-notes.md here               │   │
│  │              or click to browse                         │   │
│  │                                                         │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                │
│  ℹ️ Upload existing notes to skip brainstorm phase (0a)        │
│                                                                │
│              [Cancel]  [▶ Start Pipeline]                      │
└────────────────────────────────────────────────────────────────┘
```

After file dropped:
- Shows "✓ brainstorm-notes.md (2.4 KB) [X]"
- Auto-sets start phase to 0b
- File copied to project's docs/ folder on start

#### Delete Confirmation Modal

```
┌────────────────────────────────────────────┐
│  ⚠️ Delete Pipeline                    [X] │
├────────────────────────────────────────────┤
│                                            │
│  Are you sure you want to delete:          │
│  testGUI-Beer-Game                         │
│                                            │
│  ☑ Also delete project folder on disk      │
│    /home/claude/IMT/testGUI-Beer-Game      │
│                                            │
│  ⚠️ This action cannot be undone!          │
│                                            │
│         [Cancel]  [🗑 Delete Forever]       │
└────────────────────────────────────────────┘
```

#### Pipeline Graph View (Split Terminal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    testGUI-Beer-Game                         [⏹ Stop] [🗑 Delete]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                  │
│  │  0a  │───▶│  0b  │───▶│  1   │───▶│  2   │───▶│  3   │                  │
│  │  ✓   │    │  ✓   │    │ ●    │    │      │    │      │                  │
│  └──────┘    └──────┘    └──────┘    └──────┘    └──────┘                  │
│                                                                             │
├──────────────────────────────────┬──────────────────────────────────────────┤
│  SUPERVISOR                      │  WORKER (Phase 1)                        │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  $ claude --dangerously-skip...  │  $ claude --dangerously-skip...          │
│  > /supervisor /path --mode new  │  > Implementing bootstrap...             │
│                                  │                                          │
│  Phase 0a complete, starting 0b  │  Creating vite config...                 │
│  Phase 0b complete, starting 1   │  npm install                             │
│  Spawning worker for phase 1...  │  Setting up Cypress...                   │
│                                  │                                          │
│  (scrollable)                    │  (scrollable)                            │
│                                  │                                          │
├──────────────────────────────────┼──────────────────────────────────────────┤
│ [Message...        ] [Send]      │ [Message...        ] [Send] [✓ Signal]   │
└──────────────────────────────────┴──────────────────────────────────────────┘
  ↑ FIXED at bottom (viewport)       ↑ FIXED at bottom (viewport)
```

Key changes:
- Split view: Supervisor (left) + Worker (right)
- Both terminals have input bars FIXED at bottom of viewport
- Input bars always visible, don't scroll with terminal content
- Clicking phase node in diagram switches Worker pane to that phase

### Integration Points

- `./pipeline supervise <project>` starts both supervisor and worker sessions
- Supervisor session: `supervisor-{project-name}`
- Worker session: `worker-{project-name}`
- Delete also removes project folder on disk (with confirmation)

### Decisions Made (Feature Addition)

1. **No sidebar for supervisor** - Split view is clearer than overlay sidebar
2. **Fixed input bars** - Always visible at bottom of viewport, not scrollable
3. **Delete includes folder** - Optional checkbox to delete project folder
4. **Drag & drop notes** - Allows skipping phase 0a with existing brainstorm notes
5. **Removed "queued" status** - Simplified to: Running / Complete / Stopped

---

## Feature Addition: 2025-11-28 (Pipeline Analytics)

### New Feature: Pipeline Analytics Dashboard

View pipeline performance metrics, supervisor decision logs, and run history. Provides visibility into data already captured in manifests and logs but not currently accessible via the UI.

### Problem Statement

- No visibility into pipeline performance metrics (run times, success rates)
- No way to view cost tracking data from manifest
- No access to supervisor decision logs (new in v6.0)

### Data Sources

Already available in pipeline system:
- `.pipeline/manifest.json` - phases, timing, costs, test results
- `.pipeline/supervisor-decisions.log` - decision log (v6.0)
- `.pipeline/runs/*/metadata.json` - historical run data

### Integration Points

- Access via [📊 Analytics] button on Pipeline Graph header
- Reads manifest.json for metrics data
- Reads supervisor-decisions.log for decision entries
- Reads runs/ directory for historical data
- Updates every 30s for running pipelines

### UI Mockups

#### Pipeline Graph Header (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    testGUI-Beer-Game              [📊 Analytics] [⏹ Stop] [🗑 Delete] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                  │
│  │  0a  │───▶│  0b  │───▶│  1   │───▶│  2   │───▶│  3   │                  │
│  │  ✓   │    │  ✓   │    │  ✓   │    │  ✓   │    │ ●    │                  │
│  └──────┘    └──────┘    └──────┘    └──────┘    └──────┘                  │
│   12m          8m         45m         2h 15m       --                       │
│                                                                             │
```

Phase duration now displayed under each node.

#### Analytics View - Metrics Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    testGUI-Beer-Game - Analytics                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Metrics]  [Decisions]  [History]                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SUMMARY                                                             │   │
│  │                                                                      │   │
│  │  Total Duration: 3h 20m          Status: ✓ Complete                  │   │
│  │  Estimated Cost: $2.45           Tests: 47/52 passing                │   │
│  │  Phases: 5/5 complete            Epics: 4                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE BREAKDOWN                                                     │   │
│  │                                                                      │   │
│  │  Phase    Duration    Cost      Status                               │   │
│  │  ───────────────────────────────────────────                         │   │
│  │  0a       12m         $0.15     ✓ Complete                           │   │
│  │  0b       8m          $0.10     ✓ Complete                           │   │
│  │  1        45m         $0.55     ✓ Complete                           │   │
│  │  2        2h 15m      $1.40     ✓ Complete (4 epics)                 │   │
│  │  3        --          --        ● Running                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TEST RESULTS BY EPIC                                                │   │
│  │                                                                      │   │
│  │  Epic 1: Auth           ████████████████████  12/12 (100%)          │   │
│  │  Epic 2: Pipelines      ██████████████░░░░░░  14/18 (78%)           │   │
│  │  Epic 3: Workers        ████████████████████  10/10 (100%)          │   │
│  │  Epic 4: Terminals      ████████████████████░ 11/12 (92%)           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                          [Export JSON]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

For running pipelines: shows "Running..." for incomplete phases, updates every 30s.

#### Analytics View - Decisions Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    testGUI-Beer-Game - Analytics                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Metrics]  [Decisions]  [History]                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filter: [All ▼]  [PHASE_COMPLETE] [INTERVENTION] [SPAWN] [KILL]           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  14:32:05  SPAWN           Spawning worker for phase 0a              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  14:44:12  PHASE_COMPLETE  Phase 0a complete - user stories created  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  14:44:15  KILL            Killing worker session worker-beer-game   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  14:44:18  SPAWN           Spawning worker for phase 0b              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  14:52:30  PHASE_COMPLETE  Phase 0b complete - E2E specs written     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  15:37:45  INTERVENTION    User requested restart from phase 1       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Showing 24 entries                                         [Export JSON]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Decision types: SPAWN, KILL, PHASE_COMPLETE, INTERVENTION, ERROR, CRASH_RECOVERY

#### Analytics View - History Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    testGUI-Beer-Game - Analytics                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Metrics]  [Decisions]  [History]                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RUN HISTORY                                                         │   │
│  │                                                                      │   │
│  │  Run ID              Date           Duration   Cost    Status        │   │
│  │  ─────────────────────────────────────────────────────────────       │   │
│  │  20251128-143205     Nov 28, 14:32  3h 20m    $2.45   ● Running      │   │
│  │  20251127-091530     Nov 27, 09:15  4h 05m    $3.10   ✓ Complete     │   │
│  │  20251126-163000     Nov 26, 16:30  --        $0.85   ✗ Failed       │   │
│  │  20251125-102045     Nov 25, 10:20  2h 50m    $2.20   ✓ Complete     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TREND: DURATION                                                     │   │
│  │                                                                      │   │
│  │  4h ┤     ●                                                          │   │
│  │     │                                                                │   │
│  │  3h ┤                          ●                                     │   │
│  │     │  ●                                                             │   │
│  │  2h ┤                                                                │   │
│  │     └────┴────┴────┴────┴────                                        │   │
│  │       Nov25  Nov26  Nov27  Nov28                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

History is per-project only (MVP scope). Clicking a run loads its metrics.

### Decisions Made (Analytics Feature)

1. **Button on header** - Analytics accessed via button on Pipeline Graph, keeps it contextual
2. **Real-time updates** - Updates every 30s during running pipelines, shows "Running..." for incomplete data
3. **Per-project history** - MVP shows only runs for current project, global view is future enhancement
4. **Export JSON** - Both metrics and decisions tabs have Export JSON button
5. **No comparison** - Side-by-side run comparison deferred to future iteration
6. **Simple trend chart** - ASCII-style bar chart for duration trends (can enhance later)
7. **Supervisor heartbeat** - Pipeline v6.0.1 uses 5-minute heartbeat; Decision Log may show HEARTBEAT entries at this interval
