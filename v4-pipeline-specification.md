# v4.2 Pipeline Specification - Automated E2E Driven Development

**Version:** 4.2
**Date:** 2025-11-25
**Status:** Active

---

## Core Philosophy

**Quality → Speed → Cost**

Success = E2E tests pass in deployed environment

---

## What's New in v4.2

1. **Unified CLI**: Single `./pipeline` command replaces multiple scripts
2. **Shared libraries**: DRY codebase with `lib/` containing common functions
3. **Pre-flight checks**: Validates docs exist before pipeline start
4. **Status command**: Real-time pipeline status visibility
5. **Send/Stop helpers**: Easier interaction with running sessions
6. **Backwards compatibility**: Old scripts still work (deprecated wrappers)

### Migration from v4.1

Old commands still work but are deprecated:
```bash
# Old (deprecated)
./start-brainstorm.sh /path/project
./start-brainstorm.sh /path/project feature
./start-pipeline.sh /path/project
./newFeature-pipeline.sh /path/project

# New (recommended)
./pipeline brainstorm /path/project
./pipeline brainstorm /path/project --feature
./pipeline run /path/project
./pipeline run /path/project --feature
```

---

## Pipeline CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `./pipeline brainstorm <project> [--feature]` | Interactive brainstorm session |
| `./pipeline run <project> [--feature] [--from N]` | Run automated pipeline (0b→3) |
| `./pipeline step <N> <project> [--feature]` | Run individual step |
| `./pipeline status <project>` | Show pipeline status |
| `./pipeline send <project> <message>` | Send input to running session |
| `./pipeline stop <project>` | Stop session gracefully |
| `./pipeline analyze <project> [run-id]` | Analyze completed run |
| `./pipeline help` | Show help |

### Shortcuts

| Full | Short |
|------|-------|
| `brainstorm` | `bs` |
| `run` | `r` |
| `step` | `s` |
| `status` | `st` |
| `analyze` | `a` |

---

## Pipeline Modes

### New Project Mode

For building applications from scratch.

```bash
./pipeline brainstorm /path/project    # Phase 0a (interactive)
./pipeline run /path/project           # Phases 0b→1→2→3 (automated)
```

**Characteristics:**
- Starts with blank slate
- User stories start at US-001
- E2E tests only for new features

### New Feature Mode

For adding features to existing applications.

```bash
./pipeline brainstorm /path/project --feature    # Phase 0a (interactive)
./pipeline run /path/project --feature           # Phases 0b→1→2→3 (automated)
```

**Characteristics:**
- Reads existing codebase context first
- Continues numbering from last US-XXX
- Phase 3 runs ALL E2E tests (regression + new)
- Handles superseding stories

---

## Execution Model

### Non-Interactive Execution

Each step runs via expect script wrapper that:
1. Spawns Claude with `--model opus --dangerously-skip-permissions`
2. Sends slash command to execute
3. Waits for `PIPELINE:COMPLETE`
4. Captures full transcript
5. Has 1-hour hard timeout (absence of COMPLETE = timeout)

### Timeout Enforcement

**Implementation:** `lib/expect-step.exp` uses `expect -timeout 3600`

**CRITICAL: AI is NOT aware of this timeout**
- AI-facing prompts contain NO mention of timeout or time limits
- AI operates with endless loop mentality: "Keep trying until success"
- Timer is purely infrastructure-level enforcement

### Signal Codes

**Only one signal code:** `PIPELINE:COMPLETE`

- Commands output `PIPELINE:COMPLETE` when step finishes successfully
- No FAILED code - commands must try until complete or timeout
- Interruption/pause is handled by external stop signal, not a code
- Orchestrator detects timeout by absence of COMPLETE within time limit

---

## Pipeline Phases

```
Phase 0: Brainstorm & Technical Specs
  └── 0a: Brainstorm + User Stories (interactive)
  └── 0b: E2E Test Specs + Tech Stack (automated)

Phase 1: Bootstrap
  └── Deploy skeleton app
  └── Implement E2E tests (all RED)

Phase 2: Implement & Validate (per epic, batched)
  └── Batch 1-N: Implement 2-3 stories
  └── Each batch: code → test → BATCH_COMPLETE
  └── Final batch: COMPLETE
  └── Run E2E tests
  └── Fix until GREEN (no limit)

Phase 3: Finalize
  └── Polish & refactor
  └── Non-functional checks
  └── Final deployment
  └── [Feature mode: Run ALL E2E tests including previous]
```

---

## File Structure

### Pipeline Office
```
Pipeline-Office/
├── pipeline                    # Unified CLI (v4.2)
├── lib/
│   ├── common.sh              # Shared utilities
│   ├── transcript.sh          # Transcript functions
│   ├── expect-interactive.exp # Interactive expect script
│   └── expect-step.exp        # Step execution expect script
├── run-step.sh                # Step runner
├── init-manifest.sh           # Manifest initialization
├── update-manifest.sh         # Manifest updates
├── analyze-pipeline.sh        # Post-run analysis
├── resume-brainstorm.sh       # Resume stopped brainstorm (needs rework)
├── start-brainstorm.sh        # DEPRECATED wrapper
├── start-pipeline.sh          # DEPRECATED wrapper
├── newFeature-pipeline.sh     # DEPRECATED wrapper
├── v4-pipeline-specification.md  # This file
└── CLAUDE.md                  # Project context
```

### Project Structure
```
project/
├── docs/
│   ├── brainstorm-notes.md
│   ├── user-stories.md
│   ├── e2e-test-specs.md
│   ├── tech-stack.md
│   └── requirements.md
├── cypress/
│   └── e2e/
├── src/
└── .pipeline/
    ├── manifest.json
    ├── current-run.txt
    └── runs/
        └── YYYYMMDD-HHMMSS/
            ├── metadata.json
            ├── 0a-transcript.md
            ├── 0b-transcript.md
            ├── 1-transcript.md
            ├── 2-epic-1-transcript.md
            ├── 2-epic-2-transcript.md
            ├── 3-transcript.md
            └── analysis/
```

---

## Manifest Schema

```json
{
  "version": "4.2",
  "runId": "20251125-143000",
  "project": {
    "name": "project-name",
    "path": "/full/path"
  },
  "mode": "new-project|new-feature",
  "status": "in-progress|complete|failed",
  "startedAt": "ISO timestamp",
  "completedAt": "ISO timestamp or null",
  "currentPhase": "0b|1|2|3|complete",
  "currentEpic": 1,
  "epics": [
    {
      "id": 1,
      "name": "Epic Name",
      "status": "pending|in-progress|complete",
      "stories": ["US-001", "US-002"]
    }
  ],
  "tests": {
    "total": 12,
    "passing": 8,
    "failing": 4
  },
  "phases": {
    "0a": {"status": "complete", "completedAt": "ISO"},
    "0b": {"status": "in-progress"},
    "1": {"status": "pending"},
    "2": {"status": "pending"},
    "3": {"status": "pending"}
  }
}
```

---

## Pre-flight Checks

Before running automated pipeline, the CLI validates:

1. `docs/user-stories.md` exists
2. `docs/brainstorm-notes.md` exists
3. For feature mode: `src/` or `app/` directory exists

If checks fail, user is prompted to continue or abort.

---

## Interactive Session Control

### Sending Input
```bash
./pipeline send /path/project "Add user authentication feature"
```

### Stopping Gracefully
```bash
./pipeline stop /path/project
```

### Checking Status
```bash
./pipeline status /path/project
```

---

## Workflow Examples

### New Project
```bash
# 1. Create project directory
mkdir -p /home/claude/IMT/my-app

# 2. Interactive brainstorm
./pipeline brainstorm /home/claude/IMT/my-app

# 3. Run automated pipeline
./pipeline run /home/claude/IMT/my-app

# 4. Check status
./pipeline status /home/claude/IMT/my-app

# 5. Analyze results
./pipeline analyze /home/claude/IMT/my-app
```

### Add Feature
```bash
# 1. Interactive feature brainstorm
./pipeline brainstorm /home/claude/IMT/my-app --feature

# 2. Run feature pipeline (with regression protection)
./pipeline run /home/claude/IMT/my-app --feature
```

### Resume from Specific Step
```bash
# Start from step 2 (if step 1 succeeded but 2 failed)
./pipeline run /home/claude/IMT/my-app --from 2
```

---

## Known Limitations (v4.2)

### Resume Functionality Needs Rework
- `resume-brainstorm.sh` exists but needs improvement
- No resume for automated steps (1, 2, 3)
- Session continuity from spec not fully implemented
- Planned for v4.3

### Cost Estimation
- Token counts are estimates from transcript analysis
- Actual costs may vary

---

## Success Criteria

Pipeline is successful when:
- All E2E tests pass (new + regression for feature mode)
- App deployed to dev environment
- User stories validated

---

**Maintained by:** Pipeline Officer
**Location:** `/home/claude/IMT/Pipeline-Office`
