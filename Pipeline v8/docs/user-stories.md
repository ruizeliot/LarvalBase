# Pipeline v8 - User Stories

**Project:** Pipeline v8
**Date:** 2025-12-08
**Total Stories:** 140
**Epics:** 5

---

## Epic Overview

| Epic | Name | Stories | Dependencies |
|------|------|---------|--------------|
| 1 | Project Bootstrap | 25 | None |
| 2 | Worker Spawning | 20 | Epic 1 |
| 3 | File Watching & Todos | 25 | Epic 1 |
| 4 | Pipeline Orchestration | 30 | Epic 2, 3 |
| 5 | Full Dashboard UI | 40 | Epic 4 |

---

## Epic 1: Project Bootstrap (25 stories)

Foundation: CLI entry, manifest management, basic TUI components, and mock Claude binary.

### US-001: CLI Entry Point

**As a** user
**I want to** run `pipeline` to launch the app
**So that** I can start using the pipeline dashboard

**Acceptance Criteria:**
- [ ] `pipeline` command executes without errors `[E2E]`
- [ ] TUI renders in terminal `[E2E]`
- [ ] Launcher screen displays `[E2E]`

### US-002: CLI with Path Argument

**As a** user
**I want to** run `pipeline /path/to/project`
**So that** I can skip entering the path manually

**Acceptance Criteria:**
- [ ] Path argument is parsed `[UNIT]`
- [ ] Path input is pre-filled `[E2E]`
- [ ] Invalid path shows error `[E2E]`

### US-003: CLI Help Flag

**As a** user
**I want to** run `pipeline --help`
**So that** I can see usage instructions

**Acceptance Criteria:**
- [ ] Shows usage syntax `[E2E]`
- [ ] Lists available options `[E2E]`
- [ ] Exits after displaying `[E2E]`

### US-004: CLI Version Flag

**As a** user
**I want to** run `pipeline --version`
**So that** I can check the installed version

**Acceptance Criteria:**
- [ ] Shows version number (8.x.x) `[E2E]`
- [ ] Exits after displaying `[E2E]`

### US-005: Ink App Shell

**As a** developer
**I want** a basic Ink app structure
**So that** I have a foundation to build on

**Acceptance Criteria:**
- [ ] Ink app renders `[E2E]`
- [ ] Handles clean exit `[INTEGRATION]`
- [ ] Catches uncaught errors `[INTEGRATION]`

### US-006: Screen Router

**As a** developer
**I want** to navigate between screens
**So that** different views can be shown

**Acceptance Criteria:**
- [ ] Tracks current screen name `[UNIT]`
- [ ] Renders active screen component `[E2E]`
- [ ] navigate(screen) function works `[UNIT]`

### US-007: Global Keyboard Handler

**As a** developer
**I want** to handle q, ?, Ctrl+C globally
**So that** common keys work on all screens

**Acceptance Criteria:**
- [ ] 'q' triggers quit flow `[E2E]`
- [ ] '?' toggles help overlay `[E2E]`
- [ ] Ctrl+C triggers emergency stop `[E2E]`

### US-008: Quit Confirmation Dialog

**As a** user
**I want** to see confirmation before quitting
**So that** I don't accidentally lose progress

**Acceptance Criteria:**
- [ ] Modal dialog appears `[E2E]`
- [ ] Shows "Are you sure?" message `[E2E]`
- [ ] Can cancel with Esc `[E2E]`
- [ ] Confirms with Enter `[E2E]`

### US-009: Project Path Validation

**As a** user
**I want** to know if my path is valid
**So that** I don't start with an invalid project

**Acceptance Criteria:**
- [ ] Checks path exists `[UNIT]`
- [ ] Checks path is directory `[UNIT]`
- [ ] Shows error message if invalid `[E2E]`

### US-010: Project Directory Detection

**As a** developer
**I want** to detect if path has .pipeline/
**So that** I know if it's an existing project

**Acceptance Criteria:**
- [ ] Returns true if .pipeline/ exists `[UNIT]`
- [ ] Returns false otherwise `[UNIT]`
- [ ] Checks for manifest.json inside `[UNIT]`

### US-011: Manifest File Creation

**As a** developer
**I want** to create new manifest.json
**So that** new projects have state storage

**Acceptance Criteria:**
- [ ] Creates .pipeline/ directory `[INTEGRATION]`
- [ ] Creates manifest.json with defaults `[INTEGRATION]`
- [ ] Sets version to 8.0.0 `[UNIT]`

### US-012: Manifest File Reading

**As a** developer
**I want** to read existing manifest
**So that** I can restore state

**Acceptance Criteria:**
- [ ] Reads .pipeline/manifest.json `[INTEGRATION]`
- [ ] Parses JSON `[UNIT]`
- [ ] Returns manifest object `[UNIT]`

### US-013: Manifest File Writing

**As a** developer
**I want** to save manifest changes
**So that** state persists

**Acceptance Criteria:**
- [ ] Writes to temp file first `[INTEGRATION]`
- [ ] Renames to manifest.json (atomic) `[INTEGRATION]`
- [ ] Preserves formatting (pretty print) `[UNIT]`

### US-014: Manifest Schema Validation

**As a** developer
**I want** to validate manifest structure
**So that** corrupted data is rejected

**Acceptance Criteria:**
- [ ] Validates required fields `[UNIT]`
- [ ] Checks field types `[UNIT]`
- [ ] Returns validation errors `[UNIT]`

### US-015: Manifest Version Migration

**As a** developer
**I want** to handle old manifest versions
**So that** upgrades don't break existing projects

**Acceptance Criteria:**
- [ ] Detects version from manifest `[UNIT]`
- [ ] Applies migrations if needed `[UNIT]`
- [ ] Updates version field `[UNIT]`

### US-016: Project Config Store

**As a** developer
**I want** to store project config in memory
**So that** components can access project data

**Acceptance Criteria:**
- [ ] Stores name, path, mode `[UNIT]`
- [ ] Get/set methods work `[UNIT]`
- [ ] Notifies on change `[UNIT]`

### US-017: Recent Projects Storage

**As a** developer
**I want** to remember recent projects
**So that** users can quickly resume

**Acceptance Criteria:**
- [ ] Stores last 5 projects `[UNIT]`
- [ ] Persists to ~/.pipeline/config.json `[INTEGRATION]`
- [ ] Updates on project start `[INTEGRATION]`

### US-018: Recent Projects Display

**As a** user
**I want** to see recent projects on launcher
**So that** I can quickly select one

**Acceptance Criteria:**
- [ ] Shows project name `[E2E]`
- [ ] Shows last phase/status `[E2E]`
- [ ] Shows time since last use `[E2E]`

### US-019: CWD Auto-Population

**As a** user
**I want** the path pre-filled with current directory
**So that** I don't have to type it

**Acceptance Criteria:**
- [ ] Detects process.cwd() `[UNIT]`
- [ ] Pre-fills path input `[E2E]`
- [ ] Validates pre-filled path `[E2E]`

### US-020: Mode Selection Store

**As a** developer
**I want** to store selected mode
**So that** correct commands are used

**Acceptance Criteria:**
- [ ] Stores: new, feature, or fix `[UNIT]`
- [ ] Defaults to "new" `[UNIT]`
- [ ] Persists to manifest `[INTEGRATION]`

### US-021: Basic Text Component

**As a** developer
**I want** to display styled text
**So that** UI has visual hierarchy

**Acceptance Criteria:**
- [ ] Supports color prop `[UNIT]`
- [ ] Supports bold, dim `[UNIT]`
- [ ] Renders correctly `[E2E]`

### US-022: Basic Box Component

**As a** developer
**I want** to create bordered containers
**So that** sections are visually grouped

**Acceptance Criteria:**
- [ ] Supports border styles `[UNIT]`
- [ ] Supports padding `[UNIT]`
- [ ] Supports flexbox layout `[E2E]`

### US-023: Basic Input Component

**As a** developer
**I want** to accept text input
**So that** users can enter paths

**Acceptance Criteria:**
- [ ] Shows current value `[E2E]`
- [ ] Handles typing `[E2E]`
- [ ] Handles backspace `[E2E]`
- [ ] Shows cursor `[E2E]`

### US-024: Basic Select Component

**As a** developer
**I want** to select from options
**So that** users can choose modes

**Acceptance Criteria:**
- [ ] Shows options list `[E2E]`
- [ ] Arrow keys navigate `[E2E]`
- [ ] Enter selects `[E2E]`
- [ ] Shows current selection `[E2E]`

### US-025: Mock Claude Binary

**As a** test developer
**I want** to test without real Claude
**So that** tests are free and fast

**Acceptance Criteria:**
- [ ] Executes as Node script `[INTEGRATION]`
- [ ] Reads fixture from env var `[UNIT]`
- [ ] Writes todo files per fixture `[INTEGRATION]`
- [ ] Exits with configured code `[INTEGRATION]`

---

## Epic 2: Worker Spawning (20 stories)

Services: Windows Terminal spawning, PID tracking, session management.

### US-026: Windows Terminal Detection

**As a** developer
**I want** to detect if wt.exe exists
**So that** I know which spawn method to use

**Acceptance Criteria:**
- [ ] Checks wt.exe in PATH `[INTEGRATION]`
- [ ] Returns boolean `[UNIT]`
- [ ] Caches result `[UNIT]`

### US-027: Spawn Worker via wt.exe

**As a** developer
**I want** to spawn Claude in new WT tab
**So that** worker runs in separate window

**Acceptance Criteria:**
- [ ] Opens new Windows Terminal tab `[INTEGRATION]`
- [ ] Runs claude command `[INTEGRATION]`
- [ ] Sets working directory `[INTEGRATION]`

### US-028: Spawn Command Building

**As a** developer
**I want** to build correct wt.exe command
**So that** spawning works correctly

**Acceptance Criteria:**
- [ ] Uses -w 0 for existing window `[UNIT]`
- [ ] Uses nt for new tab `[UNIT]`
- [ ] Uses -d for directory `[UNIT]`
- [ ] Uses --title for window title `[UNIT]`

### US-029: Session ID Generation

**As a** developer
**I want** to generate unique session UUID
**So that** workers are uniquely identified

**Acceptance Criteria:**
- [ ] Generates UUID v4 `[UNIT]`
- [ ] Unique per spawn `[UNIT]`
- [ ] 36 character format `[UNIT]`

### US-030: Session ID Environment Variable

**As a** developer
**I want** to pass session ID to worker
**So that** worker can identify itself

**Acceptance Criteria:**
- [ ] Sets PIPELINE_SESSION_ID `[INTEGRATION]`
- [ ] Worker can read it `[INTEGRATION]`
- [ ] Used in todo file naming `[INTEGRATION]`

### US-031: Project Path Environment Variable

**As a** developer
**I want** to pass project path to worker
**So that** worker knows where to work

**Acceptance Criteria:**
- [ ] Sets PIPELINE_PROJECT_PATH `[INTEGRATION]`
- [ ] Absolute path `[UNIT]`
- [ ] Worker can read it `[INTEGRATION]`

### US-032: Phase Environment Variable

**As a** developer
**I want** to pass phase number to worker
**So that** worker runs correct command

**Acceptance Criteria:**
- [ ] Sets PIPELINE_PHASE `[INTEGRATION]`
- [ ] Value 1-5 `[UNIT]`
- [ ] Worker can read it `[INTEGRATION]`

### US-033: Worker PID Capture

**As a** developer
**I want** to capture spawned process PID
**So that** I can kill it later

**Acceptance Criteria:**
- [ ] Captures PID from spawn `[INTEGRATION]`
- [ ] Stores in worker session `[UNIT]`
- [ ] Updates manifest `[INTEGRATION]`

### US-034: Worker Session Store

**As a** developer
**I want** to track active worker session
**So that** dashboard knows worker state

**Acceptance Criteria:**
- [ ] Stores session ID `[UNIT]`
- [ ] Stores PID `[UNIT]`
- [ ] Stores status `[UNIT]`
- [ ] Stores phase/epic `[UNIT]`

### US-035: Worker Status Tracking

**As a** developer
**I want** to track worker status
**So that** dashboard shows correct state

**Acceptance Criteria:**
- [ ] Status: running `[UNIT]`
- [ ] Status: completed `[UNIT]`
- [ ] Status: killed `[UNIT]`
- [ ] Status: errored `[UNIT]`

### US-036: Kill Worker by Session ID

**As a** developer
**I want** to kill worker using session ID
**So that** correct process is terminated

**Acceptance Criteria:**
- [ ] Looks up PID from session `[UNIT]`
- [ ] Kills process by PID `[INTEGRATION]`
- [ ] Updates session status `[UNIT]`

### US-037: Kill Worker Graceful

**As a** developer
**I want** to gracefully stop worker
**So that** work isn't corrupted

**Acceptance Criteria:**
- [ ] Sends SIGTERM first `[INTEGRATION]`
- [ ] Waits for exit (timeout) `[INTEGRATION]`
- [ ] Force kills if needed `[INTEGRATION]`

### US-038: Worker Exit Detection

**As a** developer
**I want** to detect when worker exits
**So that** I can react to completion

**Acceptance Criteria:**
- [ ] Listens for exit event `[INTEGRATION]`
- [ ] Captures exit code `[INTEGRATION]`
- [ ] Emits event to orchestrator `[INTEGRATION]`

### US-039: Worker Exit Code Capture

**As a** developer
**I want** to capture worker exit code
**So that** I know if it succeeded

**Acceptance Criteria:**
- [ ] Code 0 = success `[UNIT]`
- [ ] Code != 0 = error `[UNIT]`
- [ ] Stored in manifest `[INTEGRATION]`

### US-040: Process Cleanup on App Exit

**As a** developer
**I want** to kill workers when dashboard exits
**So that** no orphan processes remain

**Acceptance Criteria:**
- [ ] Kills all tracked workers `[INTEGRATION]`
- [ ] Handles SIGINT, SIGTERM `[INTEGRATION]`
- [ ] Runs on clean exit too `[INTEGRATION]`

### US-041: Worker Window Title

**As a** developer
**I want** to set descriptive window title
**So that** worker window is identifiable

**Acceptance Criteria:**
- [ ] Includes project name `[UNIT]`
- [ ] Includes phase number `[UNIT]`
- [ ] Uses --title flag `[UNIT]`

### US-042: Focus Worker Window

**As a** user
**I want** to bring worker window to front
**So that** I can see Claude output

**Acceptance Criteria:**
- [ ] Press 'w' to focus `[E2E]`
- [ ] Brings WT window to front `[INTEGRATION]`
- [ ] Works when minimized `[E2E]`

### US-043: Spawn Fallback (no wt.exe)

**As a** developer
**I want** fallback if WT unavailable
**So that** app works without Windows Terminal

**Acceptance Criteria:**
- [ ] Uses cmd /c start `[INTEGRATION]`
- [ ] Opens new cmd window `[INTEGRATION]`
- [ ] Still tracks PID `[INTEGRATION]`

### US-044: Command Injection Prevention

**As a** developer
**I want** to prevent shell injection
**So that** app is secure

**Acceptance Criteria:**
- [ ] Escapes special characters `[UNIT]`
- [ ] Validates paths `[UNIT]`
- [ ] No shell interpretation `[UNIT]`

### US-045: Worker Spawn Error Handling

**As a** developer
**I want** to handle spawn failures
**So that** user knows what went wrong

**Acceptance Criteria:**
- [ ] Catches spawn errors `[INTEGRATION]`
- [ ] Shows error to user `[E2E]`
- [ ] Allows retry `[E2E]`

---

## Epic 3: File Watching & Todos (25 stories)

Data: File watching, todo parsing, progress calculation, cost/duration tracking.

### US-046: Watch Manifest File

**As a** developer
**I want** to detect manifest changes
**So that** dashboard updates on external changes

**Acceptance Criteria:**
- [ ] Watches .pipeline/manifest.json `[INTEGRATION]`
- [ ] Calls callback on change `[INTEGRATION]`
- [ ] Handles file not existing `[INTEGRATION]`

### US-047: Manifest Watch Debounce

**As a** developer
**I want** to debounce rapid changes
**So that** multiple quick saves don't cause issues

**Acceptance Criteria:**
- [ ] Groups changes within 100ms `[UNIT]`
- [ ] Single callback per batch `[UNIT]`
- [ ] Configurable delay `[UNIT]`

### US-048: Watch Todo Directory

**As a** developer
**I want** to watch ~/.claude/todos/
**So that** worker progress is detected

**Acceptance Criteria:**
- [ ] Watches directory for changes `[INTEGRATION]`
- [ ] Detects new files `[INTEGRATION]`
- [ ] Detects modified files `[INTEGRATION]`

### US-049: Todo File Pattern Match

**As a** developer
**I want** to filter by session ID
**So that** only current worker's todos are used

**Acceptance Criteria:**
- [ ] Matches session ID in filename `[UNIT]`
- [ ] Ignores other sessions `[UNIT]`
- [ ] Handles UUID format `[UNIT]`

### US-050: Todo File Parsing

**As a** developer
**I want** to parse todo JSONL format
**So that** todo data is extracted

**Acceptance Criteria:**
- [ ] Parses JSONL lines `[UNIT]`
- [ ] Extracts todo objects `[UNIT]`
- [ ] Handles malformed lines `[UNIT]`

### US-051: Todo Status Extraction

**As a** developer
**I want** to extract todo statuses
**So that** progress can be calculated

**Acceptance Criteria:**
- [ ] Extracts: pending `[UNIT]`
- [ ] Extracts: in_progress `[UNIT]`
- [ ] Extracts: completed `[UNIT]`

### US-052: Todo Store

**As a** developer
**I want** to store todos in memory
**So that** UI can display them

**Acceptance Criteria:**
- [ ] Stores todo array `[UNIT]`
- [ ] Get/set methods `[UNIT]`
- [ ] Notifies on change `[UNIT]`

### US-053: Todo Progress Calculation

**As a** developer
**I want** to calculate completion %
**So that** progress bar is accurate

**Acceptance Criteria:**
- [ ] Formula: (completed / total) * 100 `[UNIT]`
- [ ] Returns 0-100 `[UNIT]`
- [ ] Handles empty todos (0%) `[UNIT]`

### US-054: Todo Completion Detection

**As a** developer
**I want** to detect 100% completion
**So that** phase can advance

**Acceptance Criteria:**
- [ ] Detects all todos completed `[UNIT]`
- [ ] Emits completion event `[INTEGRATION]`
- [ ] Only emits once per phase `[UNIT]`

### US-055: Current Todo Identification

**As a** developer
**I want** to identify in_progress todo
**So that** UI highlights current task

**Acceptance Criteria:**
- [ ] Returns first in_progress todo `[UNIT]`
- [ ] Returns null if none `[UNIT]`
- [ ] Updates on change `[UNIT]`

### US-056: Phase Progress Calculation

**As a** developer
**I want** to calculate phase progress
**So that** phase status is accurate

**Acceptance Criteria:**
- [ ] Based on todo completion `[UNIT]`
- [ ] Returns 0-100 `[UNIT]`
- [ ] Updates on todo change `[UNIT]`

### US-057: Overall Progress Calculation

**As a** developer
**I want** to calculate overall progress
**So that** main progress bar is accurate

**Acceptance Criteria:**
- [ ] Combines phases + epics `[UNIT]`
- [ ] Weights phases appropriately `[UNIT]`
- [ ] Returns 0-100 `[UNIT]`

### US-058: File Watch Error Handling

**As a** developer
**I want** to handle watch errors
**So that** app doesn't crash

**Acceptance Criteria:**
- [ ] Catches watch errors `[INTEGRATION]`
- [ ] Attempts reconnect `[INTEGRATION]`
- [ ] Logs errors `[INTEGRATION]`

### US-059: File Watch Cleanup

**As a** developer
**I want** to stop watching on exit
**So that** no lingering handles

**Acceptance Criteria:**
- [ ] Closes all watchers `[INTEGRATION]`
- [ ] Called on app exit `[INTEGRATION]`
- [ ] No memory leaks `[INTEGRATION]`

### US-060: Manifest Change Handler

**As a** developer
**I want** to react to manifest updates
**So that** stores stay in sync

**Acceptance Criteria:**
- [ ] Reads new manifest `[INTEGRATION]`
- [ ] Updates relevant stores `[UNIT]`
- [ ] Triggers UI update `[INTEGRATION]`

### US-061: Todo Change Handler

**As a** developer
**I want** to react to todo updates
**So that** UI shows current todos

**Acceptance Criteria:**
- [ ] Parses new todo file `[INTEGRATION]`
- [ ] Updates todo store `[UNIT]`
- [ ] Triggers UI update `[INTEGRATION]`

### US-062: Epic Status from Manifest

**As a** developer
**I want** to read epic statuses
**So that** epic list is accurate

**Acceptance Criteria:**
- [ ] Parses phases[4].epics `[UNIT]`
- [ ] Returns epic array `[UNIT]`
- [ ] Handles missing data `[UNIT]`

### US-063: Current Epic Identification

**As a** developer
**I want** to identify current epic
**So that** UI highlights it

**Acceptance Criteria:**
- [ ] Returns in-progress epic `[UNIT]`
- [ ] Returns null if not in phase 4 `[UNIT]`
- [ ] Updates on change `[UNIT]`

### US-064: Cost Reading from Manifest

**As a** developer
**I want** to read cost data
**So that** cost display is accurate

**Acceptance Criteria:**
- [ ] Reads cost.total `[UNIT]`
- [ ] Reads cost.byPhase `[UNIT]`
- [ ] Returns 0 if missing `[UNIT]`

### US-065: Duration Reading from Manifest

**As a** developer
**I want** to read duration data
**So that** duration display is accurate

**Acceptance Criteria:**
- [ ] Reads duration.total (seconds) `[UNIT]`
- [ ] Reads duration.byPhase `[UNIT]`
- [ ] Returns 0 if missing `[UNIT]`

### US-066: Duration Timer

**As a** developer
**I want** to track elapsed time
**So that** duration updates live

**Acceptance Criteria:**
- [ ] Increments every second `[UNIT]`
- [ ] Starts on phase start `[INTEGRATION]`
- [ ] Stops on pause/complete `[INTEGRATION]`

### US-067: Cost Formatting

**As a** developer
**I want** to format cost as currency
**So that** display is readable

**Acceptance Criteria:**
- [ ] Format: $X.XX `[UNIT]`
- [ ] Two decimal places `[UNIT]`
- [ ] Handles 0 `[UNIT]`

### US-068: Duration Formatting

**As a** developer
**I want** to format duration as time
**So that** display is readable

**Acceptance Criteria:**
- [ ] Format: Xh Xm Xs `[UNIT]`
- [ ] Omits zero units `[UNIT]`
- [ ] Handles 0 (0s) `[UNIT]`

### US-069: ccusage Integration

**As a** developer
**I want** to query ccusage for costs
**So that** real costs are tracked

**Acceptance Criteria:**
- [ ] Runs ccusage command `[INTEGRATION]`
- [ ] Parses output `[UNIT]`
- [ ] Extracts cost value `[UNIT]`

### US-070: Cost Recalculation on Resume

**As a** developer
**I want** to recalculate costs on resume
**So that** resumed pipelines have accurate costs

**Acceptance Criteria:**
- [ ] Queries ccusage sessions `[INTEGRATION]`
- [ ] Filters by project path `[UNIT]`
- [ ] Sums all session costs `[UNIT]`

---

## Epic 4: Pipeline Orchestration (30 stories)

Logic: Phase state machine, command selection, epic loops, auto-advance.

### US-071: Orchestrator Service

**As a** developer
**I want** central orchestration logic
**So that** pipeline flow is managed

**Acceptance Criteria:**
- [ ] Class with methods `[UNIT]`
- [ ] Injected dependencies `[UNIT]`
- [ ] Event emitter `[UNIT]`

### US-072: Pipeline State Machine

**As a** developer
**I want** to track pipeline states
**So that** transitions are controlled

**Acceptance Criteria:**
- [ ] States: idle, running, paused, complete, error `[UNIT]`
- [ ] Current state tracked `[UNIT]`
- [ ] State change events `[UNIT]`

### US-073: State Transition Validation

**As a** developer
**I want** to prevent invalid transitions
**So that** state is always valid

**Acceptance Criteria:**
- [ ] Defines valid transitions `[UNIT]`
- [ ] Rejects invalid changes `[UNIT]`
- [ ] Throws on invalid `[UNIT]`

### US-074: Initialize New Pipeline

**As a** developer
**I want** to start fresh pipeline
**So that** new projects begin correctly

**Acceptance Criteria:**
- [ ] Creates manifest `[INTEGRATION]`
- [ ] Sets phase to 1 `[UNIT]`
- [ ] Sets state to running `[UNIT]`

### US-075: Resume Existing Pipeline

**As a** developer
**I want** to continue from saved state
**So that** work isn't lost

**Acceptance Criteria:**
- [ ] Loads manifest `[INTEGRATION]`
- [ ] Restores state `[UNIT]`
- [ ] Spawns worker at saved point `[INTEGRATION]`

### US-076: Phase 1 Command Selection

**As a** developer
**I want** to select correct v6 command
**So that** phase 1 runs correctly

**Acceptance Criteria:**
- [ ] New: /1-new-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Feature: /1-feature-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Fix: /1-fix-pipeline-desktop-v6.0 `[UNIT]`

### US-077: Phase 2 Command Selection

**As a** developer
**I want** to select correct v6 command
**So that** phase 2 runs correctly

**Acceptance Criteria:**
- [ ] New: /2-new-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Feature: /2-feature-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Fix: /2-fix-pipeline-desktop-v6.0 `[UNIT]`

### US-078: Phase 3 Command Selection

**As a** developer
**I want** to select correct v6 command
**So that** phase 3 runs correctly

**Acceptance Criteria:**
- [ ] New: /3-new-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Feature: /3-feature-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Fix: /3-fix-pipeline-desktop-v6.0 `[UNIT]`

### US-079: Phase 4 Command Selection

**As a** developer
**I want** to select correct v6 command
**So that** phase 4 runs correctly

**Acceptance Criteria:**
- [ ] New: /4-new-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Feature: /4-feature-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Fix: /4-fix-pipeline-desktop-v6.0 `[UNIT]`

### US-080: Phase 5 Command Selection

**As a** developer
**I want** to select correct v6 command
**So that** phase 5 runs correctly

**Acceptance Criteria:**
- [ ] New: /5-new-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Feature: /5-feature-pipeline-desktop-v6.0 `[UNIT]`
- [ ] Fix: /5-fix-pipeline-desktop-v6.0 `[UNIT]`

### US-081: Feature Mode Commands

**As a** developer
**I want** to use feature variant commands
**So that** feature mode works

**Acceptance Criteria:**
- [ ] Uses -feature- in command name `[UNIT]`
- [ ] All phases have feature variant `[UNIT]`
- [ ] Mode stored in manifest `[INTEGRATION]`

### US-082: Fix Mode Commands

**As a** developer
**I want** to use fix variant commands
**So that** fix mode works

**Acceptance Criteria:**
- [ ] Uses -fix- in command name `[UNIT]`
- [ ] All phases have fix variant `[UNIT]`
- [ ] Mode stored in manifest `[INTEGRATION]`

### US-083: Phase Completion Detection

**As a** developer
**I want** to detect when phase completes
**So that** pipeline advances

**Acceptance Criteria:**
- [ ] Detects 100% todos `[UNIT]`
- [ ] Triggers advance logic `[INTEGRATION]`
- [ ] Updates manifest `[INTEGRATION]`

### US-084: Auto-Advance to Next Phase

**As a** developer
**I want** to automatically advance phases
**So that** pipeline is autonomous

**Acceptance Criteria:**
- [ ] Kills current worker `[INTEGRATION]`
- [ ] Updates phase number `[UNIT]`
- [ ] Spawns next worker `[INTEGRATION]`

### US-085: Epic Loop Management

**As a** developer
**I want** to loop through epics in phase 4
**So that** all epics are implemented

**Acceptance Criteria:**
- [ ] Tracks current epic index `[UNIT]`
- [ ] Advances to next epic `[UNIT]`
- [ ] Updates manifest `[INTEGRATION]`

### US-086: Epic Completion Detection

**As a** developer
**I want** to detect epic completion
**So that** next epic starts

**Acceptance Criteria:**
- [ ] Detects 100% todos for epic `[UNIT]`
- [ ] Triggers epic advance `[INTEGRATION]`
- [ ] Updates epic status `[UNIT]`

### US-087: All Epics Complete Detection

**As a** developer
**I want** to detect all epics done
**So that** phase 5 can start

**Acceptance Criteria:**
- [ ] Checks all epic statuses `[UNIT]`
- [ ] All complete triggers advance `[INTEGRATION]`
- [ ] Advances to phase 5 `[INTEGRATION]`

### US-088: Pipeline Completion Detection

**As a** developer
**I want** to detect pipeline finished
**So that** complete screen shows

**Acceptance Criteria:**
- [ ] Phase 5 todos complete `[UNIT]`
- [ ] Sets state to complete `[UNIT]`
- [ ] Navigates to complete screen `[E2E]`

### US-089: Pause Pipeline

**As a** user
**I want** to pause the pipeline
**So that** I can take a break

**Acceptance Criteria:**
- [ ] Sets state to paused `[UNIT]`
- [ ] Saves current state to manifest `[INTEGRATION]`
- [ ] Worker keeps running `[INTEGRATION]`

### US-090: Resume Pipeline

**As a** user
**I want** to resume paused pipeline
**So that** work continues

**Acceptance Criteria:**
- [ ] Sets state to running `[UNIT]`
- [ ] Continues monitoring `[INTEGRATION]`
- [ ] No data lost `[E2E]`

### US-091: Manual Phase Advance

**As a** user
**I want** to force advance to next phase
**So that** stuck phases can be skipped

**Acceptance Criteria:**
- [ ] Requires confirmation dialog `[E2E]`
- [ ] Kills current worker `[INTEGRATION]`
- [ ] Advances to next phase `[INTEGRATION]`

### US-092: Worker Crash Detection

**As a** developer
**I want** to detect worker crash
**So that** user can recover

**Acceptance Criteria:**
- [ ] Detects non-zero exit code `[INTEGRATION]`
- [ ] Sets state to error `[UNIT]`
- [ ] Shows error dialog `[E2E]`

### US-093: Worker Crash Recovery

**As a** user
**I want** to recover from crash
**So that** work isn't lost

**Acceptance Criteria:**
- [ ] Offers retry option `[E2E]`
- [ ] Offers skip option `[E2E]`
- [ ] Offers abort option `[E2E]`

### US-094: Orchestrator Event Emitter

**As a** developer
**I want** to emit orchestrator events
**So that** UI reacts to changes

**Acceptance Criteria:**
- [ ] onPhaseStart event `[UNIT]`
- [ ] onPhaseComplete event `[UNIT]`
- [ ] onEpicComplete event `[UNIT]`
- [ ] onError event `[UNIT]`

### US-095: Manifest Update on Phase Change

**As a** developer
**I want** to update manifest on transitions
**So that** state persists

**Acceptance Criteria:**
- [ ] Updates currentPhase `[UNIT]`
- [ ] Updates phase status `[UNIT]`
- [ ] Writes to file `[INTEGRATION]`

### US-096: Manifest Update on Epic Change

**As a** developer
**I want** to update manifest on epic change
**So that** epic progress persists

**Acceptance Criteria:**
- [ ] Updates currentEpic `[UNIT]`
- [ ] Updates epic status `[UNIT]`
- [ ] Writes to file `[INTEGRATION]`

### US-097: Cost Update on Phase Complete

**As a** developer
**I want** to update cost after phase
**So that** costs are tracked

**Acceptance Criteria:**
- [ ] Queries ccusage `[INTEGRATION]`
- [ ] Updates cost.byPhase `[UNIT]`
- [ ] Updates cost.total `[UNIT]`

### US-098: Duration Update on Phase Complete

**As a** developer
**I want** to update duration after phase
**So that** time is tracked

**Acceptance Criteria:**
- [ ] Calculates elapsed seconds `[UNIT]`
- [ ] Updates duration.byPhase `[UNIT]`
- [ ] Updates duration.total `[UNIT]`

### US-099: Orchestrator Logging

**As a** developer
**I want** to log orchestrator decisions
**So that** debugging is possible

**Acceptance Criteria:**
- [ ] Logs to .pipeline/orchestrator.log `[INTEGRATION]`
- [ ] Timestamps all entries `[UNIT]`
- [ ] Logs phase/epic transitions `[INTEGRATION]`

### US-100: Worker Timeout Detection

**As a** developer
**I want** to detect stuck workers
**So that** user is alerted

**Acceptance Criteria:**
- [ ] Configurable timeout (default 30min) `[UNIT]`
- [ ] No todo activity triggers alert `[INTEGRATION]`
- [ ] Offers restart option `[E2E]`

---

## Epic 5: Full Dashboard UI (40 stories)

UI: All screens (Launcher, Resume, Dashboard, Complete, Help), keyboard navigation.

### US-101: Launcher Screen

**As a** user
**I want** to see launcher on startup
**So that** I can start a pipeline

**Acceptance Criteria:**
- [ ] Shows path input `[E2E]`
- [ ] Shows mode selection `[E2E]`
- [ ] Shows start button `[E2E]`

### US-102: Launcher Path Input

**As a** user
**I want** to enter/edit project path
**So that** I can specify my project

**Acceptance Criteria:**
- [ ] Text input works `[E2E]`
- [ ] Can paste paths `[E2E]`
- [ ] Shows validation status `[E2E]`

### US-103: Launcher Path Browse Hint

**As a** user
**I want** to know I can paste paths
**So that** I don't struggle with input

**Acceptance Criteria:**
- [ ] Shows [...] indicator `[E2E]`
- [ ] Tooltip or hint text `[E2E]`
- [ ] Works with paste `[E2E]`

### US-104: Launcher Mode Radio Buttons

**As a** user
**I want** to select pipeline mode
**So that** correct workflow runs

**Acceptance Criteria:**
- [ ] New Project option `[E2E]`
- [ ] Add Feature option `[E2E]`
- [ ] Fix Bug option `[E2E]`
- [ ] One selected at a time `[E2E]`

### US-105: Launcher Start Button

**As a** user
**I want** to start the pipeline
**So that** work begins

**Acceptance Criteria:**
- [ ] Validates inputs first `[E2E]`
- [ ] Shows error if invalid `[E2E]`
- [ ] Navigates to dashboard if valid `[E2E]`

### US-106: Launcher Recent Projects List

**As a** user
**I want** to quickly select recent project
**So that** I don't have to type path

**Acceptance Criteria:**
- [ ] Shows last 5 projects `[E2E]`
- [ ] Click/Enter to select `[E2E]`
- [ ] Fills path input `[E2E]`

### US-107: Launcher Validation Errors

**As a** user
**I want** to see validation errors
**So that** I know what's wrong

**Acceptance Criteria:**
- [ ] Red text for errors `[E2E]`
- [ ] Clear error message `[E2E]`
- [ ] Updates on input change `[E2E]`

### US-108: Resume Screen

**As a** user
**I want** to see resume options
**So that** I can continue or start fresh

**Acceptance Criteria:**
- [ ] Shows last state `[E2E]`
- [ ] Resume button `[E2E]`
- [ ] Cancel button `[E2E]`

### US-109: Resume State Display

**As a** user
**I want** to see where I left off
**So that** I know what to expect

**Acceptance Criteria:**
- [ ] Shows phase name `[E2E]`
- [ ] Shows epic if phase 4 `[E2E]`
- [ ] Shows progress % `[E2E]`

### US-110: Resume Cost Display

**As a** user
**I want** to see previous costs
**So that** I know spending so far

**Acceptance Criteria:**
- [ ] Shows total cost `[E2E]`
- [ ] Calculated from ccusage `[INTEGRATION]`
- [ ] Formatted as $X.XX `[E2E]`

### US-111: Resume Duration Display

**As a** user
**I want** to see previous duration
**So that** I know time invested

**Acceptance Criteria:**
- [ ] Shows total time `[E2E]`
- [ ] Formatted as Xh Xm `[E2E]`
- [ ] Accurate from manifest `[INTEGRATION]`

### US-112: Resume Button

**As a** user
**I want** to continue pipeline
**So that** work resumes

**Acceptance Criteria:**
- [ ] Spawns worker at saved point `[INTEGRATION]`
- [ ] Navigates to dashboard `[E2E]`
- [ ] Restores all state `[E2E]`

### US-113: Resume Cancel Button

**As a** user
**I want** to go back to launcher
**So that** I can choose differently

**Acceptance Criteria:**
- [ ] Returns to launcher `[E2E]`
- [ ] No state changes `[UNIT]`
- [ ] Path still selected `[E2E]`

### US-114: Resume Delete Option

**As a** user
**I want** to start fresh
**So that** I can redo from beginning

**Acceptance Criteria:**
- [ ] Confirms deletion `[E2E]`
- [ ] Deletes manifest `[INTEGRATION]`
- [ ] Returns to launcher `[E2E]`

### US-115: Dashboard Screen

**As a** user
**I want** to see pipeline status
**So that** I know what's happening

**Acceptance Criteria:**
- [ ] Shows all status info `[E2E]`
- [ ] Updates in real-time `[E2E]`
- [ ] Keyboard shortcuts work `[E2E]`

### US-116: Dashboard Project Info

**As a** user
**I want** to see project name and mode
**So that** I know what I'm working on

**Acceptance Criteria:**
- [ ] Shows project name `[E2E]`
- [ ] Shows mode (New/Feature/Fix) `[E2E]`
- [ ] In header area `[E2E]`

### US-117: Dashboard Phase Display

**As a** user
**I want** to see current phase
**So that** I know overall progress

**Acceptance Criteria:**
- [ ] Shows phase number (1-5) `[E2E]`
- [ ] Shows phase name `[E2E]`
- [ ] Shows epic if phase 4 `[E2E]`

### US-118: Dashboard Progress Bar

**As a** user
**I want** to see visual progress
**So that** completion is obvious

**Acceptance Criteria:**
- [ ] Filled bar visualization `[E2E]`
- [ ] Shows percentage number `[E2E]`
- [ ] Updates on todo changes `[E2E]`

### US-119: Dashboard Epic List

**As a** user
**I want** to see epic statuses
**So that** I know epic progress

**Acceptance Criteria:**
- [ ] Lists all epics `[E2E]`
- [ ] Checkmark for complete `[E2E]`
- [ ] Arrow for current `[E2E]`
- [ ] Empty for pending `[E2E]`

### US-120: Dashboard Todo List

**As a** user
**I want** to see current todos
**So that** I know current tasks

**Acceptance Criteria:**
- [ ] Lists todos `[E2E]`
- [ ] Status icons (check, arrow, empty) `[E2E]`
- [ ] Current highlighted `[E2E]`

### US-121: Dashboard Cost Display

**As a** user
**I want** to see running cost
**So that** I track spending

**Acceptance Criteria:**
- [ ] Shows $X.XX format `[E2E]`
- [ ] Updates on phase complete `[E2E]`
- [ ] Accurate from ccusage `[INTEGRATION]`

### US-122: Dashboard Duration Display

**As a** user
**I want** to see elapsed time
**So that** I track time spent

**Acceptance Criteria:**
- [ ] Shows Xh Xm Xs `[E2E]`
- [ ] Updates every second `[E2E]`
- [ ] Accurate total `[E2E]`

### US-123: Dashboard Worker Status

**As a** user
**I want** to see worker status
**So that** I know worker is running

**Acceptance Criteria:**
- [ ] Shows "Running" with green dot `[E2E]`
- [ ] Shows "Stopped" with red dot `[E2E]`
- [ ] Updates on state change `[E2E]`

### US-124: Dashboard Session Info

**As a** user
**I want** to see session ID and PID
**So that** I can debug if needed

**Acceptance Criteria:**
- [ ] Shows session ID (truncated) `[E2E]`
- [ ] Shows PID `[E2E]`
- [ ] In footer area `[E2E]`

### US-125: Dashboard Pause Key

**As a** user
**I want** to press 'p' to pause
**So that** I can take a break

**Acceptance Criteria:**
- [ ] 'p' triggers pause `[E2E]`
- [ ] State changes to paused `[E2E]`
- [ ] UI shows paused state `[E2E]`

### US-126: Dashboard Advance Key

**As a** user
**I want** to press 'a' to advance
**So that** I can skip stuck phases

**Acceptance Criteria:**
- [ ] 'a' shows confirmation `[E2E]`
- [ ] Confirm advances phase `[E2E]`
- [ ] Cancel returns to dashboard `[E2E]`

### US-127: Dashboard Focus Worker Key

**As a** user
**I want** to press 'w' to focus worker
**So that** I can see Claude output

**Acceptance Criteria:**
- [ ] 'w' focuses worker window `[E2E]`
- [ ] Brings to front `[E2E]`
- [ ] Works when minimized `[E2E]`

### US-128: Dashboard Paused Indicator

**As a** user
**I want** to see paused state clearly
**So that** I know pipeline is paused

**Acceptance Criteria:**
- [ ] Shows "PAUSED" prominently `[E2E]`
- [ ] Different color/style `[E2E]`
- [ ] Shows 'r' to resume hint `[E2E]`

### US-129: Complete Screen

**As a** user
**I want** to see completion summary
**So that** I know pipeline succeeded

**Acceptance Criteria:**
- [ ] Shows success message `[E2E]`
- [ ] Shows all stats `[E2E]`
- [ ] Shows next actions `[E2E]`

### US-130: Complete Summary Stats

**As a** user
**I want** to see phases, epics, tests
**So that** I know what was done

**Acceptance Criteria:**
- [ ] Phases: 5/5 complete `[E2E]`
- [ ] Epics: X/X complete `[E2E]`
- [ ] Tests: X passing `[E2E]`

### US-131: Complete Cost Summary

**As a** user
**I want** to see total cost
**So that** I know final spending

**Acceptance Criteria:**
- [ ] Shows total cost `[E2E]`
- [ ] $X.XX format `[E2E]`
- [ ] Final accurate value `[INTEGRATION]`

### US-132: Complete Duration Summary

**As a** user
**I want** to see total duration
**So that** I know time invested

**Acceptance Criteria:**
- [ ] Shows total time `[E2E]`
- [ ] Xh Xm format `[E2E]`
- [ ] Final accurate value `[INTEGRATION]`

### US-133: Complete New Project Button

**As a** user
**I want** to start another project
**So that** I can continue working

**Acceptance Criteria:**
- [ ] Returns to launcher `[E2E]`
- [ ] Clears current state `[UNIT]`
- [ ] Ready for new project `[E2E]`

### US-134: Complete Exit Button

**As a** user
**I want** to exit the app
**So that** I'm done

**Acceptance Criteria:**
- [ ] Exits cleanly `[E2E]`
- [ ] No confirmation needed `[E2E]`
- [ ] No orphan processes `[INTEGRATION]`

### US-135: Help Overlay

**As a** user
**I want** to see keyboard shortcuts
**So that** I know how to use the app

**Acceptance Criteria:**
- [ ] Press '?' to show `[E2E]`
- [ ] Overlay on current screen `[E2E]`
- [ ] Lists all shortcuts `[E2E]`

### US-136: Help Overlay Content

**As a** user
**I want** to see all shortcuts listed
**So that** I can learn them

**Acceptance Criteria:**
- [ ] Grouped by context `[E2E]`
- [ ] Clear key + description `[E2E]`
- [ ] Complete list `[E2E]`

### US-137: Help Overlay Close

**As a** user
**I want** to close help
**So that** I can return to work

**Acceptance Criteria:**
- [ ] Press Esc to close `[E2E]`
- [ ] Press '?' to toggle `[E2E]`
- [ ] Returns to previous screen `[E2E]`

### US-138: Error Dialog

**As a** user
**I want** to see errors clearly
**So that** I know what went wrong

**Acceptance Criteria:**
- [ ] Modal dialog `[E2E]`
- [ ] Clear error message `[E2E]`
- [ ] Action buttons `[E2E]`

### US-139: Error Recovery Options

**As a** user
**I want** to choose how to handle error
**So that** I can recover

**Acceptance Criteria:**
- [ ] Retry button `[E2E]`
- [ ] Skip button `[E2E]`
- [ ] Abort button `[E2E]`

### US-140: Status Bar

**As a** user
**I want** to see key hints at bottom
**So that** I remember shortcuts

**Acceptance Criteria:**
- [ ] Shows at screen bottom `[E2E]`
- [ ] Context-appropriate keys `[E2E]`
- [ ] Clear formatting `[E2E]`

---

## Story Index

| ID | Title | Epic |
|----|-------|------|
| US-001 | CLI Entry Point | 1 |
| US-002 | CLI with Path Argument | 1 |
| US-003 | CLI Help Flag | 1 |
| US-004 | CLI Version Flag | 1 |
| US-005 | Ink App Shell | 1 |
| US-006 | Screen Router | 1 |
| US-007 | Global Keyboard Handler | 1 |
| US-008 | Quit Confirmation Dialog | 1 |
| US-009 | Project Path Validation | 1 |
| US-010 | Project Directory Detection | 1 |
| US-011 | Manifest File Creation | 1 |
| US-012 | Manifest File Reading | 1 |
| US-013 | Manifest File Writing | 1 |
| US-014 | Manifest Schema Validation | 1 |
| US-015 | Manifest Version Migration | 1 |
| US-016 | Project Config Store | 1 |
| US-017 | Recent Projects Storage | 1 |
| US-018 | Recent Projects Display | 1 |
| US-019 | CWD Auto-Population | 1 |
| US-020 | Mode Selection Store | 1 |
| US-021 | Basic Text Component | 1 |
| US-022 | Basic Box Component | 1 |
| US-023 | Basic Input Component | 1 |
| US-024 | Basic Select Component | 1 |
| US-025 | Mock Claude Binary | 1 |
| US-026 | Windows Terminal Detection | 2 |
| US-027 | Spawn Worker via wt.exe | 2 |
| US-028 | Spawn Command Building | 2 |
| US-029 | Session ID Generation | 2 |
| US-030 | Session ID Environment Variable | 2 |
| US-031 | Project Path Environment Variable | 2 |
| US-032 | Phase Environment Variable | 2 |
| US-033 | Worker PID Capture | 2 |
| US-034 | Worker Session Store | 2 |
| US-035 | Worker Status Tracking | 2 |
| US-036 | Kill Worker by Session ID | 2 |
| US-037 | Kill Worker Graceful | 2 |
| US-038 | Worker Exit Detection | 2 |
| US-039 | Worker Exit Code Capture | 2 |
| US-040 | Process Cleanup on App Exit | 2 |
| US-041 | Worker Window Title | 2 |
| US-042 | Focus Worker Window | 2 |
| US-043 | Spawn Fallback (no wt.exe) | 2 |
| US-044 | Command Injection Prevention | 2 |
| US-045 | Worker Spawn Error Handling | 2 |
| US-046 | Watch Manifest File | 3 |
| US-047 | Manifest Watch Debounce | 3 |
| US-048 | Watch Todo Directory | 3 |
| US-049 | Todo File Pattern Match | 3 |
| US-050 | Todo File Parsing | 3 |
| US-051 | Todo Status Extraction | 3 |
| US-052 | Todo Store | 3 |
| US-053 | Todo Progress Calculation | 3 |
| US-054 | Todo Completion Detection | 3 |
| US-055 | Current Todo Identification | 3 |
| US-056 | Phase Progress Calculation | 3 |
| US-057 | Overall Progress Calculation | 3 |
| US-058 | File Watch Error Handling | 3 |
| US-059 | File Watch Cleanup | 3 |
| US-060 | Manifest Change Handler | 3 |
| US-061 | Todo Change Handler | 3 |
| US-062 | Epic Status from Manifest | 3 |
| US-063 | Current Epic Identification | 3 |
| US-064 | Cost Reading from Manifest | 3 |
| US-065 | Duration Reading from Manifest | 3 |
| US-066 | Duration Timer | 3 |
| US-067 | Cost Formatting | 3 |
| US-068 | Duration Formatting | 3 |
| US-069 | ccusage Integration | 3 |
| US-070 | Cost Recalculation on Resume | 3 |
| US-071 | Orchestrator Service | 4 |
| US-072 | Pipeline State Machine | 4 |
| US-073 | State Transition Validation | 4 |
| US-074 | Initialize New Pipeline | 4 |
| US-075 | Resume Existing Pipeline | 4 |
| US-076 | Phase 1 Command Selection | 4 |
| US-077 | Phase 2 Command Selection | 4 |
| US-078 | Phase 3 Command Selection | 4 |
| US-079 | Phase 4 Command Selection | 4 |
| US-080 | Phase 5 Command Selection | 4 |
| US-081 | Feature Mode Commands | 4 |
| US-082 | Fix Mode Commands | 4 |
| US-083 | Phase Completion Detection | 4 |
| US-084 | Auto-Advance to Next Phase | 4 |
| US-085 | Epic Loop Management | 4 |
| US-086 | Epic Completion Detection | 4 |
| US-087 | All Epics Complete Detection | 4 |
| US-088 | Pipeline Completion Detection | 4 |
| US-089 | Pause Pipeline | 4 |
| US-090 | Resume Pipeline | 4 |
| US-091 | Manual Phase Advance | 4 |
| US-092 | Worker Crash Detection | 4 |
| US-093 | Worker Crash Recovery | 4 |
| US-094 | Orchestrator Event Emitter | 4 |
| US-095 | Manifest Update on Phase Change | 4 |
| US-096 | Manifest Update on Epic Change | 4 |
| US-097 | Cost Update on Phase Complete | 4 |
| US-098 | Duration Update on Phase Complete | 4 |
| US-099 | Orchestrator Logging | 4 |
| US-100 | Worker Timeout Detection | 4 |
| US-101 | Launcher Screen | 5 |
| US-102 | Launcher Path Input | 5 |
| US-103 | Launcher Path Browse Hint | 5 |
| US-104 | Launcher Mode Radio Buttons | 5 |
| US-105 | Launcher Start Button | 5 |
| US-106 | Launcher Recent Projects List | 5 |
| US-107 | Launcher Validation Errors | 5 |
| US-108 | Resume Screen | 5 |
| US-109 | Resume State Display | 5 |
| US-110 | Resume Cost Display | 5 |
| US-111 | Resume Duration Display | 5 |
| US-112 | Resume Button | 5 |
| US-113 | Resume Cancel Button | 5 |
| US-114 | Resume Delete Option | 5 |
| US-115 | Dashboard Screen | 5 |
| US-116 | Dashboard Project Info | 5 |
| US-117 | Dashboard Phase Display | 5 |
| US-118 | Dashboard Progress Bar | 5 |
| US-119 | Dashboard Epic List | 5 |
| US-120 | Dashboard Todo List | 5 |
| US-121 | Dashboard Cost Display | 5 |
| US-122 | Dashboard Duration Display | 5 |
| US-123 | Dashboard Worker Status | 5 |
| US-124 | Dashboard Session Info | 5 |
| US-125 | Dashboard Pause Key | 5 |
| US-126 | Dashboard Advance Key | 5 |
| US-127 | Dashboard Focus Worker Key | 5 |
| US-128 | Dashboard Paused Indicator | 5 |
| US-129 | Complete Screen | 5 |
| US-130 | Complete Summary Stats | 5 |
| US-131 | Complete Cost Summary | 5 |
| US-132 | Complete Duration Summary | 5 |
| US-133 | Complete New Project Button | 5 |
| US-134 | Complete Exit Button | 5 |
| US-135 | Help Overlay | 5 |
| US-136 | Help Overlay Content | 5 |
| US-137 | Help Overlay Close | 5 |
| US-138 | Error Dialog | 5 |
| US-139 | Error Recovery Options | 5 |
| US-140 | Status Bar | 5 |
