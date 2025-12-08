# Pipeline v8 - Brainstorm Notes

**Date:** 2025-12-08
**Type:** Terminal/TUI Application (Two-Window Architecture)
**Framework:** Ink v5 (React for CLI)
**Pipeline Type:** Desktop only (Tauri apps with v6 commands)

---

## Problem Statement

Pipeline v7 had critical bugs that made orchestration unreliable:

1. **Worker Identification Bug**: Used `taskkill /IM claude*` wildcard, killing ALL Claude processes
2. **Todo Tracking Bug**: Grabbed todo files from wrong workers (no session scoping)
3. **Cost/Duration Bug**: Tracking broke on resume, didn't recalculate from ccusage
4. **Architecture Issue**: Complex horizontal layering made testing difficult

---

## Solution: Pipeline v8

A complete rebuild with:
- **Vertical epic slices** (each epic delivers testable functionality)
- **Session-scoped worker tracking** (UUID-based, no wildcards)
- **Mock Claude binary** for cost-efficient testing
- **Desktop pipeline only** (using stable v6 commands)

---

## Target Users

- Developers using the pipeline system for Tauri desktop apps
- Single user at a time (not multi-user)
- Windows primary (using Windows Terminal)

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
- Pipeline status display
- Epic and todo tracking
- Cost/duration display
- Keyboard controls (pause, advance, focus worker)
- Spawns worker via `wt.exe` (Windows Terminal)

**Worker Window (Separate):**
- Standard Claude CLI session
- Runs v6 pipeline phase commands
- Writes to manifest and todo files
- Dashboard monitors these files

### 3. Pipeline Modes
- **New Project**: Full pipeline (phases 1-5)
- **Add Feature**: Partial pipeline for new features
- **Fix Bug**: Minimal pipeline for bug fixes

### 4. Phases (v6 Commands)
1. Brainstorm - `/1-new-pipeline-desktop-v6.0` (Interactive)
2. E2E Specs - `/2-new-pipeline-desktop-v6.0` (Autonomous)
3. Bootstrap - `/3-new-pipeline-desktop-v6.0` (Autonomous)
4. Implement - `/4-new-pipeline-desktop-v6.0` (Loops per epic)
5. Finalize - `/5-new-pipeline-desktop-v6.0` (Autonomous)

### 5. Resume Capability
- Pause anytime with `p`
- Resume from exact point
- Recalculate costs from ccusage sessions

---

## Architecture

### Navigation Flow
```
┌───────────┐      ┌────────────────┐      ┌───────────────┐
│  LAUNCH   │─────>│ Existing proj? │─────>│   DASHBOARD   │
│           │      │                │  no  │               │
└───────────┘      └───────┬────────┘      └───────┬───────┘
                           │ yes                    │
                           v                        v
                   ┌───────────────┐        ┌─────────────┐
                   │    RESUME     │        │  COMPLETE   │
                   │   (confirm)   │        │  (summary)  │
                   └───────────────┘        └─────────────┘
```

### Two-Window Communication
```
┌──────────────┐                           ┌──────────────┐
│  DASHBOARD   │                           │    WORKER    │
│  (Ink TUI)   │                           │ (Claude CLI) │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │  1. spawn via wt.exe -w 0 nt            │
       │─────────────────────────────────────────>│
       │                                          │
       │  2. worker writes todos                  │
       │<─────────────────────────────────────────│
       │     ~/.claude/todos/{session}.json       │
       │                                          │
       │  3. worker updates manifest              │
       │<─────────────────────────────────────────│
       │     .pipeline/manifest.json              │
       │                                          │
       │  4. dashboard detects 100% todos         │
       │  5. dashboard kills worker (by PID)      │
       │─────────────────────────────────────────>│
       │                                          │
       │  6. dashboard spawns next phase          │
       │─────────────────────────────────────────>│ (new worker)
```

---

## UI Mockups

### Launcher Screen
```
┌──────────────────────────────────────────────────────────────────────┐
│                          PIPELINE v8                                  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Project Path: C:\Users\ahunt\Documents\my-project          [...] │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Mode:                                                                │
│    (*) New Project                                                    │
│    ( ) Add Feature                                                    │
│    ( ) Fix Bug                                                        │
│                                                                       │
│  ┌─────────────┐                                                      │
│  │  > START    │                                                      │
│  └─────────────┘                                                      │
│                                                                       │
│  Recent:                                                              │
│    my-app (Phase 4, 2h ago)                                          │
│    counter-desktop (Complete, 1d ago)                                │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│  [Tab] Navigate   [Enter] Select   [q] Quit   [?] Help               │
└──────────────────────────────────────────────────────────────────────┘
```

### Dashboard Screen
```
┌──────────────────────────────────────────────────────────────────────┐
│ PIPELINE v8                                        Worker: ● Running  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Project: my-app                           Cost: $2.45                 │
│ Mode: New Project                         Time: 34m 12s               │
│ Phase: 4 - Implement (Epic 2/4)                                       │
│                                                                       │
│ Overall: [████████████░░░░░░░░] 60%                                   │
│                                                                       │
│ ┌─ Epics ──────────────────┐  ┌─ Current Todos ─────────────────────┐│
│ │ [✓] 1. App Shell         │  │ [✓] Read epic requirements          ││
│ │ [▶] 2. Navigation        │  │ [✓] Plan implementation             ││
│ │ [ ] 3. Settings          │  │ [▶] Create components               ││
│ │ [ ] 4. Data Persistence  │  │ [ ] Write tests                     ││
│ │                          │  │ [ ] Run E2E suite                   ││
│ │                          │  │ [ ] Fix failures                    ││
│ │                          │  │ [ ] Commit changes                  ││
│ └──────────────────────────┘  └─────────────────────────────────────┘│
│                                                                       │
│ Session: a1b2c3d4  PID: 12345                                        │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ [p] Pause  [a] Advance  [w] Focus Worker  [q] Quit  [?] Help         │
└──────────────────────────────────────────────────────────────────────┘
```

### Resume Screen
```
┌──────────────────────────────────────────────────────────────────────┐
│                        RESUME PIPELINE                                │
│                                                                       │
│  Project: my-app                                                      │
│  Path: C:\Users\ahunt\Documents\my-app                               │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Last State                                                      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ Phase: 4 - Implement                                            │  │
│  │ Epic: 2/4 - Navigation Component                                │  │
│  │ Progress: 45%                                                   │  │
│  │ Last Activity: 2 hours ago                                      │  │
│  │                                                                 │  │
│  │ Cost: $3.45                                                     │  │
│  │ Duration: 1h 23m                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐                                │
│  │  > RESUME    │    │   CANCEL     │                                │
│  └──────────────┘    └──────────────┘                                │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│  [Enter] Resume   [Esc] Cancel   [d] Delete & Start Fresh            │
└──────────────────────────────────────────────────────────────────────┘
```

### Complete Screen
```
┌──────────────────────────────────────────────────────────────────────┐
│                      ✓ PIPELINE COMPLETE                              │
│                                                                       │
│  Project: my-app                                                      │
│  Mode: New Project                                                    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Summary                                                         │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ Phases: 5/5 complete                                            │  │
│  │ Epics: 4/4 complete                                             │  │
│  │ E2E Tests: 23/23 passing                                        │  │
│  │                                                                 │  │
│  │ Total Cost: $8.72                                               │  │
│  │ Total Time: 2h 15m                                              │  │
│  │                                                                 │  │
│  │ Files Created: 34                                               │  │
│  │ Git Commits: 6                                                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────┐    ┌─────────────────┐                          │
│  │  > NEW PROJECT  │    │      EXIT       │                          │
│  └─────────────────┘    └─────────────────┘                          │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│  [n] New Project   [q] Exit                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Cost-Efficient Testing Pyramid
```
┌─────────────────────────────────────────────────────────────┐
│  TESTING PYRAMID                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Manual]     1 Full E2E (real Claude, real project)        │
│               Run before major releases only                │
│                                                             │
│  [CI/Auto]    Integration tests with MOCK Claude binary     │
│               Tests orchestrator, file watching, spawning   │
│               $0 token cost                                 │
│                                                             │
│  [CI/Auto]    Unit tests (stores, services, parsing)        │
│               $0, fast, run on every change                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mock Claude Binary

A Node.js script that simulates Claude CLI:
- Reads fixture file specifying expected behavior
- Writes todo files at specified intervals
- Updates manifest as configured
- Exits with specified code
- **Zero token consumption**

### Test Isolation

Tests run in isolated `/tmp/pipeline-test-{uuid}/` directories:
- No `CLAUDE.md` files in path (prevents context loading)
- Fresh manifest for each test
- No cross-test contamination

### Stub Commands

For rare real Claude tests, use minimal stub commands:
```markdown
# /test-stub-phase.md
Create `.pipeline/phase-{N}-complete.txt` with "done".
Mark all todos as completed.
```
- ~100 tokens per invocation
- Tests orchestrator behavior, not Claude's code generation

---

## Keyboard Shortcuts

### Global
| Key | Action |
|-----|--------|
| `q` | Quit (with confirmation if running) |
| `?` | Toggle help overlay |
| `Ctrl+C` | Emergency stop |

### Launcher Screen
| Key | Action |
|-----|--------|
| `Tab` | Next field |
| `Shift+Tab` | Previous field |
| `Up/Down` | Navigate options |
| `Enter` | Select/Start |

### Dashboard Screen
| Key | Action |
|-----|--------|
| `p` | Pause pipeline |
| `r` | Resume (when paused) |
| `a` | Advance to next phase (manual) |
| `w` | Focus worker window |

### Dialogs
| Key | Action |
|-----|--------|
| `Enter` | Confirm |
| `Esc` | Cancel |
| `Tab` | Switch buttons |

---

## Scope

### In Scope (v1)
- Desktop pipeline only (Tauri apps with v6 commands)
- Two-window architecture (Dashboard + Worker)
- Modes: New Project, Add Feature, Fix Bug
- Phases 1-5 with epic loops in Phase 4
- File-based communication (manifest, todos)
- Session-scoped worker tracking (UUID-based)
- Cost/duration tracking via ccusage
- Resume from any point
- Mock Claude binary for testing

### Out of Scope (future)
- Terminal pipeline (Ink apps)
- Embedded worker output in dashboard
- Multi-project management
- Remote workers
- Real-time collaboration
- Plugin system

---

## Epic Summary

| Epic | Name | Description | Dependencies |
|------|------|-------------|--------------|
| 1 | Project Bootstrap | CLI launches, manifest CRUD, basic TUI | None |
| 2 | Worker Spawning | wt.exe spawn, PID tracking, kill by session | Epic 1 |
| 3 | File Watching & Todos | Watch files, detect completion, progress | Epic 1 |
| 4 | Pipeline Orchestration | Phase progression, epic loops, auto-advance | Epic 2, 3 |
| 5 | Full Dashboard UI | All screens, keyboard nav, cost/duration | Epic 4 |

---

## Data Structures

### Manifest Schema
```json
{
  "version": "8.0.0",
  "project": {
    "name": "my-app",
    "path": "C:\\Users\\ahunt\\Documents\\my-app",
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
  "worker": {
    "sessionId": "uuid-1234",
    "pid": 12345,
    "phase": 4,
    "epic": 2,
    "startedAt": "...",
    "status": "running"
  },
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

## Success Criteria

1. **CLI launches**: `pipeline` shows launcher screen
2. **Worker spawning works**: Spawns Claude in separate WT tab
3. **Session tracking correct**: UUID-based, no wildcard kills
4. **Todo tracking correct**: Session-scoped, no cross-contamination
5. **Resume works**: Picks up from exact state, recalculates costs
6. **All tests pass**: Using mock Claude (fast, free, reproducible)
7. **Desktop pipeline works**: Full flow with v6 commands

---

## Notes

- Windows is primary platform
- Windows Terminal (`wt.exe`) required for worker spawning
- ccusage binary needed for cost tracking
- Git required for commits
- Node.js 18+ required
