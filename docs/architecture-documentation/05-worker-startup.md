# Worker Startup Process

**Created:** 2026-01-08
**Status:** Complete Reference

---

## Overview

When the orchestrator spawns a worker, it follows a minimal injection approach. The worker's CLAUDE.md is pre-prepared with complete instructions, so only a simple trigger message is needed.

---

## CLAUDE.md Loading

Worker's CLAUDE.md is prepared by the spawn script before Claude starts:

### Step 1: Copy Phase-Specific Content
```powershell
Copy-Item "$pipelineOffice\claude-md\phase-$PhaseNumber.md" "$project\.claude\CLAUDE.md"
```

### Step 2: Append Shared Worker Rules
```powershell
Add-Content "$project\.claude\CLAUDE.md" (Get-Content "$pipelineOffice\claude-md\_worker-base.md")
```

### Result: Combined CLAUDE.md Contains
- Full phase instructions (what to do)
- Todo list to initialize (tasks to track)
- Phase-specific rules (constraints and outputs)
- Shared worker rules (universal behaviors)

---

## Phase-N.md Content Structure

Each `phase-N.md` file contains:

```markdown
# Phase N: [Phase Name]

**Purpose:** [What this phase accomplishes]
**Input:** [Required inputs]
**Output:** [Expected outputs]
**Mode:** [Interactive or Autonomous]

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. First task", status: "in_progress", activeForm: "Doing first task" },
  { content: "2. Second task", status: "pending", activeForm: "Doing second task" },
  ...
])
```

---

## Step 1: [Task Name]

[Detailed instructions for step 1]

---

## Step 2: [Task Name]

[Detailed instructions for step 2]

...
```

---

## _worker-base.md Content Structure

The shared worker rules file contains:

```markdown
# Worker Base Rules

## Rule 1: WebSearch First
[Universal search-before-implementing rule]

## Rule 2: No Mocking
[Forbidden mocking patterns]

## Rule 3: Completeness Pairs
[Add/Delete, Open/Close requirements]

## Rule 4: No Placeholders
[No empty handlers rule]

## Rule 5: Todo Tracking
[How to update todos]

## Rule 6: Test Investigation Order
[Check code before tests]

...
```

---

## Startup Injection

Since CLAUDE.md already contains complete phase instructions, the orchestrator injects only:

```
BEGIN
```

This single word triggers the worker to start executing based on CLAUDE.md content.

---

## Worker Initialization Sequence

When worker starts:

1. **Claude Code launches** in project directory with `--dangerously-skip-permissions`
2. **CLAUDE.md loaded** automatically by Claude Code
3. **"BEGIN" message received** via injection
4. **Todo list initialized** from phase instructions
5. **First task marked** `in_progress`
6. **Execution begins** following phase steps

---

## Spawn Script Command

The full spawn command:

```powershell
# In spawn-worker-wt.ps1
wt -w "Pipeline-$OrchestratorPid" split-pane -H -s 0.5 `
    --title "Worker" `
    pwsh -NoExit -Command "cd '$ProjectPath'; claude --dangerously-skip-permissions"
```

After Claude is ready (detected by watching for prompt), inject:

```powershell
# Inject BEGIN message
& "$pipelineOffice\lib\inject-message.ps1" -Message "BEGIN" -TargetPid $WorkerPid
```

---

## Worker Flags

| Flag | Purpose |
|------|---------|
| `--dangerously-skip-permissions` | Skip permission prompts for autonomous execution |

---

## Detection: Claude Ready

The spawn script detects when Claude is ready by:

1. Watching console output for Claude prompt indicator
2. Waiting for stable state (no output for 2 seconds)
3. Then injecting BEGIN message

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-08 | Initial document |
| 2026-01-13 | Made standalone (added full spawn details and CLAUDE.md structure) |
