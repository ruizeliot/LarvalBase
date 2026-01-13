# Pipeline Launcher v11

**Purpose:** Initialize and launch the v11 Pipeline Orchestrator.

This launcher prepares the orchestrator CLAUDE.md and spawns the orchestrator in a new Windows Terminal window.

---

## CRITICAL RULES

1. **Initialize the todo list FIRST** - before any other action
2. **Execute ALL steps 1-7 IN SEQUENCE** - no skipping, no reordering
3. **Mark todos as you go** - `in_progress` when starting, `completed` when done
4. **Do NOT modify todo content** - only change status field
5. **Step 7 (Inject BEGIN) is MANDATORY** - the orchestrator cannot start without it

---

## Initial Todo List

**IMMEDIATELY call TodoWrite with this EXACT list:**

```
TodoWrite([
  { content: "1. Check prerequisites", status: "pending", activeForm: "Checking prerequisites" },
  { content: "2. Validate brainstorm files", status: "pending", activeForm: "Validating files" },
  { content: "3. Ask configuration questions", status: "pending", activeForm: "Asking configuration" },
  { content: "4. Prepare orchestrator CLAUDE.md", status: "pending", activeForm: "Preparing CLAUDE.md" },
  { content: "5. Create manifest", status: "pending", activeForm: "Creating manifest" },
  { content: "6. Spawn orchestrator window", status: "pending", activeForm: "Spawning orchestrator" },
  { content: "7. Inject BEGIN message", status: "pending", activeForm: "Injecting BEGIN" }
])
```

**Now execute steps 1-7 in sequence. Do NOT skip any step.**

---

## 1. Check Prerequisites

**Mark todo 1 as `in_progress`, then run:**

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
[ -d "$PIPELINE_OFFICE" ] && echo "✅ Pipeline-Office found" || { echo "❌ Pipeline-Office not found"; exit 1; }
```

**Check for existing pipeline:**

```bash
if [ -f ".pipeline/manifest.json" ]; then
  cat ".pipeline/manifest.json" | jq -r '"Existing: Status=\(.status), Phase=\(.currentPhase)"'
fi
```

**If manifest exists AND status is NOT "complete":** Use AskUserQuestion:
- "Resume" → orchestrator handles resume
- "Start fresh" → `rm -rf .pipeline && rm -f .claude/CLAUDE.md`

**Mark todo 1 as `completed`.**

---

## 2. Validate Brainstorm Files

**Mark todo 2 as `in_progress`, then run:**

```bash
[ -f "docs/brainstorm-notes.md" ] && echo "✅ brainstorm-notes.md" || echo "❌ brainstorm-notes.md MISSING"
[ -f "docs/user-stories.md" ] && echo "✅ user-stories.md" || echo "❌ user-stories.md MISSING"
```

**If EITHER file missing:** Output error and STOP:
```
❌ Brainstorm files not found. Run /brainstorm first.
```

**Mark todo 2 as `completed`.**

---

## 3. Ask Configuration Questions

**Mark todo 3 as `in_progress`, then use AskUserQuestion:**

```
questions:
  - header: "Mode"
    question: "What type of project?"
    options:
      - label: "New Project (Recommended)"
        description: "Starting from scratch"
      - label: "Feature"
        description: "Adding to existing project"

  - header: "Execution"
    question: "How autonomous?"
    options:
      - label: "Autonomous (Recommended)"
        description: "Run phases 2-5 without intervention"
      - label: "Collaborative"
        description: "Ask at phase boundaries"
```

**Save answers as MODE and USER_MODE for step 5.**

**Mark todo 3 as `completed`.**

---

## 4. Prepare Orchestrator CLAUDE.md

**Mark todo 4 as `in_progress`, then run:**

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
mkdir -p ".claude"
cp "$PIPELINE_OFFICE/claude-md/orchestrator-v11.md" ".claude/CLAUDE.md"
echo "✅ Orchestrator CLAUDE.md prepared"
```

**Mark todo 4 as `completed`.**

---

## 5. Create Manifest

**Mark todo 5 as `in_progress`, then run:**

Replace `<MODE>` and `<USER_MODE>` with answers from step 3:

```bash
mkdir -p ".pipeline"
PROJECT_NAME=$(basename "$(pwd -W)")
PROJECT_PATH=$(pwd -W)
STORY_COUNT=$(grep -c "^## US-" docs/user-stories.md 2>/dev/null || echo 0)
EPIC_COUNT=$(grep -c "^# Epic" docs/user-stories.md 2>/dev/null || echo 0)

cat > ".pipeline/manifest.json" << 'MANIFEST_EOF'
{
  "version": "11.0.0",
  "project": { "name": "PROJECT_NAME_PLACEHOLDER", "path": "PROJECT_PATH_PLACEHOLDER" },
  "stack": "desktop",
  "mode": "MODE_PLACEHOLDER",
  "userMode": "USER_MODE_PLACEHOLDER",
  "status": "initializing",
  "brainstorm": {
    "completed": true,
    "notesFile": "docs/brainstorm-notes.md",
    "storiesFile": "docs/user-stories.md",
    "epicCount": EPIC_COUNT_PLACEHOLDER,
    "storyCount": STORY_COUNT_PLACEHOLDER
  },
  "currentPhase": "2",
  "phases": {
    "2": { "status": "pending" },
    "3": { "status": "pending" },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  },
  "workers": { "current": null, "supervisor": null },
  "createdAt": "CREATED_AT_PLACEHOLDER"
}
MANIFEST_EOF

# Replace placeholders
sed -i "s|PROJECT_NAME_PLACEHOLDER|$PROJECT_NAME|g" ".pipeline/manifest.json"
sed -i "s|PROJECT_PATH_PLACEHOLDER|$PROJECT_PATH|g" ".pipeline/manifest.json"
sed -i "s|MODE_PLACEHOLDER|<MODE>|g" ".pipeline/manifest.json"
sed -i "s|USER_MODE_PLACEHOLDER|<USER_MODE>|g" ".pipeline/manifest.json"
sed -i "s|EPIC_COUNT_PLACEHOLDER|$EPIC_COUNT|g" ".pipeline/manifest.json"
sed -i "s|STORY_COUNT_PLACEHOLDER|$STORY_COUNT|g" ".pipeline/manifest.json"
sed -i "s|CREATED_AT_PLACEHOLDER|$(date -Iseconds)|g" ".pipeline/manifest.json"

echo "✅ Manifest created"
cat ".pipeline/manifest.json" | jq .
```

**Mark todo 5 as `completed`.**

---

## 6. Spawn Orchestrator Window

**Mark todo 6 as `in_progress`, then run THIS EXACT BLOCK:**

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
PROJECT_PATH=$(pwd -W)

echo "Spawning orchestrator window..."
echo "Project path: $PROJECT_PATH"

# Spawn and capture PID (script saves to .pipeline/orchestrator-powershell-pid.txt)
powershell.exe -ExecutionPolicy Bypass -File "$PIPELINE_OFFICE/lib/spawn-orchestrator-wt.ps1" -ProjectPath "$PROJECT_PATH"

# Read the PID from file
if [ -f ".pipeline/orchestrator-powershell-pid.txt" ]; then
  ORCH_PID=$(cat ".pipeline/orchestrator-powershell-pid.txt" | tr -d '\r\n ')
  echo "✅ Orchestrator window spawned with PID: $ORCH_PID"
else
  echo "❌ ERROR: Orchestrator PID file not found!"
  exit 1
fi
```

**Mark todo 6 as `completed`.**

---

## 7. Inject BEGIN Message

**⚠️ THIS STEP IS MANDATORY - DO NOT SKIP**

**Mark todo 7 as `in_progress`, then run:**

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"

# Read orchestrator PID
ORCH_PID=$(cat ".pipeline/orchestrator-powershell-pid.txt" | tr -d '\r\n ')
echo "Injecting BEGIN to orchestrator PID: $ORCH_PID"

# Wait for Claude to initialize
sleep 5

# Inject BEGIN message using inject-message.ps1
powershell.exe -ExecutionPolicy Bypass -File "$PIPELINE_OFFICE/lib/inject-message.ps1" -TargetPid $ORCH_PID -Message "BEGIN"

echo ""
echo "=========================================="
echo "  ✅ Pipeline Orchestrator v11 Launched!"
echo "=========================================="
echo "Orchestrator PID: $ORCH_PID"
echo "BEGIN message injected."
echo "You can close this window."
```

**Mark todo 7 as `completed`.**

---

## Completion Checklist

Before finishing, verify ALL todos are `completed`:

```
TodoWrite([
  { content: "1. Check prerequisites", status: "completed", activeForm: "Checking prerequisites" },
  { content: "2. Validate brainstorm files", status: "completed", activeForm: "Validating files" },
  { content: "3. Ask configuration questions", status: "completed", activeForm: "Asking configuration" },
  { content: "4. Prepare orchestrator CLAUDE.md", status: "completed", activeForm: "Preparing CLAUDE.md" },
  { content: "5. Create manifest", status: "completed", activeForm: "Creating manifest" },
  { content: "6. Spawn orchestrator window", status: "completed", activeForm: "Spawning orchestrator" },
  { content: "7. Inject BEGIN message", status: "completed", activeForm: "Injecting BEGIN" }
])
```

**If any todo is NOT completed, GO BACK and complete it before finishing.**
