# Dashboard Features

**Created:** 2026-01-08
**File:** `lib/dashboard-v3.cjs`

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
| **Mode** | `new` or `feature` |
| **Step Mode** | `AUTO` (continuous) or `STEP` (paused at checkpoints) |
| **Iteration** | `v1/3` when in step mode with multiple iterations |
| **Timer** | `T H:MM:SS` active time (persists to manifest) |
| **Heartbeat** | `H 4:32 (2/6)` countdown + count/refreshEvery |
| **Checkpoint** | `CHECKPOINT Phase 2` when status is checkpoint |

---

## Phase Status Icons

| Icon | Status |
|------|--------|
| `o` (dim) | pending |
| `>` (yellow) | running |
| `Y` (green) | complete |
| `X` (red) | failed |
| `~` (cyan) | analysis running |
| `#` (magenta) | analysis complete |
| `!` (yellow) | no sessionId (can't analyze) |

---

## Pricing Modes

**API Mode** (default):
- Columns: `tok|$`
- Shows actual API cost based on Anthropic pricing
- Per-model pricing (Opus, Sonnet, Haiku)

**SUB Mode** (subscription):
- Columns: `tok|%|$`
- `%` = percentage of 7-day usage
- `$` = estimated subscription cost ($50/week budget)
- Uses calibration: `tokensPerPercent` value

---

## Token Breakdown Columns

| Column | Description |
|--------|-------------|
| **time** | Duration of phase (H:MM:SS) |
| **regular** | Non-cached tokens and cost |
| **cached** | Cache read tokens and cost |
| **total** | Sum of regular + cached |

---

## Expanded Phase Details (Tab to expand)

When phase is expanded, shows:

1. **Execution Summary** (if analysis complete):
   - Task health: `X clean, Y friction, Z struggled`
   - Time/cost wasted
   - What went well (top 3)
   - Issues found (with count and recovery status)
   - Recommendations (prioritized)

2. **Todo Breakdown**:
   - Individual todo items with time/tokens/cost
   - Tree view for hierarchy
   - Expandable todo analysis (if available)

---

## Heartbeat System

- **Purpose**: Pings orchestrator periodically to trigger monitoring
- **Default interval**: 5 minutes (300,000ms)
- **Message format**: `HEARTBEAT: Read worker console, extract todo progress...`
- **Configurable**: Adjust with +/- keys
- **Pausable**: Toggle with P key
- **Manual trigger**: Press Enter anytime

---

## Auto-Analysis

- Spawns `spawn-analysis-worker.ps1` on phase/epic complete
- Analyzes transcript for struggles, issues, recommendations
- Results stored in `manifest.phases[N].analysis`
- Toggle with A key
- Manual trigger with r key on selected item

---

## Session Tracking

Tracks all session IDs in manifest:
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

| File | Purpose |
|------|---------|
| `.pipeline/manifest.json` | Main state file (read every 1s) |
| `.pipeline/dashboard-state.json` | Dashboard UI state (saved every 5s) |
| `.pipeline/e2e-progress.json` | E2E test progress (optional) |
| `.pipeline/session-info.txt` | Worker session ID (watched) |

---

## TODO

- [ ] Remove onboarding indicator (legacy feature)
