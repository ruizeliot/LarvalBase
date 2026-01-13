# File Locations

**Created:** 2026-01-08
**Status:** Complete Reference

---

## Overview

This document defines where all pipeline configuration files live and how they are loaded. The pipeline uses a single source of truth for CLAUDE.md content.

---

## Single Source of Truth

All CLAUDE.md content lives in `Pipeline-Office/claude-md/`:

```
Pipeline-Office/
└── claude-md/
    ├── orchestrator.md      # Orchestrator instructions
    ├── _worker-base.md      # Shared worker rules (all phases)
    ├── supervisor.md        # Supervisor instructions
    ├── phase-1.md           # Phase 1: Brainstorm
    ├── phase-2.md           # Phase 2: Technical specs
    ├── phase-3.md           # Phase 3: Bootstrap
    ├── phase-4.md           # Phase 4: Implement
    └── phase-5.md           # Phase 5: Finalize
```

---

## Loading Rules

| Component | Source File(s) | Destination |
|-----------|----------------|-------------|
| Orchestrator | `claude-md/orchestrator.md` | `project/.claude/CLAUDE.md` |
| Worker | `claude-md/phase-N.md` + `claude-md/_worker-base.md` | `project/.claude/CLAUDE.md` |
| Supervisor | `claude-md/supervisor.md` | `project/.claude/CLAUDE.md` |

**Note:** Worker CLAUDE.md is created by concatenating phase-specific content with shared base rules.

---

## Spawn Script Behavior

### spawn-worker.ps1

```powershell
$claudeMdSource = "$pipelineOffice\claude-md\phase-$PhaseNumber.md"
$workerBaseSource = "$pipelineOffice\claude-md\_worker-base.md"

# Copy phase-specific content first
Copy-Item $claudeMdSource $claudeMdDest

# Append shared worker rules
Add-Content $claudeMdDest (Get-Content $workerBaseSource)
```

### spawn-supervisor.ps1

```powershell
$supervisorMdSource = "$pipelineOffice\claude-md\supervisor.md"
Copy-Item $supervisorMdSource $claudeMdDest
```

---

## Per-Project Files

Each project using the pipeline has:

```
<project>/
├── .pipeline/
│   ├── manifest.json           # Pipeline state
│   ├── dashboard.cjs           # Dashboard script (copied)
│   ├── dashboard-state.json    # Dashboard UI state
│   ├── orchestrator-pid.txt    # Orchestrator process ID
│   ├── session-info.txt        # Current worker session ID
│   └── snapshots/              # Step mode iteration snapshots
│       └── iteration-N/        # Docs snapshot per iteration
├── .claude/
│   └── CLAUDE.md               # Current component instructions
└── docs/
    ├── brainstorm-notes.md     # Phase 1 output (new in v11)
    ├── user-stories.md         # Phase 1 output
    ├── test-specs.md           # Phase 2 output
    └── README.md               # Phase 5 output
```

---

## Pipeline-Office Library Files

```
Pipeline-Office/
├── lib/
│   ├── dashboard-v3.cjs           # Dashboard application
│   ├── find-shell-pid.ps1         # Get process ID
│   ├── spawn-dashboard-wt.ps1     # Spawn dashboard window
│   ├── spawn-worker-wt.ps1        # Spawn worker pane
│   ├── spawn-supervisor-wt.ps1    # Spawn supervisor pane
│   ├── read-console-buffer.ps1    # Read worker output
│   ├── inject-message.ps1         # Inject message to Claude
│   ├── analyze-feedback-impact.js # Cascade analyzer
│   ├── generate-test-report.js    # Checkpoint test report
│   └── calibration-test.js        # Token calibration
└── claude-md/
    └── (CLAUDE.md source files)
```

---

## Files NOT Used (Legacy)

These locations should NOT contain CLAUDE.md content:

| Location | Reason |
|----------|--------|
| `Pipeline-Office/.claude/CLAUDE.md` | Should not exist or be empty |
| `~/.claude/commands/worker-base*.md` | Legacy - not used |
| `lib/supervisor-claude.md` | Legacy - not used |

All content comes from `claude-md/` folder only.

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PIPELINE_OFFICE` | Path to Pipeline-Office repo | `C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office` |
| `PROJECT_PATH` | Current project being built | `C:\Users\ahunt\Documents\IMT Claude\my-app` |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-08 | Initial document |
| 2026-01-13 | Made standalone (added full directory structures) |
