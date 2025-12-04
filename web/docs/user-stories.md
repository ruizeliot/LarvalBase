# User Stories

**Project:** PipelineWebGUI
**Date:** 2025-11-28
**Total Stories:** 25 (1 superseded)
**Epics:** 5

---

## Epic 1: Authentication

### US-001: Login

**As an** admin user
**I want to** login with a password
**So that** I can access the dashboard securely

**Acceptance Criteria:**
- [ ] Password input field on login page
- [ ] Submit validates against env var stored password
- [ ] Success returns JWT token and redirects to Pipelines List
- [ ] Error message for wrong password
- [ ] JWT stored in localStorage/memory for subsequent requests

### US-002: Session Persistence

**As an** authenticated user
**I want to** stay logged in across browser sessions
**So that** I don't have to re-enter my password every time

**Acceptance Criteria:**
- [ ] JWT token persists in localStorage
- [ ] App checks token validity on load
- [ ] Expired token redirects to login
- [ ] WebSocket connections authenticate with same JWT

### US-003: Logout

**As an** authenticated user
**I want to** logout from the dashboard
**So that** I can secure my session when done

**Acceptance Criteria:**
- [ ] Logout button visible in navigation
- [ ] Clicking logout clears JWT from storage
- [ ] Redirects to login page
- [ ] WebSocket connections closed on logout

---

## Epic 2: Pipeline Management

### US-004: View Pipelines List

**As an** admin user
**I want to** see all pipelines with their status
**So that** I can monitor ongoing work at a glance

**Acceptance Criteria:**
- [ ] Main view shows list of all pipelines
- [ ] Each pipeline shows: project name, current phase, status (running/complete/stopped)
- [ ] List updates in real-time via WebSocket
- [ ] Clicking a pipeline navigates to Pipeline Graph view
- [ ] Delete button on each pipeline row

### US-005: View Pipeline Graph

**As an** admin user
**I want to** see a visual graph of pipeline phases
**So that** I can understand progress and navigate to specific phases

**Acceptance Criteria:**
- [ ] Visual diagram showing phases: 0a → 0b → 1 → 2 → 3
- [ ] Current phase highlighted
- [ ] Completed phases marked as done
- [ ] Phase status info displayed (time, worker assigned)
- [ ] Clicking a phase opens Worker View for that phase

### US-006: Start New Pipeline

**As an** admin user
**I want to** start a new pipeline via a button
**So that** I can kick off work without typing commands

**Acceptance Criteria:**
- [ ] [+ New Pipeline] button on Pipelines List view
- [ ] Modal opens with:
  - [ ] Input for project path
  - [ ] Mode selector: New Project / Feature
  - [ ] Start from phase dropdown (optional)
  - [ ] Drag-and-drop zone for brainstorm-notes.md
- [ ] If brainstorm notes uploaded:
  - [ ] File copied to project's docs/ folder
  - [ ] Auto-sets start phase to 0b (skips brainstorm)
- [ ] Clicking Start executes `./pipeline supervise <path> [options]`
- [ ] Opens Pipeline Graph view with split terminal (Supervisor + Worker)

### US-007: Stop Pipeline

**As an** admin user
**I want to** stop a running pipeline via a button
**So that** I can halt work without typing commands

**Acceptance Criteria:**
- [ ] Stop button on Pipeline Graph view
- [ ] Clicking sends pre-filled message to Supervisor (e.g., `./pipeline stop /path`)
- [ ] Supervisor executes the stop command

### US-008: Signal Phase Completion

**As an** admin user
**I want to** signal phase completion via a button
**So that** I can advance the pipeline without typing commands

**Acceptance Criteria:**
- [ ] "Signal Complete" button on Worker View
- [ ] Clicking sends pre-filled message to Supervisor (e.g., `./pipeline signal 0a`)
- [ ] Supervisor executes the signal command

### US-009: Restart From Phase

**As an** admin user
**I want to** restart from a specific phase via a button
**So that** I can retry without typing commands

**Acceptance Criteria:**
- [ ] "Restart" button with phase selector on Pipeline Graph
- [ ] Clicking sends pre-filled message to Supervisor (e.g., `./pipeline run /path --from 1`)
- [ ] Supervisor executes the command

### US-021: Delete Pipeline

**As an** admin user
**I want to** delete a pipeline and its project folder
**So that** I can clean up test projects and free disk space

**Acceptance Criteria:**
- [ ] Delete button on each pipeline in Pipelines List view
- [ ] Delete button on Pipeline Graph view
- [ ] Confirmation modal with checkbox "Also delete project folder on disk"
- [ ] Shows full project path in confirmation
- [ ] Warning that action cannot be undone
- [ ] Deletes pipeline record from registry
- [ ] If checkbox checked, deletes project folder recursively
- [ ] Pipeline removed from list after deletion

---

## Epic 3: Worker Management

### US-010: View Workers List

**As an** admin user
**I want to** see all connected workers
**So that** I can monitor available machines

**Acceptance Criteria:**
- [ ] Workers list in Settings view
- [ ] Each worker shows: name, CPU, RAM, status (connected/disconnected)
- [ ] List updates in real-time via WebSocket
- [ ] Visual indicator for active vs idle workers

### US-011: Generate Connection Token

**As an** admin user
**I want to** generate a connection token
**So that** new machines can connect as workers

**Acceptance Criteria:**
- [ ] "Generate Token" button in Settings
- [ ] Displays new token (copyable)
- [ ] Token can be used by worker agent to authenticate
- [ ] Option to revoke/invalidate tokens

### US-012: Download Agent Binary

**As an** admin user
**I want to** download pre-built agent executables
**So that** I can easily set up workers on different machines

**Acceptance Criteria:**
- [ ] Download buttons for each OS: Windows (.exe), Linux, macOS
- [ ] Files served from `/api/agent/:os` endpoint
- [ ] Clear instructions for running the agent
- [ ] Agent prompts for connection token on first run

### US-013: Remove Worker

**As an** admin user
**I want to** remove a worker from the registry
**So that** I can clean up disconnected or unwanted machines

**Acceptance Criteria:**
- [ ] "Remove" button next to each worker in Settings
- [ ] Confirmation prompt before removal
- [ ] Worker removed from registry
- [ ] If worker was connected, connection is terminated

---

## Epic 4: Terminal Views

### US-014: View Worker Terminal

**As an** admin user
**I want to** see real-time terminal output from a worker
**So that** I can monitor what the worker is doing

**Acceptance Criteria:**
- [ ] Full terminal view using xterm.js
- [ ] Attaches to worker's tmux session
- [ ] Full color/ANSI support
- [ ] Scrollable history
- [ ] Real-time updates via WebSocket
- [ ] Input bar fixed at bottom of viewport (always visible, doesn't scroll with content)

### US-015: Send Message to Worker

**As an** admin user
**I want to** send messages/commands to a worker terminal
**So that** I can interact with the worker session

**Acceptance Criteria:**
- [ ] Input field to type message
- [ ] "Send" button transmits to worker's tmux session
- [ ] Message appears in terminal output
- [ ] Support for sending special keys (Enter, Ctrl+C, etc.)

### US-016: View Supervisor Sidebar [SUPERSEDED by US-022]

**Note:** Supervisor is now shown in split view on Pipeline Graph (US-022), not as a sidebar.

~~**As an** admin user~~
~~**I want to** see the supervisor terminal in a sidebar~~
~~**So that** I can monitor the supervisor while viewing other content~~

### US-017: Send Message to Supervisor

**As an** admin user
**I want to** send messages to the supervisor
**So that** I can give instructions or execute commands

**Acceptance Criteria:**
- [ ] Input field in supervisor sidebar
- [ ] "Send" button transmits to supervisor session
- [ ] Pre-filled message buttons for common actions (from US-006, US-007, US-008, US-009)
- [ ] "Nudge" button sends continue/proceed message

### US-018: Copy Terminal Output

**As an** admin user
**I want to** copy terminal output to clipboard
**So that** I can save or share logs

**Acceptance Criteria:**
- [ ] "Copy Output" button on Worker View
- [ ] Copies visible terminal buffer to clipboard
- [ ] Success feedback (toast/notification)

### US-019: Kill Worker Session

**As an** admin user
**I want to** force kill a worker session
**So that** I can terminate stuck or unresponsive workers

**Acceptance Criteria:**
- [ ] "Kill Worker" button on Worker View
- [ ] Confirmation prompt (destructive action)
- [ ] Terminates worker process/session
- [ ] Worker status updates to disconnected

### US-020: Restart Coordinator

**As an** admin user
**I want to** restart the coordinator service
**So that** I can recover from issues without SSH access

**Acceptance Criteria:**
- [ ] "Restart Coordinator" button in Settings
- [ ] Confirmation prompt (will disconnect all sessions)
- [ ] Triggers coordinator service restart
- [ ] Dashboard reconnects automatically after restart

### US-022: Split Terminal View (Pipeline Graph)

**As an** admin user
**I want to** see both Supervisor and Worker terminals side-by-side
**So that** I can monitor orchestration and execution simultaneously

**Acceptance Criteria:**
- [ ] Pipeline Graph view shows split terminal panes below the phase diagram
- [ ] Left pane: Supervisor terminal (attaches to `supervisor-{project}` tmux session)
- [ ] Right pane: Worker terminal (attaches to `worker-{project}` tmux session)
- [ ] Both terminals use xterm.js with full color/ANSI support
- [ ] Both terminals have input bar fixed at bottom of their pane
- [ ] Clicking a phase node switches Worker pane to that phase's worker session
- [ ] Phase diagram at top shows: 0a → 0b → 1 → 2 → 3 with current phase highlighted

---

## Epic 5: Pipeline Analytics (Added 2025-11-28)

### US-023: View Pipeline Metrics

**As an** admin user
**I want to** see metrics for a pipeline run
**So that** I can understand performance, costs, and test results

**Acceptance Criteria:**
- [ ] Analytics button on Pipeline Graph header opens Analytics view
- [ ] Metrics tab shows summary: total duration, estimated cost, test pass rate, phase count
- [ ] Phase breakdown table shows per-phase: duration, cost, status
- [ ] Test results section shows pass/fail counts per epic with progress bars
- [ ] For running pipelines: shows "Running..." for incomplete phases
- [ ] Metrics update every 30 seconds for running pipelines
- [ ] Export JSON button exports metrics data
- [ ] Phase durations calculated from manifest startedAt/completedAt timestamps

### US-024: View Decision Log

**As an** admin user
**I want to** see the supervisor's decision log
**So that** I can understand what decisions were made during pipeline execution

**Acceptance Criteria:**
- [ ] Decisions tab in Analytics view displays supervisor-decisions.log
- [ ] Each entry shows: timestamp, decision type, description
- [ ] Decision types include: SPAWN, KILL, PHASE_COMPLETE, INTERVENTION, ERROR, CRASH_RECOVERY, HEARTBEAT
- [ ] HEARTBEAT entries appear every 5 minutes (pipeline v6.0.1 supervisor heartbeat interval)
- [ ] Filter buttons to show only specific decision types
- [ ] Entries displayed in chronological order (newest at bottom)
- [ ] Shows entry count ("Showing 24 entries")
- [ ] Export JSON button exports decision log data
- [ ] Gracefully handles missing log file (shows "No decisions logged")

### US-025: View Pipeline History

**As an** admin user
**I want to** see historical runs for a project
**So that** I can track performance trends over time

**Acceptance Criteria:**
- [ ] History tab in Analytics view shows list of previous runs
- [ ] Each run shows: Run ID, date, duration, cost, status (Running/Complete/Failed)
- [ ] Runs loaded from .pipeline/runs/*/metadata.json
- [ ] Simple trend chart shows duration over recent runs
- [ ] Clicking a run loads that run's metrics in Metrics tab
- [ ] Current/active run highlighted at top of list
- [ ] Handles projects with no history (shows "No previous runs")
- [ ] History is per-project only (not global across all projects)

---

## Story Index

| ID | Title | Epic | Status |
|----|-------|------|--------|
| US-001 | Login | 1 | |
| US-002 | Session Persistence | 1 | |
| US-003 | Logout | 1 | |
| US-004 | View Pipelines List | 2 | |
| US-005 | View Pipeline Graph | 2 | |
| US-006 | Start New Pipeline | 2 | |
| US-007 | Stop Pipeline | 2 | |
| US-008 | Signal Phase Completion | 2 | |
| US-009 | Restart From Phase | 2 | |
| US-010 | View Workers List | 3 | |
| US-011 | Generate Connection Token | 3 | |
| US-012 | Download Agent Binary | 3 | |
| US-013 | Remove Worker | 3 | |
| US-014 | View Worker Terminal | 4 | |
| US-015 | Send Message to Worker | 4 | |
| US-016 | View Supervisor Sidebar | 4 | SUPERSEDED by US-022 |
| US-017 | Send Message to Supervisor | 4 | |
| US-018 | Copy Terminal Output | 4 | |
| US-019 | Kill Worker Session | 4 | |
| US-020 | Restart Coordinator | 4 | |
| US-021 | Delete Pipeline | 2 | NEW |
| US-022 | Split Terminal View | 4 | NEW |
| US-023 | View Pipeline Metrics | 5 | NEW |
| US-024 | View Decision Log | 5 | NEW |
| US-025 | View Pipeline History | 5 | NEW |
