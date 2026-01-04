# CLAUDE.md-Based Pipeline System Implementation Plan

> **For Claude:** Execute this plan sequentially. Each task builds on the previous.

**Goal:** Replace slash command-based rules with CLAUDE.md files that persist in context for every message, solving the "rules fade from context" problem.

**Architecture:**
- `Pipeline-Office/claude-md/` contains source CLAUDE.md files
- Orchestrator copies appropriate file to project's `.claude/CLAUDE.md` before spawning
- Rules stay in system prompt for entire session

**Tech Stack:** Markdown files, Bash scripts, PowerShell

**Testing Strategy:**
- Manual verification: spawn orchestrator/worker and confirm rules are in context
- Check CLAUDE.md is copied correctly before spawn
- Verify self-reflection checklist appears in worker output

**Execution Strategy:**
- **Parallelization:** NO (sequential dependencies)
- **Reason:** Each file builds on shared content; spawn scripts depend on files existing

---

## Task 1: Create claude-md Directory Structure

**Files:**
- Create: `claude-md/` directory in Pipeline-Office

**Step 1: Create directory**

```bash
mkdir -p "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md"
```

**Step 2: Verify**

```bash
ls -la "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md"
```

Expected: Empty directory exists

---

## Task 2: Create Shared Rules Content (Base Template)

**Files:**
- Create: `claude-md/_shared-rules.md` (template file, not used directly)

**Purpose:** This file contains rules shared by ALL agents (orchestrator + workers). We'll copy relevant sections into each CLAUDE.md file.

**Step 1: Write shared rules template**

```markdown
## Core Rules (All Agents)

### Rule 1: WebSearch First

**Always search for anything technical. Don't rely on training knowledge.**

- Before implementing ANY technical solution → WebSearch first
- Before claiming something is a "limitation" → WebSearch to verify
- When encountering an error → WebSearch the exact error message
- When using a library/API → WebSearch for current documentation

**Examples:**
- How to configure Tauri? → Search before coding
- WebdriverIO drag syntax? → Search before writing test
- "This doesn't work in WebView2" → Search to verify before claiming

**The Rule:** If you're about to write code based on memory, STOP and search first.

---

### Rule 2: Self-Reflection After Every Task

**After completing each task, run this checklist:**

#### Fixed Checklist:
- [ ] Did I search before implementing?
- [ ] Did I check existing code patterns first?
- [ ] Did I avoid placeholders? (empty handlers, console.log stubs)
- [ ] Did I implement both halves of pairs? (add/delete, open/close)
- [ ] Did I handle edge cases?
- [ ] Did I use real actions, not synthetic events?
- [ ] Did I test what was asked, not something easier?
- [ ] If I struggled, did I search for solutions rather than guess?
- [ ] If I claimed a limitation, did I verify it exists?

#### Open Reflection:
- What did I just do?
- Did I cut any corners?
- What could I have missed?

**If any checklist item is NO:** Fix it before moving on.

---
```

**Step 2: Save to file**

Save the above content to `claude-md/_shared-rules.md`

**Step 3: Verify file exists**

```bash
cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/_shared-rules.md" | head -20
```

---

## Task 3: Create Orchestrator CLAUDE.md

**Files:**
- Create: `claude-md/orchestrator.md`
- Reference: Current `commands/orchestrator-desktop-v9.0.md` for protocol content

**Step 1: Read current orchestrator command**

```bash
cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/commands/orchestrator-desktop-v9.0.md"
```

**Step 2: Write orchestrator.md**

Structure:
```markdown
# Pipeline Orchestrator v10.0

You are the Pipeline Orchestrator. You manage pipeline execution by spawning workers and monitoring their progress.

---

## Core Rules (All Agents)

[INSERT SHARED RULES FROM _shared-rules.md]

---

## Orchestrator-Specific Rules

### Self-Reflection Additions (Orchestrator)

After each action, also verify:
- [ ] Did I check worker status before spawning/killing?
- [ ] Did I verify deliverables before advancing phase?
- [ ] Did I update manifest after state changes?

---

## Orchestrator Protocol

[INSERT FULL ORCHESTRATOR PROTOCOL FROM CURRENT COMMAND]

- Dashboard message-driven monitoring
- Startup flow (check existing pipeline, ask questions)
- Resume flow
- Heartbeat handling (section 7)
- Worker completion handling (section 8)
- Phase advancement (section 9)
- Gate checks (Gate 1, Gate 2)
- User interrupts

---
```

**Step 3: Save file**

Save complete orchestrator.md to `claude-md/orchestrator.md`

**Step 4: Verify**

```bash
wc -l "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/orchestrator.md"
```

Expected: ~1200+ lines (full protocol + shared rules)

---

## Task 4: Create Worker Base Content Template

**Files:**
- Create: `claude-md/_worker-base.md` (template for all phase files)

**Step 1: Read current worker base**

```bash
cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/commands/worker-base-desktop-v9.0.md"
```

**Step 2: Write worker base template**

Structure:
```markdown
## Core Rules (All Agents)

[INSERT SHARED RULES FROM _shared-rules.md]

---

## Worker-Specific Rules

### Self-Reflection Additions (Worker)

After each task, also verify:
- [ ] Did I update todos after completing each task?
- [ ] Did I run tests before committing?
- [ ] Did I commit at phase end with proper format?

---

## Worker Base Rules

[INSERT CONTENT FROM worker-base-desktop-v9.0.md]

- Orchestrator communication (todos)
- Forbidden patterns (empty handlers, synthetic events)
- Completeness pairs
- Edge case matrix
- Code patterns first
- Autonomous execution mode
- Parallel tool execution
- Git discipline
- Error handling strategy
- Test cheating detection

---
```

**Step 3: Save to _worker-base.md**

**Step 4: Verify**

```bash
wc -l "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/_worker-base.md"
```

Expected: ~450+ lines

---

## Task 5: Create Phase 1 CLAUDE.md

**Files:**
- Create: `claude-md/phase-1.md`
- Reference: Current phase 1 command for phase-specific content

**Step 1: Find phase 1 command**

```bash
ls "C:/Users/ahunt/.claude/commands/" | grep "1-new-pipeline-desktop"
```

**Step 2: Read phase 1 command**

```bash
cat "C:/Users/ahunt/.claude/commands/1-new-pipeline-desktop-v9.0.md"
```

**Step 3: Write phase-1.md**

Structure:
```markdown
# Pipeline Worker: Phase 1 (Brainstorm)

You are a Pipeline Worker executing Phase 1: User Story Creation.

---

[INSERT FULL _worker-base.md CONTENT]

---

## Phase 1: Brainstorm User Stories

**Goal:** Create comprehensive user stories through interactive discussion with user.

**Deliverable:** `docs/user-stories.md`

**Mode:** INTERACTIVE (this phase uses AskUserQuestion)

[INSERT PHASE 1 SPECIFIC STEPS AND TODOS FROM COMMAND]

---
```

**Step 4: Save to phase-1.md**

**Step 5: Verify**

```bash
head -50 "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/phase-1.md"
```

---

## Task 6: Create Phase 2 CLAUDE.md

**Files:**
- Create: `claude-md/phase-2.md`

**Step 1: Read phase 2 command**

```bash
cat "C:/Users/ahunt/.claude/commands/2-new-pipeline-desktop-v9.0.md"
```

**Step 2: Write phase-2.md**

Structure:
```markdown
# Pipeline Worker: Phase 2 (Test Specs)

You are a Pipeline Worker executing Phase 2: Test Specification Creation.

---

[INSERT FULL _worker-base.md CONTENT]

---

## Phase 2: Write Test Specifications

**Goal:** Create comprehensive test specifications based on user stories.

**Deliverable:** `docs/test-specs.md`

**Mode:** AUTONOMOUS (no user interaction)

[INSERT PHASE 2 SPECIFIC STEPS AND TODOS FROM COMMAND]

---
```

**Step 3: Save to phase-2.md**

**Step 4: Verify**

```bash
head -50 "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/phase-2.md"
```

---

## Task 7: Create Phase 3 CLAUDE.md

**Files:**
- Create: `claude-md/phase-3.md`

**Step 1: Read phase 3 command**

```bash
cat "C:/Users/ahunt/.claude/commands/3-new-pipeline-desktop-v9.0.md"
```

**Step 2: Write phase-3.md**

Structure:
```markdown
# Pipeline Worker: Phase 3 (Bootstrap)

You are a Pipeline Worker executing Phase 3: Project Bootstrap.

---

[INSERT FULL _worker-base.md CONTENT]

---

## Phase 3: Bootstrap Project Skeleton

**Goal:** Create project skeleton with failing tests (RED state).

**Deliverables:**
- `package.json`
- `e2e/` directory with test files
- Basic project structure

**Mode:** AUTONOMOUS (no user interaction)

[INSERT PHASE 3 SPECIFIC STEPS AND TODOS FROM COMMAND]

---
```

**Step 3: Save to phase-3.md**

**Step 4: Verify**

```bash
head -50 "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/phase-3.md"
```

---

## Task 8: Create Phase 4 CLAUDE.md

**Files:**
- Create: `claude-md/phase-4.md`

**Step 1: Read phase 4 command**

```bash
cat "C:/Users/ahunt/.claude/commands/4-new-pipeline-desktop-v9.0.md"
```

**Step 2: Write phase-4.md**

Structure:
```markdown
# Pipeline Worker: Phase 4 (Implement)

You are a Pipeline Worker executing Phase 4: Epic Implementation.

---

[INSERT FULL _worker-base.md CONTENT]

---

## Phase 4: Implement Epic

**Goal:** Implement current epic until all tests pass (GREEN state).

**Deliverables:**
- Working code for epic
- All tests passing
- Git commit with epic changes

**Mode:** AUTONOMOUS (no user interaction)

[INSERT PHASE 4 SPECIFIC STEPS AND TODOS FROM COMMAND]

---
```

**Step 3: Save to phase-4.md**

**Step 4: Verify**

```bash
head -50 "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/phase-4.md"
```

---

## Task 9: Create Phase 5 CLAUDE.md

**Files:**
- Create: `claude-md/phase-5.md`

**Step 1: Read phase 5 command**

```bash
cat "C:/Users/ahunt/.claude/commands/5-new-pipeline-desktop-v9.0.md"
```

**Step 2: Write phase-5.md**

Structure:
```markdown
# Pipeline Worker: Phase 5 (Finalize)

You are a Pipeline Worker executing Phase 5: Quality Audit & Finalization.

---

[INSERT FULL _worker-base.md CONTENT]

---

## Phase 5: Finalize for Production

**Goal:** Run 3-layer quality audit, polish, create final build.

**Deliverables:**
- `docs/quality-audit.md`
- `README.md`
- Final production build

**Mode:** AUTONOMOUS (no user interaction)

[INSERT PHASE 5 SPECIFIC STEPS AND TODOS FROM COMMAND]

---
```

**Step 3: Save to phase-5.md**

**Step 4: Verify**

```bash
head -50 "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/phase-5.md"
```

---

## Task 10: Create Minimal Launcher Command

**Files:**
- Create: `C:/Users/ahunt/.claude/commands/pipeline.md`

**Step 1: Write launcher command**

```markdown
---
name: pipeline
description: Launch the pipeline orchestrator (v10.0 with CLAUDE.md)
---

# Pipeline Launcher

This command launches the Pipeline Orchestrator with persistent rules via CLAUDE.md.

## Steps

### 1. Copy Orchestrator CLAUDE.md to Project

```bash
SOURCE="C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/orchestrator.md"
DEST=".claude/CLAUDE.md"

mkdir -p .claude
cp "$SOURCE" "$DEST"
echo "Copied orchestrator CLAUDE.md"
```

### 2. Spawn Orchestrator in New Terminal

```bash
powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-orchestrator.ps1" -ProjectPath "."
```

### 3. Confirm

Output: "Orchestrator spawned. Check the new terminal window."

Then STOP. The orchestrator runs in the other window.
```

**Step 2: Save to commands directory**

**Step 3: Verify**

```bash
cat "C:/Users/ahunt/.claude/commands/pipeline.md"
```

---

## Task 11: Create spawn-orchestrator.ps1 Script

**Files:**
- Create: `lib/spawn-orchestrator.ps1`

**Step 1: Write spawn script**

```powershell
param(
    [string]$ProjectPath = "."
)

$ErrorActionPreference = "Stop"

# Get absolute path
$AbsPath = (Resolve-Path $ProjectPath).Path

# Spawn Claude in new conhost window
$process = Start-Process -FilePath "conhost.exe" -ArgumentList "powershell.exe", "-NoExit", "-Command", "cd '$AbsPath'; claude" -PassThru

Write-Host "Orchestrator spawned in PID: $($process.Id)"
Write-Host "Project: $AbsPath"
```

**Step 2: Save to lib/spawn-orchestrator.ps1**

**Step 3: Verify**

```bash
cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-orchestrator.ps1"
```

---

## Task 12: Update spawn-worker.ps1 to Copy CLAUDE.md

**Files:**
- Modify: `lib/spawn-worker.ps1`

**Step 1: Read current spawn-worker.ps1**

```bash
cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker.ps1"
```

**Step 2: Add CLAUDE.md copy step**

Add near the beginning of the script (after param block):

```powershell
# Copy phase-specific CLAUDE.md before spawning worker
$ClaudeMdSource = "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/phase-$PhaseNumber.md"
$ClaudeMdDest = Join-Path $ProjectPath ".claude/CLAUDE.md"

if (Test-Path $ClaudeMdSource) {
    New-Item -ItemType Directory -Force -Path (Join-Path $ProjectPath ".claude") | Out-Null
    Copy-Item $ClaudeMdSource $ClaudeMdDest -Force
    Write-Host "Copied phase-$PhaseNumber CLAUDE.md"
} else {
    Write-Warning "CLAUDE.md source not found: $ClaudeMdSource"
}
```

**Step 3: Remove BaseRules parameter (no longer needed)**

The `-BaseRules` parameter is no longer needed since rules are now in CLAUDE.md.

**Step 4: Verify changes**

```bash
cat "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker.ps1" | head -40
```

---

## Task 13: Update Orchestrator to Not Pass BaseRules

**Files:**
- Already handled: orchestrator.md will not reference BaseRules

**Step 1: Verify orchestrator.md doesn't use BaseRules**

Search for BaseRules in the orchestrator.md file:

```bash
grep -n "BaseRules" "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/claude-md/orchestrator.md"
```

Expected: No matches (we removed it when creating orchestrator.md)

**Step 2: If found, remove references**

Remove any `-BaseRules` parameters from spawn-worker calls in orchestrator.md.

---

## Task 14: Test Orchestrator Spawn

**Step 1: Navigate to a test project**

```bash
cd "C:/Users/ahunt/Documents/IMT Claude/test-project"
```

**Step 2: Run launcher command**

In Claude, type: `/pipeline`

**Step 3: Verify CLAUDE.md was copied**

```bash
cat ".claude/CLAUDE.md" | head -30
```

Expected: Shows "# Pipeline Orchestrator v10.0" header

**Step 4: Verify orchestrator window opened**

Check that a new conhost window opened with Claude running.

---

## Task 15: Test Worker Spawn with CLAUDE.md

**Step 1: From orchestrator, let it spawn a Phase 1 worker**

Or manually test:

```bash
powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/spawn-worker.ps1" -ProjectPath "." -PhaseNumber "1" -PhaseCommand "/1-new-pipeline-desktop-v9.0"
```

**Step 2: Verify CLAUDE.md was replaced with phase-1**

```bash
cat ".claude/CLAUDE.md" | head -30
```

Expected: Shows "# Pipeline Worker: Phase 1 (Brainstorm)" header

**Step 3: Verify worker has rules in context**

In the worker window, the rules should persist throughout the session.

---

## Task 16: Commit All Changes

**Step 1: Stage new files**

```bash
cd "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
git add claude-md/
git add lib/spawn-orchestrator.ps1
git add lib/spawn-worker.ps1
git add docs/plans/2026-01-04-claude-md-pipeline-system-implementation.md
```

**Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(v10): implement CLAUDE.md-based pipeline system

- Add claude-md/ directory with orchestrator.md and phase-1 through phase-5.md
- Add shared rules: WebSearch-first, self-reflection checklist
- Add spawn-orchestrator.ps1 for launcher command
- Update spawn-worker.ps1 to copy phase-specific CLAUDE.md
- Remove BaseRules parameter (no longer needed)

Rules now persist in system prompt for entire session instead of fading from context.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Step 3: Verify commit**

```bash
git log -1 --oneline
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `claude-md/` directory exists with 8 files:
  - [ ] `_shared-rules.md`
  - [ ] `_worker-base.md`
  - [ ] `orchestrator.md`
  - [ ] `phase-1.md`
  - [ ] `phase-2.md`
  - [ ] `phase-3.md`
  - [ ] `phase-4.md`
  - [ ] `phase-5.md`
- [ ] `/pipeline` command exists in `~/.claude/commands/`
- [ ] `spawn-orchestrator.ps1` exists in `lib/`
- [ ] `spawn-worker.ps1` copies CLAUDE.md before spawning
- [ ] Test spawn shows correct CLAUDE.md content
- [ ] All changes committed to git

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create directory structure | `claude-md/` |
| 2 | Create shared rules template | `_shared-rules.md` |
| 3 | Create orchestrator CLAUDE.md | `orchestrator.md` |
| 4 | Create worker base template | `_worker-base.md` |
| 5-9 | Create phase 1-5 CLAUDE.md | `phase-1.md` through `phase-5.md` |
| 10 | Create launcher command | `~/.claude/commands/pipeline.md` |
| 11 | Create orchestrator spawn script | `lib/spawn-orchestrator.ps1` |
| 12 | Update worker spawn script | `lib/spawn-worker.ps1` |
| 13 | Remove BaseRules references | `orchestrator.md` |
| 14-15 | Test spawning | Manual verification |
| 16 | Commit all changes | Git |

**Estimated time:** 2-3 hours (mostly copying and organizing existing content)
