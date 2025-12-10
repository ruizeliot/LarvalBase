# Pipeline v7.0 Design

> Clean architecture with three components: Orchestrator, Dashboard, Workers

## Overview

A simplified pipeline system replacing the complex v6.x bash/Node.js hybrid with a clean separation of concerns.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      USER                               │
│                        │                                │
│                  Start Claude                           │
│                  /orchestrator                          │
│                        │                                │
│                        ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │              ORCHESTRATOR (Claude)                 │  │
│  │                                                    │  │
│  │  • Loaded via /orchestrator slash command          │  │
│  │  • Asks: stack type? pipeline mode?                │  │
│  │  • Spawns dashboard (Node.js process)              │  │
│  │  • Spawns workers (Claude in new terminals)        │  │
│  │  • Periodically checks worker progress (TodoWrite) │  │
│  │  • Decides when to advance phases                  │  │
│  └───────────────────────────────────────────────────┘  │
│              │                           │              │
│       spawns │                    spawns │              │
│              ▼                           ▼              │
│  ┌─────────────────┐         ┌─────────────────────┐   │
│  │    DASHBOARD    │         │   WORKER (Claude)   │   │
│  │   (Node.js)     │         │   (New Terminal)    │   │
│  │                 │         │                     │   │
│  │  • TUI display  │         │  • Runs phase cmd   │   │
│  │  • Phase status │         │  • Uses TodoWrite   │   │
│  │  • Cost tracker │         │  • User can watch   │   │
│  │  • Epic progress│         │  • Autonomous       │   │
│  └─────────────────┘         └─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Orchestrator is the brain** - A Claude session that thinks and adapts, not a dumb script
2. **Clean slate** - Archive all v6.x legacy code, keep only desktop phase commands
3. **Periodic check-in** - Orchestrator checks every 2-3 minutes, doesn't watch continuously
4. **TodoWrite for progress** - Workers use TodoWrite, orchestrator reads to assess completion
5. **Manifest as state** - All state in `.pipeline/manifest.json`, enables crash recovery

---

## Component Details

### 1. Orchestrator

**Invocation:** `/orchestrator` slash command

**Startup flow:**

1. User runs `claude` in project directory
2. User types `/orchestrator`
3. Orchestrator loads context and greets user
4. Asks: "What type of stack?" (desktop, terminal, web)
5. Asks: "New project, feature, or fix?"
6. Spawns the dashboard process
7. Spawns first worker with appropriate phase command

**During execution:**

- Checks worker progress every 2-3 minutes
- Reads `~/.claude/todos/` to assess completion
- Uses intelligence to decide: "Is this phase done?"
- When done: kills worker, runs post-phase analysis, spawns next worker
- Updates manifest (dashboard reads and refreshes)

**Post-phase analysis:**

- Reads worker's conversation transcript
- Extracts timing and cost per todo item
- Stores breakdown in manifest for dashboard display

**What orchestrator does NOT do:**

- Watch continuously (burns tokens)
- Wait for explicit signals
- Run complex bash scripts

### 2. Dashboard

**Technology:** Node.js (single file, no framework)

**Display:**

```
╔══════════════════════════════════════════════════════╗
║  PIPELINE DASHBOARD                                  ║
║  Project: my-desktop-app  │  Mode: new               ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  PHASES                                              ║
║  [✓] 1. Brainstorm         3m 42s   $0.12  [+]      ║
║  [✓] 2. Technical          2m 15s   $0.08  [+]      ║
║  [>] 3. Bootstrap          5m 03s   $0.21           ║
║  [ ] 4. Implement                                    ║
║      [ ] Epic 1: App shell & navigation             ║
║      [ ] Epic 2: Core game logic                    ║
║      [ ] Epic 3: Settings & persistence             ║
║  [ ] 5. Finalize                                     ║
║                                                      ║
║  WORKER PROGRESS                                     ║
║  [########..........] 40%  (4/10 todos)             ║
║                                                      ║
║  COST                                                ║
║  This run: $0.41  │  Total project: $2.87           ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

**Expanded phase view (after completion):**

```
║  [✓] 1. Brainstorm         3m 42s   $0.12  [-]      ║
║      ├─ Define target users       0m 45s   $0.02    ║
║      ├─ Identify core features    1m 12s   $0.04    ║
║      ├─ Draft user stories        1m 30s   $0.05    ║
║      └─ Finalize brainstorm doc   0m 15s   $0.01    ║
```

**Data sources:**

- `.pipeline/manifest.json` - phase status, timing, cost, epic list
- `~/.claude/todos/` - current worker progress
- `ccusage` - cost tracking

**Control flow:**

- Orchestrator spawns: `node .pipeline/dashboard.cjs`
- Dashboard runs in same terminal as orchestrator
- Orchestrator updates manifest → Dashboard reads and refreshes

### 3. Workers

**Spawning:**

Orchestrator uses Bash tool to launch new Windows Terminal:

```bash
cmd.exe /c start wt.exe --title "Worker-Phase-3" -d "C:/path/to/project" cmd /k claude "/3-new-pipeline-desktop-v6.0" --dangerously-skip-permissions
```

**What gets passed:**

- Phase slash command (e.g., `/3-new-pipeline-desktop-v6.0`)
- Working directory is project path
- Worker runs autonomously, uses TodoWrite

**Worker visibility:**

- Opens in separate terminal window (user can watch)
- Orchestrator doesn't capture output directly
- Orchestrator reads todos from `~/.claude/todos/` to monitor

**Killing workers:**

- Track window title, use `taskkill` with title filter
- Or track PID if discoverable

---

## File Structure

### Global commands (kept):

```
~/.claude/commands/
├── orchestrator.md              # NEW: The orchestrator slash command
├── 1-new-pipeline-desktop-v6.0.md
├── 2-new-pipeline-desktop-v6.0.md
├── 3-new-pipeline-desktop-v6.0.md
├── 4-new-pipeline-desktop-v6.0.md
└── 5-new-pipeline-desktop-v6.0.md
```

### Per-project files:

```
<project>/
├── .pipeline/
│   ├── manifest.json            # State: phases, epics, timing, cost
│   ├── dashboard.cjs            # Dashboard script (copied on init)
│   └── transcripts/             # Worker conversation logs for analysis
│       ├── phase-1.jsonl
│       ├── phase-2.jsonl
│       └── ...
└── docs/
    ├── user-stories.md          # Created by Phase 1
    ├── e2e-test-specs.md        # Created by Phase 2
    └── brainstorm-notes.md      # Created by Phase 1
```

### Pipeline-Office:

```
Pipeline-Office/
├── lib/
│   └── dashboard.cjs            # Dashboard source (template)
├── archive/                     # All legacy code moved here
└── CLAUDE.md                    # Updated docs
```

---

## Manifest Schema

```json
{
  "version": "7.0",
  "project": {
    "name": "my-desktop-app",
    "path": "C:/Users/ahunt/Documents/my-desktop-app"
  },
  "stack": "desktop",
  "mode": "new",
  "status": "running",
  "currentPhase": "3",
  "createdAt": "2025-12-09T10:00:00Z",

  "epics": [
    { "id": 1, "name": "App shell & navigation", "status": "pending" },
    { "id": 2, "name": "Core game logic", "status": "pending" },
    { "id": 3, "name": "Settings & persistence", "status": "pending" }
  ],

  "phases": {
    "1": {
      "status": "complete",
      "startedAt": "2025-12-09T10:00:00Z",
      "completedAt": "2025-12-09T10:03:42Z",
      "duration": 222000,
      "cost": 0.12,
      "workerSessionId": "abc-123",
      "todoBreakdown": [
        { "content": "Define target users", "duration": 45000, "cost": 0.02 },
        { "content": "Identify core features", "duration": 72000, "cost": 0.04 },
        { "content": "Draft user stories", "duration": 90000, "cost": 0.05 },
        { "content": "Finalize brainstorm doc", "duration": 15000, "cost": 0.01 }
      ]
    },
    "2": {
      "status": "complete",
      "startedAt": "...",
      "completedAt": "...",
      "duration": 135000,
      "cost": 0.08,
      "workerSessionId": "def-456",
      "todoBreakdown": [...]
    },
    "3": {
      "status": "running",
      "startedAt": "2025-12-09T10:05:57Z",
      "workerSessionId": "ghi-789"
    },
    "4": {
      "status": "pending",
      "currentEpic": null
    },
    "5": {
      "status": "pending"
    }
  },

  "totalCost": 0.41
}
```

**Simplifications from v6:**

- No nested `loops` array - epics are top-level
- `todoBreakdown` for post-phase analysis
- Flat structure, easy to read and update

---

## Phase Commands (Kept)

The existing desktop phase commands remain unchanged:

| Phase | Command | Purpose |
|-------|---------|---------|
| 1 | `/1-new-pipeline-desktop-v6.0` | Brainstorm - user stories, epic definition |
| 2 | `/2-new-pipeline-desktop-v6.0` | Technical - E2E specs, tech stack |
| 3 | `/3-new-pipeline-desktop-v6.0` | Bootstrap - skeleton, failing tests |
| 4 | `/4-new-pipeline-desktop-v6.0` | Implement - code until tests pass (loops per epic) |
| 5 | `/5-new-pipeline-desktop-v6.0` | Finalize - polish, verify, build |

---

## Migration Plan

1. **Archive legacy code** - Move all bash scripts, old dashboard, analysis tools to `archive/`
2. **Create orchestrator command** - `~/.claude/commands/orchestrator.md`
3. **Create dashboard** - `Pipeline-Office/lib/dashboard.cjs`
4. **Update CLAUDE.md** - Document new v7 system
5. **Test with a project** - Run full pipeline with new system

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Orchestrator as Claude session | Can think, adapt, make intelligent decisions |
| Periodic check-in (2-3 min) | Balance between responsiveness and token cost |
| TodoWrite for progress | Already used by workers, easy to read |
| Dashboard as Node.js | Cross-platform, no dependencies, simple |
| Clean slate approach | v6.x too complex, easier to rebuild than refactor |
| Epics at manifest top-level | Simpler than nested loops structure |
| Post-phase analysis | Enables per-todo breakdown without continuous monitoring |

---

**Version:** 7.0
**Date:** 2025-12-09
**Status:** Design complete, ready for implementation planning
