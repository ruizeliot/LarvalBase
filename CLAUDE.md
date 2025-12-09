# Pipeline-Office

**Version:** 7.0
**Architecture:** Orchestrator + Dashboard + Workers

---

## Overview

Pipeline v7.0 is a clean three-component system:

| Component | Technology | Role |
|-----------|------------|------|
| **Orchestrator** | Claude slash command | Brain - spawns workers, monitors progress |
| **Dashboard** | Node.js | Display - shows phases, epics, todos, cost |
| **Workers** | Claude in terminals | Execution - runs phase commands |

## Quick Start

```bash
# 1. Navigate to your project
cd /path/to/your-project

# 2. Start Claude
claude

# 3. Run the orchestrator
/orchestrator
```

The orchestrator will ask for stack type and pipeline mode, then manage everything.

## File Structure

```
Pipeline-Office/
├── lib/
│   └── dashboard.cjs      # Dashboard source (copied to projects)
├── docs/
│   └── plans/             # Design and implementation docs
├── archive/               # Legacy v6.x code (reference only)
└── CLAUDE.md              # This file
```

## Per-Project Files

When orchestrator initializes a project:

```
<project>/
├── .pipeline/
│   ├── manifest.json      # Pipeline state
│   └── dashboard.cjs      # Dashboard script
└── docs/
    ├── user-stories.md    # From Phase 1
    └── e2e-test-specs.md  # From Phase 2
```

## Commands

| Command | Location | Purpose |
|---------|----------|---------|
| `/orchestrator` | `~/.claude/commands/` | Start pipeline orchestration |
| `/1-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 1: Brainstorm |
| `/2-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 2: Technical |
| `/3-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 3: Bootstrap |
| `/4-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 4: Implement |
| `/5-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 5: Finalize |

## How It Works

1. **You start Claude** in your project directory
2. **You run `/orchestrator`** - it asks stack/mode questions
3. **Orchestrator spawns dashboard** - shows in terminal
4. **Orchestrator spawns worker** - opens new terminal window
5. **Worker runs autonomously** - uses TodoWrite for progress
6. **Orchestrator checks every 2-3 min** - reads todo files
7. **When phase complete** - kills worker, spawns next
8. **Repeat until done** - all phases complete

## Manifest Schema

```json
{
  "version": "7.0",
  "project": { "name": "...", "path": "..." },
  "stack": "desktop",
  "mode": "new",
  "status": "running",
  "currentPhase": "3",
  "epics": [
    { "id": 1, "name": "...", "status": "pending" }
  ],
  "phases": {
    "1": { "status": "complete", "duration": 222000, "cost": 0.12 },
    "2": { "status": "complete" },
    "3": { "status": "running", "workerSessionId": "..." },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  },
  "totalCost": 0.41
}
```

## Legacy Code

All v6.x code is archived in `archive/`. Reference only - not used by v7.0.

---

**Last Updated:** 2025-12-09
