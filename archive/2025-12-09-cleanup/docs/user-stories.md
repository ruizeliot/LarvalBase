# Pipeline Dashboard Orchestrator - User Stories

**Version:** 1.1.0
**Created:** 2025-12-05
**Updated:** 2025-12-05
**Total User Stories:** 80

---

## Table of Contents

1. [Execution Control (US-EXEC)](#1-execution-control-us-exec) - 8 stories
2. [Worker Lifecycle (US-WORK)](#2-worker-lifecycle-us-work) - 9 stories ⚠️ **CRITICAL**
3. [Pipeline Modes (US-MODE)](#3-pipeline-modes-us-mode) - 6 stories
4. [Graceful Stop/Resume (US-STOP)](#4-graceful-stopresume-us-stop) - 6 stories
5. [Dashboard Display (US-DASH)](#5-dashboard-display-us-dash) - 7 stories
6. [Todo List Tracking (US-TODO)](#6-todo-list-tracking-us-todo) - 6 stories
7. [Cost Tracking (US-COST)](#7-cost-tracking-us-cost) - 6 stories
8. [Epic Loop Tracking (US-EPIC)](#8-epic-loop-tracking-us-epic) - 5 stories
9. [Manifest Management (US-MAN)](#9-manifest-management-us-man) - 5 stories
10. [Dependencies (US-DEP)](#10-dependencies-us-dep) - 4 stories
11. [Error Handling (US-ERR)](#11-error-handling-us-err) - 5 stories
12. [Logging (US-LOG)](#12-logging-us-log) - 4 stories
13. [Analytics (US-ANA)](#13-analytics-us-ana) - 3 stories
14. [CLI Arguments (US-CLI)](#14-cli-arguments-us-cli) - 2 stories
15. [Test System Metrics (US-TEST)](#15-test-system-metrics-us-test) - 4 stories ⭐ **NEW**

---

## 1. Execution Control (US-EXEC)

### US-EXEC-001: Start Pipeline
**As a** developer
**I want to** start the pipeline orchestrator with a project path
**So that** I can automate the development workflow

**Acceptance Criteria:**
- [ ] Orchestrator accepts project path as first argument
- [ ] Orchestrator validates project path exists
- [ ] Orchestrator initializes manifest if not present
- [ ] Orchestrator displays startup banner with project info

---

### US-EXEC-002: Phase Timeouts
**As a** developer
**I want to** have automatic phase timeouts with dynamic limits
**So that** phases don't run indefinitely

**Acceptance Criteria:**
- [ ] Each phase has a configurable timeout
- [ ] Timeouts are phase-specific (Phase 4 longer than Phase 1)
- [ ] Warning displayed when approaching timeout
- [ ] Phase terminates gracefully when timeout reached

---

### US-EXEC-003: Disable Timeouts
**As a** developer
**I want to** disable phase timeouts with `--no-timeout` flag
**So that** I can run long operations without interruption

**Acceptance Criteria:**
- [ ] `--no-timeout` flag is parsed from CLI
- [ ] When enabled, no timeout checks occur
- [ ] Configuration message displayed at startup
- [ ] Flag persists for entire session

---

### US-EXEC-004: Phase Retry Logic
**As a** developer
**I want to** have automatic retry when a phase fails
**So that** transient errors don't stop the pipeline

**Acceptance Criteria:**
- [ ] Failed phases are retried automatically
- [ ] Retry count is configurable via `--max-restarts`
- [ ] Delay between retries (5 seconds default)
- [ ] After max retries, pipeline pauses with error

---

### US-EXEC-005: Worker Spawning
**As a** developer
**I want to** spawn Claude workers in Windows Terminal
**So that** phases execute in isolated processes

**Acceptance Criteria:**
- [ ] Workers spawn via `wt.exe` on Windows
- [ ] Worker receives correct session ID
- [ ] Worker receives correct todo file path
- [ ] Worker process is tracked by orchestrator

---

### US-EXEC-006: Worker Process Monitoring
**As a** developer
**I want to** monitor worker process status
**So that** I know if a worker crashes or exits

**Acceptance Criteria:**
- [ ] Worker exit code is captured
- [ ] Worker crash is detected
- [ ] Orchestrator handles worker termination gracefully
- [ ] Log entry created for worker status changes

---

### US-EXEC-007: Worker Stuck Detection
**As a** developer
**I want to** detect when a worker is stuck (no progress for 10+ minutes)
**So that** I can take corrective action

**Acceptance Criteria:**
- [ ] Progress is tracked via todo list changes
- [ ] 10-minute threshold for stuck detection
- [ ] Warning displayed when worker appears stuck
- [ ] Warning repeats every 10 minutes if still stuck

---

### US-EXEC-008: Phase Completion Detection
**As a** developer
**I want to** detect when a phase is complete
**So that** the pipeline can advance to the next phase

**Acceptance Criteria:**
- [ ] Phase completion detected via all todos completed
- [ ] Phase completion logged with timestamp
- [ ] Manifest updated with phase completion
- [ ] Next phase initiated automatically

---

## 2. Worker Lifecycle (US-WORK) ⚠️ CRITICAL

> **Why Critical:** Without proper worker lifecycle management, orphan Claude processes accumulate,
> consuming resources and potentially causing conflicts. Each pipeline must manage only its own workers.

### US-WORK-001: Worker PID Tracking
**As a** developer
**I want to** track PIDs of all workers spawned by my pipeline
**So that** I can manage their lifecycle

**Acceptance Criteria:**
- [ ] Worker PID stored immediately after spawn
- [ ] PID stored in manifest under `workerPids[]`
- [ ] PID associated with pipeline instance ID
- [ ] Multiple concurrent pipelines have separate PID lists

---

### US-WORK-002: Kill Previous Worker on New Spawn
**As a** developer
**I want to** automatically kill the previous worker when spawning a new one
**So that** orphan processes don't accumulate

**Acceptance Criteria:**
- [ ] Previous worker killed before spawning new one
- [ ] Kill uses SIGTERM first, SIGKILL after 5s timeout
- [ ] Kill logged with reason
- [ ] Graceful handling if previous worker already exited

---

### US-WORK-003: Pipeline Instance Isolation
**As a** developer
**I want to** each pipeline to manage only its own workers
**So that** multiple concurrent pipelines don't interfere

**Acceptance Criteria:**
- [ ] Pipeline has unique instance ID
- [ ] Workers tagged with pipeline instance ID
- [ ] Kill operations only affect same-instance workers
- [ ] No cross-pipeline interference

---

### US-WORK-004: Worker Cleanup on Pipeline Exit
**As a** developer
**I want to** all workers killed when pipeline exits
**So that** no orphan processes remain

**Acceptance Criteria:**
- [ ] All tracked PIDs killed on normal exit
- [ ] All tracked PIDs killed on error exit
- [ ] All tracked PIDs killed on Ctrl+C
- [ ] Cleanup logged with kill count

---

### US-WORK-005: Orphan Detection
**As a** developer
**I want to** detect orphan Claude processes from crashed pipelines
**So that** I can clean them up

**Acceptance Criteria:**
- [ ] Check for Claude processes on startup
- [ ] Identify processes from previous crashed pipelines
- [ ] Offer to kill orphans (with confirmation)
- [ ] List orphan PIDs and their age

---

### US-WORK-006: Worker Process Verification
**As a** developer
**I want to** verify a worker process is still running
**So that** I know if it crashed

**Acceptance Criteria:**
- [ ] PID existence checked periodically
- [ ] Process name verified (not just PID reuse)
- [ ] Crash detected and logged
- [ ] Retry logic triggered on crash

---

### US-WORK-007: Windows Process Management
**As a** developer
**I want to** worker lifecycle to work on Windows
**So that** Windows users have the same functionality

**Acceptance Criteria:**
- [ ] `taskkill` used instead of `kill` on Windows
- [ ] Process tree killed (child processes too)
- [ ] PowerShell fallback if taskkill fails
- [ ] Same behavior as Linux/macOS

---

## 3. Pipeline Modes (US-MODE)

### US-MODE-001: New Project Mode
**As a** developer
**I want to** run the full 5-phase pipeline for new projects
**So that** I can create applications from scratch

**Acceptance Criteria:**
- [ ] `--mode new` activates new project mode
- [ ] All 5 phases execute (1-5)
- [ ] Mode recorded in manifest
- [ ] Dashboard displays correct mode

---

### US-MODE-002: Feature Mode
**As a** developer
**I want to** run a 3-phase pipeline for adding features
**So that** I can extend existing applications efficiently

**Acceptance Criteria:**
- [ ] `--mode feature` activates feature mode
- [ ] Only phases 1, 2, 3 execute
- [ ] Mode recorded in manifest
- [ ] Dashboard displays correct mode

---

### US-MODE-003: Fix Mode
**As a** developer
**I want to** run a single-phase pipeline for bug fixes
**So that** I can quickly address issues

**Acceptance Criteria:**
- [ ] `--mode fix` activates fix mode
- [ ] Only phase 2 executes
- [ ] Mode recorded in manifest
- [ ] Dashboard displays correct mode

---

### US-MODE-004: Mode Persistence
**As a** developer
**I want to** have the pipeline mode persist across restarts
**So that** resumed pipelines use the same mode

**Acceptance Criteria:**
- [ ] Mode stored in manifest.json
- [ ] Mode loaded on resume
- [ ] Mode cannot be changed mid-pipeline
- [ ] Warning if mode mismatch detected

---

### US-MODE-005: Phase Sequence by Mode
**As a** developer
**I want to** get the correct phase sequence for my mode
**So that** only relevant phases execute

**Acceptance Criteria:**
- [ ] `getPhaseSequence()` returns correct phases for mode
- [ ] New mode: [1, 2, 3, 4, 5]
- [ ] Feature mode: [1, 2, 3]
- [ ] Fix mode: [2]

---

### US-MODE-006: Default Mode
**As a** developer
**I want to** have 'new' as the default mode
**So that** I don't need to specify mode for new projects

**Acceptance Criteria:**
- [ ] No `--mode` flag defaults to 'new'
- [ ] Default mode logged at startup
- [ ] Dashboard shows 'new' as default

---

## 3. Graceful Stop/Resume (US-STOP)

### US-STOP-001: Ctrl+C Handling
**As a** developer
**I want to** pause the pipeline gracefully with Ctrl+C
**So that** I can stop work without losing progress

**Acceptance Criteria:**
- [ ] Single Ctrl+C triggers pause
- [ ] Second Ctrl+C forces quit
- [ ] "Press Ctrl+C again to force quit" message shown
- [ ] 3-second grace period between presses

---

### US-STOP-002: State Preservation on Pause
**As a** developer
**I want to** have all state saved when pausing
**So that** I can resume exactly where I left off

**Acceptance Criteria:**
- [ ] Current phase saved to manifest
- [ ] Session ID saved to manifest
- [ ] Todo file path saved to manifest
- [ ] Elapsed time saved to manifest
- [ ] Pause timestamp recorded

---

### US-STOP-003: Resume from Pause
**As a** developer
**I want to** resume a paused pipeline
**So that** I can continue where I left off

**Acceptance Criteria:**
- [ ] Paused state detected on startup
- [ ] "Resuming paused pipeline" message shown
- [ ] Same session ID used
- [ ] Same todo file used
- [ ] Elapsed time continues from pause point

---

### US-STOP-004: Pause Reason Recording
**As a** developer
**I want to** record why the pipeline was paused
**So that** I know what happened

**Acceptance Criteria:**
- [ ] Pause reason stored in manifest
- [ ] "User pressed Ctrl+C" for manual pause
- [ ] Error message for crash pause
- [ ] Pause reason displayed on resume

---

### US-STOP-005: Worker Cleanup on Pause
**As a** developer
**I want to** have workers cleaned up when pausing
**So that** no orphan processes remain

**Acceptance Criteria:**
- [ ] Worker process terminated on pause
- [ ] Worker terminal closed if possible
- [ ] No orphan node processes left
- [ ] Cleanup logged

---

### US-STOP-006: Budget Pause
**As a** developer
**I want to** have the pipeline pause when budget is exceeded
**So that** I can control costs

**Acceptance Criteria:**
- [ ] `--budget N` sets spending limit
- [ ] Pipeline pauses when limit reached
- [ ] Pause reason: "Budget limit exceeded"
- [ ] Current cost displayed in pause message

---

## 4. Dashboard Display (US-DASH)

### US-DASH-001: Live Dashboard
**As a** developer
**I want to** see a live-updating dashboard
**So that** I can monitor pipeline progress

**Acceptance Criteria:**
- [ ] Dashboard refreshes every 2 seconds
- [ ] Screen clears between updates
- [ ] No flickering or artifacts
- [ ] Works in Windows Terminal

---

### US-DASH-002: Phase Progress Display
**As a** developer
**I want to** see which phase is currently running
**So that** I know where the pipeline is

**Acceptance Criteria:**
- [ ] Current phase number displayed
- [ ] Phase name displayed
- [ ] Phase status (running/paused/complete)
- [ ] Visual indicator for active phase

---

### US-DASH-003: Todo Progress Bar
**As a** developer
**I want to** see a progress bar for todos
**So that** I can gauge completion percentage

**Acceptance Criteria:**
- [ ] Progress bar shows completed/total
- [ ] Percentage displayed numerically
- [ ] Bar uses color coding (green for complete)
- [ ] Updates in real-time

---

### US-DASH-004: Elapsed Time Display
**As a** developer
**I want to** see elapsed time for the pipeline
**So that** I know how long it's been running

**Acceptance Criteria:**
- [ ] Total elapsed time displayed
- [ ] Current phase elapsed time displayed
- [ ] Format: HH:MM:SS or appropriate unit
- [ ] Continues from resume point

---

### US-DASH-005: Cost Display
**As a** developer
**I want to** see current API cost on the dashboard
**So that** I can track spending

**Acceptance Criteria:**
- [ ] Total cost displayed in USD
- [ ] Current phase cost displayed
- [ ] Session cost displayed
- [ ] Updates in real-time from ccusage

---

### US-DASH-006: Epic Loop Display
**As a** developer
**I want to** see epic loop progress in Phase 4
**So that** I know which epic is being implemented

**Acceptance Criteria:**
- [ ] Current epic number shown
- [ ] Epic name displayed
- [ ] Epic status (pending/in_progress/complete)
- [ ] Epic progress (X of Y epics)

---

### US-DASH-007: Mode Display
**As a** developer
**I want to** see the pipeline mode on the dashboard
**So that** I know which phase sequence is active

**Acceptance Criteria:**
- [ ] Mode displayed (new/feature/fix)
- [ ] Color-coded by mode type
- [ ] Visible in dashboard header
- [ ] Phase sequence shown based on mode

---

## 5. Todo List Tracking (US-TODO)

### US-TODO-001: Todo File Discovery
**As a** developer
**I want to** automatically discover the worker's todo file
**So that** I can track task progress

**Acceptance Criteria:**
- [ ] Todo file located by session ID
- [ ] Path resolved correctly on Windows
- [ ] File existence verified
- [ ] Path stored in manifest

---

### US-TODO-002: Todo Parsing
**As a** developer
**I want to** parse todo items from the JSONL file
**So that** I can display task status

**Acceptance Criteria:**
- [ ] JSONL format parsed correctly
- [ ] Each todo has content and status
- [ ] Handles malformed lines gracefully
- [ ] Returns empty array if file missing

---

### US-TODO-003: Todo Status Tracking
**As a** developer
**I want to** track todo status changes
**So that** I can detect progress

**Acceptance Criteria:**
- [ ] Pending/in_progress/completed statuses tracked
- [ ] Status changes logged
- [ ] Previous state compared to detect changes
- [ ] Stuck detection uses status changes

---

### US-TODO-004: Per-Todo Metrics
**As a** developer
**I want to** store metrics for each completed todo
**So that** I can analyze task performance

**Acceptance Criteria:**
- [ ] Duration recorded for each todo
- [ ] Cost recorded for each todo
- [ ] Token counts recorded
- [ ] Metrics stored in manifest

---

### US-TODO-005: Todo Completion Display
**As a** developer
**I want to** see when todos complete with metrics
**So that** I can track individual task performance

**Acceptance Criteria:**
- [ ] Completion message displayed
- [ ] Duration shown
- [ ] Cost shown
- [ ] Token counts shown

---

### US-TODO-006: Active Todo Highlight
**As a** developer
**I want to** see which todo is currently in progress
**So that** I know what the worker is doing

**Acceptance Criteria:**
- [ ] In-progress todo highlighted
- [ ] Different color/style from pending
- [ ] Only one todo in_progress at a time
- [ ] Spinner or indicator for activity

---

## 6. Cost Tracking (US-COST)

### US-COST-001: ccusage Integration
**As a** developer
**I want to** get real-time cost data from ccusage
**So that** I can track API spending

**Acceptance Criteria:**
- [ ] ccusage output parsed correctly
- [ ] Cost in USD extracted
- [ ] Token counts extracted
- [ ] Updates every dashboard refresh

---

### US-COST-002: Per-Session Cost
**As a** developer
**I want to** track cost for the current session
**So that** I can see this run's spending

**Acceptance Criteria:**
- [ ] Session start cost recorded
- [ ] Current cost minus start = session cost
- [ ] Session cost displayed on dashboard
- [ ] Resets on new session

---

### US-COST-003: Per-Phase Cost
**As a** developer
**I want to** track cost for each phase
**So that** I can see phase-level spending

**Acceptance Criteria:**
- [ ] Phase start cost recorded
- [ ] Phase end cost recorded
- [ ] Phase cost stored in manifest
- [ ] Historical phase costs visible

---

### US-COST-004: Budget Limit
**As a** developer
**I want to** set a budget limit for the pipeline
**So that** spending doesn't exceed my budget

**Acceptance Criteria:**
- [ ] `--budget N` sets limit in USD
- [ ] Limit checked every dashboard refresh
- [ ] Pipeline pauses when limit reached
- [ ] Warning at 80% of budget

---

### US-COST-005: Cost Estimation
**As a** developer
**I want to** see estimated total cost
**So that** I can plan my budget

**Acceptance Criteria:**
- [ ] Estimate based on progress percentage
- [ ] Historical data used if available
- [ ] Estimate displayed on dashboard
- [ ] Updates as pipeline progresses

---

### US-COST-006: Token Breakdown
**As a** developer
**I want to** see input/output/cache token breakdown
**So that** I understand API usage patterns

**Acceptance Criteria:**
- [ ] Input tokens displayed
- [ ] Output tokens displayed
- [ ] Cache read/write tokens displayed
- [ ] Breakdown visible in verbose mode

---

## 7. Epic Loop Tracking (US-EPIC)

### US-EPIC-001: Epic Discovery
**As a** developer
**I want to** discover epics from the manifest
**So that** I can track epic-level progress

**Acceptance Criteria:**
- [ ] Epic list loaded from manifest
- [ ] Epic metadata (name, stories, tests) available
- [ ] Epic order preserved
- [ ] Empty epic list handled

---

### US-EPIC-002: Current Epic Tracking
**As a** developer
**I want to** track which epic is currently being implemented
**So that** I know Phase 4 progress

**Acceptance Criteria:**
- [ ] Current epic determined by status
- [ ] First pending epic is current
- [ ] Current epic highlighted on dashboard
- [ ] Epic transitions logged

---

### US-EPIC-003: Epic Completion
**As a** developer
**I want to** mark epics as complete when done
**So that** the pipeline advances to the next epic

**Acceptance Criteria:**
- [ ] Epic status updated to 'complete'
- [ ] Completion timestamp recorded
- [ ] Tests passing count recorded
- [ ] Next epic becomes current

---

### US-EPIC-004: Epic Duration/Cost
**As a** developer
**I want to** track duration and cost per epic
**So that** I can analyze epic-level performance

**Acceptance Criteria:**
- [ ] Epic start time tracked
- [ ] Epic end time tracked
- [ ] Epic cost calculated
- [ ] Metrics stored in manifest

---

### US-EPIC-005: All Epics Complete Detection
**As a** developer
**I want to** detect when all epics are complete
**So that** Phase 4 can finish

**Acceptance Criteria:**
- [ ] All epics checked for completion
- [ ] Phase 4 marked complete when all epics done
- [ ] Transition to Phase 5 triggered
- [ ] Summary logged with all epic stats

---

## 8. Manifest Management (US-MAN)

### US-MAN-001: Manifest Creation
**As a** developer
**I want to** create a manifest for new projects
**So that** pipeline state is tracked

**Acceptance Criteria:**
- [ ] Manifest created if not exists
- [ ] Project ID set from folder name
- [ ] Project path stored
- [ ] Initial phase set to 1

---

### US-MAN-002: Manifest Reading
**As a** developer
**I want to** read the manifest reliably
**So that** state is restored correctly

**Acceptance Criteria:**
- [ ] JSON parsed without errors
- [ ] Missing file returns null
- [ ] Corrupt file detected
- [ ] Schema validated

---

### US-MAN-003: Manifest Writing
**As a** developer
**I want to** write manifest updates atomically
**So that** state isn't corrupted

**Acceptance Criteria:**
- [ ] Write to temp file first
- [ ] Rename to final path
- [ ] Backup before write
- [ ] JSON formatted with indentation

---

### US-MAN-004: Manifest Backup
**As a** developer
**I want to** have manifest backups
**So that** I can recover from corruption

**Acceptance Criteria:**
- [ ] Backup created before each write
- [ ] Backup path: manifest.json.backup
- [ ] Backup restored if main corrupt
- [ ] Only one backup kept

---

### US-MAN-005: Corrupt Manifest Recovery
**As a** developer
**I want to** recover from corrupt manifests
**So that** pipelines aren't lost

**Acceptance Criteria:**
- [ ] Corruption detected on read
- [ ] Backup file checked
- [ ] Backup restored if valid
- [ ] User notified of recovery

---

## 9. Dependencies (US-DEP)

### US-DEP-001: Node.js Version Check
**As a** developer
**I want to** verify Node.js v18+ is installed
**So that** the orchestrator runs correctly

**Acceptance Criteria:**
- [ ] Node version checked at startup
- [ ] Error if < v18
- [ ] Clear error message with required version
- [ ] Process exits on failure

---

### US-DEP-002: ccusage Check
**As a** developer
**I want to** verify ccusage is available
**So that** cost tracking works

**Acceptance Criteria:**
- [ ] ccusage checked at startup
- [ ] Auto-install attempted if missing
- [ ] Warning if install fails
- [ ] Cost tracking gracefully degraded

---

### US-DEP-003: Claude CLI Check
**As a** developer
**I want to** verify Claude CLI is installed
**So that** workers can spawn

**Acceptance Criteria:**
- [ ] Claude CLI checked at startup
- [ ] Error if not found
- [ ] Clear installation instructions
- [ ] Process exits on failure

---

### US-DEP-004: Windows Terminal Check
**As a** developer
**I want to** verify Windows Terminal is available
**So that** workers can spawn in tabs

**Acceptance Criteria:**
- [ ] wt.exe checked at startup
- [ ] Fallback to cmd.exe if needed
- [ ] Warning if neither available
- [ ] Clear error message

---

## 10. Error Handling (US-ERR)

### US-ERR-001: Worker Crash Handling
**As a** developer
**I want to** handle worker crashes gracefully
**So that** the pipeline can recover

**Acceptance Criteria:**
- [ ] Worker exit detected
- [ ] Exit code logged
- [ ] Retry logic triggered
- [ ] State preserved for recovery

---

### US-ERR-002: Network Error Handling
**As a** developer
**I want to** handle network errors gracefully
**So that** transient issues don't fail the pipeline

**Acceptance Criteria:**
- [ ] API errors caught
- [ ] Retry with backoff
- [ ] Error message logged
- [ ] Pipeline pauses after max retries

---

### US-ERR-003: File System Error Handling
**As a** developer
**I want to** handle file system errors gracefully
**So that** permission/disk issues are reported

**Acceptance Criteria:**
- [ ] EACCES errors caught
- [ ] ENOSPC errors caught
- [ ] Clear error messages
- [ ] Pipeline pauses with instructions

---

### US-ERR-004: Max Restart Limit
**As a** developer
**I want to** have a maximum restart limit
**So that** infinite loops are prevented

**Acceptance Criteria:**
- [ ] Default limit of 3 restarts
- [ ] Configurable via `--max-restarts`
- [ ] Pipeline pauses at limit
- [ ] Clear message about max restarts

---

### US-ERR-005: Consecutive Restart Tracking
**As a** developer
**I want to** track consecutive (not total) restarts
**So that** successful runs reset the counter

**Acceptance Criteria:**
- [ ] Counter increments on failure
- [ ] Counter resets on success
- [ ] Only consecutive failures counted
- [ ] Logged for debugging

---

## 11. Logging (US-LOG)

### US-LOG-001: Pipeline Log File
**As a** developer
**I want to** have all events logged to a file
**So that** I can debug issues

**Acceptance Criteria:**
- [ ] Log file at .pipeline/pipeline.log
- [ ] Timestamps on all entries
- [ ] Log level indicators
- [ ] Rotation/cleanup of old logs

---

### US-LOG-002: Verbose Mode
**As a** developer
**I want to** enable verbose logging
**So that** I can see detailed information

**Acceptance Criteria:**
- [ ] `--verbose` flag enables verbose mode
- [ ] Additional details logged to console
- [ ] ccusage raw output shown
- [ ] Worker stdout shown

---

### US-LOG-003: Phase Transition Logging
**As a** developer
**I want to** log all phase transitions
**So that** I can track pipeline progress

**Acceptance Criteria:**
- [ ] Phase start logged
- [ ] Phase end logged
- [ ] Phase duration logged
- [ ] Phase cost logged

---

### US-LOG-004: Error Logging
**As a** developer
**I want to** log all errors with context
**So that** I can debug failures

**Acceptance Criteria:**
- [ ] Error message logged
- [ ] Stack trace logged
- [ ] Context (phase, epic, todo) logged
- [ ] Severity level indicated

---

## 12. Analytics (US-ANA)

### US-ANA-001: Pipeline Run Recording
**As a** developer
**I want to** record each pipeline run
**So that** I can analyze historical performance

**Acceptance Criteria:**
- [ ] Run ID generated
- [ ] Start/end timestamps recorded
- [ ] Total cost recorded
- [ ] Success/failure recorded

---

### US-ANA-002: Phase Statistics
**As a** developer
**I want to** store phase-level statistics
**So that** I can analyze phase performance

**Acceptance Criteria:**
- [ ] Duration per phase stored
- [ ] Cost per phase stored
- [ ] Status per phase stored
- [ ] Accessible in manifest.phaseStats

---

### US-ANA-003: Pipeline Runs History
**As a** developer
**I want to** store history of pipeline runs
**So that** I can compare performance over time

**Acceptance Criteria:**
- [ ] Runs stored in pipeline-runs.json
- [ ] Last N runs kept (e.g., 50)
- [ ] Summary statistics calculated
- [ ] Accessible for reporting

---

## 13. CLI Arguments (US-CLI)

### US-CLI-001: Argument Parsing
**As a** developer
**I want to** have consistent CLI argument parsing
**So that** all flags work correctly

**Acceptance Criteria:**
- [ ] `--mode` parsed with value
- [ ] `--no-timeout` parsed as boolean
- [ ] `--verbose` parsed as boolean
- [ ] `--budget` parsed with number
- [ ] `--max-restarts` parsed with number

---

### US-CLI-002: Help Display
**As a** developer
**I want to** see help with `--help` flag
**So that** I know all available options

**Acceptance Criteria:**
- [ ] `--help` shows usage information
- [ ] All flags documented
- [ ] Examples provided
- [ ] Exit after showing help

---

## 15. Test System Metrics (US-TEST)

### US-TEST-001: Test Duration Tracking
**As a** developer
**I want to** track duration of each test and test suite
**So that** I can identify slow tests and optimize performance

**Acceptance Criteria:**
- [ ] Test start time recorded
- [ ] Test end time recorded
- [ ] Per-test duration tracked
- [ ] Per-suite duration tracked

---

### US-TEST-002: Test Cost Tracking
**As a** developer
**I want to** track cost per test suite (when using real workers)
**So that** I can analyze test efficiency

**Acceptance Criteria:**
- [ ] Estimated cost per suite calculated
- [ ] Actual cost tracked when available
- [ ] Cost per test calculated
- [ ] Test budget limit supported

---

### US-TEST-003: Test Run History
**As a** developer
**I want to** store history of test runs
**So that** I can compare performance over time

**Acceptance Criteria:**
- [ ] Test run history stored in test-history.json
- [ ] Last N runs kept (e.g., 20)
- [ ] Success rate calculated over time
- [ ] Average duration trend tracked

---

### US-TEST-004: Test Performance Analysis
**As a** developer
**I want to** analyze test performance
**So that** I can identify bottlenecks and regressions

**Acceptance Criteria:**
- [ ] Slowest tests identified
- [ ] Most expensive tests identified
- [ ] Efficiency score calculated
- [ ] Performance regression detection

---

---

# Test System

## Test Categories

### 1. Unit Tests (67 tests)
Test individual functions in isolation.

### 2. Integration Tests (20 tests)
Test component interactions.

### 3. E2E Tests (15 tests)
Test full pipeline scenarios.

### 4. Manual Tests (10 tests)
Tests requiring human verification.

---

## Test Matrix

| Category | User Story | Test Type | Test Name |
|----------|------------|-----------|-----------|
| US-EXEC-001 | Start Pipeline | Unit | `test_start_with_valid_path` |
| US-EXEC-001 | Start Pipeline | Unit | `test_start_with_invalid_path` |
| US-EXEC-001 | Start Pipeline | Integration | `test_manifest_init_on_start` |
| US-EXEC-002 | Phase Timeouts | Unit | `test_timeout_calculation` |
| US-EXEC-002 | Phase Timeouts | Unit | `test_timeout_warning` |
| US-EXEC-003 | Disable Timeouts | Unit | `test_no_timeout_flag_parsing` |
| US-EXEC-003 | Disable Timeouts | Integration | `test_no_timeout_execution` |
| US-EXEC-004 | Phase Retry | Unit | `test_retry_logic` |
| US-EXEC-004 | Phase Retry | Unit | `test_retry_counter_reset` |
| US-EXEC-005 | Worker Spawning | Integration | `test_worker_spawn_windows` |
| US-EXEC-006 | Worker Monitoring | Unit | `test_worker_exit_detection` |
| US-EXEC-007 | Stuck Detection | Unit | `test_stuck_threshold` |
| US-EXEC-007 | Stuck Detection | Integration | `test_stuck_warning_display` |
| US-EXEC-008 | Phase Completion | Unit | `test_completion_detection` |
| US-MODE-001 | New Mode | Unit | `test_new_mode_phases` |
| US-MODE-002 | Feature Mode | Unit | `test_feature_mode_phases` |
| US-MODE-003 | Fix Mode | Unit | `test_fix_mode_phases` |
| US-MODE-004 | Mode Persistence | Integration | `test_mode_saved_to_manifest` |
| US-MODE-005 | Phase Sequence | Unit | `test_get_phase_sequence` |
| US-MODE-006 | Default Mode | Unit | `test_default_mode_is_new` |
| US-STOP-001 | Ctrl+C | Integration | `test_sigint_handling` |
| US-STOP-002 | State Preservation | Unit | `test_state_saved_on_pause` |
| US-STOP-003 | Resume | Integration | `test_resume_from_pause` |
| US-STOP-004 | Pause Reason | Unit | `test_pause_reason_recorded` |
| US-STOP-005 | Worker Cleanup | Integration | `test_worker_cleanup` |
| US-STOP-006 | Budget Pause | Unit | `test_budget_limit_check` |
| US-DASH-001 | Live Dashboard | Manual | `test_dashboard_refresh` |
| US-DASH-002 | Phase Display | Unit | `test_phase_info_display` |
| US-DASH-003 | Progress Bar | Unit | `test_progress_bar_render` |
| US-DASH-004 | Elapsed Time | Unit | `test_elapsed_time_format` |
| US-DASH-005 | Cost Display | Unit | `test_cost_display_format` |
| US-DASH-006 | Epic Display | Unit | `test_epic_display` |
| US-DASH-007 | Mode Display | Unit | `test_mode_display` |
| US-TODO-001 | Todo Discovery | Unit | `test_todo_file_discovery` |
| US-TODO-002 | Todo Parsing | Unit | `test_jsonl_parsing` |
| US-TODO-002 | Todo Parsing | Unit | `test_malformed_jsonl` |
| US-TODO-003 | Status Tracking | Unit | `test_status_change_detection` |
| US-TODO-004 | Per-Todo Metrics | Unit | `test_todo_metrics_storage` |
| US-TODO-005 | Completion Display | Unit | `test_completion_message` |
| US-TODO-006 | Active Highlight | Unit | `test_active_todo_highlight` |
| US-COST-001 | ccusage Integration | Unit | `test_ccusage_parsing` |
| US-COST-002 | Per-Session Cost | Unit | `test_session_cost_calc` |
| US-COST-003 | Per-Phase Cost | Unit | `test_phase_cost_tracking` |
| US-COST-004 | Budget Limit | Unit | `test_budget_limit_parsing` |
| US-COST-004 | Budget Limit | Integration | `test_budget_pause_trigger` |
| US-COST-005 | Cost Estimation | Unit | `test_cost_estimation` |
| US-COST-006 | Token Breakdown | Unit | `test_token_breakdown_parsing` |
| US-EPIC-001 | Epic Discovery | Unit | `test_epic_list_loading` |
| US-EPIC-002 | Current Epic | Unit | `test_current_epic_determination` |
| US-EPIC-003 | Epic Completion | Unit | `test_epic_mark_complete` |
| US-EPIC-004 | Epic Duration/Cost | Unit | `test_epic_metrics` |
| US-EPIC-005 | All Complete | Unit | `test_all_epics_complete` |
| US-MAN-001 | Manifest Creation | Unit | `test_manifest_creation` |
| US-MAN-002 | Manifest Reading | Unit | `test_manifest_reading` |
| US-MAN-002 | Manifest Reading | Unit | `test_manifest_missing` |
| US-MAN-003 | Manifest Writing | Unit | `test_manifest_writing` |
| US-MAN-004 | Manifest Backup | Unit | `test_manifest_backup` |
| US-MAN-005 | Corrupt Recovery | Unit | `test_corrupt_manifest_recovery` |
| US-DEP-001 | Node Version | Unit | `test_node_version_check` |
| US-DEP-002 | ccusage Check | Unit | `test_ccusage_check` |
| US-DEP-003 | Claude CLI | Unit | `test_claude_cli_check` |
| US-DEP-004 | Windows Terminal | Unit | `test_wt_check` |
| US-ERR-001 | Worker Crash | Integration | `test_worker_crash_handling` |
| US-ERR-002 | Network Error | Unit | `test_network_error_handling` |
| US-ERR-003 | File System Error | Unit | `test_fs_error_handling` |
| US-ERR-004 | Max Restart | Unit | `test_max_restart_limit` |
| US-ERR-005 | Consecutive Restart | Unit | `test_consecutive_restart_tracking` |
| US-LOG-001 | Log File | Unit | `test_log_file_creation` |
| US-LOG-002 | Verbose Mode | Unit | `test_verbose_mode_output` |
| US-LOG-003 | Phase Logging | Unit | `test_phase_transition_logging` |
| US-LOG-004 | Error Logging | Unit | `test_error_logging` |
| US-ANA-001 | Run Recording | Unit | `test_run_recording` |
| US-ANA-002 | Phase Statistics | Unit | `test_phase_stats_storage` |
| US-ANA-003 | Runs History | Unit | `test_runs_history` |
| US-CLI-001 | Argument Parsing | Unit | `test_cli_argument_parsing` |
| US-CLI-002 | Help Display | Unit | `test_help_display` |
| US-TEST-001 | Test Duration | Unit | `test_duration_tracking` |
| US-TEST-001 | Test Duration | Unit | `test_per_test_duration` |
| US-TEST-001 | Test Duration | Unit | `test_per_suite_duration` |
| US-TEST-002 | Test Cost | Unit | `test_cost_per_suite` |
| US-TEST-002 | Test Cost | Unit | `test_cost_budget_limit` |
| US-TEST-003 | Test History | Unit | `test_run_history_storage` |
| US-TEST-003 | Test History | Unit | `test_success_rate_calc` |
| US-TEST-004 | Performance Analysis | Unit | `test_slowest_tests_detection` |
| US-TEST-004 | Performance Analysis | Unit | `test_regression_detection` |

---

## Test Implementation

### Test File Structure

```
Pipeline-Office/tests/
├── unit/
│   ├── exec.test.js
│   ├── mode.test.js
│   ├── stop.test.js
│   ├── dashboard.test.js
│   ├── todo.test.js
│   ├── cost.test.js
│   ├── epic.test.js
│   ├── manifest.test.js
│   ├── deps.test.js
│   ├── error.test.js
│   ├── logging.test.js
│   ├── analytics.test.js
│   ├── cli.test.js
│   └── test-metrics.test.js
├── integration/
│   ├── worker-spawn.test.js
│   ├── pause-resume.test.js
│   ├── mode-persistence.test.js
│   └── budget-pause.test.js
├── e2e/
│   ├── full-new-pipeline.test.js
│   ├── feature-mode-pipeline.test.js
│   ├── fix-mode-pipeline.test.js
│   ├── pause-resume-cycle.test.js
│   └── error-recovery.test.js
├── manual/
│   └── manual-test-checklist.md
├── fixtures/
│   ├── sample-manifest.json
│   ├── sample-todos.jsonl
│   └── ccusage-output.json
└── run-tests.js
```

### Test Runner Script

```javascript
// Pipeline-Office/tests/run-tests.js
const { execSync } = require('child_process');
const path = require('path');

const testDirs = ['unit', 'integration'];
let totalPassed = 0;
let totalFailed = 0;

for (const dir of testDirs) {
  console.log(`\n=== Running ${dir} tests ===\n`);
  try {
    execSync(`node --test ${path.join(__dirname, dir)}/*.test.js`, {
      stdio: 'inherit'
    });
    totalPassed++;
  } catch (err) {
    totalFailed++;
  }
}

console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);
process.exit(totalFailed > 0 ? 1 : 0);
```

---

## Running Tests

```bash
# Run all tests
node Pipeline-Office/tests/run-tests.js

# Run specific category
node --test Pipeline-Office/tests/unit/*.test.js

# Run specific test file
node --test Pipeline-Office/tests/unit/mode.test.js

# Run with verbose output
node --test --test-reporter=spec Pipeline-Office/tests/unit/*.test.js
```

---

## Coverage Goals

| Category | Target Coverage |
|----------|-----------------|
| Unit Tests | 90% |
| Integration Tests | 80% |
| E2E Tests | Core paths |
| Total | 85% |

---

## Continuous Integration

Tests should run:
1. Before each commit (pre-commit hook)
2. On each push to feature branches
3. On PR creation
4. Before merge to main

---

**Document End**

---

## 16. Worker Lifecycle Additions (US-WORK-ADD)

### US-WORK-008: Test Suite Worker Cleanup
**As a** developer
**I want to** have the test suite clean up all spawned workers on exit (including interruption)
**So that** orphan Claude processes don't accumulate when tests are stopped

**Acceptance Criteria:**
- [ ] Test suite registers SIGINT handler
- [ ] All spawned worker PIDs tracked during test run
- [ ] Workers killed on normal test completion
- [ ] Workers killed on test interruption (Ctrl+C)
- [ ] Workers killed on test failure/error
- [ ] Protected PIDs (test runner's Claude session) NEVER killed
- [ ] Cleanup logged with PID counts

---

### US-WORK-009: Protected PID Mechanism
**As a** developer
**I want to** protect pre-existing Claude processes from being killed by tests or pipelines
**So that** running tests from within a Claude session doesn't kill the session

**Acceptance Criteria:**
- [ ] Pre-existing Claude PIDs recorded at startup
- [ ] Protected PIDs stored in module-level list
- [ ] All kill functions check against protected list
- [ ] Protected PIDs logged at startup
- [ ] Test verifies protection mechanism works

