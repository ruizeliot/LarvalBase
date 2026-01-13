# Orchestrator Todos

**Created:** 2026-01-08
**Status:** Complete Reference

---

## Overview

The orchestrator is the central controller of the pipeline. It spawns workers, monitors progress, and manages phase transitions. This document details each task the orchestrator executes.

---

## Initialization Tasks

### Todo 1: Get Orchestrator PID

**Purpose:** Capture the orchestrator's process ID for later message injection.

**Steps:**
- Run `find-shell-pid.ps1` to get current shell's process ID
- Save to `.pipeline/orchestrator-pid.txt`
- Used later for message injection back to orchestrator

**Output:** `.pipeline/orchestrator-pid.txt` containing PID number

---

### Todo 2: Ask User About Calibration

**Purpose:** Optionally calibrate token/cost tracking for accurate estimates.

**Steps:**
- AskUserQuestion: "Run calibration? (measures tokens-per-percent for cost tracking)"
- If yes: run `calibration-test.js`, save result to `calibration.json`
- If no: skip (use previous calibration if exists)

**Output:** `calibration.json` (optional)

---

### Todo 3: Create .pipeline/ and Manifest

**Purpose:** Initialize pipeline state directory and manifest file.

**Steps:**
- Create `.pipeline/` folder in project
- Copy `dashboard-v3.cjs` to `.pipeline/dashboard.cjs`
- Create `manifest.json` with initial state

**Manifest Initial Schema:**
```json
{
  "version": "10.0.1",
  "status": "initializing",
  "currentPhase": "1",
  "orchestratorPid": "<from todo 1>",
  "dashboardPid": null,
  "workerPid": null,
  "supervisorPid": null,
  "phases": {
    "1": { "status": "pending" },
    "2": { "status": "pending" },
    "3": { "status": "pending" },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  },
  "paneSizes": {
    "workerSplit": 0.5,
    "supervisorSplit": 0.5
  }
}
```

---

### Todo 4: Spawn Dashboard

**Purpose:** Launch the visual monitoring dashboard.

**Steps:**
- Run `spawn-dashboard-wt.ps1`
- Creates NEW Windows Terminal window named "Pipeline-{OrchestratorPID}"
- Dashboard takes 100% of window initially
- Dashboard runs `node dashboard-v3.cjs` monitoring manifest
- Dashboard PID saved to manifest

**Window Layout After Todo 4:**
```
+---------------------------+
|                           |
|         Dashboard         |
|         (100%)            |
|                           |
+---------------------------+
```

---

### Todo 5: Wait for HEARTBEAT

**Purpose:** Synchronize orchestrator with dashboard startup.

**Steps:**
- Dashboard sends HEARTBEAT message to orchestrator via injection
- Orchestrator STOPS and waits until message received
- HEARTBEAT confirms Dashboard is ready

**Blocking:** Yes - orchestrator pauses until HEARTBEAT received

---

### Todo 6: Spawn Worker

**Purpose:** Launch the Claude agent that executes the current phase.

**Steps:**
- Run `spawn-worker-wt.ps1`
- Adds Worker pane to EXISTING WT window (right side, 50% width)
- Worker CLAUDE.md prepared:
  - Source: `claude-md/phase-N.md` + `claude-md/_worker-base.md`
  - Destination: `project/.claude/CLAUDE.md`
- Worker Claude starts with `--dangerously-skip-permissions`
- Phase command injected after Claude ready
- Worker PID saved to manifest

**Window Layout After Todo 6:**
```
+---------------------------+
|           |               |
| Dashboard |    Worker     |
|   (50%)   |    (50%)      |
|           |               |
+---------------------------+
```

---

### Todo 7: Spawn Supervisor

**Purpose:** Launch the Haiku-powered quality reviewer.

**Steps:**
- Run `spawn-supervisor-wt.ps1`
- Adds Supervisor pane to EXISTING WT window (below Worker, 50% of Worker area)
- Supervisor CLAUDE.md prepared:
  - Source: `claude-md/supervisor.md`
  - Destination: `project/.claude/CLAUDE.md`
- Supervisor Claude starts with `--model haiku --dangerously-skip-permissions`
- Startup message injected with reviewer instructions
- Supervisor PID saved to manifest

**Window Layout After Todo 7:**
```
+---------------------------+
|           |    Worker     |
| Dashboard +---------------+
|   (50%)   |  Supervisor   |
+---------------------------+
```

---

## Monitoring Loop Tasks

### Todo 8: HEARTBEAT - Check Worker and Update Manifest

**Purpose:** Periodically monitor worker progress.

**Trigger:** Every 5 minutes by Dashboard HEARTBEAT message

**Steps:**
- Check if Worker process is alive (Get-Process by PID)
- Read Worker console buffer (last 50 lines) via `read-console-buffer.ps1`
- Extract todo progress (X/Y completed)
- Update `manifest.phases[phase].workerProgress`

**Manifest Update:**
```json
{
  "phases": {
    "N": {
      "workerProgress": "7/12"
    }
  }
}
```

---

### Todo 9: Worker Exit - Check Deliverables

**Purpose:** Validate phase completion and clean up processes.

**Trigger:** When Worker process exits (detected in todo 8)

**Steps:**
- Check phase deliverables exist:
  - Phase 1: `docs/user-stories.md`
  - Phase 2: `docs/test-specs.md`
  - Phase 3: `package.json` + `e2e/` folder
  - Phase 4: (pass - implementation varies)
  - Phase 5: `README.md`
- Kill Worker and Supervisor processes (`taskkill`)
- Set PIDs to null in manifest

**Deliverables by Phase:**

| Phase | Required Deliverables |
|-------|----------------------|
| 1 | `docs/user-stories.md` |
| 2 | `docs/test-specs.md` |
| 3 | `package.json`, `e2e/` folder |
| 4 | (varies by epic) |
| 5 | `README.md` |

---

### Todo 10: Advance to Next Phase or Complete

**Purpose:** Progress pipeline state machine.

**Decision Logic:**
- If Phase 4 and more epics remain: increment currentEpic, go to todo 6
- If final phase (5 for new, 3 for feature): mark pipeline "complete", generate report
- Otherwise: increment currentPhase, update manifest, go to todo 6 (spawn new Worker)

**State Transitions:**
```
Phase 1 complete -> Phase 2
Phase 2 complete -> Phase 3
Phase 3 complete -> Phase 4 (epic 1)
Phase 4 epic N complete -> Phase 4 (epic N+1) OR Phase 5
Phase 5 complete -> Pipeline Complete
```

---

## Manifest Status Reference

| Status | Description | Next Action |
|--------|-------------|-------------|
| `initializing` | Pipeline starting up | Continue to todo 4 |
| `running` | Worker executing phase | Wait for heartbeat |
| `checkpoint` | Step mode pause for review | Wait for user command |
| `complete` | All phases finished | Generate report |
| `failed` | Unrecoverable error | Alert user |

---

## PowerShell Scripts Used

| Script | Purpose |
|--------|---------|
| `find-shell-pid.ps1` | Get current process ID |
| `spawn-dashboard-wt.ps1` | Launch dashboard in WT |
| `spawn-worker-wt.ps1` | Launch worker pane |
| `spawn-supervisor-wt.ps1` | Launch supervisor pane |
| `read-console-buffer.ps1` | Read worker output |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-08 | Initial document |
| 2026-01-13 | Made standalone (added context and schema details) |
