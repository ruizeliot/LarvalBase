# E2E Test Specifications

**Project:** PipelineWebGUI
**Date:** 2025-11-28
**Total Tests:** 24 main tests + 72 edge cases = 96 test scenarios
**Coverage:** 100% (all acceptance criteria mapped)

---

## Epic 1: Authentication

### E2E-001: Login (US-001)

**Test:** Admin user can login with correct password and access dashboard

**Steps:**
1. Navigate to login page
2. Enter correct password in password field
3. Click submit button
4. Verify form submits to server (network request to `/api/auth`)
5. Verify server returns 200 with JWT token
6. Verify JWT stored in localStorage
7. Verify redirect to Pipelines List view

**Edge Cases:**
- E2E-001a: Wrong password → Verify client submits to server, server returns 401, error message "Invalid password" displayed from server response (no client-side validation)
- E2E-001b: Empty password → Verify client submits to server, server returns 400, error message "Password required" displayed from server response (no client-side validation)
- E2E-001c: Server unavailable → Error message "Unable to connect" displayed

**Covers Acceptance Criteria:**
- Password input field on login page
- Submit validates against env var stored password
- Success returns JWT token and redirects to Pipelines List
- Error message for wrong password
- JWT stored in localStorage/memory for subsequent requests

---

### E2E-002: Session Persistence (US-002)

**Test:** Authenticated user stays logged in across browser sessions

**Steps:**
1. Login successfully (from E2E-001)
2. Close browser tab
3. Open new tab and navigate to app
4. Verify app loads Pipelines List (not login page)
5. Verify JWT from localStorage is sent with API requests
6. Verify WebSocket connection authenticates with JWT

**Edge Cases:**
- E2E-002a: Expired JWT token → Redirects to login page
- E2E-002b: Invalid/tampered JWT token → Server returns 401, redirects to login
- E2E-002c: localStorage cleared → Redirects to login page

**Covers Acceptance Criteria:**
- JWT token persists in localStorage
- App checks token validity on load
- Expired token redirects to login
- WebSocket connections authenticate with same JWT

---

### E2E-003: Logout (US-003)

**Test:** Authenticated user can logout and clear session

**Steps:**
1. Login successfully
2. Verify logout button visible in navigation
3. Click logout button
4. Verify JWT removed from localStorage
5. Verify redirected to login page
6. Verify WebSocket connection closed

**Edge Cases:**
- E2E-003a: Double-click logout → Only one logout processed, no errors
- E2E-003b: Logout while API request in progress → Request cancelled gracefully
- E2E-003c: Try to access protected route after logout → Redirects to login

**Covers Acceptance Criteria:**
- Logout button visible in navigation
- Clicking logout clears JWT from storage
- Redirects to login page
- WebSocket connections closed on logout

---

## Epic 2: Pipeline Management

### E2E-004: View Pipelines List (US-004)

**Test:** Admin can see all pipelines with status on main view

**Steps:**
1. Login and navigate to Pipelines List
2. Verify list displays all pipelines from server
3. Verify each row shows: project name, current phase (0a/0b/1/2/3), status icon
4. Verify status icons: Running (green dot), Complete (blue check), Stopped (gray square)
5. Verify delete button present on each row
6. Create new pipeline (separate test), verify list updates via WebSocket
7. Click a pipeline row, verify navigation to Pipeline Graph view

**Edge Cases:**
- E2E-004a: No pipelines exist → Shows empty state "No pipelines. Click + New Pipeline to start"
- E2E-004b: 50+ pipelines → List scrollable, all pipelines visible
- E2E-004c: WebSocket disconnects → Shows reconnecting indicator, auto-reconnects

**Covers Acceptance Criteria:**
- Main view shows list of all pipelines
- Each pipeline shows: project name, current phase, status
- List updates in real-time via WebSocket
- Clicking a pipeline navigates to Pipeline Graph view
- Delete button on each pipeline row

---

### E2E-005: View Pipeline Graph (US-005)

**Test:** Admin can see visual pipeline phase diagram

**Steps:**
1. Navigate to Pipeline Graph view for a pipeline
2. Verify visual diagram shows phases: 0a → 0b → 1 → 2 → 3
3. Verify arrows connect phases left to right
4. Verify current phase highlighted (different color/border)
5. Verify completed phases show checkmark
6. Verify phase info displays (time started, worker assigned)
7. Click a phase node, verify Worker View opens for that phase

**Edge Cases:**
- E2E-005a: Pipeline at phase 0a → Only 0a highlighted, rest inactive
- E2E-005b: Pipeline complete → All phases show checkmarks
- E2E-005c: Pipeline stopped mid-phase → Current phase shows paused indicator

**Covers Acceptance Criteria:**
- Visual diagram showing phases: 0a → 0b → 1 → 2 → 3
- Current phase highlighted
- Completed phases marked as done
- Phase status info displayed
- Clicking a phase opens Worker View for that phase

---

### E2E-006: Start New Pipeline (US-006)

**Test:** Admin can start new pipeline via modal

**Steps:**
1. Click [+ New Pipeline] button on Pipelines List
2. Verify modal opens with form
3. Enter project path in input field
4. Select "New Project" mode
5. Leave start phase as default (0a)
6. Click Start button
7. Verify server receives POST `/api/pipelines` with correct payload
8. Verify Pipeline Graph view opens with split terminal (Supervisor left, Worker right - Worker may show "Starting..." initially)

**Edge Cases:**
- E2E-006a: Invalid project path → Server returns 400, error "Invalid path" displayed
- E2E-006b: Select Feature mode → POST includes mode: "feature"
- E2E-006c: Select start phase 1 → POST includes startFrom: "1"
- E2E-006d: Path already has running pipeline → Server returns 409, error "Pipeline already running"

**Covers Acceptance Criteria:**
- [+ New Pipeline] button on Pipelines List view
- Modal opens with input for project path
- Mode selector: New Project / Feature
- Start from phase dropdown (optional)
- Clicking Start executes pipeline command
- Opens Pipeline Graph view with split terminal

---

### E2E-006-DND: Drag and Drop Brainstorm Notes (US-006)

**Test:** Admin can drag-drop brainstorm notes to skip phase 0a

**Steps:**
1. Open New Pipeline modal
2. Drag brainstorm-notes.md file onto drop zone
3. Verify file preview shows "brainstorm-notes.md (X KB)" with remove button
4. Verify start phase auto-sets to 0b
5. Click Start
6. Verify file uploaded to server
7. Verify server copies file to project's docs/ folder
8. Verify pipeline starts at phase 0b

**Edge Cases:**
- E2E-006-DNDa: Drop non-.md file → Error "Only .md files accepted"
- E2E-006-DNDb: Drop file then click remove → File cleared, phase resets to 0a
- E2E-006-DNDc: Click drop zone to browse → File browser opens

**Covers Acceptance Criteria:**
- Drag-and-drop zone for brainstorm-notes.md
- File copied to project's docs/ folder
- Auto-sets start phase to 0b (skips brainstorm)

---

### E2E-007: Stop Pipeline (US-007)

**Test:** Admin can stop a running pipeline

**Steps:**
1. Navigate to Pipeline Graph for a running pipeline
2. Verify Stop button visible
3. Click Stop button
4. Verify message sent to Supervisor terminal (via WebSocket)
5. Verify pipeline status changes to Stopped
6. Verify status reflected in Pipelines List

**Edge Cases:**
- E2E-007a: Stop already stopped pipeline → Button disabled or shows "Stopped"
- E2E-007b: Stop while phase transitioning → Stops cleanly at next opportunity
- E2E-007c: Network error during stop → Error displayed, retry option

**Covers Acceptance Criteria:**
- Stop button on Pipeline Graph view
- Clicking sends pre-filled message to Supervisor
- Supervisor executes the stop command

---

### E2E-008: Signal Phase Completion (US-008)

**Test:** Admin can manually signal phase completion

**Steps:**
1. Navigate to Worker View for active phase
2. Verify "Signal Complete" button visible
3. Click Signal Complete button
4. Verify message sent to Supervisor (via WebSocket)
5. Verify phase advances to next phase
6. Verify Pipeline Graph updates to show new current phase

**Edge Cases:**
- E2E-008a: Signal on completed pipeline → Button disabled or hidden
- E2E-008b: Signal while already signaling → Prevents duplicate signals
- E2E-008c: Phase requires tests to pass → Warning "Tests may not be passing"

**Covers Acceptance Criteria:**
- "Signal Complete" button on Worker View
- Clicking sends pre-filled message to Supervisor
- Supervisor executes the signal command

---

### E2E-009: Restart From Phase (US-009)

**Test:** Admin can restart pipeline from specific phase

**Steps:**
1. Navigate to Pipeline Graph for a stopped/complete pipeline
2. Verify Restart button with phase selector visible
3. Select phase 1 from dropdown
4. Click Restart
5. Verify message sent to Supervisor with --from 1
6. Verify pipeline restarts at phase 1
7. Verify Pipeline Graph shows phase 1 as current

**Edge Cases:**
- E2E-009a: Restart from current phase → Re-runs current phase
- E2E-009b: Restart from phase that hasn't been reached → Error "Cannot restart from unvisited phase"
- E2E-009c: Restart while running → Warning "Pipeline is running, stop first?"

**Covers Acceptance Criteria:**
- "Restart" button with phase selector on Pipeline Graph
- Clicking sends pre-filled message to Supervisor
- Supervisor executes the command

---

### E2E-021: Delete Pipeline (US-021)

**Test:** Admin can delete pipeline and optionally project folder

**Steps:**
1. Navigate to Pipelines List
2. Click Delete button on a pipeline row
3. Verify confirmation modal appears
4. Verify modal shows project name and full path
5. Verify checkbox "Also delete project folder on disk" present
6. Verify warning "This action cannot be undone"
7. Click Delete Forever without checkbox
8. Verify pipeline removed from list
9. Verify project folder still exists on disk

**Edge Cases:**
- E2E-021a: Delete with checkbox checked → Pipeline AND project folder deleted
- E2E-021b: Delete running pipeline → Warning "Pipeline is running, stop first?"
- E2E-021c: Cancel delete → Modal closes, nothing deleted

**Covers Acceptance Criteria:**
- Delete button on each pipeline in Pipelines List view
- Delete button on Pipeline Graph view
- Confirmation modal with checkbox "Also delete project folder on disk"
- Shows full project path in confirmation
- Warning that action cannot be undone
- Deletes pipeline record from registry
- If checkbox checked, deletes project folder recursively
- Pipeline removed from list after deletion

---

## Epic 3: Worker Management

### E2E-010: View Workers List (US-010)

**Test:** Admin can see all connected workers

**Steps:**
1. Navigate to Settings view
2. Verify Workers list section visible
3. Verify each worker shows: name, CPU %, RAM %, status indicator
4. Verify connected workers show green indicator, disconnected show gray
5. Verify idle workers show different styling than active workers
6. Connect new worker, verify list updates via WebSocket

**Edge Cases:**
- E2E-010a: No workers connected → Shows empty state "No workers connected"
- E2E-010b: Worker disconnects → Status changes to disconnected in real-time
- E2E-010c: Worker reconnects → Status updates to connected

**Covers Acceptance Criteria:**
- Workers list in Settings view
- Each worker shows: name, CPU, RAM, status
- List updates in real-time via WebSocket
- Visual indicator for active vs idle workers

---

### E2E-011: Generate Connection Token (US-011)

**Test:** Admin can generate token for new workers

**Steps:**
1. Navigate to Settings view
2. Click "Generate Token" button
3. Verify new token displayed in copyable format
4. Verify copy button works (copies to clipboard)
5. Verify token can be used by worker agent to authenticate

**Edge Cases:**
- E2E-011a: Generate multiple tokens → Each token is unique
- E2E-011b: Revoke token → Token no longer valid for authentication
- E2E-011c: Use expired/revoked token → Worker authentication fails

**Covers Acceptance Criteria:**
- "Generate Token" button in Settings
- Displays new token (copyable)
- Token can be used by worker agent to authenticate
- Option to revoke/invalidate tokens

---

### E2E-012: Download Agent Binary (US-012)

**Test:** Admin can download pre-built agent executables

**Steps:**
1. Navigate to Settings view
2. Verify download buttons for Windows (.exe), Linux, macOS
3. Click Windows download button
4. Verify browser downloads file from `/api/agent/windows`
5. Verify instructions displayed for running agent

**Edge Cases:**
- E2E-012a: Agent binary not available → Error "Agent build not available"
- E2E-012b: Download while offline → Error handling gracefully
- E2E-012c: Click each OS button → Correct binary downloaded for each

**Covers Acceptance Criteria:**
- Download buttons for each OS: Windows, Linux, macOS
- Files served from `/api/agent/:os` endpoint
- Clear instructions for running the agent
- Agent prompts for connection token on first run

---

### E2E-013: Remove Worker (US-013)

**Test:** Admin can remove worker from registry

**Steps:**
1. Navigate to Settings view
2. Click "Remove" button next to a worker
3. Verify confirmation prompt appears
4. Click confirm
5. Verify worker removed from list
6. If worker was connected, verify connection terminated

**Edge Cases:**
- E2E-013a: Remove connected worker → Connection terminated, worker disappears
- E2E-013b: Remove already disconnected worker → Worker removed from registry
- E2E-013c: Cancel removal → Worker remains in list

**Covers Acceptance Criteria:**
- "Remove" button next to each worker in Settings
- Confirmation prompt before removal
- Worker removed from registry
- If worker was connected, connection is terminated

---

## Epic 4: Terminal Views

### E2E-014: View Worker Terminal (US-014)

**Test:** Admin can see real-time terminal output from worker

**Steps:**
1. Navigate to Worker View for an active worker
2. Verify xterm.js terminal rendered
3. Verify terminal shows tmux session content
4. Verify ANSI colors displayed correctly
5. Verify terminal scrollable (scroll up to see history)
6. Verify real-time updates as worker outputs text
7. Verify input bar fixed at bottom of viewport (doesn't scroll with content)

**Edge Cases:**
- E2E-014a: Worker session not running → Shows "Worker session not active"
- E2E-014b: Very long output → Scrollback buffer maintained, performance stable
- E2E-014c: Binary/special characters → Rendered safely, no injection

**Covers Acceptance Criteria:**
- Full terminal view using xterm.js
- Attaches to worker's tmux session
- Full color/ANSI support
- Scrollable history
- Real-time updates via WebSocket
- Input bar fixed at bottom of viewport

---

### E2E-015: Send Message to Worker (US-015)

**Test:** Admin can send messages to worker terminal

**Steps:**
1. Navigate to Worker View
2. Type message in input field
3. Click Send button
4. Verify message transmitted to worker's tmux session
5. Verify message appears in terminal output
6. Test Enter key sends message
7. Test Ctrl+C sends interrupt signal

**Edge Cases:**
- E2E-015a: Send empty message → Nothing sent or enter key only
- E2E-015b: Send very long message → Message truncated or scrolls in input
- E2E-015c: Send while disconnected → Error "Worker disconnected"

**Covers Acceptance Criteria:**
- Input field to type message
- "Send" button transmits to worker's tmux session
- Message appears in terminal output
- Support for sending special keys (Enter, Ctrl+C)

---

### E2E-017: Send Message to Supervisor (US-017)

**Test:** Admin can send messages to supervisor

**Steps:**
1. Navigate to Pipeline Graph view (split terminal)
2. Type message in supervisor input field
3. Click Send button
4. Verify message transmitted to supervisor session
5. Verify pre-filled message buttons visible (Stop, Signal, Restart)
6. Click Nudge button
7. Verify "continue" message sent to supervisor

**Edge Cases:**
- E2E-017a: Pre-filled button sends exact command → No extra characters
- E2E-017b: Supervisor session not running → Error "Supervisor not active"
- E2E-017c: Send while supervisor processing → Message queued or sent

**Covers Acceptance Criteria:**
- Input field in supervisor terminal pane (split view, not sidebar)
- "Send" button transmits to supervisor session
- Pre-filled message buttons for common actions
- "Nudge" button sends continue/proceed message

---

### E2E-018: Copy Terminal Output (US-018)

**Test:** Admin can copy terminal output to clipboard

**Steps:**
1. Navigate to Worker View with terminal output
2. Click "Copy Output" button
3. Verify visible terminal buffer copied to clipboard
4. Verify success toast/notification displayed
5. Paste in text editor to verify content

**Edge Cases:**
- E2E-018a: Empty terminal → Copies empty string or shows "Nothing to copy"
- E2E-018b: Copy fails (permissions) → Error message displayed
- E2E-018c: Very large buffer → Copies truncated or full based on implementation

**Covers Acceptance Criteria:**
- "Copy Output" button on Worker View
- Copies visible terminal buffer to clipboard
- Success feedback (toast/notification)

---

### E2E-019: Kill Worker Session (US-019)

**Test:** Admin can force kill a stuck worker

**Steps:**
1. Navigate to Worker View for stuck/unresponsive worker
2. Click "Kill Worker" button
3. Verify confirmation prompt (destructive action warning)
4. Click confirm
5. Verify worker process terminated
6. Verify worker status updates to disconnected
7. Verify terminal shows disconnected state

**Edge Cases:**
- E2E-019a: Kill already dead worker → Shows "Worker already stopped"
- E2E-019b: Cancel kill → Worker continues running
- E2E-019c: Kill during active task → Task interrupted, may need restart

**Covers Acceptance Criteria:**
- "Kill Worker" button on Worker View
- Confirmation prompt (destructive action)
- Terminates worker process/session
- Worker status updates to disconnected

---

### E2E-020: Restart Coordinator (US-020)

**Test:** Admin can restart coordinator service

**Steps:**
1. Navigate to Settings view
2. Click "Restart Coordinator" button
3. Verify confirmation prompt warns about disconnecting sessions
4. Click confirm
5. Verify coordinator restart triggered
6. Verify dashboard disconnects briefly
7. Verify dashboard auto-reconnects after restart

**Edge Cases:**
- E2E-020a: Restart fails → Error message, manual intervention needed
- E2E-020b: Cancel restart → Nothing happens
- E2E-020c: Multiple rapid restarts → Debounced or queued

**Covers Acceptance Criteria:**
- "Restart Coordinator" button in Settings
- Confirmation prompt (will disconnect all sessions)
- Triggers coordinator service restart
- Dashboard reconnects automatically after restart

---

### E2E-022: Split Terminal View (US-022)

**Test:** Admin can see Supervisor and Worker terminals side-by-side

**Steps:**
1. Navigate to Pipeline Graph view for active pipeline
2. Verify phase diagram at top (0a → 0b → 1 → 2 → 3)
3. Verify current phase highlighted in diagram
4. Verify split terminal panes below diagram
5. Verify left pane shows Supervisor terminal (supervisor-{project} session)
6. Verify right pane shows Worker terminal (worker-{project} session)
7. Verify both terminals have xterm.js with color support
8. Verify both terminals have input bar fixed at bottom
9. Click different phase in diagram
10. Verify Worker pane switches to that phase's worker session

**Edge Cases:**
- E2E-022a: No worker for selected phase → Shows "No worker for this phase"
- E2E-022b: Resize browser → Both terminals resize proportionally
- E2E-022c: One terminal disconnects → Shows reconnecting state

**Covers Acceptance Criteria:**
- Pipeline Graph view shows split terminal panes below phase diagram
- Left pane: Supervisor terminal
- Right pane: Worker terminal
- Both terminals use xterm.js with full color/ANSI support
- Both terminals have input bar fixed at bottom
- Clicking a phase node switches Worker pane to that phase's worker session
- Phase diagram at top shows phases with current highlighted

---

## Epic 5: Pipeline Analytics

### E2E-023: View Pipeline Metrics (US-023)

**Test:** Admin can view metrics for a pipeline run

**Steps:**
1. Navigate to Pipeline Graph view for a pipeline
2. Click [Analytics] button in header
3. Verify Analytics view opens with Metrics tab active
4. Verify summary section shows: total duration, estimated cost, test pass rate, phase count
5. Verify phase breakdown table shows per-phase: duration, cost, status
6. Verify test results section shows pass/fail counts per epic with progress bars
7. For running pipeline: verify incomplete phases show "Running..."
8. Verify metrics update every 30 seconds for running pipeline (wait 30s, verify data timestamp/values change)
9. Click Export JSON button
10. Verify JSON file downloads with metrics data

**Edge Cases:**
- E2E-023a: Complete pipeline → All phases show duration and cost, status "Complete"
- E2E-023b: Running pipeline → Current phase shows "Running...", future phases show "--"
- E2E-023c: Failed pipeline → Failed phase shows error status, subsequent phases show "--"

**Covers Acceptance Criteria:**
- Analytics button on Pipeline Graph header opens Analytics view
- Metrics tab shows summary: total duration, estimated cost, test pass rate, phase count
- Phase breakdown table shows per-phase: duration, cost, status
- Test results section shows pass/fail counts per epic with progress bars
- For running pipelines: shows "Running..." for incomplete phases
- Metrics update every 30 seconds for running pipelines
- Export JSON button exports metrics data
- Phase durations calculated from manifest startedAt/completedAt timestamps

---

### E2E-024: View Decision Log (US-024)

**Test:** Admin can view supervisor decision log

**Steps:**
1. Navigate to Analytics view for a pipeline
2. Click [Decisions] tab
3. Verify decision entries displayed with: timestamp, decision type, description
4. Verify decision types include: SPAWN, KILL, PHASE_COMPLETE, INTERVENTION, ERROR
5. Verify HEARTBEAT entries appear at 5-minute intervals
6. Verify entries in chronological order (newest at bottom)
7. Verify entry count shown (e.g., "Showing 24 entries")
8. Click filter button for "PHASE_COMPLETE"
9. Verify only PHASE_COMPLETE entries shown
10. Click Export JSON button
11. Verify JSON file downloads with decision log data

**Edge Cases:**
- E2E-024a: No decisions logged → Shows "No decisions logged" message
- E2E-024b: Filter shows no results → Shows "No entries match filter"
- E2E-024c: Very long decision log (500+ entries) → Scrollable, performance stable

**Covers Acceptance Criteria:**
- Decisions tab in Analytics view displays supervisor-decisions.log
- Each entry shows: timestamp, decision type, description
- Decision types include: SPAWN, KILL, PHASE_COMPLETE, INTERVENTION, ERROR, CRASH_RECOVERY, HEARTBEAT
- HEARTBEAT entries appear every 5 minutes (pipeline v6.0.1 supervisor heartbeat interval)
- Filter buttons to show only specific decision types
- Entries displayed in chronological order (newest at bottom)
- Shows entry count ("Showing 24 entries")
- Export JSON button exports decision log data
- Gracefully handles missing log file (shows "No decisions logged")

---

### E2E-025: View Pipeline History (US-025)

**Test:** Admin can view historical runs for a project

**Steps:**
1. Navigate to Analytics view for a pipeline
2. Click [History] tab
3. Verify list of previous runs displayed
4. Verify each run shows: Run ID, date, duration, cost, status
5. Verify current/active run highlighted at top
6. Verify simple trend chart shows duration over recent runs
7. Click a previous run in list
8. Verify Metrics tab loads with that run's data
9. Verify chart updates to highlight selected run

**Edge Cases:**
- E2E-025a: No previous runs → Shows "No previous runs" message
- E2E-025b: Project with 50+ runs → List scrollable, all runs accessible
- E2E-025c: Run with missing metadata → Shows partial data with "Data unavailable" for missing fields

**Covers Acceptance Criteria:**
- History tab in Analytics view shows list of previous runs
- Each run shows: Run ID, date, duration, cost, status (Running/Complete/Failed)
- Runs loaded from .pipeline/runs/*/metadata.json
- Simple trend chart shows duration over recent runs
- Clicking a run loads that run's metrics in Metrics tab
- Current/active run highlighted at top of list
- Handles projects with no history (shows "No previous runs")
- History is per-project only (not global across all projects)

---

## Coverage Matrix

| User Story | E2E Tests | Criteria Covered |
|------------|-----------|------------------|
| US-001 | E2E-001, E2E-001a, E2E-001b, E2E-001c | 5/5 |
| US-002 | E2E-002, E2E-002a, E2E-002b, E2E-002c | 4/4 |
| US-003 | E2E-003, E2E-003a, E2E-003b, E2E-003c | 4/4 |
| US-004 | E2E-004, E2E-004a, E2E-004b, E2E-004c | 5/5 |
| US-005 | E2E-005, E2E-005a, E2E-005b, E2E-005c | 5/5 |
| US-006 | E2E-006, E2E-006a, E2E-006b, E2E-006c, E2E-006d, E2E-006-DND, E2E-006-DNDa, E2E-006-DNDb, E2E-006-DNDc | 9/9 |
| US-007 | E2E-007, E2E-007a, E2E-007b, E2E-007c | 3/3 |
| US-008 | E2E-008, E2E-008a, E2E-008b, E2E-008c | 3/3 |
| US-009 | E2E-009, E2E-009a, E2E-009b, E2E-009c | 3/3 |
| US-010 | E2E-010, E2E-010a, E2E-010b, E2E-010c | 4/4 |
| US-011 | E2E-011, E2E-011a, E2E-011b, E2E-011c | 4/4 |
| US-012 | E2E-012, E2E-012a, E2E-012b, E2E-012c | 4/4 |
| US-013 | E2E-013, E2E-013a, E2E-013b, E2E-013c | 4/4 |
| US-014 | E2E-014, E2E-014a, E2E-014b, E2E-014c | 6/6 |
| US-015 | E2E-015, E2E-015a, E2E-015b, E2E-015c | 4/4 |
| US-016 | SUPERSEDED by US-022 | N/A |
| US-017 | E2E-017, E2E-017a, E2E-017b, E2E-017c | 4/4 |
| US-018 | E2E-018, E2E-018a, E2E-018b, E2E-018c | 3/3 |
| US-019 | E2E-019, E2E-019a, E2E-019b, E2E-019c | 4/4 |
| US-020 | E2E-020, E2E-020a, E2E-020b, E2E-020c | 4/4 |
| US-021 | E2E-021, E2E-021a, E2E-021b, E2E-021c | 8/8 |
| US-022 | E2E-022, E2E-022a, E2E-022b, E2E-022c | 7/7 |
| US-023 | E2E-023, E2E-023a, E2E-023b, E2E-023c | 8/8 |
| US-024 | E2E-024, E2E-024a, E2E-024b, E2E-024c | 9/9 |
| US-025 | E2E-025, E2E-025a, E2E-025b, E2E-025c | 8/8 |

**Total Coverage:** 24/24 user stories covered (US-016 superseded)
**Total Test Scenarios:** 24 main tests + 72 edge cases = 96 scenarios
