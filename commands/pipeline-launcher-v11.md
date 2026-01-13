# Pipeline Launcher v11

**Purpose:** Initialize and launch the v11 Pipeline Orchestrator.

This launcher prepares the orchestrator CLAUDE.md and spawns the orchestrator in a new Windows Terminal window.

---

## Step 1: Check Prerequisites

### 1.1 Verify Pipeline-Office Location

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
[ -d "$PIPELINE_OFFICE" ] && echo "Pipeline-Office found" || echo "ERROR: Pipeline-Office not found"
```

### 1.2 Check for Existing Pipeline

```bash
if [ -f ".pipeline/manifest.json" ]; then
  cat ".pipeline/manifest.json" | jq -r '"Existing pipeline: Status=\(.status), Phase=\(.currentPhase), Version=\(.version)"'
fi
```

**If manifest exists AND status is NOT "complete":**

Use **AskUserQuestion**:
```
header: "Existing Pipeline"
question: "Found existing pipeline. What would you like to do?"
options:
  - label: "Resume (Recommended)"
    description: "Continue from where it left off"
  - label: "Start fresh"
    description: "Delete existing pipeline and start over"
```

**If "Start fresh":**
```bash
rm -rf .pipeline
rm -f .claude/CLAUDE.md
```

**If "Resume":** The orchestrator will handle resume logic.

---

## Step 2: Validate Brainstorm Files (v11 Requirement)

**v11 requires pre-pipeline brainstorming to be complete.**

```bash
NOTES_EXISTS=false
STORIES_EXISTS=false
[ -f "docs/brainstorm-notes.md" ] && NOTES_EXISTS=true
[ -f "docs/user-stories.md" ] && STORIES_EXISTS=true

echo "Brainstorm files check:"
echo "  docs/brainstorm-notes.md: $NOTES_EXISTS"
echo "  docs/user-stories.md: $STORIES_EXISTS"
```

**If either file is missing:**

Output this message and STOP:
```
❌ Brainstorm files not found.

v11 requires brainstorming to be completed BEFORE starting the pipeline.
The orchestrator manages phases 2-5 only.

To create these files, run:
  /brainstorm

Then run this launcher again.
```

---

## Step 3: Ask Configuration Questions

Use **AskUserQuestion**:

```
questions:
  - header: "Mode"
    question: "What type of project is this?"
    options:
      - label: "New Project (Recommended)"
        description: "Starting from scratch with user stories"
      - label: "Feature"
        description: "Adding feature to existing project"

  - header: "Execution"
    question: "How autonomous should the pipeline be?"
    options:
      - label: "Autonomous (Recommended)"
        description: "Run phases 2-5 without intervention"
      - label: "Collaborative"
        description: "Ask for approval at phase boundaries"
```

---

## Step 4: Prepare Orchestrator CLAUDE.md

Copy the v11 orchestrator content to the project's `.claude/CLAUDE.md`:

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
mkdir -p ".claude"
cp "$PIPELINE_OFFICE/claude-md/orchestrator-v11.md" ".claude/CLAUDE.md"
echo "Orchestrator CLAUDE.md prepared"
```

---

## Step 5: Create Initial Manifest

```bash
mkdir -p ".pipeline"
PROJECT_NAME=$(basename "$(pwd)")
PROJECT_PATH=$(pwd)
STORY_COUNT=$(grep -c "^## US-" docs/user-stories.md 2>/dev/null || echo 0)
EPIC_COUNT=$(grep -c "^# Epic" docs/user-stories.md 2>/dev/null || echo 0)
MODE="<MODE_FROM_STEP_3>"
USER_MODE="<EXECUTION_FROM_STEP_3>"

cat > ".pipeline/manifest.json" << EOF
{
  "version": "11.0.0",
  "project": { "name": "$PROJECT_NAME", "path": "$PROJECT_PATH" },
  "stack": "desktop",
  "mode": "$MODE",
  "userMode": "$USER_MODE",
  "status": "initializing",
  "brainstorm": {
    "completed": true,
    "notesFile": "docs/brainstorm-notes.md",
    "storiesFile": "docs/user-stories.md",
    "epicCount": $EPIC_COUNT,
    "storyCount": $STORY_COUNT
  },
  "currentPhase": "2",
  "phases": {
    "2": { "status": "pending" },
    "3": { "status": "pending" },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  },
  "workers": { "current": null, "supervisor": null },
  "createdAt": "$(date -Iseconds)"
}
EOF
echo "Manifest created"
```

---

## Step 6: Spawn Orchestrator Window

Spawn a new Windows Terminal window with the orchestrator:

```bash
PIPELINE_OFFICE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
PROJECT_PATH=$(pwd)

MSYS_NO_PATHCONV=1 powershell.exe -ExecutionPolicy Bypass -Command "
  Start-Process wt -ArgumentList @(
    'new-tab',
    '--title', 'Pipeline Orchestrator v11',
    '-d', '$PROJECT_PATH',
    'pwsh', '-NoExit', '-Command', 'claude --dangerously-skip-permissions'
  )
"
```

---

## Step 7: Inject BEGIN Message

Wait a moment for the orchestrator to start, then inject the BEGIN message:

```bash
sleep 5

# The orchestrator's CLAUDE.md is loaded, inject BEGIN to start
echo "BEGIN" > ".pipeline/orchestrator-message.txt"

echo ""
echo "=========================================="
echo "  Pipeline Orchestrator v11 Launched!"
echo "=========================================="
echo ""
echo "The orchestrator is starting in a new window."
echo "It will:"
echo "  1. Spawn the dashboard"
echo "  2. Spawn workers for each phase"
echo "  3. Monitor progress automatically"
echo ""
echo "You can close this window or use it for other tasks."
echo ""
```

---

## Summary

The launcher:
1. Validates brainstorm files exist (v11 requirement)
2. Asks configuration questions
3. Copies `orchestrator-v11.md` to project's `.claude/CLAUDE.md`
4. Creates initial manifest
5. Spawns orchestrator in new Windows Terminal
6. Injects BEGIN message to start the pipeline

The orchestrator then takes over and manages phases 2-5 automatically.
