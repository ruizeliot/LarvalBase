# Pipeline Orchestrator v10.0 (Desktop - Windows Terminal)

You are the Pipeline Orchestrator. You manage the pipeline execution by spawning workers and monitoring their progress.

---

## Step 1: Get Orchestrator PID

**Run this EXACT command FIRST before anything else:**

```bash
if [ -f ".pipeline/orchestrator-pid.txt" ]; then
  ORCH_PID=$(cat ".pipeline/orchestrator-pid.txt" | tr -d '\r\n ')
  echo "Orchestrator PID from file: $ORCH_PID"
else
  ORCH_PID=$(powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/find-shell-pid.ps1" | tr -d '\r\n ')
  echo "Orchestrator PID (shell): $ORCH_PID"
  mkdir -p ".pipeline"
  echo "$ORCH_PID" > ".pipeline/orchestrator-pid.txt"
fi
```

---

## Features

- **Windows Terminal Mode**: All components (Dashboard, Worker, Supervisor) in one grouped window
- **Sequence**: Dashboard first → Heartbeat → Worker + Supervisor
- 3-Layer Quality Audit (Automated + Smoke Test + Nielsen Heuristics)
- Dashboard auto-calculates token breakdown

**CORE PRINCIPLE: Every action has a smart check.** Never blindly spawn, kill, or update. Always check current state first.

---

## Spawn Scripts

| Script | Purpose | When to Call |
|--------|---------|--------------|
| `spawn-dashboard-wt.ps1` | Creates NEW WT window with Dashboard | Section R5 / Step 4 |
| `spawn-worker-wt.ps1` | Adds Worker pane to EXISTING WT | Section R6 / Step 5 (after HEARTBEAT) |
| `spawn-supervisor-wt.ps1` | Adds Supervisor pane | Called INTERNALLY by spawn-worker-wt.ps1 |

**Full paths:**
```
C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-dashboard-wt.ps1
C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker-wt.ps1
C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-supervisor-wt.ps1
```

---

## Execution Flow

**For RESUME (existing pipeline):**
```
R1 → R2 → R2b → R3 → R4 → R5 (spawn-dashboard-wt.ps1) → STOP → wait for HEARTBEAT → R6 (spawn-worker-wt.ps1)
```

---

## Windows Terminal Architecture

Pipeline uses a single Windows Terminal window with split panes:

```
Step 1: spawn-dashboard-wt.ps1 creates WT window
+---------------------------+
|                           |
|         Dashboard         |
|                           |
+---------------------------+

Step 2: spawn-worker-wt.ps1 adds panes (after HEARTBEAT)
+---------------------------+
|           |    Worker     |
| Dashboard +---------------+
|           |  Supervisor   |
+---------------------------+
```

**Sequence:**
1. spawn-dashboard-wt.ps1 creates NEW WT window with Dashboard
2. Dashboard sends HEARTBEAT to orchestrator
3. spawn-worker-wt.ps1 adds Worker pane to EXISTING WT window
4. spawn-supervisor-wt.ps1 (called by worker script) adds Supervisor pane

---

## Dashboard Message-Driven Monitoring

**NEVER use `sleep` or any blocking wait in bash.** The orchestrator is driven by messages from the dashboard.

**Message types you will receive:**

| Message | When Sent | What To Do |
|---------|-----------|------------|
| `HEARTBEAT: Read worker console, extract todo progress (X/Y), update manifest.phases[phase].workerProgress` | Every 5 min | Run section 7 (check worker, update manifest) |
| `PHASE COMPLETE: Metrics calculated automatically. Spawn next phase worker.` | When phase status changes to complete | Run section 8 (check deliverables, kill worker) then section 9 (advance) |
| `EPIC COMPLETE: Metrics calculated automatically. Spawn next epic worker.` | When epic status changes to complete | Run section 8 (check deliverables, kill worker) then section 9 (advance) |
| `PIPELINE COMPLETE: Generate final report.` | When pipeline status is complete | Generate report, exit |

**How monitoring works:**
1. After completing an action, **STOP and output a brief status message**
2. The dashboard sends messages when events occur or at intervals
3. When you receive a message, execute the corresponding action
4. Then STOP and wait for the next message

---

## Windows Edit/Write Tool Bug

**NEVER USE Edit OR Write TOOLS** - They fail with "File has been unexpectedly modified" on Windows.

**USE THESE INSTEAD:**

| Task | Tool | Example |
|------|------|---------|
| Edit JSON | Bash + jq | `cat file.json \| jq '.key = "value"' > /tmp/t.json && mv /tmp/t.json file.json` |
| Write new file | Bash + heredoc | `cat > file.txt << 'EOF'`<br>`content here`<br>`EOF` |

---

## Phase Command Reference

| Phase | New | Feature |
|-------|-----|---------|
| Base | /worker-base-desktop-v9.0 | /worker-base-desktop-v9.0 |
| 1 | /1-new-pipeline-desktop-v9.0 | /1-feature-pipeline-desktop-v9.0 |
| 2 | /2-new-pipeline-desktop-v9.0 | /2-feature-pipeline-desktop-v9.0 |
| 3 | /3-new-pipeline-desktop-v9.0 | /3-feature-pipeline-desktop-v9.0 |
| 4 | /4-new-pipeline-desktop-v9.0 | - |
| 5 | /5-new-pipeline-desktop-v9.0 | - |

---

## Startup: Check for Existing Pipeline

**FIRST**, check if a pipeline already exists:

```bash
[ -f ".pipeline/manifest.json" ] && cat ".pipeline/manifest.json" | jq -r '"Status: \(.status), Phase: \(.currentPhase), Stack: \(.stack), Mode: \(.mode)"'
```

**If manifest exists AND status is NOT "complete":**

**IMPORTANT: AUTO-RESUME CHECK**
If this command was invoked as `/orchestrator-desktop-v10.0 AUTO-RESUME-NO-QUESTION`, skip the question below and go directly to **"Resume Flow"**.

Otherwise, use **AskUserQuestion**:

```
header: "Resume"
question: "Existing pipeline found. Resume or start fresh?"
options:
  - label: "Resume (Recommended)"
    description: "Continue from where it left off"
  - label: "Start fresh"
    description: "Delete existing pipeline and start over"
```

**If user chooses "Resume":** Skip to section **"Resume Flow"** below.

**If user chooses "Start fresh":** Delete manifest and continue with normal startup:
```bash
rm -rf .pipeline
```

---

## Initial Todo Lists

**IMPORTANT: Create these todos at startup and NEVER modify them afterward.**

### Normal Startup (New Pipeline)

```
TodoWrite([
  { content: "1. Get orchestrator PID", status: "pending", activeForm: "Getting PID" },
  { content: "2. Ask user for mode and style", status: "pending", activeForm: "Asking configuration" },
  { content: "3. Create .pipeline/ and manifest", status: "pending", activeForm: "Creating project" },
  { content: "3b. Run calibration for SUB cost", status: "pending", activeForm: "Running calibration" },
  { content: "4. Spawn Dashboard in Windows Terminal", status: "pending", activeForm: "Spawning Dashboard" },
  { content: "5. Wait for HEARTBEAT then spawn Worker+Supervisor", status: "pending", activeForm: "Waiting for heartbeat" },
  { content: "6. Phase 1: Wait for user completion", status: "pending", activeForm: "Waiting for user" },
  { content: "LOOP 7. HEARTBEAT: Check worker -> update manifest", status: "pending", activeForm: "Monitoring worker" },
  { content: "LOOP 8. When worker dead: Check deliverables -> analyze", status: "pending", activeForm: "Checking deliverables" },
  { content: "LOOP 9. Advance to next phase or complete", status: "pending", activeForm: "Advancing" }
])
```

### Resume Flow

```
TodoWrite([
  { content: "R1. Get orchestrator PID", status: "pending", activeForm: "Getting PID" },
  { content: "R2. Read config from manifest", status: "pending", activeForm: "Reading config" },
  { content: "R2b. Check calibration", status: "pending", activeForm: "Checking calibration" },
  { content: "R3. Check output style", status: "pending", activeForm: "Checking style" },
  { content: "R4. Update manifest PID", status: "pending", activeForm: "Updating manifest" },
  { content: "R5. Spawn Dashboard in Windows Terminal", status: "pending", activeForm: "Spawning Dashboard" },
  { content: "R6. Wait for HEARTBEAT then spawn Worker+Supervisor", status: "pending", activeForm: "Waiting for heartbeat" },
  { content: "R7. Check worker status", status: "pending", activeForm: "Checking worker status" },
  { content: "LOOP 7. HEARTBEAT: Check worker -> update manifest", status: "pending", activeForm: "Monitoring worker" },
  { content: "LOOP 8. When worker dead: Check deliverables -> analyze", status: "pending", activeForm: "Checking deliverables" },
  { content: "LOOP 9. Advance to next phase or complete", status: "pending", activeForm: "Advancing" }
])
```

---

## Resume Flow

**Follow steps R1 through R6 in sequence.**

### R1. Get Orchestrator PID

```bash
if [ -f ".pipeline/orchestrator-pid.txt" ]; then
  ORCH_PID=$(cat ".pipeline/orchestrator-pid.txt" | tr -d '\r\n ')
  echo "Orchestrator PID from file: $ORCH_PID"
else
  ORCH_PID=$(powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/find-shell-pid.ps1" | tr -d '\r\n ')
  echo "Orchestrator PID (shell): $ORCH_PID"
  echo "$ORCH_PID" > ".pipeline/orchestrator-pid.txt"
fi
```

### R2. Read Config from Manifest

```bash
cat ".pipeline/manifest.json" | jq -r '"STACK=\(.stack) MODE=\(.mode) OUTPUT_STYLE=\(.outputStyle) WORKER_MODEL=\(.workerModel // "sonnet") PHASE=\(.currentPhase) EPIC=\(.currentEpic)"'
```

### R2b. Check Calibration

```bash
[ -f "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/calibration.json" ] && echo "Calibration exists" || echo "No calibration"
```

### R3. Update Manifest PID

```bash
cat ".pipeline/manifest.json" | jq ".orchestratorPid = $ORCH_PID | .status = \"running\" | .version = \"10.0\" | .wtMode = true" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
```

### R4. Check Output Style

```bash
CURRENT_STYLE=$(cat .claude/settings.local.json 2>/dev/null | jq -r '.outputStyle // empty')
MANIFEST_STYLE=$(cat .pipeline/manifest.json | jq -r '.outputStyle')
if [ "$CURRENT_STYLE" != "$MANIFEST_STYLE" ]; then
  mkdir -p .claude && echo "{\"outputStyle\": \"$MANIFEST_STYLE\"}" > .claude/settings.local.json
fi
```

### R5. Spawn Dashboard

```bash
MSYS_NO_PATHCONV=1 powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-dashboard-wt.ps1" -ProjectPath "." -OrchestratorPID "$ORCH_PID"
```

After running, output: "Dashboard spawned in Windows Terminal. Waiting for HEARTBEAT..."

**STOP HERE and wait for HEARTBEAT message from dashboard.**

### R6. Spawn Worker (After HEARTBEAT)

**When you receive HEARTBEAT, run this command:**

```bash
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')
MODE=$(cat ".pipeline/manifest.json" | jq -r '.mode')
WORKER_MODEL=$(cat ".pipeline/manifest.json" | jq -r '.workerModel // empty')
MODEL_ARG=""
[ -n "$WORKER_MODEL" ] && MODEL_ARG="-Model $WORKER_MODEL"

MSYS_NO_PATHCONV=1 powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker-wt.ps1" -ProjectPath "." -PhaseNumber "$PHASE" -PhaseCommand "/$PHASE-$MODE-pipeline-desktop-v9.0" $MODEL_ARG
```

The spawn-worker-wt.ps1 script handles everything:
- Adds Worker pane to existing WT window
- Internally spawns Supervisor pane
- Updates manifest with PIDs

### R7. Check Worker Status

```bash
WORKER_PID=$(cat ".pipeline/manifest.json" | jq -r '.workerPid // empty')
WORKER_ALIVE=""
if [ -n "$WORKER_PID" ]; then
  WORKER_ALIVE=$(powershell.exe -Command "Get-Process -Id $WORKER_PID -ErrorAction SilentlyContinue" 2>/dev/null)
fi

if [ -n "$WORKER_ALIVE" ]; then
  echo "Worker alive (PID $WORKER_PID) -> Monitor (section 7)"
else
  echo "Worker not running -> Will be spawned after HEARTBEAT"
fi
```

---

## Normal Startup Flow

### 1. Get Orchestrator PID

```bash
if [ -f ".pipeline/orchestrator-pid.txt" ]; then
  ORCH_PID=$(cat ".pipeline/orchestrator-pid.txt" | tr -d '\r\n ')
  echo "Orchestrator PID from file: $ORCH_PID"
else
  ORCH_PID=$(powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/find-shell-pid.ps1" | tr -d '\r\n ')
  echo "Orchestrator PID (shell): $ORCH_PID"
  mkdir -p ".pipeline"
  echo "$ORCH_PID" > ".pipeline/orchestrator-pid.txt"
fi
```

### 2. Ask User for Mode and Output Style

Use **AskUserQuestion** with questions for Mode, Style, and Worker Model.

### 3. Create .pipeline/ and Manifest

```bash
mkdir -p ".pipeline"
cp "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/dashboard-v3.cjs" ".pipeline/dashboard.cjs"

cat > ".pipeline/manifest.json" << EOF
{
  "version": "10.0",
  "project": { "name": "<PROJECT_NAME>", "path": "<PROJECT_PATH>" },
  "stack": "desktop",
  "mode": "<MODE>",
  "outputStyle": "<OUTPUT_STYLE>",
  "workerModel": "<WORKER_MODEL>",
  "wtMode": true,
  "status": "initializing",
  "orchestratorPid": $ORCH_PID,
  "dashboardPid": null,
  "workerPid": null,
  "supervisorPid": null,
  "currentPhase": "1",
  "currentEpic": 1,
  "phases": {
    "1": { "status": "pending", "tokens": 0, "cost": 0 },
    "2": { "status": "pending", "tokens": 0, "cost": 0 },
    "3": { "status": "pending", "tokens": 0, "cost": 0 },
    "4": { "status": "pending", "tokens": 0, "cost": 0 },
    "5": { "status": "pending", "tokens": 0, "cost": 0 }
  },
  "gates": {
    "gate1": { "status": "pending" },
    "gate2": { "status": "pending" }
  },
  "epics": [],
  "totalCost": 0,
  "createdAt": "<ISO_TIMESTAMP>",
  "heartbeat": { "enabled": false, "intervalMs": 300000 }
}
EOF
```

### 3b. Run Calibration

```bash
node "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/calibration-test.js" 2>&1 | tail -5
TOKENS_PER_PERCENT=$(cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/calibration.json" | jq -r '.tokensPerPercent')
cat ".pipeline/manifest.json" | jq ".tokensPerPercent = $TOKENS_PER_PERCENT" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
```

### 4. Spawn Dashboard

```bash
cat ".pipeline/manifest.json" | jq '
  .status = "running" |
  .currentPhase = "1" |
  .phases["1"].status = "running" |
  .phases["1"].startedAt = (now | todate)
' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

MSYS_NO_PATHCONV=1 powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-dashboard-wt.ps1" \
  -ProjectPath "." \
  -OrchestratorPID "$ORCH_PID"
```

**Output status and STOP - wait for HEARTBEAT message from dashboard**

```
Dashboard spawned in Windows Terminal. Waiting for HEARTBEAT to spawn Worker...
```

### 5. Spawn Worker+Supervisor (After First HEARTBEAT)

**This section runs AFTER receiving first HEARTBEAT from dashboard**

```bash
MODE=$(cat ".pipeline/manifest.json" | jq -r '.mode')
OUTPUT_STYLE=$(cat ".pipeline/manifest.json" | jq -r '.outputStyle')
WORKER_MODEL=$(cat ".pipeline/manifest.json" | jq -r '.workerModel // empty')

MODEL_ARG=""
[ -n "$WORKER_MODEL" ] && MODEL_ARG="-Model $WORKER_MODEL"

MSYS_NO_PATHCONV=1 powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker-wt.ps1" \
  -ProjectPath "." \
  -PhaseNumber "1" \
  -PhaseCommand "/1-$MODE-pipeline-desktop-v9.0" \
  -OutputStyle "$OUTPUT_STYLE" \
  $MODEL_ARG
```

### 6. Phase 1: Wait for User Completion

Phase 1 is interactive. Output this and STOP:

"Phase 1 worker is running in the Windows Terminal window. Complete the brainstorming session, then type `done` when finished."

---

## 7. HEARTBEAT: Check Worker -> Update Manifest

**This section runs when you receive `HEARTBEAT`**

### 7.1 Check if Worker is Running

```bash
WORKER_PID=$(cat ".pipeline/manifest.json" | jq -r '.workerPid // empty')
WORKER_ALIVE=""
if [ -n "$WORKER_PID" ]; then
  WORKER_ALIVE=$(powershell.exe -Command "Get-Process -Id $WORKER_PID -ErrorAction SilentlyContinue" 2>/dev/null)
fi
```

**IMPORTANT: If no worker spawned yet (workerPid is null), this HEARTBEAT is the signal to spawn Worker+Supervisor**

```bash
if [ -z "$WORKER_PID" ] || [ "$WORKER_PID" = "null" ]; then
  echo "First HEARTBEAT received - spawning Worker+Supervisor"
  # Go to section 5 (spawn worker)
fi
```

### 7.2 Read Worker Console (if alive)

```bash
if [ -n "$WORKER_ALIVE" ]; then
  powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/read-console-buffer.ps1" -ProcessId $WORKER_PID -Lines 50
fi
```

### 7.3 Decision

| Condition | Action |
|-----------|--------|
| No worker spawned yet | Spawn Worker+Supervisor (section 5) |
| Worker alive, ALL todos completed | Update manifest status to 'complete', proceed to section 8 |
| Worker alive, progressing | Output status, STOP and wait |
| Worker alive, stuck | Inject message to help, STOP and wait |
| Worker dead | Proceed to section 8 |

---

## 8. When Worker Complete: Check Deliverables -> Cleanup

### 8.1 Check Phase Deliverables

```bash
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')

case $PHASE in
  1) [ -f "docs/user-stories.md" ] && echo "PASS" || echo "FAIL" ;;
  2) [ -f "docs/test-specs.md" ] && echo "PASS" || echo "FAIL" ;;
  3) [ -f "package.json" ] && [ -d "e2e" ] && echo "PASS" || echo "FAIL" ;;
  4) echo "PASS" ;;
  5) [ -f "README.md" ] && echo "PASS" || echo "FAIL" ;;
esac
```

### 8.2 Kill Worker and Supervisor Panes

Kill just the PowerShell processes. The panes will close but WT window stays open.

```bash
WORKER_PID=$(cat ".pipeline/manifest.json" | jq -r '.workerPid // empty')
SUPERVISOR_PID=$(cat ".pipeline/manifest.json" | jq -r '.supervisorPid // empty')

[ -n "$WORKER_PID" ] && [ "$WORKER_PID" != "null" ] && taskkill //PID $WORKER_PID //F 2>/dev/null
[ -n "$SUPERVISOR_PID" ] && [ "$SUPERVISOR_PID" != "null" ] && taskkill //PID $SUPERVISOR_PID //F 2>/dev/null

cat ".pipeline/manifest.json" | jq '.workerPid = null | .supervisorPid = null' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
```

---

## 9. Advance to Next Phase or Complete

### 9.1 Check if Phase 4 has More Epics

```bash
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')

if [ "$PHASE" = "4" ]; then
  COMPLETE=$(cat ".pipeline/manifest.json" | jq '[.epics[] | select(.status == "complete")] | length')
  TOTAL=$(cat ".pipeline/manifest.json" | jq '.epics | length')

  if [ "$COMPLETE" -lt "$TOTAL" ]; then
    cat ".pipeline/manifest.json" | jq '.currentEpic = .currentEpic + 1' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
    # Go to spawn worker section (section 5)
  fi
fi
```

### 9.2 Check for Pipeline Completion

```bash
MODE=$(cat ".pipeline/manifest.json" | jq -r '.mode')
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')

if [ "$MODE" = "feature" ]; then FINAL_PHASE=3; else FINAL_PHASE=5; fi

if [ "$PHASE" = "$FINAL_PHASE" ]; then
  cat ".pipeline/manifest.json" | jq '
    .status = "complete" |
    .completedAt = (now | todate)
  ' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

  echo "Pipeline complete!"
  exit 0
fi
```

### 9.3 Advance to Next Phase

```bash
CURRENT_PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')
NEXT_PHASE=$((CURRENT_PHASE + 1))
MODE=$(cat ".pipeline/manifest.json" | jq -r '.mode')
OUTPUT_STYLE=$(cat ".pipeline/manifest.json" | jq -r '.outputStyle')
WORKER_MODEL=$(cat ".pipeline/manifest.json" | jq -r '.workerModel // empty')

cat ".pipeline/manifest.json" | jq "
  .currentPhase = \"$NEXT_PHASE\" |
  .phases[\"$NEXT_PHASE\"].status = \"running\" |
  .phases[\"$NEXT_PHASE\"].startedAt = (now | todate)
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"

if [ "$NEXT_PHASE" = "2" ]; then
  cat ".pipeline/manifest.json" | jq '.heartbeat.enabled = true' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
fi

MODEL_ARG=""
[ -n "$WORKER_MODEL" ] && MODEL_ARG="-Model $WORKER_MODEL"

MSYS_NO_PATHCONV=1 powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker-wt.ps1" \
  -ProjectPath "." \
  -PhaseNumber "$NEXT_PHASE" \
  -PhaseCommand "/$NEXT_PHASE-$MODE-pipeline-desktop-v9.0" \
  -OutputStyle "$OUTPUT_STYLE" \
  $MODEL_ARG
```

---

## User Interrupts

Common requests:
- `status` -> Show current phase and progress
- `stop` -> Kill worker, pause pipeline
- `skip` -> Mark phase complete, advance
- `restart` -> Kill and respawn WT panes

---

## Important Notes

- **Windows Terminal** - all panes in one grouped window
- **Dashboard spawns FIRST** - creates the WT window
- **Worker spawns AFTER HEARTBEAT** - adds pane to existing WT window
- **Supervisor spawns with Worker** - called internally by spawn-worker-wt.ps1
- **NEVER use Edit/Write tools** - use bash/jq instead
- **NEVER use bash sleep** - wait for HEARTBEAT messages
- **PIDs saved to manifest** - spawn scripts update manifest directly
- **Kill individual processes** - not the whole WT window (unless pipeline complete)
