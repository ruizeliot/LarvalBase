# Dashboard Features

**Created:** 2026-01-08
**Status:** Complete Reference
**File:** `lib/dashboard-v3.cjs`

---

## Overview

The dashboard is a Node.js terminal application that provides real-time monitoring of pipeline execution. It displays phase progress, token usage, costs, and communicates with the orchestrator via heartbeat messages.

---

## Display Layout

```
+=====================================================================+
|                    [ASCII LOGO]  v9.0                               |
|                                                                     |
|  Project: my-app  |  Mode: new  |  AUTO  |  T 1:23:45  |  H 4:32 (2/6)
+=========================+=======================================+===+
|                         |          == API MODE ==               |   |
|  PHASES  Up/Down Tab    |   time   |  regular   |   cached   |   total   |
|                         |          |   tok|$    |   tok|$    |   tok|$   |
+-------------------------+----------+------------+------------+-----------+
|  Y  1. Brainstorm       |  0:45:12 |  125K|$2.50|   50K|$0.15|  175K|$2.65|
|  >  2. Technical        |  running |                                     |
|  o  3. Bootstrap        |    --    |     --     |     --     |     --    |
|  o  4. Implement        |    --    |     --     |     --     |     --    |
|  o  5. Finalize         |    --    |     --     |     --     |     --    |
+=====================================================================+
```

---

## Key Bindings

| Key | Action |
|-----|--------|
| `Up` / `Down` | Navigate up/down through phases/epics |
| `Tab` | Expand/collapse selected item |
| `Space` | Toggle pricing mode (API <-> SUB) |
| `Enter` | Send manual HEARTBEAT to orchestrator |
| `p` / `P` | Pause/resume automatic heartbeat |
| `+` / `=` | Increase heartbeat interval (+1 minute) |
| `-` / `_` | Decrease heartbeat interval (-1 minute, min 1 min) |
| `r` | Run analysis on selected phase/epic |
| `a` / `A` | Toggle auto-analysis on/off |
| `q` / `Ctrl+C` | Quit dashboard |

---

## Header Information

| Element | Description |
|---------|-------------|
| **Project** | Project name (from manifest or folder name) |
| **Mode** | `new` (full pipeline) or `feature` (partial pipeline) |
| **Step Mode** | `AUTO` (continuous execution) or `STEP` (paused at checkpoints) |
| **Iteration** | `v1/3` when in step mode with multiple iterations |
| **Timer** | `T H:MM:SS` active time (persisted to manifest) |
| **Heartbeat** | `H 4:32 (2/6)` countdown timer + current count/refresh interval |
| **Checkpoint** | `CHECKPOINT Phase 2` displayed when status is checkpoint |

---

## Phase Status Icons

| Icon | Status | Description |
|------|--------|-------------|
| `o` (dim) | pending | Phase not yet started |
| `>` (yellow) | running | Phase currently executing |
| `Y` (green) | complete | Phase finished successfully |
| `X` (red) | failed | Phase encountered error |
| `~` (cyan) | analysis running | Post-phase analysis in progress |
| `#` (magenta) | analysis complete | Analysis results available |
| `!` (yellow) | no sessionId | Cannot analyze (missing session) |

---

## Pricing Modes

### API Mode (default)
- Columns: `tok|$`
- Shows actual API cost based on Anthropic pricing
- Per-model pricing (Opus, Sonnet, Haiku)
- Most accurate for pay-per-use billing

### SUB Mode (subscription)
- Columns: `tok|%|$`
- `%` = percentage of 7-day usage allowance
- `$` = estimated subscription cost ($50/week budget)
- Uses calibration: `tokensPerPercent` value from calibration.json

**Toggle:** Press `Space` to switch between modes

---

## Token Breakdown Columns

| Column | Description |
|--------|-------------|
| **time** | Duration of phase (H:MM:SS format) |
| **regular** | Non-cached tokens and associated cost |
| **cached** | Cache read tokens and associated cost (discounted) |
| **total** | Sum of regular + cached tokens and costs |

---

## Expanded Phase Details

Press `Tab` on a phase to expand details. Shows:

### 1. Execution Summary (if analysis complete)
- **Task health:** `X clean, Y friction, Z struggled`
- **Time/cost wasted:** Estimated waste from retries
- **What went well:** Top 3 positive observations
- **Issues found:** Count and recovery status
- **Recommendations:** Prioritized improvement suggestions

### 2. Todo Breakdown
- Individual todo items with time/tokens/cost
- Tree view for hierarchical display
- Expandable todo analysis (if available)

---

## Heartbeat System

| Property | Value |
|----------|-------|
| **Purpose** | Pings orchestrator periodically to trigger monitoring |
| **Default interval** | 5 minutes (300,000ms) |
| **Message format** | `HEARTBEAT: Read worker console, extract todo progress...` |
| **Configurable** | Adjust with +/- keys |
| **Pausable** | Toggle with P key |
| **Manual trigger** | Press Enter anytime |

### Heartbeat Behavior
- Dashboard sends heartbeat to orchestrator via message injection
- Orchestrator reads worker console output on heartbeat
- Progress extracted and updated in manifest
- Dashboard reads manifest update on next poll

---

## Auto-Analysis

| Property | Value |
|----------|-------|
| **Trigger** | Phase or epic completion |
| **Script** | `spawn-analysis-worker.ps1` |
| **Output** | `manifest.phases[N].analysis` |
| **Toggle** | Press `A` key |
| **Manual** | Press `r` key on selected item |

Analysis examines session transcript for:
- Struggles and retries
- Issues encountered
- Recommendations for improvement

---

## Session Tracking

Dashboard tracks all session IDs in manifest for analysis:

```json
{
  "sessions": {
    "orchestrator": ["session-id-1", "session-id-2"],
    "workers": {
      "phase-1": "session-id-3",
      "phase-2": "session-id-4",
      "epic-1": "session-id-5"
    }
  }
}
```

---

## Files Used

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `.pipeline/manifest.json` | Main state file | Read every 1s |
| `.pipeline/dashboard-state.json` | Dashboard UI state | Saved every 5s |
| `.pipeline/e2e-progress.json` | E2E test progress | Optional, on change |
| `.pipeline/session-info.txt` | Worker session ID | Watched for changes |

---

## Manifest Schema (Dashboard-Relevant Fields)

```json
{
  "project": { "name": "my-app", "path": "/path/to/project" },
  "status": "running",
  "mode": "new",
  "currentPhase": "2",
  "stepMode": false,
  "currentIteration": 1,
  "phases": {
    "1": {
      "status": "complete",
      "duration": 2712000,
      "cost": 2.65,
      "tokens": { "regular": 125000, "cached": 50000 },
      "analysis": { "summary": "...", "issues": [], "recommendations": [] }
    },
    "2": { "status": "running" }
  },
  "heartbeat": {
    "enabled": true,
    "intervalMs": 300000
  }
}
```

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-08 | Initial document |
| 2026-01-13 | Made standalone (added manifest schema and full context) |
