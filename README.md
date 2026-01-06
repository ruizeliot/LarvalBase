# Pipeline-Office

**Version:** 9.0.0
**Platform:** Windows (conhost.exe required)
**Purpose:** Autonomous Tauri desktop app development with Claude AI

---

## Overview

Pipeline-Office is a **three-component orchestration system** that automates the development of Tauri desktop applications using Claude AI. It manages the entire development lifecycle from brainstorming to deployment through a structured 5-phase workflow.

### Core Philosophy: Functionality-First

Born from the "test fred" failure where all tests passed but the app didn't work (due to mocked APIs), Pipeline v9.0 enforces **real implementation over test satisfaction**:

> **Working App = Success, Passing Tests = Verification**
> *(Not the other way around)*

**Absolute No-Mocking Policy:**
- Never mock system APIs (`@tauri-apps` plugins, OS, filesystem, dialog, network)
- Never use hardcoded mock data in production code
- Never create test-only code paths
- If a test cannot pass without mocks, the feature is not implemented

---

## Architecture

```
+------------------+     heartbeat     +------------------+
|   Orchestrator   | <---------------> |    Dashboard     |
|  (Claude slash   |                   |  (Node.js TUI)   |
|    command)      |                   |                  |
+--------+---------+                   +------------------+
         |                                     ^
         | spawns/monitors                     | reads
         v                                     |
+------------------+                   +------------------+
|     Worker       |                   |    manifest.json |
| (Claude in       | ----------------> |                  |
|  conhost.exe)    |    updates        +------------------+
+------------------+
```

| Component | Technology | Role |
|-----------|------------|------|
| **Orchestrator** | Claude slash command | Brain - spawns workers, monitors progress, runs quality gates |
| **Dashboard** | Node.js (dashboard-v3.cjs) | Display - real-time status, cost tracking, heartbeat sender |
| **Workers** | Claude in conhost terminals | Execution - runs phase commands autonomously |

### Why conhost.exe?

The heartbeat system uses `WriteConsoleInput` Win32 API to send messages to the orchestrator. This only works with traditional console windows (conhost.exe), not Windows Terminal (which uses ConPTY).

---

## Features

### Version 9.0
- **3-Layer Quality Audit** (Automated + Smoke Test + Nielsen Heuristics)
- **Gate 1 & Gate 2 enforcement** with auto-retry
- **CLAUDE.md injection** - Phase-specific rules in system prompt
- **Token breakdown** - Regular vs cached tokens with dual pricing
- **Epic verification agent** - Anti-cheat checks between epics
- **Step mode** - Review app after each phase/epic with feedback loops
- **OBS recording integration** - Video documentation of pipeline runs

### Version 9.1
- **Epic Verification Agent** - Detects hardcoded returns, skipped tests, mocks in production
- **Auto-respawn on verification failure** (max 2 retries)

---

## Prerequisites

1. **Windows 10/11** with PowerShell 5.1+
2. **Node.js 18+**
3. **Claude CLI** installed and authenticated
4. **Tauri prerequisites** (Rust, Visual Studio Build Tools)

---

## Quick Start

### 1. Start Claude in conhost (NOT Windows Terminal)

```
Win+R → conhost.exe powershell.exe -NoExit → Enter
```

### 2. Navigate to your project directory

```powershell
cd "C:\path\to\your-project"
```

### 3. Start Claude and run the orchestrator

```bash
claude
/orchestrator-desktop-v9.0
```

The orchestrator will:
1. Ask for pipeline mode (New project / Add feature)
2. Ask for output style (Technical / Simple)
3. Ask for review mode (Auto / Step)
4. Spawn the dashboard
5. Spawn Phase 1 worker

---

## Workflow Phases

### New Project Mode (5 phases)

| Phase | Name | Purpose | Mode |
|-------|------|---------|------|
| 1 | Brainstorm | Create user stories with ASCII mockups | Interactive |
| 2 | Technical | Write functionality specifications | Autonomous |
| 3 | Bootstrap | Create skeleton + failing E2E tests (integrations-first) | Autonomous |
| 4 | Implement | Implement until tests pass (per epic) | Autonomous |
| 5 | Finalize | 3-layer quality audit + polish | Autonomous |

### Feature Mode (3 phases)

| Phase | Name | Purpose | Mode |
|-------|------|---------|------|
| 1 | Scope | Define new feature stories | Interactive |
| 2 | Technical | Write functionality specs for feature | Autonomous |
| 3 | Implement | Implement until tests pass | Autonomous |

---

## Quality Gates

### Gate 1 (After Phase 3)

Verifies E2E test infrastructure:
- No synthetic events (`dispatchEvent`, `DragEvent`, etc.)
- No direct API calls in tests
- Interaction helpers exist (`e2e/helpers/interactions.js`)
- Smoke test skeleton exists (`e2e/specs/smoke.e2e.js`)

### Gate 2 (After Phase 4 & 5)

Verifies implementation quality:
- No empty handlers (`onClick={() => {}}`)
- No console.log placeholders
- No test-only code paths
- Design token compliance (no arbitrary Tailwind values)
- All buttons have handlers
- Smoke tests pass
- Quality audit report exists (Phase 5)

---

## File Structure

```
Pipeline-Office/
├── lib/
│   ├── dashboard-v3.cjs       # Interactive dashboard
│   ├── spawn-worker.ps1       # Spawn worker with CLAUDE.md injection
│   ├── spawn-dashboard.ps1    # Spawn dashboard with heartbeat
│   ├── spawn-orchestrator.ps1 # Launch orchestrator
│   ├── analyze-session.ps1    # Cost/token analysis
│   ├── kill-worker.ps1        # Clean worker termination
│   ├── inject-worker-message.ps1  # Send messages to workers
│   ├── read-console-buffer.ps1    # Read worker console output
│   └── generate-report.ps1    # Final pipeline report
├── claude-md/
│   ├── _shared-rules.md       # Rules for all agents
│   ├── _worker-base.md        # Base rules for workers
│   ├── orchestrator.md        # Orchestrator-specific rules
│   ├── phase-1.md             # Phase 1 worker rules
│   ├── phase-2.md             # Phase 2 worker rules
│   ├── phase-3.md             # Phase 3 worker rules
│   ├── phase-4.md             # Phase 4 worker rules
│   └── phase-5.md             # Phase 5 worker rules
├── lib/templates/
│   ├── wdio.conf.template.ts       # WebDriverIO config
│   ├── wdio.conf.dev.template.ts   # Dev config (fast iteration)
│   ├── wdio.conf.smoke.template.ts # Smoke test config
│   └── e2e-helpers.template.ts     # Interaction helpers
├── docs/plans/                # Design documents
├── archive/                   # Legacy v6.x code
├── CLAUDE.md                  # Project documentation
└── README.md                  # This file
```

### Per-Project Files

When the orchestrator initializes a project:

```
<project>/
├── .pipeline/
│   ├── manifest.json          # Pipeline state
│   ├── dashboard.cjs          # Dashboard script (copied)
│   └── dashboard-state.json   # Dashboard UI state
├── .claude/
│   ├── CLAUDE.md              # Phase-specific rules (auto-generated)
│   └── settings.local.json    # Output style setting
├── docs/
│   ├── user-stories.md        # From Phase 1
│   ├── functionality-specs.md # From Phase 2
│   └── quality-audit.md       # From Phase 5
└── e2e/
    ├── specs/
    │   └── smoke.e2e.js       # Layer 2 smoke tests
    └── helpers/
        └── interactions.js    # WebDriverIO action helpers
```

---

## Commands Reference

### Orchestrator
| Command | Purpose |
|---------|---------|
| `/orchestrator-desktop-v9.0` | Start pipeline orchestration |

### Phase Commands (New Project)
| Phase | Command |
|-------|---------|
| 1 | `/1-new-pipeline-desktop-v9.0` |
| 2 | `/2-new-pipeline-desktop-v9.0` |
| 3 | `/3-new-pipeline-desktop-v9.0` |
| 4 | `/4-new-pipeline-desktop-v9.0` |
| 5 | `/5-new-pipeline-desktop-v9.0` |

### Phase Commands (Feature)
| Phase | Command |
|-------|---------|
| 1 | `/1-feature-pipeline-desktop-v9.0` |
| 2 | `/2-feature-pipeline-desktop-v9.0` |
| 3 | `/3-feature-pipeline-desktop-v9.0` |

---

## Dashboard Controls

| Key | Action |
|-----|--------|
| `1-5` | Toggle phase expansion |
| `Arrow keys` | Navigate items |
| `Tab` | Expand/collapse selected item |
| `P` | Pause/resume heartbeat |
| `+`/`-` | Adjust heartbeat interval |
| `A` | Toggle auto-analysis |
| `r` | Run manual analysis |
| `Space` | Toggle pricing mode (API/SUB) |
| `Q` | Quit dashboard |

---

## Manifest Schema (v9.0)

```json
{
  "version": "9.0",
  "project": { "name": "...", "path": "..." },
  "stack": "desktop",
  "mode": "new",
  "outputStyle": "pipeline-technical",
  "stepMode": false,
  "onboardingLevel": "minimal",
  "status": "running",
  "orchestratorPid": 1234,
  "workerPid": 5678,
  "currentPhase": "3",
  "currentEpic": 1,
  "tokensPerPercent": 1000000,
  "phases": {
    "1": {
      "status": "complete",
      "tokens": 2915260,
      "cost": 2.76,
      "regularTokens": 1500000,
      "regularCost": 1.50,
      "cachedTokens": 1415260,
      "cachedCost": 1.26,
      "todoBreakdown": [...]
    }
  },
  "gates": {
    "gate1": { "status": "pass", "checkedAt": "..." },
    "gate2": { "status": "pending", "checkedAt": null }
  },
  "epics": [
    { "id": 1, "name": "Core UI", "status": "complete", "verification": {...} }
  ],
  "totalCost": 2.76,
  "heartbeat": { "enabled": true, "intervalMs": 300000 }
}
```

---

## CLAUDE.md System

Pipeline v9.0 uses a CLAUDE.md injection system to persist phase-specific rules in the worker's system prompt.

### How it works

1. `spawn-worker.ps1` copies the appropriate phase file from `Pipeline-Office/claude-md/phase-N.md`
2. The file is written to `<project>/.claude/CLAUDE.md`
3. Claude loads this file automatically into its system prompt
4. Rules persist throughout the entire worker session

### Template Structure

```
claude-md/
├── _shared-rules.md       # Rules for ALL agents (3 core policies)
├── _worker-base.md        # Base rules for ALL workers
├── orchestrator.md        # Full orchestrator instructions
├── phase-1.md             # = _shared-rules + _worker-base + phase-1-specific
├── phase-2.md             # = _shared-rules + _worker-base + phase-2-specific
└── ...
```

### Three Shared Rules

1. **WebSearch First** - Search before implementing technical solutions
2. **Self-Reflection After Every Task** - 9-item checklist, STOP-fix-retry on any NO
3. **Research Before Claiming Limitations** - Search-verify-document before declaring anything doesn't work

---

## 3-Layer Quality Audit (Phase 5)

| Layer | Method | Focus |
|-------|--------|-------|
| **Layer 1** | Automated | Gate 2 checks, linting, type checking |
| **Layer 2** | Smoke Test | Click every button, fill every form, test every interaction |
| **Layer 3** | Nielsen Heuristics | Visibility, feedback, consistency, error prevention |

---

## Heartbeat System

The dashboard sends periodic messages to the orchestrator:

| Message | When | Orchestrator Action |
|---------|------|---------------------|
| `HEARTBEAT: ...` | Every 5 min (default) | Check worker, update manifest |
| `PHASE COMPLETE: ...` | Phase status → complete | Kill worker, advance phase |
| `EPIC COMPLETE: ...` | Epic status → complete | Kill worker, advance epic |

The orchestrator is **message-driven** - it waits for dashboard messages rather than polling.

---

## Token & Cost Tracking

Dashboard displays tokens with color-coded breakdown:
- **Yellow** = Regular tokens (input + output) and cost
- **Cyan** = Cached tokens (cache write + read) and cost
- **Green** = Total tokens and total cost

Two pricing modes:
- **API** - Based on Anthropic API pricing per million tokens
- **SUB** - Based on subscription usage percentage (requires calibration)

---

## Troubleshooting

### "File has been unexpectedly modified" errors
- Disable Google Drive for the project folder (it modifies timestamps during sync)
- Use absolute paths for all file operations

### Dashboard doesn't receive heartbeats
- Ensure you're running in conhost.exe, not Windows Terminal
- Check that `orchestratorPid` in manifest matches actual PID

### Worker not progressing
- Check worker console for errors
- Orchestrator can inject messages to recover stuck workers
- After 3 failed recovery attempts, escalates to user

### Gate failures
- Gate checks have max 3 retries before escalating
- Review gate failure output for specific issues
- Worker is automatically respawned to fix issues

---

## Related Files

- **Orchestrator command:** `~/.claude/commands/orchestrator-desktop-v9.0.md`
- **Phase commands:** `~/.claude/commands/N-new-pipeline-desktop-v9.0.md`
- **Design documents:** `docs/plans/2025-12-18-functionality-first-pipeline-v10.md`

---

## License

MIT

---

**Last Updated:** 2026-01-06
