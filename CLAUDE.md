# Pipeline-Office

**Purpose:** Pipeline Officer workspace for system-level pipeline changes

**Location:** `/home/claude/IMT/Pipeline-Office`

**Version:** 6.2.2

---

## Role: Pipeline Officer

You manage the pipeline system architecture, not specific pipeline executions.

**You are responsible for:**
- Pipeline specification (`v4-pipeline-specification.md`)
- Unified CLI (`./pipeline`)
- Shared libraries (`lib/`)
- Step commands (`~/.claude/commands/*-pipeline-*.md`)
- Unit test suite (`tests/run-tests.sh`)

**You are NOT responsible for:**
- Running pipelines (that's Agents)
- Implementing tasks (that's Subagents)

---

## Development Workflow

**When fixing bugs:**
1. Fix the bug
2. **Add unit test for the bug** (prevents regression)
3. Run full test suite: `./tests/run-tests.sh`
4. All tests must pass before committing

**Always suggest adding tests when finding bugs.**

**When updating VERSION:**
```bash
./sync-version.sh 5.2.7   # Update VERSION and sync everywhere
# OR
echo "5.2.7" > VERSION && ./sync-version.sh  # Manual edit then sync
```
This automatically updates: CLAUDE.md header, and warns if skill commands need renaming (major.minor change only).

---

## Quick Reference

```bash
# New project (runs all phases 0a→0b→1→2→3)
./pipeline run /path/to/project

# Resume from saved state (reads manifest.currentPhase)
./pipeline run /path/to/project

# Start from specific phase (override)
./pipeline run /path/to/project --from 0b

# New feature mode
./pipeline run /path/to/project --feature

# Windows / No-tmux (foreground mode)
./pipeline run /path/to/project --foreground   # Or auto-detected

# Individual step
./pipeline step 2 /path/to/project

# Status & interaction
./pipeline status /path/to/project
./pipeline send /path/to/project "message"
./pipeline stop /path/to/project
./pipeline watch /path/to/project  # tmux attach or tail log

# Analysis
./pipeline analyze /path/to/project
```

---

## Unit Tests

```bash
cd /home/claude/IMT/Pipeline-Office/tests
./run-tests.sh              # Run all (currently 57 tests)
./run-tests.sh manifest     # Run specific test
./run-tests.sh signal       # Run signal tests
```

**Run tests before any pipeline changes.**

---

## Key Files

| File | Purpose |
|------|---------|
| `./pipeline` | Unified CLI |
| `supervisor.md` | Supervisor skill (orchestrates pipeline) |
| `run-analyze.sh` | Analysis runner with tmux/monitoring |
| `sync-version.sh` | Version sync (propagates to all files) |
| `lib/common.sh` | Shared utilities |
| `lib/analyze-run.sh` | Main analysis logic |
| `lib/transcript.sh` | Transcript functions |
| `lib/parallel-cypress.sh` | Parallel test runner (v6.2) |
| `run-analyze-pipeline.sh` | Phased analysis runner (A→B→C) |
| `tests/run-tests.sh` | Unit test suite |
| `v4-pipeline-specification.md` | Full specification |
| `docs/analysis-pipeline.md` | Analysis pipeline documentation |
| `VERSION` | Pipeline version (source of truth) |

---

## Pipeline Flow

**Phases:**
- **0a (Brainstorm):** Interactive, creates user stories
- **0b (Technical):** E2E specs + tech stack
- **1 (Bootstrap):** Skeleton + failing tests (RED)
- **2 (Implement):** Code + passing tests (GREEN) - loops per epic
- **3 (Finalize):** Polish, verify, deploy

---

## Architecture Highlights

### Supervisor-Based Orchestration (v6.0+)
- Supervisor (AI) spawns workers via tmux, reads their output
- Workers do NOT signal completion - supervisor decides when phase is done
- Supervisor kills worker → spawns new worker for next phase
- Decision log and crash recovery built-in
- **Adaptive heartbeat** (v6.1): 2min for fast phases, 5min for complex, 10min during Cypress
- **Progress markers** (v6.1): Workers emit `[PROGRESS]` JSON for supervisor parsing
- **Activity detection** (v6.1): Checks for active processes before nudging
- **Parallel Cypress** (v6.2): Runs epic tests in parallel processes (~3x faster)
- **Adaptive Parallelism** (v6.2.1): Auto-detects CPU cores and RAM to optimize process count. Cross-platform (Linux, macOS, Windows/Git Bash/WSL)
- **Windows Foreground Mode** (v6.2.2): Runs without tmux for Windows Git Bash compatibility. Auto-detects when tmux unavailable. File-based messaging and log tailing.

### Phase 0a: User Approval Required
- Only phase that requires user confirmation
- Supervisor asks user "Do you approve?" before advancing
- All other phases are autonomous

### Phase Completion Flow
1. Supervisor spawns worker with phase command
2. Worker executes phase (creates files, passes tests, etc.)
3. Supervisor reads worker output, checks phase objectives
4. Supervisor kills worker and advances to next phase

### Resume Behavior
- `./pipeline run <project>` reads `manifest.currentPhase` and resumes
- `./pipeline run <project> --from 0b` overrides and starts from specified phase
- Manifest updated after each phase (survives crashes)

### Looping Phases
- Phase 2 loops through epics via `phases[2].loops[]` in manifest
- Each loop completion triggers next iteration until all complete

### Command Versioning
- Commands versioned: `2-pipeline-implementEpic-v6.0.md`
- Version included in command filename for clear tracking

### Deprecated in v6.0
- `./pipeline signal` - kept for compatibility but not used
- `run-step.sh` - archived (supervisor manages workers directly)
- `manager-pipeline` skill - archived (supervisor handles everything)

---

## Monitor Log

```bash
cat /tmp/pipeline-<project>-<step>-monitor.log
```

---

## TODO for v6.3

| Priority | Item |
|----------|------|
| High | Remote worker execution (agent system) |
| Medium | Actual cost tracking (from API usage) |
| Medium | Cypress Cloud integration (optional, for analytics) |
| Low | Parallel analysis |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 6.2.2 | 2025-11-29 | **Windows Foreground Mode:** Added `--foreground` flag for running without tmux. Auto-detects Windows/no-tmux and enables foreground mode. File-based messaging (`./pipeline send`), log tailing (`./pipeline watch`). Cross-platform support for Windows Git Bash. |
| 6.2.1 | 2025-11-29 | **Adaptive Parallelism:** `parallel-cypress.sh` now auto-detects CPU cores and RAM to calculate optimal process count. Cross-platform support for Linux, macOS, Windows (Git Bash, WSL, Cygwin). Reserves cores for system (scales with core count). Shows speedup metrics in results. |
| 6.2.0 | 2025-11-29 | **Parallel Cypress:** Added `lib/parallel-cypress.sh` to run epic tests in parallel (~3x faster). Phase 3 now runs full regression in parallel by default. Phase 2 end-of-phase regression also supports parallel mode. |
| 6.1.0 | 2025-11-29 | **Smart E2E Testing:** Smoke test regression (not full suite per epic), full regression only at Phase 3. **Progress Markers:** Workers emit `[PROGRESS]` JSON for supervisor tracking. **Activity-Based Detection:** Supervisor checks for active processes before nudging. **Smart Nudging:** Context-aware nudge messages based on detected state. **Cypress Grep:** Added @smoke tag support for tiered regression testing. |
| 6.0.1 | 2025-11-28 | Heartbeat interval increased to 5 minutes (was 2 min). Supervisor gets more time to assess worker progress. |
| 6.0 | 2025-11-28 | **Major: Supervisor-based orchestration.** Supervisor reads worker output to judge completion (workers don't signal). Signal command deprecated. run-step.sh and manager-pipeline archived. Added decision logging, crash recovery, cost tracking (estimation). Command versions updated to v6.0. |
| 5.2.24 | 2025-11-27 | Signal updates manifest (not just checkpoint), --from flag for resume, 0a waits for user, test commands use signal |
| 5.2.23 | 2025-11-27 | Analysis pipeline docs, phased analysis (A→B→C) with signal completion |
| 5.2.22 | 2025-11-27 | Signal command: programmatic phase completion (replaces text-based PIPELINE:COMPLETE) |
| 5.2.13 | 2025-11-26 | Analysis: Claude CLI + /analyze-pipeline-v5.2 slash command, controller mode, 128 tests |
| 5.2.12 | 2025-11-26 | Analysis uses Claude CLI (not bash), fix session UUID format, 125 tests |
| 5.2.11 | 2025-11-26 | Fix ls\|wc pipefail bug (exit 2 when no files), remove `local` outside function |
| 5.2.10 | 2025-11-26 | Analysis: 20 sessions (was 5), better step detection, lower thresholds |
| 5.2.9 | 2025-11-26 | Fix jq SIGPIPE bug in analyze-run.sh (5 instances), 122 tests total |
| 5.2.8 | 2025-11-26 | Analysis runs in tmux with monitoring (run-analyze.sh), watch supports analysis |
| 5.2.7 | 2025-11-26 | Comprehensive analysis system tests (12 new test groups, 118 total tests) |
| 5.2.6 | 2025-11-26 | Faster PIPELINE:COMPLETE detection (10s interval), TodoWrite JSONL parsing |
| 5.2.3 | 2025-11-26 | Clear input (C-u) before nudge/send to prevent phantom text concatenation |
| 5.2.2 | 2025-11-26 | Visual mode auto-continue after detach |
| 5.2.1 | 2025-11-26 | Headless mode TTY detection |
| 5.2 | 2025-11-26 | Generic loops, pipeline type/version, command versioning |
| 5.1 | 2025-11-26 | JSONL-based monitoring, todo tracking, stall detection |
| 5.0 | 2025-11-25 | Intelligence system (modules, anti-patterns, fix learner) |

---

**Last Updated:** 2025-11-29
