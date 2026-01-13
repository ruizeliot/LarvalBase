# Pipeline Execution Flow

**Created:** 2026-01-08

---

## Step 1: User Runs Launcher

**Step 1a:** User opens Claude in project directory
```
cd "C:\Users\ahunt\Documents\IMT Claude\my-project"
claude
```

**Step 1b:** User types launcher command
```
/pipeline-launcher-v10
```

**Step 1c:** Launcher prepares the orchestrator's CLAUDE.md
```bash
cp "Pipeline-Office/claude-md/orchestrator.md" ".claude/CLAUDE.md"
```

**Step 1d:** Launcher spawns the orchestrator window
```bash
# Spawn new Claude session in project directory
```

**Step 1e:** Launcher injects start message to orchestrator
```bash
# Inject "BEGIN" or similar message to trigger orchestrator
```

---

## Step 2: Orchestrator Starts

**Step 2a:** Orchestrator session starts with `orchestrator.md` loaded as CLAUDE.md

**Step 2b:** Orchestrator receives injected start message

**Step 2c:** Orchestrator begins executing based on CLAUDE.md instructions

---

## Step 3: Orchestrator Executes

See: [02-orchestrator-todos.md](./02-orchestrator-todos.md)
