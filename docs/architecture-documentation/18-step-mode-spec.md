# Step Mode Specification

**Created:** 2026-01-12
**Status:** Design Complete, Implementation Pending
**Depends On:** [02-orchestrator-todos.md](./02-orchestrator-todos.md), [03-dashboard-features.md](./03-dashboard-features.md)

---

## Overview

Step mode provides **human-in-the-loop checkpoints** during pipeline execution. Instead of running autonomously from Phase 1 to Phase 5, the pipeline pauses after each phase (or epic in Phase 4) for user review.

### Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **AUTO** | Continuous execution, no pauses | Trusted pipeline, overnight runs |
| **STEP** | Pause at checkpoints for user review | Learning, quality control, iteration |

---

## Manifest Schema

### New Fields

```json
{
  "stepMode": true,
  "currentIteration": 1,
  "iterations": [
    {
      "id": 1,
      "branch": "main",
      "startedAt": "2026-01-12T10:00:00Z",
      "endedAt": null,
      "endReason": null,
      "feedback": null,
      "checkpoint": null,
      "cost": 0,
      "snapshotPath": null
    }
  ],
  "cascadeRestartPhase": null,
  "cascadeAnalysis": null
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `stepMode` | boolean | `true` = pause at checkpoints, `false` = auto mode |
| `currentIteration` | number | Current iteration number (starts at 1) |
| `iterations` | array | History of all iterations |
| `cascadeRestartPhase` | string\|null | Phase to restart from after feedback analysis |
| `cascadeAnalysis` | object\|null | Result of cascade analyzer |

### Iteration Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Iteration number |
| `branch` | string | Git branch name (if branching enabled) |
| `startedAt` | ISO string | When iteration started |
| `endedAt` | ISO string\|null | When iteration ended |
| `endReason` | string\|null | `"completed"`, `"feedback"`, `"rollback"` |
| `feedback` | string\|null | User feedback that ended this iteration |
| `checkpoint` | string\|null | Last checkpoint reached (e.g., `"phase-3"`, `"epic-2"`) |
| `cost` | number | Total cost for this iteration |
| `snapshotPath` | string\|null | Path to docs snapshot |

---

## Startup Question

### Question 4: Execution Mode

Add to orchestrator startup (after Mode, Style, Model questions):

```
header: "Execution"
question: "How should the pipeline run?"
options:
  - label: "Auto (Recommended)"
    description: "Run continuously, no pauses"
  - label: "Step"
    description: "Pause after each phase for review"
```

### Manifest Update

```bash
# If user selects "Step":
cat ".pipeline/manifest.json" | jq '
  .stepMode = true |
  .currentIteration = 1 |
  .iterations = [{
    "id": 1,
    "branch": "main",
    "startedAt": (now | todate),
    "endedAt": null,
    "endReason": null,
    "feedback": null,
    "checkpoint": null,
    "cost": 0,
    "snapshotPath": null
  }]
' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
```

---

## Checkpoint Logic

### When Checkpoints Occur

| Phase | Checkpoint Trigger | What Happens |
|-------|-------------------|--------------|
| 1 | Phase complete | Pause for design review |
| 2 | Phase complete | Pause for spec review |
| 3 | Phase complete | Pause + auto-launch app |
| 4 | Each epic complete | Pause + auto-launch app |
| 5 | Phase complete | Final review before ship |

### Checkpoint Flow

```
Phase/Epic Complete
        │
        ▼
┌───────────────────┐
│ Is stepMode true? │
└─────────┬─────────┘
          │
    YES   │   NO
    ▼     │   ▼
┌─────────┴───────────┐
│                     │
▼                     ▼
┌─────────────┐  ┌──────────────┐
│ CHECKPOINT  │  │ AUTO-ADVANCE │
│ SEQUENCE    │  │ to next      │
└─────────────┘  └──────────────┘
```

### Checkpoint Sequence (Section 8.5)

**Run when `stepMode === true` and phase/epic is complete:**

```bash
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')
EPIC=$(cat ".pipeline/manifest.json" | jq -r '.currentEpic // empty')

# 1. Update status to checkpoint
cat ".pipeline/manifest.json" | jq '
  .status = "checkpoint" |
  .checkpointAt = (now | todate)
' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# 2. Save iteration snapshot
ITERATION=$(cat ".pipeline/manifest.json" | jq -r '.currentIteration')
SNAPSHOT_PATH=".pipeline/snapshots/iteration-$ITERATION"
mkdir -p "$SNAPSHOT_PATH"
cp -r docs "$SNAPSHOT_PATH/"

# Update iteration with snapshot path
cat ".pipeline/manifest.json" | jq "
  .iterations[-1].snapshotPath = \"$SNAPSHOT_PATH\" |
  .iterations[-1].checkpoint = \"phase-$PHASE\"
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# 3. Auto-launch app (Phase 3+)
if [ "$PHASE" -ge "3" ]; then
  echo "Launching app for testing..."
  npm run tauri dev &
  APP_PID=$!
  cat ".pipeline/manifest.json" | jq ".appPid = $APP_PID" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
fi

# 4. Generate test report
node "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/generate-test-report.js"
```

### Test Report Generation (Section 8.6)

Create `lib/generate-test-report.js`:

```javascript
// Generates a human-readable test report based on current phase/epic
// Shows:
// - What was implemented
// - What to test manually
// - Known edge cases to verify
// - Success criteria

const manifest = JSON.parse(fs.readFileSync('.pipeline/manifest.json'));
const phase = manifest.currentPhase;
const epic = manifest.currentEpic;

// Read user stories and generate test checklist
// Output to .pipeline/test-report.md
```

### Checkpoint Message to Orchestrator

```
CHECKPOINT: Phase [N] complete. App launched for testing.
Test report: .pipeline/test-report.md
Waiting for user command: continue | feedback "<text>" | add "<feature>" | back [N]
```

---

## User Commands (Step Mode)

### Command: `continue`

User is satisfied, proceed to next phase/epic.

```bash
# Update manifest
cat ".pipeline/manifest.json" | jq '
  .status = "running" |
  .checkpointAt = null
' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# Kill app if running
APP_PID=$(cat ".pipeline/manifest.json" | jq -r '.appPid // empty')
[ -n "$APP_PID" ] && taskkill //PID $APP_PID //F 2>/dev/null

# Proceed to section 9 (advance)
```

### Command: `feedback "<text>"`

User has feedback that requires changes.

```bash
FEEDBACK="$1"

# 1. Run cascade analyzer
node "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/analyze-feedback-impact.js" "$FEEDBACK"

# 2. Read restart phase
RESTART_PHASE=$(cat ".pipeline/manifest.json" | jq -r '.cascadeRestartPhase')

# 3. End current iteration
cat ".pipeline/manifest.json" | jq "
  .iterations[-1].endedAt = (now | todate) |
  .iterations[-1].endReason = \"feedback\" |
  .iterations[-1].feedback = \"$FEEDBACK\"
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# 4. Create new iteration
NEXT_ITERATION=$(($(cat ".pipeline/manifest.json" | jq -r '.currentIteration') + 1))
cat ".pipeline/manifest.json" | jq "
  .currentIteration = $NEXT_ITERATION |
  .iterations += [{
    \"id\": $NEXT_ITERATION,
    \"branch\": \"main\",
    \"startedAt\": (now | todate),
    \"endedAt\": null,
    \"endReason\": null,
    \"feedback\": null,
    \"checkpoint\": null,
    \"cost\": 0,
    \"snapshotPath\": null
  }] |
  .status = \"running\" |
  .currentPhase = \"$RESTART_PHASE\"
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# 5. Spawn worker for restart phase
# Go to spawn worker section
```

### Command: `add "<feature>"`

User wants to add a feature (always restarts from Phase 1).

```bash
FEATURE="$1"

# Append to user stories
echo "" >> docs/user-stories.md
echo "## Added Feature: $FEATURE" >> docs/user-stories.md
echo "" >> docs/user-stories.md
echo "(Details to be elaborated in Phase 1)" >> docs/user-stories.md

# Set cascade to Phase 1
cat ".pipeline/manifest.json" | jq '
  .cascadeRestartPhase = "1" |
  .cascadeAnalysis = {
    "feedback": "Feature addition: '"$FEATURE"'",
    "impactLevel": "MAJOR",
    "restartPhase": 1
  }
' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# Same as feedback command from step 3 onwards
```

### Command: `back [N]`

Rollback to iteration N.

```bash
TARGET_ITERATION=$1

# 1. Validate iteration exists
ITERATION_EXISTS=$(cat ".pipeline/manifest.json" | jq ".iterations[] | select(.id == $TARGET_ITERATION)")
if [ -z "$ITERATION_EXISTS" ]; then
  echo "Error: Iteration $TARGET_ITERATION not found"
  exit 1
fi

# 2. Get snapshot path
SNAPSHOT_PATH=$(cat ".pipeline/manifest.json" | jq -r ".iterations[] | select(.id == $TARGET_ITERATION) | .snapshotPath")

# 3. Restore docs from snapshot
if [ -d "$SNAPSHOT_PATH/docs" ]; then
  rm -rf docs
  cp -r "$SNAPSHOT_PATH/docs" docs
fi

# 4. Get checkpoint phase
CHECKPOINT=$(cat ".pipeline/manifest.json" | jq -r ".iterations[] | select(.id == $TARGET_ITERATION) | .checkpoint")
RESTART_PHASE=$(echo "$CHECKPOINT" | sed 's/phase-//')

# 5. End current iteration
cat ".pipeline/manifest.json" | jq "
  .iterations[-1].endedAt = (now | todate) |
  .iterations[-1].endReason = \"rollback\"
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# 6. Create new iteration from rollback point
NEXT_ITERATION=$(($(cat ".pipeline/manifest.json" | jq -r '.currentIteration') + 1))
cat ".pipeline/manifest.json" | jq "
  .currentIteration = $NEXT_ITERATION |
  .iterations += [{
    \"id\": $NEXT_ITERATION,
    \"branch\": \"main\",
    \"startedAt\": (now | todate),
    \"endedAt\": null,
    \"endReason\": null,
    \"feedback\": null,
    \"checkpoint\": null,
    \"cost\": 0,
    \"snapshotPath\": null,
    \"rolledBackFrom\": $TARGET_ITERATION
  }] |
  .status = \"running\" |
  .currentPhase = \"$RESTART_PHASE\"
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

# 7. Spawn worker
```

---

## Cascade Analyzer

### Location

`lib/analyze-feedback-impact.js` (already exists)

### Purpose

Analyzes user feedback text to determine which phase needs to be re-run.

### Impact Levels

| Level | Restart Phase | Trigger Keywords |
|-------|---------------|------------------|
| MAJOR | 1 | "instead of", "replace", "remove feature", "completely different", "redesign", "new feature", "add feature" |
| MODERATE | 2 | "test should", "behavior should", "validation", "edge case", "error handling" |
| MINOR | 3 | "layout", "design", "ui", "component", "styling" |
| MINIMAL | 4 | "bug", "fix", "broken", "typo", "minor" |

### Output

Updates manifest with:
```json
{
  "cascadeRestartPhase": "2",
  "cascadeAnalysis": {
    "feedback": "The validation should check for empty strings",
    "impactLevel": "MODERATE",
    "restartPhase": 2,
    "analyzedAt": "2026-01-12T15:30:00Z",
    "impacts": {
      "phase1": false,
      "phase2": true,
      "phase3": false,
      "phase4": false
    }
  }
}
```

---

## Dashboard Integration

### Already Implemented

The dashboard already supports step mode display:

1. **Header indicator**: Shows "⏸ STEP" (magenta) or "AUTO" (dim)
2. **Iteration display**: Shows "🔄 v1/3" (current/total)
3. **Checkpoint badge**: Shows "CHECKPOINT Phase 2" when status is "checkpoint"
4. **Iteration history**: Shows last 3 iterations with status and cost

### Heartbeat Behavior

When `status === "checkpoint"`:
- Dashboard pauses automatic heartbeats
- Shows "PAUSED - Waiting for user" indicator
- Manual heartbeat (Enter) still works

---

## Orchestrator Integration

### New Sections to Add

| Section | Purpose |
|---------|---------|
| 8.5 | Checkpoint sequence (save snapshot, launch app, generate report) |
| 8.6 | Test report generation |
| 8.7 | Cascade restart execution |
| 8.8 | Iteration snapshot save/restore |

### Modified User Interrupts

Add to orchestrator "User Interrupts" section:

```markdown
### Step Mode Commands (when status is "checkpoint")

| Command | Action |
|---------|--------|
| `continue` | Accept checkpoint, proceed to next phase/epic |
| `feedback "<text>"` | Analyze feedback, restart from appropriate phase |
| `add "<feature>"` | Add feature, restart from Phase 1 |
| `back N` | Rollback to iteration N |
```

---

## File Dependencies

### New Files to Create

| File | Purpose |
|------|---------|
| `lib/generate-test-report.js` | Generate human-readable test checklist at checkpoints |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `commands/orchestrator-desktop-v10.0.md` | Add Question 4, sections 8.5-8.8, user commands |
| `docs/architecture-documentation/02-orchestrator-todos.md` | Add step mode todos |

### Files Already Complete

| File | Status |
|------|--------|
| `lib/analyze-feedback-impact.js` | ✅ Complete |
| `lib/dashboard-v3.cjs` | ✅ Complete (step mode display) |

---

## Example Flow

### Scenario: User Runs Step Mode Pipeline

```
1. User: /orchestrator-desktop-v10.0
2. Orchestrator asks: Mode? → "new"
3. Orchestrator asks: Style? → "Developer"
4. Orchestrator asks: Model? → "Sonnet"
5. Orchestrator asks: Execution? → "Step"    ← NEW
6. Manifest created with stepMode: true
7. Phase 1 runs (brainstorm)
8. Phase 1 complete → CHECKPOINT
   - Status: "checkpoint"
   - Dashboard shows: ⏸ STEP | CHECKPOINT Phase 1
   - Orchestrator: "Phase 1 complete. Review docs/user-stories.md"
9. User: "continue"
10. Phase 2 runs (specs)
11. Phase 2 complete → CHECKPOINT
12. User: feedback "Add validation for empty input"
    - Cascade analyzer: MODERATE → restart Phase 2
    - New iteration created (v2)
    - Phase 2 re-runs with feedback context
13. Phase 2 complete → CHECKPOINT
14. User: "continue"
... continues ...
```

---

## Implementation Checklist

- [ ] Add Question 4 (Execution Mode) to orchestrator startup
- [ ] Add `stepMode` initialization in manifest creation
- [ ] Add section 8.5 (checkpoint sequence) to orchestrator
- [ ] Add section 8.6 (test report generation) - create lib/generate-test-report.js
- [ ] Add section 8.7 (cascade restart) to orchestrator
- [ ] Add section 8.8 (snapshot save/restore) to orchestrator
- [ ] Add step mode user commands to orchestrator
- [ ] Update orchestrator todos for step mode flow
- [ ] Test end-to-end step mode flow

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial specification |
