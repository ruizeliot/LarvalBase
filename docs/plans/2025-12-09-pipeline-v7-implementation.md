# Pipeline v7.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a clean three-component pipeline system (Orchestrator, Dashboard, Workers) replacing the complex v6.x system.

**Architecture:** Orchestrator is a Claude slash command that asks user for stack/mode, spawns a Node.js dashboard for display, and spawns worker Claude sessions in separate terminals. Orchestrator periodically checks worker progress via TodoWrite files.

**Tech Stack:** Node.js (dashboard), Claude slash commands (orchestrator + workers), Windows Terminal for worker windows.

---

## Task 1: Archive Legacy Code

**Files:**
- Create: `C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\archive\`
- Move: All `.sh` files, old `lib/` contents, `analysis-pipeline/`, etc.

**Step 1: Create archive directory**

```bash
mkdir -p "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/archive"
```

**Step 2: Move legacy bash scripts to archive**

```bash
cd "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
mv *.sh archive/ 2>/dev/null || true
mv pipeline archive/ 2>/dev/null || true
mv run-*.sh archive/ 2>/dev/null || true
mv init-*.sh archive/ 2>/dev/null || true
mv sync-*.sh archive/ 2>/dev/null || true
```

**Step 3: Move legacy lib files to archive (keep lib/ folder)**

```bash
mkdir -p archive/lib
mv lib/*.sh archive/lib/ 2>/dev/null || true
mv lib/*.cjs archive/lib/ 2>/dev/null || true
mv lib/*.json archive/lib/ 2>/dev/null || true
```

**Step 4: Move other legacy directories**

```bash
mv analysis-pipeline archive/ 2>/dev/null || true
mv agent archive/ 2>/dev/null || true
mv .pipeline archive/dot-pipeline 2>/dev/null || true
```

**Step 5: Verify archive contents**

Run: `ls -la archive/`
Expected: All legacy files moved, Pipeline-Office root is clean

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: archive v6.x legacy code for v7.0 clean slate"
```

---

## Task 2: Create Dashboard Script

**Files:**
- Create: `C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\lib\dashboard.cjs`

**Step 1: Create lib directory if needed**

```bash
mkdir -p "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib"
```

**Step 2: Write dashboard script**

Create file `C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\lib\dashboard.cjs`:

```javascript
#!/usr/bin/env node
/**
 * Pipeline v7.0 Dashboard
 *
 * Displays pipeline progress, reads from manifest and worker todos.
 * Spawned by orchestrator, runs in same terminal.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============ CONFIGURATION ============

const PROJECT_PATH = process.argv[2] || process.cwd();
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const TODOS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'todos');
const REFRESH_INTERVAL = 2000; // 2 seconds

// Phase display names
const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

// ============ STATE ============

let expandedPhases = new Set(); // Phases with expanded todo breakdown
let lastManifest = null;
let lastTodos = null;

// ============ MANIFEST FUNCTIONS ============

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    }
  } catch (err) {
    // Ignore read errors
  }
  return null;
}

// ============ TODO FUNCTIONS ============

function findWorkerTodoFile(sessionId) {
  if (!sessionId || !fs.existsSync(TODOS_DIR)) return null;

  // Pattern: {sessionId}-agent-{sessionId}.json
  const expectedName = `${sessionId}-agent-${sessionId}.json`;
  const todoPath = path.join(TODOS_DIR, expectedName);

  if (fs.existsSync(todoPath)) {
    return todoPath;
  }

  // Fallback: find any file containing the session ID
  try {
    const files = fs.readdirSync(TODOS_DIR);
    for (const file of files) {
      if (file.includes(sessionId) && file.endsWith('.json')) {
        return path.join(TODOS_DIR, file);
      }
    }
  } catch (err) {
    // Ignore
  }

  return null;
}

function readWorkerTodos(sessionId) {
  const todoFile = findWorkerTodoFile(sessionId);
  if (!todoFile) return null;

  try {
    const content = fs.readFileSync(todoFile, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function getTodoStats(todos) {
  if (!Array.isArray(todos) || todos.length === 0) {
    return { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };
  }

  return {
    pending: todos.filter(t => t.status === 'pending').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
    total: todos.length,
    items: todos.map(t => ({ content: t.content, status: t.status }))
  };
}

// ============ FORMATTING ============

function formatTime(ms) {
  if (!ms || ms < 0) return '--:--';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatCost(usd) {
  if (usd === undefined || usd === null) return '$-.--';
  return '$' + parseFloat(usd).toFixed(2);
}

function renderProgressBar(completed, total, width = 20) {
  if (total === 0) return '.'.repeat(width);
  const filled = Math.floor((completed / total) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

// ============ DISPLAY ============

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function render() {
  const manifest = readManifest();
  if (!manifest) {
    console.log('Waiting for manifest...');
    return;
  }

  lastManifest = manifest;

  // Get current worker's todos
  let todoStats = { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };
  const currentPhase = manifest.currentPhase;
  if (currentPhase && manifest.phases[currentPhase]) {
    const sessionId = manifest.phases[currentPhase].workerSessionId;
    if (sessionId) {
      const todos = readWorkerTodos(sessionId);
      todoStats = getTodoStats(todos);
      lastTodos = todos;
    }
  }

  clearScreen();

  // Header
  const projectName = manifest.project?.name || path.basename(PROJECT_PATH);
  const mode = manifest.mode || 'new';

  console.log('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
  console.log(`\x1b[36m║\x1b[0m  PIPELINE DASHBOARD                                  \x1b[36m║\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m  Project: ${projectName.padEnd(15).slice(0, 15)}  │  Mode: ${mode.padEnd(10).slice(0, 10)}   \x1b[36m║\x1b[0m`);
  console.log('\x1b[36m╠══════════════════════════════════════════════════════╣\x1b[0m');
  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m  \x1b[1mPHASES\x1b[0m                                              \x1b[36m║\x1b[0m');

  // Phases
  const phases = ['1', '2', '3', '4', '5'];
  for (const phase of phases) {
    const phaseData = manifest.phases?.[phase] || {};
    const status = phaseData.status || 'pending';
    const name = PHASE_NAMES[phase];

    let icon = '[ ]';
    let color = '';
    if (status === 'complete') {
      icon = '\x1b[32m[✓]\x1b[0m';
    } else if (status === 'running') {
      icon = '\x1b[33m[>]\x1b[0m';
      color = '\x1b[33m';
    } else if (status === 'failed') {
      icon = '\x1b[31m[X]\x1b[0m';
    }

    // Duration and cost for completed phases
    let stats = '';
    if (status === 'complete' && phaseData.duration) {
      const time = formatTime(phaseData.duration);
      const cost = formatCost(phaseData.cost);
      const expandIcon = expandedPhases.has(phase) ? '[-]' : '[+]';
      stats = `  ${time}   ${cost}  ${expandIcon}`;
    } else if (status === 'running' && manifest.phases[phase]?.startedAt) {
      const elapsed = Date.now() - new Date(manifest.phases[phase].startedAt).getTime();
      stats = `  ${formatTime(elapsed)}`;
    }

    console.log(`\x1b[36m║\x1b[0m  ${icon} ${phase}. ${color}${name.padEnd(12)}\x1b[0m${stats.padEnd(30).slice(0, 30)} \x1b[36m║\x1b[0m`);

    // Show expanded todo breakdown for completed phases
    if (expandedPhases.has(phase) && phaseData.todoBreakdown) {
      for (let i = 0; i < phaseData.todoBreakdown.length; i++) {
        const todo = phaseData.todoBreakdown[i];
        const prefix = i === phaseData.todoBreakdown.length - 1 ? '└─' : '├─';
        const todoTime = formatTime(todo.duration);
        const todoCost = formatCost(todo.cost);
        const content = todo.content.slice(0, 25).padEnd(25);
        console.log(`\x1b[36m║\x1b[0m      ${prefix} ${content} ${todoTime} ${todoCost}  \x1b[36m║\x1b[0m`);
      }
    }

    // Show epics under Phase 4
    if (phase === '4' && manifest.epics && manifest.epics.length > 0) {
      for (const epic of manifest.epics) {
        let epicIcon = '[ ]';
        if (epic.status === 'complete') {
          epicIcon = '\x1b[32m[✓]\x1b[0m';
        } else if (epic.status === 'running') {
          epicIcon = '\x1b[33m[>]\x1b[0m';
        }
        const epicName = `Epic ${epic.id}: ${epic.name}`.slice(0, 40);
        console.log(`\x1b[36m║\x1b[0m      ${epicIcon} ${epicName.padEnd(42)} \x1b[36m║\x1b[0m`);
      }
    }
  }

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');

  // Worker progress
  console.log('\x1b[36m║\x1b[0m  \x1b[1mWORKER PROGRESS\x1b[0m                                     \x1b[36m║\x1b[0m');
  if (todoStats.total === 0) {
    console.log('\x1b[36m║\x1b[0m  \x1b[90m(Waiting for worker to create todos...)\x1b[0m             \x1b[36m║\x1b[0m');
  } else {
    const pct = Math.round((todoStats.completed / todoStats.total) * 100);
    const bar = renderProgressBar(todoStats.completed, todoStats.total);
    console.log(`\x1b[36m║\x1b[0m  [${bar}] ${pct}%  (${todoStats.completed}/${todoStats.total} todos)       \x1b[36m║\x1b[0m`);
  }

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');

  // Cost
  console.log('\x1b[36m║\x1b[0m  \x1b[1mCOST\x1b[0m                                                \x1b[36m║\x1b[0m');
  const totalCost = formatCost(manifest.totalCost || 0);
  console.log(`\x1b[36m║\x1b[0m  This run: ${totalCost}                                  \x1b[36m║\x1b[0m`);

  console.log('\x1b[36m║\x1b[0m                                                      \x1b[36m║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');

  // Status line
  if (manifest.status === 'complete') {
    console.log('\n\x1b[32m  ✓ PIPELINE COMPLETE\x1b[0m');
  } else if (manifest.status === 'paused') {
    console.log('\n\x1b[33m  ⏸ PIPELINE PAUSED\x1b[0m');
  }
}

// ============ MAIN ============

function main() {
  console.log('Starting Pipeline Dashboard...');
  console.log(`Project: ${PROJECT_PATH}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log('');

  // Initial render
  render();

  // Refresh loop
  setInterval(render, REFRESH_INTERVAL);

  // Handle exit
  process.on('SIGINT', () => {
    console.log('\nDashboard stopped.');
    process.exit(0);
  });
}

main();
```

**Step 3: Verify file was created**

Run: `ls -la "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/dashboard.cjs"`
Expected: File exists with ~300 lines

**Step 4: Test dashboard runs without errors**

Run: `node "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/dashboard.cjs" --help`
Expected: Starts and shows "Waiting for manifest..."

**Step 5: Commit**

```bash
cd "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
git add lib/dashboard.cjs
git commit -m "feat: add v7.0 dashboard script"
```

---

## Task 3: Create Orchestrator Slash Command

**Files:**
- Create: `C:\Users\ahunt\.claude\commands\orchestrator.md`

**Step 1: Write orchestrator command**

Create file `C:\Users\ahunt\.claude\commands\orchestrator.md`:

```markdown
# Pipeline Orchestrator

You are the Pipeline Orchestrator. You manage the pipeline execution by spawning workers and monitoring their progress.

## Your Responsibilities

1. **Ask user for configuration** (only at startup)
2. **Initialize the project** (create .pipeline/, manifest.json)
3. **Spawn the dashboard** (runs in background)
4. **Spawn workers** (one at a time, in new terminal windows)
5. **Monitor progress** (check every 2-3 minutes via TodoWrite)
6. **Advance phases** (kill worker, analyze, spawn next)

## Startup Flow

When first loaded, ask the user:

1. "What type of stack?" - Options: desktop (Tauri), terminal (Ink), web (React)
2. "What type of pipeline?" - Options: new (full 5 phases), feature (phases 1-3), fix (phase 2 only)

## Phase Commands (Desktop Stack)

| Phase | Command | Purpose |
|-------|---------|---------|
| 1 | `/1-new-pipeline-desktop-v6.0` | Brainstorm - user stories, epics |
| 2 | `/2-new-pipeline-desktop-v6.0` | Technical - E2E specs |
| 3 | `/3-new-pipeline-desktop-v6.0` | Bootstrap - skeleton, failing tests |
| 4 | `/4-new-pipeline-desktop-v6.0` | Implement - code until tests pass |
| 5 | `/5-new-pipeline-desktop-v6.0` | Finalize - polish, verify |

## Initialization

After user answers questions, do the following:

1. Create `.pipeline/` directory if it doesn't exist
2. Copy dashboard script: `cp "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/dashboard.cjs" .pipeline/`
3. Create initial manifest.json:

```json
{
  "version": "7.0",
  "project": {
    "name": "<project-folder-name>",
    "path": "<full-project-path>"
  },
  "stack": "<user-choice>",
  "mode": "<user-choice>",
  "status": "running",
  "currentPhase": "1",
  "createdAt": "<now-iso>",
  "epics": [],
  "phases": {
    "1": { "status": "pending" },
    "2": { "status": "pending" },
    "3": { "status": "pending" },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  },
  "totalCost": 0
}
```

4. Spawn dashboard: `node .pipeline/dashboard.cjs`
5. Spawn first worker

## Spawning Workers

Use this command to spawn a worker in a new Windows Terminal:

```bash
cmd.exe /c start wt.exe --title "Worker-Phase-<N>" -d "<project-path>" cmd /k claude "/<phase-command>" --dangerously-skip-permissions
```

Example:
```bash
cmd.exe /c start wt.exe --title "Worker-Phase-1" -d "C:/Users/ahunt/Documents/my-project" cmd /k claude "/1-new-pipeline-desktop-v6.0" --dangerously-skip-permissions
```

After spawning, update the manifest:
- Set `phases[N].status = "running"`
- Set `phases[N].startedAt = <now-iso>`
- Set `phases[N].workerSessionId = <generate-uuid>`

## Monitoring Progress

Every 2-3 minutes, check the worker's progress:

1. Read the worker's todo file from `~/.claude/todos/`
   - Pattern: `<sessionId>-agent-<sessionId>.json`
2. Parse the todos and check completion status
3. If all todos are completed (status === "completed"), the phase is done

To find the todo file:
```bash
ls ~/.claude/todos/ | grep <sessionId>
```

To read todos:
```bash
cat ~/.claude/todos/<sessionId>-agent-<sessionId>.json
```

## Phase Completion

When a phase completes:

1. **Kill the worker window:**
```bash
taskkill /FI "WINDOWTITLE eq Worker-Phase-<N>" /F
```

2. **Update manifest:**
   - Set `phases[N].status = "complete"`
   - Set `phases[N].completedAt = <now-iso>`
   - Set `phases[N].duration = completedAt - startedAt`
   - Set `currentPhase = <next-phase>`

3. **Extract epics (after Phase 1):**
   - Read `docs/user-stories.md`
   - Parse epic definitions
   - Update `manifest.epics` array

4. **Spawn next worker** (if more phases remain)

## Phase 4 Epic Looping

Phase 4 (Implement) loops through epics:

1. Set `phases[4].currentEpic = <epic-id>`
2. Spawn worker with `/4-new-pipeline-desktop-v6.0`
3. When complete, mark epic as complete
4. If more epics, spawn worker again for next epic
5. When all epics complete, advance to Phase 5

## Graceful Stop

If user presses Ctrl+C or asks to stop:

1. Kill worker window
2. Update manifest: `status = "paused"`
3. Save state so it can be resumed

## Resume

If manifest exists with `status = "paused"`:

1. Ask user: "Resume from Phase <N>?"
2. If yes, spawn worker for current phase
3. Continue monitoring

## Important Notes

- **DO NOT watch continuously** - only check every 2-3 minutes
- **Trust the worker** - let it work autonomously
- **Update manifest frequently** - enables crash recovery
- **Keep responses concise** - you're orchestrating, not implementing
```

**Step 2: Verify file was created**

Run: `ls -la "C:/Users/ahunt/.claude/commands/orchestrator.md"`
Expected: File exists

**Step 3: Commit**

```bash
cd "C:/Users/ahunt/.claude/commands"
git add orchestrator.md
git commit -m "feat: add v7.0 orchestrator slash command"
```

---

## Task 4: Update Pipeline-Office CLAUDE.md

**Files:**
- Modify: `C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\CLAUDE.md`

**Step 1: Replace CLAUDE.md with v7.0 documentation**

Create new content for `C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\CLAUDE.md`:

```markdown
# Pipeline-Office

**Version:** 7.0
**Architecture:** Orchestrator + Dashboard + Workers

---

## Overview

Pipeline v7.0 is a clean three-component system:

| Component | Technology | Role |
|-----------|------------|------|
| **Orchestrator** | Claude slash command | Brain - spawns workers, monitors progress |
| **Dashboard** | Node.js | Display - shows phases, epics, todos, cost |
| **Workers** | Claude in terminals | Execution - runs phase commands |

## Quick Start

```bash
# 1. Navigate to your project
cd /path/to/your-project

# 2. Start Claude
claude

# 3. Run the orchestrator
/orchestrator
```

The orchestrator will ask for stack type and pipeline mode, then manage everything.

## File Structure

```
Pipeline-Office/
├── lib/
│   └── dashboard.cjs      # Dashboard source (copied to projects)
├── docs/
│   └── plans/             # Design and implementation docs
├── archive/               # Legacy v6.x code (reference only)
└── CLAUDE.md              # This file
```

## Per-Project Files

When orchestrator initializes a project:

```
<project>/
├── .pipeline/
│   ├── manifest.json      # Pipeline state
│   └── dashboard.cjs      # Dashboard script
└── docs/
    ├── user-stories.md    # From Phase 1
    └── e2e-test-specs.md  # From Phase 2
```

## Commands

| Command | Location | Purpose |
|---------|----------|---------|
| `/orchestrator` | `~/.claude/commands/` | Start pipeline orchestration |
| `/1-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 1: Brainstorm |
| `/2-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 2: Technical |
| `/3-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 3: Bootstrap |
| `/4-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 4: Implement |
| `/5-new-pipeline-desktop-v6.0` | `~/.claude/commands/` | Phase 5: Finalize |

## How It Works

1. **You start Claude** in your project directory
2. **You run `/orchestrator`** - it asks stack/mode questions
3. **Orchestrator spawns dashboard** - shows in terminal
4. **Orchestrator spawns worker** - opens new terminal window
5. **Worker runs autonomously** - uses TodoWrite for progress
6. **Orchestrator checks every 2-3 min** - reads todo files
7. **When phase complete** - kills worker, spawns next
8. **Repeat until done** - all phases complete

## Manifest Schema

```json
{
  "version": "7.0",
  "project": { "name": "...", "path": "..." },
  "stack": "desktop",
  "mode": "new",
  "status": "running",
  "currentPhase": "3",
  "epics": [
    { "id": 1, "name": "...", "status": "pending" }
  ],
  "phases": {
    "1": { "status": "complete", "duration": 222000, "cost": 0.12 },
    "2": { "status": "complete" },
    "3": { "status": "running", "workerSessionId": "..." },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  },
  "totalCost": 0.41
}
```

## Legacy Code

All v6.x code is archived in `archive/`. Reference only - not used by v7.0.

---

**Last Updated:** 2025-12-09
```

**Step 2: Commit**

```bash
cd "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for v7.0"
```

---

## Task 5: Test Complete Flow

**Files:**
- Uses: All created files

**Step 1: Create a test project directory**

```bash
mkdir -p "C:/Users/ahunt/Documents/IMT Claude/test-pipeline-v7"
cd "C:/Users/ahunt/Documents/IMT Claude/test-pipeline-v7"
```

**Step 2: Start Claude and run orchestrator**

```bash
claude
```

Then type: `/orchestrator`

**Step 3: Answer orchestrator questions**

- Stack: desktop
- Mode: new

**Step 4: Verify initialization**

Check that:
- `.pipeline/manifest.json` was created
- `.pipeline/dashboard.cjs` was copied
- Dashboard is running and showing output
- Worker window opened with Phase 1

**Step 5: Let Phase 1 run for a few minutes**

Watch the worker create todos and make progress.

**Step 6: Verify orchestrator checks progress**

After 2-3 minutes, orchestrator should:
- Read the worker's todo file
- Report progress status
- Continue monitoring

**Step 7: Clean up test**

```bash
rm -rf "C:/Users/ahunt/Documents/IMT Claude/test-pipeline-v7"
```

---

## Task 6: Final Commit

**Step 1: Review all changes**

```bash
cd "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
git status
git log --oneline -5
```

**Step 2: Create release tag**

```bash
git tag -a v7.0.0 -m "Pipeline v7.0 - Clean orchestrator/dashboard/worker architecture"
```

**Step 3: Push changes**

```bash
git push origin master
git push origin v7.0.0
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Archive legacy code | `archive/` |
| 2 | Create dashboard | `lib/dashboard.cjs` |
| 3 | Create orchestrator | `~/.claude/commands/orchestrator.md` |
| 4 | Update docs | `CLAUDE.md` |
| 5 | Test flow | Integration test |
| 6 | Release | Git tag v7.0.0 |

**Estimated time:** 30-45 minutes

**Dependencies:** None - clean slate approach
