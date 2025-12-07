# Pipeline v7 - User Stories

**Date:** 2025-12-07
**Total Stories:** 286
**Epics:** 8

---

## Epic Overview

| Epic | Name | Layer | Stories | Dependencies |
|------|------|-------|---------|--------------|
| 1 | TUI Framework | Foundation | 30 | None |
| 2 | Test Infrastructure | Foundation | 40 | Epic 1 |
| 3 | State Management | Data | 47 | Epic 1, 2 |
| 4 | Filesystem Service | Services | 34 | Epic 3 |
| 5 | Process Service | Services | 29 | Epic 3 |
| 6 | Cost Service | Services | 22 | Epic 3 |
| 7 | Pipeline Orchestrator | Logic | 36 | Epic 4, 5, 6 |
| 8 | UI Screens | UI | 48 | Epic 7 |

---

## Epic 1: TUI Framework (30 stories)

Foundation layer providing all Ink v5 components and keyboard handling.

### US-001: Box Container Component
**As a** developer
**I want** a Box component that wraps Ink's Box
**So that** I can create flexible layouts with borders and padding

**Acceptance Criteria:**
- [ ] Renders children in flexbox layout
- [ ] Supports border styles (single, double, round)
- [ ] Supports padding and margin props
- [ ] Supports flexDirection (row, column)
- [ ] Has data-testid attribute for testing

### US-002: Text Component
**As a** developer
**I want** a Text component with styling options
**So that** I can display styled text in the TUI

**Acceptance Criteria:**
- [ ] Renders text content
- [ ] Supports color prop (named colors, hex)
- [ ] Supports bold, italic, underline, strikethrough
- [ ] Supports dimmed text
- [ ] Supports inverse (background/foreground swap)

### US-003: Input Component
**As a** developer
**I want** an Input component for text entry
**So that** users can enter text like project paths

**Acceptance Criteria:**
- [ ] Displays current value
- [ ] Shows cursor position
- [ ] Handles character input
- [ ] Handles backspace/delete
- [ ] Supports placeholder text
- [ ] Calls onChange callback

### US-004: Select Component
**As a** developer
**I want** a Select component for option selection
**So that** users can choose from a list of options

**Acceptance Criteria:**
- [ ] Displays list of options
- [ ] Shows current selection indicator (►)
- [ ] Navigates with arrow keys
- [ ] Selects with Enter
- [ ] Calls onChange with selected value
- [ ] Supports disabled options

### US-005: Radio Group Component
**As a** developer
**I want** a RadioGroup component
**So that** users can select one option from a group

**Acceptance Criteria:**
- [ ] Displays options with radio indicators (○/●)
- [ ] Only one option selected at a time
- [ ] Navigates with arrow keys
- [ ] Selects with Enter or Space
- [ ] Calls onChange with selected value

### US-006: Checkbox Component
**As a** developer
**I want** a Checkbox component
**So that** users can toggle boolean options

**Acceptance Criteria:**
- [ ] Displays checkbox indicator (☐/☑)
- [ ] Toggles with Enter or Space
- [ ] Supports label text
- [ ] Calls onChange with boolean value

### US-007: Button Component
**As a** developer
**I want** a Button component
**So that** users can trigger actions

**Acceptance Criteria:**
- [ ] Displays button text
- [ ] Shows focus state (border or inverse)
- [ ] Activates with Enter
- [ ] Supports disabled state
- [ ] Calls onPress callback

### US-008: Progress Bar Component
**As a** developer
**I want** a ProgressBar component
**So that** I can show completion progress

**Acceptance Criteria:**
- [ ] Displays progress as filled bar (████░░░░)
- [ ] Shows percentage value
- [ ] Accepts value prop (0-100)
- [ ] Configurable width
- [ ] Configurable fill/empty characters

### US-009: Spinner Component
**As a** developer
**I want** a Spinner component
**So that** I can show loading state

**Acceptance Criteria:**
- [ ] Animates through spinner frames
- [ ] Supports different spinner types (dots, line, arc)
- [ ] Displays optional label text
- [ ] Can be stopped/started

### US-010: Divider Component
**As a** developer
**I want** a Divider component
**So that** I can visually separate sections

**Acceptance Criteria:**
- [ ] Renders horizontal line
- [ ] Supports different line styles (─, ═, -)
- [ ] Fills available width
- [ ] Supports optional title in middle

### US-011: Spacer Component
**As a** developer
**I want** a Spacer component
**So that** I can add flexible space in layouts

**Acceptance Criteria:**
- [ ] Expands to fill available space
- [ ] Works in both row and column flex directions

### US-012: Badge Component
**As a** developer
**I want** a Badge component
**So that** I can show status indicators

**Acceptance Criteria:**
- [ ] Displays short text in colored background
- [ ] Supports predefined variants (success, error, warning, info)
- [ ] Supports custom colors

### US-013: Table Component
**As a** developer
**I want** a Table component
**So that** I can display tabular data

**Acceptance Criteria:**
- [ ] Renders headers and rows
- [ ] Aligns columns (left, center, right)
- [ ] Supports column widths (fixed, auto)
- [ ] Draws borders between cells

### US-014: List Component
**As a** developer
**I want** a List component
**So that** I can display scrollable lists

**Acceptance Criteria:**
- [ ] Renders list items
- [ ] Supports item prefixes (•, -, numbers)
- [ ] Scrolls when items exceed height
- [ ] Shows scroll indicator

### US-015: useInput Hook
**As a** developer
**I want** a useInput hook
**So that** I can handle keyboard input

**Acceptance Criteria:**
- [ ] Receives character input
- [ ] Receives special key info (arrow, enter, escape, tab)
- [ ] Receives modifier keys (ctrl, shift, meta)
- [ ] Can be conditionally active

### US-016: useApp Hook
**As a** developer
**I want** a useApp hook
**So that** I can control the application lifecycle

**Acceptance Criteria:**
- [ ] Provides exit() function
- [ ] Provides clear() function for screen
- [ ] Exposes app dimensions

### US-017: useFocus Hook
**As a** developer
**I want** a useFocus hook
**So that** I can manage focus state

**Acceptance Criteria:**
- [ ] Returns isFocused boolean
- [ ] Provides focus() function
- [ ] Works with Tab navigation

### US-018: useFocusManager Hook
**As a** developer
**I want** a useFocusManager hook
**So that** I can control focus programmatically

**Acceptance Criteria:**
- [ ] Provides focusNext() function
- [ ] Provides focusPrevious() function
- [ ] Provides focus(id) function
- [ ] Tracks current focus id

### US-019: Screen Container Component
**As a** developer
**I want** a Screen component
**So that** I can create full-screen views

**Acceptance Criteria:**
- [ ] Fills terminal dimensions
- [ ] Provides header/footer areas
- [ ] Manages internal scroll
- [ ] Clears previous content

### US-020: Modal Component
**As a** developer
**I want** a Modal component
**So that** I can show overlay dialogs

**Acceptance Criteria:**
- [ ] Renders on top of content
- [ ] Captures keyboard focus
- [ ] Has visible border
- [ ] Closes with Escape
- [ ] Calls onClose callback

### US-021: Toast/Notification Component
**As a** developer
**I want** a Toast component
**So that** I can show temporary messages

**Acceptance Criteria:**
- [ ] Displays message at screen edge
- [ ] Auto-dismisses after timeout
- [ ] Supports different types (info, success, error)
- [ ] Can be manually dismissed

### US-022: Split Pane Layout
**As a** developer
**I want** a SplitPane component
**So that** I can create side-by-side views

**Acceptance Criteria:**
- [ ] Divides space into two panes
- [ ] Supports horizontal and vertical split
- [ ] Allows resizing with arrow keys
- [ ] Maintains minimum pane sizes

### US-023: StatusBar Component
**As a** developer
**I want** a StatusBar component
**So that** I can show persistent status information

**Acceptance Criteria:**
- [ ] Renders at screen bottom
- [ ] Shows key hints
- [ ] Updates dynamically
- [ ] Supports left/right sections

### US-024: Scrollable Component
**As a** developer
**I want** a Scrollable component
**So that** content can exceed visible area

**Acceptance Criteria:**
- [ ] Shows visible portion of content
- [ ] Scrolls with arrow keys when focused
- [ ] Shows scroll position indicator
- [ ] Supports programmatic scroll-to

### US-025: Form Component
**As a** developer
**I want** a Form component
**So that** I can group form fields

**Acceptance Criteria:**
- [ ] Manages field focus with Tab
- [ ] Validates on submit
- [ ] Shows validation errors
- [ ] Calls onSubmit with values

### US-026: Tab Navigation
**As a** developer
**I want** Tab key to navigate between focusable elements
**So that** keyboard navigation is intuitive

**Acceptance Criteria:**
- [ ] Tab moves to next focusable
- [ ] Shift+Tab moves to previous
- [ ] Focus wraps at boundaries
- [ ] Non-focusable elements skipped

### US-027: Arrow Key Navigation
**As a** developer
**I want** arrow keys to navigate within components
**So that** users can select options

**Acceptance Criteria:**
- [ ] Up/Down for vertical lists
- [ ] Left/Right for horizontal layouts
- [ ] Stops at boundaries (no wrap by default)
- [ ] Configurable wrap behavior

### US-028: Enter/Space Activation
**As a** developer
**I want** Enter and Space to activate focused elements
**So that** users can trigger actions

**Acceptance Criteria:**
- [ ] Enter activates buttons
- [ ] Space toggles checkboxes
- [ ] Enter selects list items
- [ ] Appropriate callback called

### US-029: Escape Cancellation
**As a** developer
**I want** Escape to cancel/close/go-back
**So that** users can exit current context

**Acceptance Criteria:**
- [ ] Closes modals
- [ ] Cancels dialogs
- [ ] Returns to previous screen
- [ ] Appropriate callback called

### US-030: Global Keyboard Shortcuts
**As a** developer
**I want** global shortcuts (q, ?, Ctrl+L)
**So that** common actions are always available

**Acceptance Criteria:**
- [ ] q shows quit confirmation
- [ ] ? shows help overlay
- [ ] Ctrl+L clears screen
- [ ] Shortcuts work from any screen

---

## Epic 2: Test Infrastructure (40 stories)

Foundation layer providing Mock Claude, Mock PTY, and test utilities.

### US-031: Mock Claude Binary
**As a** test developer
**I want** a mock Claude binary
**So that** E2E tests don't call real Claude API

**Acceptance Criteria:**
- [ ] Executes as standalone Node script
- [ ] Reads fixture file from environment variable
- [ ] Outputs lines from fixture with timing
- [ ] Exits with code from fixture

### US-032: Mock Claude Output Streaming
**As a** test developer
**I want** mock Claude to stream output
**So that** it simulates real Claude behavior

**Acceptance Criteria:**
- [ ] Outputs lines sequentially
- [ ] Respects timing delays from fixture
- [ ] Supports JSON progress markers
- [ ] Streams to stdout/stderr appropriately

### US-033: Mock Claude Todo File Updates
**As a** test developer
**I want** mock Claude to update todo files
**So that** orchestrator todo detection can be tested

**Acceptance Criteria:**
- [ ] Creates todo files at specified timestamps
- [ ] Updates todo content per fixture
- [ ] Uses correct file path pattern
- [ ] Triggers filesystem watch events

### US-034: Mock Claude Exit Codes
**As a** test developer
**I want** mock Claude to exit with configurable codes
**So that** error handling can be tested

**Acceptance Criteria:**
- [ ] Exits with code from fixture (0, 1, etc.)
- [ ] Supports timeout simulation
- [ ] Supports crash simulation
- [ ] Supports interrupt simulation

### US-035: Fixture File Format
**As a** test developer
**I want** a well-defined fixture format
**So that** test data is consistent

**Acceptance Criteria:**
- [ ] JSON format with schema validation
- [ ] output[] array for stdout lines
- [ ] todoStates[] array for todo updates
- [ ] finalState object for exit behavior
- [ ] Timing fields in milliseconds

### US-036: Phase-Specific Fixtures
**As a** test developer
**I want** fixtures for each phase
**So that** phase-specific behavior can be tested

**Acceptance Criteria:**
- [ ] phase-1-success.json (brainstorm)
- [ ] phase-2-success.json (specs)
- [ ] phase-3-success.json (bootstrap)
- [ ] phase-4-success.json (implement)
- [ ] phase-5-success.json (finalize)

### US-037: Error Scenario Fixtures
**As a** test developer
**I want** fixtures for error scenarios
**So that** error handling can be tested

**Acceptance Criteria:**
- [ ] claude-timeout.json
- [ ] claude-crash.json
- [ ] claude-context-limit.json
- [ ] claude-api-error.json
- [ ] claude-permission-error.json

### US-038: Epic Loop Fixtures
**As a** test developer
**I want** fixtures for epic progression
**So that** epic looping can be tested

**Acceptance Criteria:**
- [ ] epic-1-complete.json
- [ ] epic-2-complete.json
- [ ] epic-transition.json
- [ ] all-epics-complete.json

### US-039: Resume Scenario Fixtures
**As a** test developer
**I want** fixtures for resume scenarios
**So that** resume behavior can be tested

**Acceptance Criteria:**
- [ ] resume-phase-4.json
- [ ] resume-mid-epic.json
- [ ] resume-after-crash.json
- [ ] resume-with-cost-recalc.json

### US-040: Mock PTY Emulator
**As a** test developer
**I want** a mock PTY module
**So that** terminal interaction can be tested

**Acceptance Criteria:**
- [ ] Provides spawn() function matching node-pty API
- [ ] Captures stdin writes
- [ ] Emits stdout data events
- [ ] Simulates terminal dimensions

### US-041: Mock PTY Input Simulation
**As a** test developer
**I want** to simulate keyboard input to PTY
**So that** interactive behavior can be tested

**Acceptance Criteria:**
- [ ] write() function for character input
- [ ] Supports special keys (arrows, enter, escape)
- [ ] Supports modifier combinations
- [ ] Records input history

### US-042: Mock PTY Output Capture
**As a** test developer
**I want** to capture PTY output
**So that** test assertions can verify output

**Acceptance Criteria:**
- [ ] Captures all stdout data
- [ ] Provides waitFor(pattern) function
- [ ] Supports regex matching
- [ ] Supports timeout on wait

### US-043: Mock PTY Resize Events
**As a** test developer
**I want** to simulate terminal resize
**So that** layout adaptation can be tested

**Acceptance Criteria:**
- [ ] resize(cols, rows) function
- [ ] Emits resize event
- [ ] Updates dimensions property

### US-044: Mock Filesystem Module
**As a** test developer
**I want** a mock filesystem
**So that** file operations are isolated

**Acceptance Criteria:**
- [ ] In-memory file storage
- [ ] Provides fs API compatible methods
- [ ] Tracks all read/write operations
- [ ] Can be pre-populated for tests

### US-045: Mock Filesystem File Operations
**As a** test developer
**I want** mock file read/write
**So that** manifest and config operations work

**Acceptance Criteria:**
- [ ] readFile returns mock content
- [ ] writeFile stores to memory
- [ ] Supports sync and async variants
- [ ] Tracks operation history

### US-046: Mock Filesystem Directory Operations
**As a** test developer
**I want** mock directory operations
**So that** project structure can be tested

**Acceptance Criteria:**
- [ ] mkdir creates directory
- [ ] readdir lists contents
- [ ] existsSync checks existence
- [ ] rmdir removes directory

### US-047: Mock Filesystem Watch
**As a** test developer
**I want** mock filesystem watching
**So that** todo file watching can be tested

**Acceptance Criteria:**
- [ ] watch() returns watcher object
- [ ] Emits change events on file updates
- [ ] Can be triggered programmatically
- [ ] close() stops watching

### US-048: Mock ccusage Integration
**As a** test developer
**I want** mock ccusage responses
**So that** cost calculation can be tested

**Acceptance Criteria:**
- [ ] Returns fixture cost data
- [ ] Supports session filtering
- [ ] Returns duration data
- [ ] Simulates recalculation

### US-049: Test Harness Setup
**As a** test developer
**I want** a test harness
**So that** tests have consistent setup

**Acceptance Criteria:**
- [ ] beforeEach resets all mocks
- [ ] afterEach cleans up resources
- [ ] Provides test utilities
- [ ] Sets up mock environment variables

### US-050: CLET Test Runner Integration
**As a** test developer
**I want** CLET integrated
**So that** CLI E2E tests work

**Acceptance Criteria:**
- [ ] runner() function available
- [ ] fork() spawns CLI
- [ ] wait() for output patterns
- [ ] stdin() for input simulation

### US-051: Test Assertions for TUI
**As a** test developer
**I want** TUI-specific assertions
**So that** output verification is easy

**Acceptance Criteria:**
- [ ] toContainText(pattern)
- [ ] toShowScreen(name)
- [ ] toHaveFocus(elementId)
- [ ] toShowProgress(percent)

### US-052: Test Assertions for State
**As a** test developer
**I want** state assertions
**So that** store verification is easy

**Acceptance Criteria:**
- [ ] toHaveManifestPhase(n)
- [ ] toHaveEpicStatus(epicId, status)
- [ ] toHaveTodoCount(n)
- [ ] toHaveCost(amount)

### US-053: Test Timing Utilities
**As a** test developer
**I want** timing utilities
**So that** async behavior is testable

**Acceptance Criteria:**
- [ ] advanceTimers(ms) function
- [ ] runAllTimers() function
- [ ] waitFor(condition) utility
- [ ] flushPromises() function

### US-054: Mock Environment Setup
**As a** test developer
**I want** mock environment variables
**So that** configuration is isolated

**Acceptance Criteria:**
- [ ] Set MOCK_CLAUDE_FIXTURE path
- [ ] Set USE_MOCK_CLAUDE=true
- [ ] Set test project path
- [ ] Restore after test

### US-055: Snapshot Testing for TUI
**As a** test developer
**I want** snapshot testing
**So that** TUI output is regression-tested

**Acceptance Criteria:**
- [ ] Capture terminal output snapshot
- [ ] Compare against saved snapshot
- [ ] Update snapshots on change
- [ ] Strip ANSI codes for comparison

### US-056: Test Coverage Reporting
**As a** test developer
**I want** coverage reports
**So that** test completeness is tracked

**Acceptance Criteria:**
- [ ] Line coverage percentage
- [ ] Branch coverage percentage
- [ ] Function coverage percentage
- [ ] Uncovered lines highlighted

### US-057: Test Isolation Verification
**As a** test developer
**I want** tests to be isolated
**So that** tests don't affect each other

**Acceptance Criteria:**
- [ ] Each test has fresh mock state
- [ ] No shared mutable state
- [ ] Cleanup after each test
- [ ] Parallel test execution works

### US-058: Fixture Validation
**As a** test developer
**I want** fixture validation
**So that** invalid fixtures are caught

**Acceptance Criteria:**
- [ ] JSON schema validation
- [ ] Required fields checked
- [ ] Type validation
- [ ] Error messages for invalid fixtures

### US-059: Test Helper Functions
**As a** test developer
**I want** helper functions
**So that** common patterns are reusable

**Acceptance Criteria:**
- [ ] createMockProject() helper
- [ ] createMockManifest() helper
- [ ] simulatePhaseComplete() helper
- [ ] simulateEpicComplete() helper

### US-060: Test Data Factories
**As a** test developer
**I want** test data factories
**So that** test data creation is easy

**Acceptance Criteria:**
- [ ] buildManifest() factory
- [ ] buildProject() factory
- [ ] buildTodo() factory
- [ ] buildWorker() factory

### US-061: Integration Test Patterns
**As a** test developer
**I want** integration test patterns
**So that** component integration is tested

**Acceptance Criteria:**
- [ ] Mount component with providers
- [ ] Inject mock dependencies
- [ ] Assert on rendered output
- [ ] Verify event handling

### US-062: E2E Test Patterns
**As a** test developer
**I want** E2E test patterns
**So that** full flows are tested

**Acceptance Criteria:**
- [ ] Launch full CLI
- [ ] Navigate through screens
- [ ] Verify state changes
- [ ] Check final output

### US-063: Mock Process Spawn
**As a** test developer
**I want** mock process spawning
**So that** worker spawning can be tested

**Acceptance Criteria:**
- [ ] spawn() returns mock process
- [ ] Tracks spawned processes
- [ ] Simulates stdout/stderr
- [ ] Simulates exit events

### US-064: Mock Process Kill
**As a** test developer
**I want** mock process killing
**So that** worker termination can be tested

**Acceptance Criteria:**
- [ ] kill(pid) marks process dead
- [ ] Emits exit event
- [ ] Updates process state
- [ ] Records kill history

### US-065: Test Error Simulation
**As a** test developer
**I want** error simulation
**So that** error paths are tested

**Acceptance Criteria:**
- [ ] Simulate file read errors
- [ ] Simulate process spawn errors
- [ ] Simulate network errors
- [ ] Verify error handling

### US-066: Performance Test Utilities
**As a** test developer
**I want** performance utilities
**So that** slow tests are detected

**Acceptance Criteria:**
- [ ] Test timeout enforcement
- [ ] Execution time tracking
- [ ] Slow test warnings
- [ ] Performance regression detection

### US-067: Test Retry Logic
**As a** test developer
**I want** test retry capability
**So that** flaky tests can be handled

**Acceptance Criteria:**
- [ ] Configurable retry count
- [ ] Delay between retries
- [ ] Report retry attempts
- [ ] Distinguish flake vs failure

### US-068: Mock Git Operations
**As a** test developer
**I want** mock git operations
**So that** commit verification works

**Acceptance Criteria:**
- [ ] Mock git status
- [ ] Mock git commit
- [ ] Mock git push
- [ ] Track git operation history

### US-069: Test Context Isolation
**As a** test developer
**I want** isolated test contexts
**So that** each test has clean state

**Acceptance Criteria:**
- [ ] Fresh filesystem per test
- [ ] Fresh stores per test
- [ ] Fresh mocks per test
- [ ] No cross-test pollution

### US-070: Debug Logging for Tests
**As a** test developer
**I want** debug logging
**So that** test failures can be diagnosed

**Acceptance Criteria:**
- [ ] Capture mock interactions
- [ ] Log state changes
- [ ] Output on test failure
- [ ] Configurable verbosity

---

## Epic 3: State Management (47 stories)

Data layer providing all state stores for the application.

### US-071: ManifestStore Creation
**As a** developer
**I want** a ManifestStore
**So that** pipeline state is managed

**Acceptance Criteria:**
- [ ] In-memory state object
- [ ] Initial state with defaults
- [ ] Subscribe for changes
- [ ] Get current state

### US-072: ManifestStore Manifest Fields
**As a** developer
**I want** manifest fields in store
**So that** all pipeline data is tracked

**Acceptance Criteria:**
- [ ] version field
- [ ] project object
- [ ] currentPhase number
- [ ] phases object with phase states
- [ ] workers array
- [ ] cost object
- [ ] duration object

### US-073: ManifestStore Phase Updates
**As a** developer
**I want** to update phase state
**So that** phase progression is tracked

**Acceptance Criteria:**
- [ ] setPhaseStatus(phase, status)
- [ ] setCurrentPhase(phase)
- [ ] getPhaseStatus(phase)
- [ ] Emits change event

### US-074: ManifestStore Epic Updates
**As a** developer
**I want** to update epic state
**So that** epic progression is tracked

**Acceptance Criteria:**
- [ ] setEpicStatus(epicId, status)
- [ ] setCurrentEpic(epicId)
- [ ] getEpicStatus(epicId)
- [ ] addEpic(epic)
- [ ] Emits change event

### US-075: ManifestStore Worker Tracking
**As a** developer
**I want** to track workers
**So that** worker sessions are managed

**Acceptance Criteria:**
- [ ] addWorker(worker) with sessionId
- [ ] updateWorkerStatus(sessionId, status)
- [ ] removeWorker(sessionId)
- [ ] getActiveWorkers()
- [ ] getWorkerBySession(sessionId)

### US-076: ManifestStore Cost Updates
**As a** developer
**I want** to update costs
**So that** spending is tracked

**Acceptance Criteria:**
- [ ] addCost(amount, phase)
- [ ] getTotalCost()
- [ ] getCostByPhase(phase)
- [ ] resetCost()

### US-077: ManifestStore Duration Updates
**As a** developer
**I want** to update duration
**So that** time is tracked

**Acceptance Criteria:**
- [ ] addDuration(seconds, phase)
- [ ] getTotalDuration()
- [ ] getDurationByPhase(phase)
- [ ] resetDuration()

### US-078: ProjectStore Creation
**As a** developer
**I want** a ProjectStore
**So that** project config is managed

**Acceptance Criteria:**
- [ ] In-memory state object
- [ ] Project name, path, type, mode
- [ ] Subscribe for changes
- [ ] Get current state

### US-079: ProjectStore Project Fields
**As a** developer
**I want** project fields
**So that** project info is accessible

**Acceptance Criteria:**
- [ ] name field
- [ ] path field (absolute)
- [ ] type field (desktop/terminal)
- [ ] mode field (new/feature/fix)

### US-080: ProjectStore Validation
**As a** developer
**I want** project validation
**So that** invalid projects are rejected

**Acceptance Criteria:**
- [ ] Path exists validation
- [ ] Path is directory validation
- [ ] Type is valid validation
- [ ] Mode is valid validation
- [ ] Returns validation errors

### US-081: SessionStore Creation
**As a** developer
**I want** a SessionStore
**So that** worker sessions are managed

**Acceptance Criteria:**
- [ ] In-memory session map
- [ ] Add/remove sessions
- [ ] Get session by ID
- [ ] List active sessions

### US-082: SessionStore Session Fields
**As a** developer
**I want** session fields
**So that** session info is complete

**Acceptance Criteria:**
- [ ] sessionId (UUID)
- [ ] projectPath
- [ ] phase
- [ ] epic (if applicable)
- [ ] startedAt timestamp
- [ ] status (running/paused/complete)
- [ ] pid (process ID)

### US-083: SessionStore Session Lifecycle
**As a** developer
**I want** session lifecycle management
**So that** sessions transition correctly

**Acceptance Criteria:**
- [ ] createSession() generates UUID
- [ ] startSession(id) sets running
- [ ] pauseSession(id) sets paused
- [ ] completeSession(id) sets complete
- [ ] Validates transitions

### US-084: SessionStore Current Session
**As a** developer
**I want** current session tracking
**So that** active work is known

**Acceptance Criteria:**
- [ ] setCurrentSession(id)
- [ ] getCurrentSession()
- [ ] clearCurrentSession()
- [ ] Only one current at a time

### US-085: TodoStore Creation
**As a** developer
**I want** a TodoStore
**So that** worker todos are managed

**Acceptance Criteria:**
- [ ] In-memory todo list per session
- [ ] Add/update/remove todos
- [ ] Get todos by session
- [ ] Subscribe for changes

### US-086: TodoStore Todo Fields
**As a** developer
**I want** todo fields
**So that** todo info is complete

**Acceptance Criteria:**
- [ ] content (task description)
- [ ] status (pending/in_progress/completed)
- [ ] activeForm (present participle)
- [ ] sessionId (which worker)
- [ ] timestamp

### US-087: TodoStore Session Scoping
**As a** developer
**I want** todos scoped to sessions
**So that** workers don't see each other's todos

**Acceptance Criteria:**
- [ ] getTodosBySession(sessionId)
- [ ] addTodo(todo, sessionId)
- [ ] Only returns matching session
- [ ] Different sessions isolated

### US-088: TodoStore Progress Calculation
**As a** developer
**I want** progress calculation
**So that** completion percentage is known

**Acceptance Criteria:**
- [ ] getProgress(sessionId) returns 0-100
- [ ] Counts completed vs total
- [ ] Returns 0 if no todos
- [ ] Recalculates on changes

### US-089: TodoStore Completion Detection
**As a** developer
**I want** completion detection
**So that** phase/epic completion is detected

**Acceptance Criteria:**
- [ ] isComplete(sessionId) returns boolean
- [ ] True when all todos completed
- [ ] Emits completion event
- [ ] Works with 0 todos (returns true)

### US-090: CostStore Creation
**As a** developer
**I want** a CostStore
**So that** costs are tracked separately

**Acceptance Criteria:**
- [ ] In-memory cost data
- [ ] Total cost
- [ ] Cost by phase
- [ ] Cost by session

### US-091: CostStore Cost Fields
**As a** developer
**I want** cost fields
**So that** cost breakdown is complete

**Acceptance Criteria:**
- [ ] total (cumulative)
- [ ] byPhase object
- [ ] bySession object
- [ ] currency (USD)

### US-092: CostStore Accumulation
**As a** developer
**I want** cost accumulation
**So that** costs add up correctly

**Acceptance Criteria:**
- [ ] addCost(amount, phase, session)
- [ ] Increments total
- [ ] Increments phase total
- [ ] Increments session total

### US-093: CostStore Reset
**As a** developer
**I want** cost reset
**So that** costs can be recalculated

**Acceptance Criteria:**
- [ ] reset() clears all
- [ ] resetPhase(phase) clears phase
- [ ] resetSession(session) clears session
- [ ] Preserves other data

### US-094: DurationStore Creation
**As a** developer
**I want** a DurationStore
**So that** duration is tracked

**Acceptance Criteria:**
- [ ] In-memory duration data
- [ ] Total duration in seconds
- [ ] Duration by phase
- [ ] Duration by session

### US-095: DurationStore Timer
**As a** developer
**I want** duration timer
**So that** time is tracked automatically

**Acceptance Criteria:**
- [ ] startTimer(phase, session)
- [ ] stopTimer()
- [ ] pauseTimer()
- [ ] resumeTimer()
- [ ] Adds elapsed to totals

### US-096: Store Persistence Interface
**As a** developer
**I want** persistence interface
**So that** stores can be saved/loaded

**Acceptance Criteria:**
- [ ] toJSON() serializes state
- [ ] fromJSON(data) deserializes
- [ ] Validates data on load
- [ ] Returns errors for invalid data

### US-097: Store Change Events
**As a** developer
**I want** change events
**So that** UI reacts to state changes

**Acceptance Criteria:**
- [ ] subscribe(listener) registers
- [ ] unsubscribe(listener) removes
- [ ] Listener called on change
- [ ] Provides changed fields

### US-098: Store Immutability
**As a** developer
**I want** immutable state updates
**So that** changes are predictable

**Acceptance Criteria:**
- [ ] State objects not mutated
- [ ] New objects on update
- [ ] Deep equality checking
- [ ] No side effects

### US-099: Store Selectors
**As a** developer
**I want** state selectors
**So that** specific data is easy to get

**Acceptance Criteria:**
- [ ] selectPhase(state)
- [ ] selectEpics(state)
- [ ] selectTodos(state)
- [ ] selectProgress(state)

### US-100: Store Actions
**As a** developer
**I want** typed actions
**So that** updates are predictable

**Acceptance Criteria:**
- [ ] Action types defined
- [ ] dispatch(action) function
- [ ] Reducer handles actions
- [ ] Actions logged for debugging

### US-101: Store Middleware
**As a** developer
**I want** middleware support
**So that** cross-cutting concerns work

**Acceptance Criteria:**
- [ ] Logging middleware
- [ ] Persistence middleware
- [ ] Validation middleware
- [ ] Middleware chain execution

### US-102: Store Initialization
**As a** developer
**I want** store initialization
**So that** stores start correctly

**Acceptance Criteria:**
- [ ] Default state on create
- [ ] Load from file if exists
- [ ] Merge with defaults
- [ ] Validate loaded state

### US-103: Store Reset
**As a** developer
**I want** store reset
**So that** state can be cleared

**Acceptance Criteria:**
- [ ] reset() to defaults
- [ ] Clears all data
- [ ] Emits reset event
- [ ] Preserves subscriptions

### US-104: Store Undo/Redo
**As a** developer
**I want** undo capability
**So that** mistakes can be reverted

**Acceptance Criteria:**
- [ ] History of states
- [ ] undo() reverts
- [ ] redo() re-applies
- [ ] Configurable history limit

### US-105: Multi-Store Coordination
**As a** developer
**I want** store coordination
**So that** stores stay in sync

**Acceptance Criteria:**
- [ ] Transaction support
- [ ] Atomic multi-store updates
- [ ] Rollback on error
- [ ] Consistent state

### US-106: Store Dev Tools
**As a** developer
**I want** dev tools
**So that** state can be inspected

**Acceptance Criteria:**
- [ ] Log all actions
- [ ] Time-travel debugging
- [ ] State export/import
- [ ] Action replay

### US-107: Store Type Safety
**As a** developer
**I want** type safety
**So that** type errors are caught

**Acceptance Criteria:**
- [ ] TypeScript interfaces
- [ ] Generic store types
- [ ] Action type safety
- [ ] Selector type inference

### US-108: Zustand Store Pattern
**As a** developer
**I want** Zustand-like API
**So that** store usage is familiar

**Acceptance Criteria:**
- [ ] create() function
- [ ] Hook for React access
- [ ] Selector function
- [ ] Middleware support

### US-109: Store Hydration
**As a** developer
**I want** store hydration
**So that** state loads on startup

**Acceptance Criteria:**
- [ ] Load from manifest file
- [ ] Handle missing file
- [ ] Merge with defaults
- [ ] Validate schema

### US-110: Store Dehydration
**As a** developer
**I want** store dehydration
**So that** state saves on shutdown

**Acceptance Criteria:**
- [ ] Save to manifest file
- [ ] Atomic write (temp + rename)
- [ ] Handle write errors
- [ ] Trigger on quit

### US-111: useManifest Hook
**As a** developer
**I want** useManifest hook
**So that** components access manifest

**Acceptance Criteria:**
- [ ] Returns current manifest
- [ ] Re-renders on change
- [ ] Provides update functions
- [ ] Selector support

### US-112: useProject Hook
**As a** developer
**I want** useProject hook
**So that** components access project

**Acceptance Criteria:**
- [ ] Returns current project
- [ ] Re-renders on change
- [ ] Provides update functions

### US-113: useSession Hook
**As a** developer
**I want** useSession hook
**So that** components access session

**Acceptance Criteria:**
- [ ] Returns current session
- [ ] Re-renders on change
- [ ] Provides lifecycle functions

### US-114: useTodos Hook
**As a** developer
**I want** useTodos hook
**So that** components access todos

**Acceptance Criteria:**
- [ ] Returns todos for session
- [ ] Returns progress percentage
- [ ] Re-renders on change

### US-115: useCost Hook
**As a** developer
**I want** useCost hook
**So that** components access cost

**Acceptance Criteria:**
- [ ] Returns total cost
- [ ] Returns cost by phase
- [ ] Re-renders on change
- [ ] Formats as currency

### US-116: useDuration Hook
**As a** developer
**I want** useDuration hook
**So that** components access duration

**Acceptance Criteria:**
- [ ] Returns total duration
- [ ] Returns duration by phase
- [ ] Re-renders on tick
- [ ] Formats as hh:mm:ss

### US-117: Store Provider Component
**As a** developer
**I want** StoreProvider
**So that** stores are available to tree

**Acceptance Criteria:**
- [ ] Wraps application
- [ ] Provides all stores via context
- [ ] Initializes stores
- [ ] Handles cleanup

---

## Epic 4: Filesystem Service (34 stories)

Services layer providing all filesystem operations.

### US-118: FilesystemService Creation
**As a** developer
**I want** a FilesystemService
**So that** file operations are centralized

**Acceptance Criteria:**
- [ ] Class with fs methods
- [ ] Injected file system (real or mock)
- [ ] Error handling
- [ ] Logging

### US-119: Project Directory Creation
**As a** developer
**I want** to create project directories
**So that** new projects have structure

**Acceptance Criteria:**
- [ ] createProjectDir(path) creates folder
- [ ] Creates .pipeline subdirectory
- [ ] Creates docs subdirectory
- [ ] Returns success/error

### US-120: Project Directory Validation
**As a** developer
**I want** to validate project directories
**So that** invalid paths are rejected

**Acceptance Criteria:**
- [ ] validateProjectDir(path) checks exists
- [ ] Checks is directory
- [ ] Checks write permission
- [ ] Returns validation result

### US-121: Project Discovery
**As a** developer
**I want** to discover existing projects
**So that** resume works

**Acceptance Criteria:**
- [ ] discoverProject(path) finds manifest
- [ ] Returns project info
- [ ] Returns null if not found
- [ ] Validates manifest schema

### US-122: Manifest Read
**As a** developer
**I want** to read manifests
**So that** state is loaded

**Acceptance Criteria:**
- [ ] readManifest(path) returns data
- [ ] Parses JSON
- [ ] Validates schema
- [ ] Returns error on invalid

### US-123: Manifest Write
**As a** developer
**I want** to write manifests
**So that** state is persisted

**Acceptance Criteria:**
- [ ] writeManifest(path, data) saves
- [ ] Writes to temp file first
- [ ] Renames to final (atomic)
- [ ] Returns success/error

### US-124: Manifest Watch
**As a** developer
**I want** to watch manifest changes
**So that** external changes are detected

**Acceptance Criteria:**
- [ ] watchManifest(path, callback)
- [ ] Callback on file change
- [ ] Debounces rapid changes
- [ ] Returns unwatch function

### US-125: Todo File Watch
**As a** developer
**I want** to watch todo files
**So that** worker progress is detected

**Acceptance Criteria:**
- [ ] watchTodoDir(callback) watches ~/.claude/todos/
- [ ] Filters by session ID pattern
- [ ] Callback on todo file change
- [ ] Parses todo content

### US-126: Todo File Parsing
**As a** developer
**I want** to parse todo files
**So that** todo state is extracted

**Acceptance Criteria:**
- [ ] parseTodoFile(path) returns todos
- [ ] Handles JSONL format
- [ ] Extracts session ID from filename
- [ ] Returns array of todos

### US-127: Todo Session Filtering
**As a** developer
**I want** todos filtered by session
**So that** only relevant todos are used

**Acceptance Criteria:**
- [ ] Session ID embedded in filename
- [ ] Filter by pattern match
- [ ] Ignore other sessions
- [ ] Clear separation

### US-128: Config File Read
**As a** developer
**I want** to read config files
**So that** settings are loaded

**Acceptance Criteria:**
- [ ] readConfig(path) returns data
- [ ] Supports JSON format
- [ ] Returns defaults if missing
- [ ] Validates schema

### US-129: Config File Write
**As a** developer
**I want** to write config files
**So that** settings are persisted

**Acceptance Criteria:**
- [ ] writeConfig(path, data) saves
- [ ] Pretty-prints JSON
- [ ] Atomic write
- [ ] Creates parent dirs

### US-130: Log File Write
**As a** developer
**I want** to write log files
**So that** activity is recorded

**Acceptance Criteria:**
- [ ] appendLog(path, message)
- [ ] Timestamp prefix
- [ ] Creates file if missing
- [ ] Handles large files

### US-131: Log File Read
**As a** developer
**I want** to read log files
**So that** history is viewable

**Acceptance Criteria:**
- [ ] readLog(path, lines) returns lines
- [ ] Reads last N lines
- [ ] Handles missing file
- [ ] Parses timestamps

### US-132: File Exists Check
**As a** developer
**I want** to check file existence
**So that** operations can be conditional

**Acceptance Criteria:**
- [ ] exists(path) returns boolean
- [ ] Works for files and dirs
- [ ] Handles permission errors
- [ ] Async and sync variants

### US-133: Directory Listing
**As a** developer
**I want** to list directories
**So that** contents are known

**Acceptance Criteria:**
- [ ] listDir(path) returns entries
- [ ] Includes file type (file/dir)
- [ ] Sorts alphabetically
- [ ] Handles empty dirs

### US-134: File Copy
**As a** developer
**I want** to copy files
**So that** templates can be cloned

**Acceptance Criteria:**
- [ ] copyFile(src, dest)
- [ ] Preserves permissions
- [ ] Overwrites if exists
- [ ] Returns success/error

### US-135: File Delete
**As a** developer
**I want** to delete files
**So that** cleanup works

**Acceptance Criteria:**
- [ ] deleteFile(path)
- [ ] Handles missing file
- [ ] Returns success/error
- [ ] Secure delete option

### US-136: Directory Delete
**As a** developer
**I want** to delete directories
**So that** cleanup works

**Acceptance Criteria:**
- [ ] deleteDir(path)
- [ ] Recursive option
- [ ] Handles non-empty
- [ ] Returns success/error

### US-137: Path Resolution
**As a** developer
**I want** to resolve paths
**So that** relative paths work

**Acceptance Criteria:**
- [ ] resolvePath(path) returns absolute
- [ ] Handles ~ for home
- [ ] Handles . and ..
- [ ] Cross-platform

### US-138: Path Joining
**As a** developer
**I want** to join paths
**So that** paths are built correctly

**Acceptance Criteria:**
- [ ] joinPath(...parts) returns path
- [ ] Handles separators
- [ ] Normalizes result
- [ ] Cross-platform

### US-139: Temp File Creation
**As a** developer
**I want** to create temp files
**So that** atomic writes work

**Acceptance Criteria:**
- [ ] createTempFile(prefix) returns path
- [ ] Unique filename
- [ ] In temp directory
- [ ] Cleanup registration

### US-140: Temp Directory Creation
**As a** developer
**I want** to create temp directories
**So that** isolated work areas exist

**Acceptance Criteria:**
- [ ] createTempDir(prefix) returns path
- [ ] Unique name
- [ ] Cleanup on exit
- [ ] Returns path

### US-141: Atomic File Write
**As a** developer
**I want** atomic file writes
**So that** partial writes don't corrupt

**Acceptance Criteria:**
- [ ] atomicWrite(path, data)
- [ ] Writes to temp
- [ ] Renames to final
- [ ] Returns success/error

### US-142: File Lock
**As a** developer
**I want** file locking
**So that** concurrent access is safe

**Acceptance Criteria:**
- [ ] lockFile(path) acquires lock
- [ ] unlockFile(path) releases
- [ ] Timeout option
- [ ] Returns lock status

### US-143: Home Directory
**As a** developer
**I want** home directory path
**So that** user paths work

**Acceptance Criteria:**
- [ ] getHomeDir() returns path
- [ ] Cross-platform
- [ ] Handles missing
- [ ] Caches result

### US-144: ccusage Directory
**As a** developer
**I want** ccusage directory path
**So that** cost files are found

**Acceptance Criteria:**
- [ ] getCcusageDir() returns path
- [ ] Handles XDG_DATA_HOME
- [ ] Default fallback
- [ ] Cross-platform

### US-145: Session File Naming
**As a** developer
**I want** session-scoped filenames
**So that** sessions don't conflict

**Acceptance Criteria:**
- [ ] getSessionFilename(sessionId, type)
- [ ] Unique per session
- [ ] Predictable pattern
- [ ] Parsable session ID

### US-146: File Permissions Check
**As a** developer
**I want** to check permissions
**So that** operations are safe

**Acceptance Criteria:**
- [ ] canRead(path) returns boolean
- [ ] canWrite(path) returns boolean
- [ ] canExecute(path) returns boolean
- [ ] Handles errors

### US-147: Disk Space Check
**As a** developer
**I want** to check disk space
**So that** space issues are detected

**Acceptance Criteria:**
- [ ] getDiskSpace(path) returns bytes
- [ ] Returns free space
- [ ] Returns total space
- [ ] Cross-platform

### US-148: File Watch Debounce
**As a** developer
**I want** debounced file watching
**So that** rapid changes are batched

**Acceptance Criteria:**
- [ ] Configurable debounce time
- [ ] Groups rapid changes
- [ ] Calls callback once
- [ ] Returns final state

### US-149: Glob Pattern Matching
**As a** developer
**I want** glob pattern support
**So that** file sets are matched

**Acceptance Criteria:**
- [ ] glob(pattern) returns paths
- [ ] Supports * and **
- [ ] Supports negation
- [ ] Returns sorted list

### US-150: JSON Schema Validation
**As a** developer
**I want** JSON schema validation
**So that** data is validated

**Acceptance Criteria:**
- [ ] validateSchema(data, schema)
- [ ] Returns errors array
- [ ] Clear error messages
- [ ] Supports nested schemas

### US-151: File System Error Handling
**As a** developer
**I want** consistent error handling
**So that** errors are predictable

**Acceptance Criteria:**
- [ ] Consistent error types
- [ ] Error codes (ENOENT, EACCES, etc.)
- [ ] Error messages
- [ ] Stack traces

---

## Epic 5: Process Service (29 stories)

Services layer providing all process operations.

### US-152: ProcessService Creation
**As a** developer
**I want** a ProcessService
**So that** process operations are centralized

**Acceptance Criteria:**
- [ ] Class with process methods
- [ ] Injected spawn function (real or mock)
- [ ] Error handling
- [ ] Logging

### US-153: Worker Spawn
**As a** developer
**I want** to spawn workers
**So that** Claude processes run

**Acceptance Criteria:**
- [ ] spawnWorker(command, args, options)
- [ ] Returns process handle
- [ ] Assigns session ID
- [ ] Registers in session store

### US-154: Worker Session ID Assignment
**As a** developer
**I want** session IDs for workers
**So that** workers are uniquely identified

**Acceptance Criteria:**
- [ ] UUID v4 generation
- [ ] Passed to worker as env var
- [ ] Recorded in manifest
- [ ] Available in stores

### US-155: Worker Environment Setup
**As a** developer
**I want** proper environment for workers
**So that** workers run correctly

**Acceptance Criteria:**
- [ ] PIPELINE_SESSION_ID set
- [ ] PIPELINE_PROJECT_PATH set
- [ ] PIPELINE_PHASE set
- [ ] Inherits parent env

### US-156: Worker PID Tracking
**As a** developer
**I want** PID tracking
**So that** processes are identifiable

**Acceptance Criteria:**
- [ ] Store PID on spawn
- [ ] Update manifest with PID
- [ ] Use PID for kill
- [ ] Handle PID reuse

### US-157: Worker Output Capture
**As a** developer
**I want** to capture worker output
**So that** output is displayed

**Acceptance Criteria:**
- [ ] Capture stdout stream
- [ ] Capture stderr stream
- [ ] Buffer for display
- [ ] Event emission

### US-158: Worker Output Events
**As a** developer
**I want** output events
**So that** UI updates in real-time

**Acceptance Criteria:**
- [ ] onStdout(callback) event
- [ ] onStderr(callback) event
- [ ] Line-buffered
- [ ] Include timestamp

### US-159: Worker Kill
**As a** developer
**I want** to kill workers
**So that** processes can be stopped

**Acceptance Criteria:**
- [ ] killWorker(sessionId)
- [ ] Uses session ID lookup
- [ ] Sends SIGTERM first
- [ ] SIGKILL after timeout

### US-160: Worker Kill by Session
**As a** developer
**I want** to kill by session ID
**So that** correct process is killed

**Acceptance Criteria:**
- [ ] Looks up PID from session
- [ ] No wildcard matching
- [ ] Verifies process exists
- [ ] Updates session status

### US-161: Worker Graceful Shutdown
**As a** developer
**I want** graceful shutdown
**So that** work isn't lost

**Acceptance Criteria:**
- [ ] Sends SIGTERM
- [ ] Waits for exit
- [ ] SIGKILL after 10s
- [ ] Cleans up resources

### US-162: Worker Exit Detection
**As a** developer
**I want** exit detection
**So that** completion is known

**Acceptance Criteria:**
- [ ] onExit(callback) event
- [ ] Provides exit code
- [ ] Provides signal if killed
- [ ] Updates session status

### US-163: Worker Exit Code Handling
**As a** developer
**I want** exit code handling
**So that** success/failure is known

**Acceptance Criteria:**
- [ ] 0 = success
- [ ] Non-zero = error
- [ ] Store in session
- [ ] Emit to listeners

### US-164: Worker Crash Detection
**As a** developer
**I want** crash detection
**So that** crashes are handled

**Acceptance Criteria:**
- [ ] Detect unexpected exit
- [ ] Store crash info
- [ ] Emit crash event
- [ ] Enable recovery

### US-165: Worker State Tracking
**As a** developer
**I want** state tracking
**So that** worker state is known

**Acceptance Criteria:**
- [ ] running state
- [ ] paused state
- [ ] completed state
- [ ] errored state
- [ ] killed state

### US-166: Worker Pause/Resume
**As a** developer
**I want** pause/resume
**So that** work can be interrupted

**Acceptance Criteria:**
- [ ] pauseWorker(sessionId) sends SIGSTOP
- [ ] resumeWorker(sessionId) sends SIGCONT
- [ ] Updates state
- [ ] Works on Windows (via API)

### US-167: Process List
**As a** developer
**I want** process listing
**So that** active workers are known

**Acceptance Criteria:**
- [ ] listWorkers() returns array
- [ ] Includes session ID, PID, state
- [ ] Only active workers
- [ ] Sorted by start time

### US-168: Process Cleanup
**As a** developer
**I want** process cleanup
**So that** zombie processes don't linger

**Acceptance Criteria:**
- [ ] cleanupWorkers() kills all
- [ ] Called on app exit
- [ ] Updates all sessions
- [ ] Logs cleanup

### US-169: PTY Spawn
**As a** developer
**I want** PTY spawning
**So that** Claude has terminal

**Acceptance Criteria:**
- [ ] Uses node-pty
- [ ] Configures terminal size
- [ ] Handles resize
- [ ] Supports ANSI

### US-170: PTY Input
**As a** developer
**I want** PTY input
**So that** workers receive input

**Acceptance Criteria:**
- [ ] write(data) sends to PTY
- [ ] Handles special keys
- [ ] Buffers appropriately
- [ ] Returns success

### US-171: PTY Output
**As a** developer
**I want** PTY output
**So that** worker output is captured

**Acceptance Criteria:**
- [ ] onData(callback) for output
- [ ] Raw output with ANSI
- [ ] Buffered by line
- [ ] High throughput

### US-172: PTY Resize
**As a** developer
**I want** PTY resize
**So that** layout changes work

**Acceptance Criteria:**
- [ ] resize(cols, rows)
- [ ] Updates PTY
- [ ] Worker receives SIGWINCH
- [ ] Layout recalculates

### US-173: Command Injection Prevention
**As a** developer
**I want** injection prevention
**So that** commands are safe

**Acceptance Criteria:**
- [ ] Escape special characters
- [ ] Validate command
- [ ] No shell interpretation
- [ ] Log warnings

### US-174: Cross-Platform Spawn
**As a** developer
**I want** cross-platform support
**So that** Windows/Mac/Linux work

**Acceptance Criteria:**
- [ ] Windows: cmd.exe handling
- [ ] Unix: bash handling
- [ ] Path separator handling
- [ ] Shell detection

### US-175: Process Resource Limits
**As a** developer
**I want** resource limits
**So that** runaway processes are contained

**Acceptance Criteria:**
- [ ] Memory limit option
- [ ] CPU limit option
- [ ] Kill on exceed
- [ ] Log violations

### US-176: Process Timeout
**As a** developer
**I want** process timeout
**So that** stuck processes don't hang

**Acceptance Criteria:**
- [ ] Configurable timeout
- [ ] Kill after timeout
- [ ] Emit timeout event
- [ ] Log timeout

### US-177: Stdin Forwarding
**As a** developer
**I want** stdin forwarding
**So that** interactive input works

**Acceptance Criteria:**
- [ ] Forward keyboard to worker
- [ ] Handle raw mode
- [ ] Handle special keys
- [ ] Toggle forwarding

### US-178: Stdout Parsing
**As a** developer
**I want** stdout parsing
**So that** structured output is extracted

**Acceptance Criteria:**
- [ ] Detect [PROGRESS] lines
- [ ] Detect [TODO] lines
- [ ] Parse JSON content
- [ ] Emit structured events

### US-179: Process Health Check
**As a** developer
**I want** health checks
**So that** stuck processes are detected

**Acceptance Criteria:**
- [ ] Check output activity
- [ ] Timeout on inactivity
- [ ] Configurable threshold
- [ ] Emit stall event

### US-180: Concurrent Worker Limit
**As a** developer
**I want** concurrency limit
**So that** resources aren't exhausted

**Acceptance Criteria:**
- [ ] Max workers setting
- [ ] Queue excess requests
- [ ] Error if too many
- [ ] Log warnings

---

## Epic 6: Cost Service (22 stories)

Services layer providing cost and duration tracking.

### US-181: CostService Creation
**As a** developer
**I want** a CostService
**So that** cost operations are centralized

**Acceptance Criteria:**
- [ ] Class with cost methods
- [ ] Injected ccusage interface
- [ ] Error handling
- [ ] Logging

### US-182: ccusage Binary Detection
**As a** developer
**I want** ccusage detection
**So that** availability is known

**Acceptance Criteria:**
- [ ] Check if ccusage in PATH
- [ ] Check version
- [ ] Return availability status
- [ ] Fallback if missing

### US-183: ccusage Session Query
**As a** developer
**I want** session queries
**So that** costs are retrieved

**Acceptance Criteria:**
- [ ] querySessions(filter) returns data
- [ ] Filter by project path
- [ ] Filter by date range
- [ ] Returns cost and duration

### US-184: ccusage Cost Parsing
**As a** developer
**I want** cost parsing
**So that** costs are extracted

**Acceptance Criteria:**
- [ ] Parse ccusage output
- [ ] Extract total cost
- [ ] Extract cost per session
- [ ] Handle currency format

### US-185: ccusage Duration Parsing
**As a** developer
**I want** duration parsing
**So that** time is extracted

**Acceptance Criteria:**
- [ ] Parse ccusage output
- [ ] Extract total duration
- [ ] Extract duration per session
- [ ] Handle time format

### US-186: Cost Recalculation
**As a** developer
**I want** cost recalculation
**So that** resume has correct costs

**Acceptance Criteria:**
- [ ] recalculateCost(projectPath) queries ccusage
- [ ] Sums all session costs
- [ ] Updates cost store
- [ ] Returns total

### US-187: Duration Recalculation
**As a** developer
**I want** duration recalculation
**So that** resume has correct duration

**Acceptance Criteria:**
- [ ] recalculateDuration(projectPath) queries ccusage
- [ ] Sums all session durations
- [ ] Updates duration store
- [ ] Returns total

### US-188: Real-Time Cost Updates
**As a** developer
**I want** real-time updates
**So that** cost updates during work

**Acceptance Criteria:**
- [ ] Poll ccusage periodically
- [ ] Update cost store
- [ ] Emit change events
- [ ] Configurable interval

### US-189: Real-Time Duration Timer
**As a** developer
**I want** real-time timer
**So that** duration updates during work

**Acceptance Criteria:**
- [ ] Timer increments seconds
- [ ] Starts on phase start
- [ ] Pauses on pause
- [ ] Stops on complete

### US-190: Cost by Phase Breakdown
**As a** developer
**I want** phase breakdown
**So that** costs per phase are known

**Acceptance Criteria:**
- [ ] getCostByPhase() returns object
- [ ] Key by phase number
- [ ] Sum costs per phase
- [ ] Updates on change

### US-191: Duration by Phase Breakdown
**As a** developer
**I want** phase breakdown
**So that** duration per phase is known

**Acceptance Criteria:**
- [ ] getDurationByPhase() returns object
- [ ] Key by phase number
- [ ] Sum duration per phase
- [ ] Updates on change

### US-192: Cost Formatting
**As a** developer
**I want** cost formatting
**So that** costs display nicely

**Acceptance Criteria:**
- [ ] formatCost(amount) returns string
- [ ] Dollar sign prefix
- [ ] Two decimal places
- [ ] Thousands separator

### US-193: Duration Formatting
**As a** developer
**I want** duration formatting
**So that** duration displays nicely

**Acceptance Criteria:**
- [ ] formatDuration(seconds) returns string
- [ ] hh:mm:ss format
- [ ] Handles days
- [ ] Human readable option

### US-194: Cost Estimation
**As a** developer
**I want** cost estimation
**So that** projected cost is shown

**Acceptance Criteria:**
- [ ] estimateCost(currentPhase, totalPhases)
- [ ] Uses historical data
- [ ] Returns projected total
- [ ] Updates as work progresses

### US-195: Cost Budget Warning
**As a** developer
**I want** budget warnings
**So that** overspending is detected

**Acceptance Criteria:**
- [ ] Configurable budget limit
- [ ] Warning at 80%
- [ ] Alert at 100%
- [ ] Optional auto-pause

### US-196: Cost History
**As a** developer
**I want** cost history
**So that** past costs are visible

**Acceptance Criteria:**
- [ ] getCostHistory(projectPath)
- [ ] Returns array of sessions
- [ ] Includes timestamps
- [ ] Sorted by date

### US-197: Duration History
**As a** developer
**I want** duration history
**So that** past durations are visible

**Acceptance Criteria:**
- [ ] getDurationHistory(projectPath)
- [ ] Returns array of sessions
- [ ] Includes timestamps
- [ ] Sorted by date

### US-198: Session Correlation
**As a** developer
**I want** session correlation
**So that** ccusage sessions match workers

**Acceptance Criteria:**
- [ ] Match by session ID
- [ ] Match by timestamp
- [ ] Match by project path
- [ ] Handle gaps

### US-199: Offline Cost Handling
**As a** developer
**I want** offline handling
**So that** missing ccusage works

**Acceptance Criteria:**
- [ ] Detect ccusage unavailable
- [ ] Show "N/A" for cost
- [ ] Continue pipeline
- [ ] Log warning

### US-200: Cost Export
**As a** developer
**I want** cost export
**So that** costs can be reported

**Acceptance Criteria:**
- [ ] exportCosts(format)
- [ ] CSV format
- [ ] JSON format
- [ ] Date range filter

### US-201: Cost Reset
**As a** developer
**I want** cost reset
**So that** tracking can restart

**Acceptance Criteria:**
- [ ] resetCost(projectPath)
- [ ] Clears cost store
- [ ] Keeps ccusage data
- [ ] Updates manifest

### US-202: Cost Aggregation
**As a** developer
**I want** cost aggregation
**So that** totals are calculated

**Acceptance Criteria:**
- [ ] Sum across phases
- [ ] Sum across sessions
- [ ] Sum across projects
- [ ] Returns breakdown

---

## Epic 7: Pipeline Orchestrator (36 stories)

Logic layer providing pipeline orchestration.

### US-203: Orchestrator Creation
**As a** developer
**I want** an Orchestrator
**So that** pipeline flow is managed

**Acceptance Criteria:**
- [ ] Class with orchestration methods
- [ ] Injected services
- [ ] State machine for phases
- [ ] Error handling

### US-204: Pipeline Initialization
**As a** developer
**I want** pipeline init
**So that** new pipelines start correctly

**Acceptance Criteria:**
- [ ] initPipeline(project) creates manifest
- [ ] Sets up initial state
- [ ] Creates directories
- [ ] Returns success

### US-205: Phase Progression
**As a** developer
**I want** phase progression
**So that** phases advance correctly

**Acceptance Criteria:**
- [ ] advancePhase() moves to next
- [ ] Validates current complete
- [ ] Updates manifest
- [ ] Spawns worker

### US-206: Phase 1 Handling
**As a** developer
**I want** Phase 1 handling
**So that** brainstorm phase works

**Acceptance Criteria:**
- [ ] Interactive mode
- [ ] User input required
- [ ] Creates user stories
- [ ] Detects completion

### US-207: Phase 2 Handling
**As a** developer
**I want** Phase 2 handling
**So that** specs phase works

**Acceptance Criteria:**
- [ ] Autonomous mode
- [ ] Creates E2E specs
- [ ] Validates output
- [ ] Detects completion

### US-208: Phase 3 Handling
**As a** developer
**I want** Phase 3 handling
**So that** bootstrap phase works

**Acceptance Criteria:**
- [ ] Autonomous mode
- [ ] Creates skeleton
- [ ] Sets up tests
- [ ] Detects completion

### US-209: Phase 4 Handling
**As a** developer
**I want** Phase 4 handling
**So that** implement phase works

**Acceptance Criteria:**
- [ ] Epic looping
- [ ] Per-epic workers
- [ ] Test verification
- [ ] Detects completion

### US-210: Phase 5 Handling
**As a** developer
**I want** Phase 5 handling
**So that** finalize phase works

**Acceptance Criteria:**
- [ ] Autonomous mode
- [ ] Polish code
- [ ] Final verification
- [ ] Detects completion

### US-211: Epic Loop Management
**As a** developer
**I want** epic looping
**So that** epics iterate correctly

**Acceptance Criteria:**
- [ ] Track current epic
- [ ] Advance to next epic
- [ ] Detect all complete
- [ ] Update manifest

### US-212: Epic Completion Detection
**As a** developer
**I want** epic completion detection
**So that** loop advances

**Acceptance Criteria:**
- [ ] Monitor todo completion
- [ ] Check test results
- [ ] Update epic status
- [ ] Emit complete event

### US-213: Todo Monitoring
**As a** developer
**I want** todo monitoring
**So that** progress is tracked

**Acceptance Criteria:**
- [ ] Watch todo files
- [ ] Filter by session
- [ ] Calculate progress
- [ ] Detect 100% complete

### US-214: Todo Completion Detection
**As a** developer
**I want** completion detection
**So that** phase ends correctly

**Acceptance Criteria:**
- [ ] All todos completed = done
- [ ] Emit completion event
- [ ] Update manifest
- [ ] Trigger phase advance

### US-215: Worker Lifecycle Management
**As a** developer
**I want** worker lifecycle
**So that** workers are managed

**Acceptance Criteria:**
- [ ] Spawn worker for phase
- [ ] Monitor worker status
- [ ] Kill worker on complete
- [ ] Handle worker crash

### US-216: Worker Crash Recovery
**As a** developer
**I want** crash recovery
**So that** work isn't lost

**Acceptance Criteria:**
- [ ] Detect worker crash
- [ ] Log crash info
- [ ] Offer resume option
- [ ] Preserve progress

### US-217: Resume Pipeline
**As a** developer
**I want** resume capability
**So that** interrupted work continues

**Acceptance Criteria:**
- [ ] resumePipeline(path) loads state
- [ ] Recalculates costs
- [ ] Spawns worker at correct point
- [ ] Continues from last state

### US-218: Resume from Phase
**As a** developer
**I want** phase resume
**So that** specific phase restarts

**Acceptance Criteria:**
- [ ] Resume at phase start
- [ ] Reset phase progress
- [ ] Keep earlier phases
- [ ] Spawn correct worker

### US-219: Resume from Epic
**As a** developer
**I want** epic resume
**So that** specific epic restarts

**Acceptance Criteria:**
- [ ] Resume at epic start
- [ ] Reset epic progress
- [ ] Keep earlier epics
- [ ] Spawn correct worker

### US-220: Pause Pipeline
**As a** developer
**I want** pause capability
**So that** work can be interrupted

**Acceptance Criteria:**
- [ ] pausePipeline() pauses worker
- [ ] Saves current state
- [ ] Updates manifest
- [ ] Safe to exit after

### US-221: Cancel Pipeline
**As a** developer
**I want** cancel capability
**So that** work can be abandoned

**Acceptance Criteria:**
- [ ] cancelPipeline() kills worker
- [ ] Cleans up state
- [ ] Updates manifest
- [ ] Preserves progress

### US-222: Pipeline State Machine
**As a** developer
**I want** state machine
**So that** transitions are valid

**Acceptance Criteria:**
- [ ] States: idle, running, paused, complete, error
- [ ] Valid transitions defined
- [ ] Invalid transitions rejected
- [ ] Events on transition

### US-223: Pipeline Events
**As a** developer
**I want** pipeline events
**So that** UI reacts to changes

**Acceptance Criteria:**
- [ ] onPhaseStart event
- [ ] onPhaseComplete event
- [ ] onEpicStart event
- [ ] onEpicComplete event
- [ ] onProgress event

### US-224: Error Handling
**As a** developer
**I want** error handling
**So that** errors are managed

**Acceptance Criteria:**
- [ ] Catch worker errors
- [ ] Log error details
- [ ] Update state
- [ ] Offer recovery

### US-225: Error Recovery Options
**As a** developer
**I want** recovery options
**So that** errors can be handled

**Acceptance Criteria:**
- [ ] Retry option
- [ ] Skip option
- [ ] Abort option
- [ ] User choice

### US-226: Progress Calculation
**As a** developer
**I want** progress calculation
**So that** overall progress is known

**Acceptance Criteria:**
- [ ] Calculate phase progress
- [ ] Calculate overall progress
- [ ] Weight by phase
- [ ] Return percentage

### US-227: Time Estimation
**As a** developer
**I want** time estimation
**So that** remaining time is known

**Acceptance Criteria:**
- [ ] Estimate remaining time
- [ ] Based on progress rate
- [ ] Updates as work progresses
- [ ] Returns formatted string

### US-228: Pipeline Validation
**As a** developer
**I want** pipeline validation
**So that** invalid states are caught

**Acceptance Criteria:**
- [ ] Validate manifest state
- [ ] Validate phase order
- [ ] Validate epic order
- [ ] Return validation errors

### US-229: Dependency Injection
**As a** developer
**I want** dependency injection
**So that** services are swappable

**Acceptance Criteria:**
- [ ] Services injected to orchestrator
- [ ] Mock services for testing
- [ ] Real services for production
- [ ] Interface contracts

### US-230: Event Bus
**As a** developer
**I want** event bus
**So that** components communicate

**Acceptance Criteria:**
- [ ] emit(event, data) publishes
- [ ] on(event, callback) subscribes
- [ ] off(event, callback) unsubscribes
- [ ] Typed events

### US-231: Command Queue
**As a** developer
**I want** command queue
**So that** operations are ordered

**Acceptance Criteria:**
- [ ] Queue commands
- [ ] Process in order
- [ ] Handle failures
- [ ] Retry logic

### US-232: Orchestrator Hooks
**As a** developer
**I want** lifecycle hooks
**So that** extensions are possible

**Acceptance Criteria:**
- [ ] beforePhase hook
- [ ] afterPhase hook
- [ ] beforeEpic hook
- [ ] afterEpic hook

### US-233: Pipeline Type Handling
**As a** developer
**I want** type-specific handling
**So that** desktop/terminal differ

**Acceptance Criteria:**
- [ ] Desktop: Tauri commands
- [ ] Terminal: Ink commands
- [ ] Type in manifest
- [ ] Commands selected by type

### US-234: Pipeline Mode Handling
**As a** developer
**I want** mode-specific handling
**So that** new/feature/fix differ

**Acceptance Criteria:**
- [ ] New: Full pipeline
- [ ] Feature: Partial pipeline
- [ ] Fix: Minimal pipeline
- [ ] Mode in manifest

### US-235: Orchestrator Cleanup
**As a** developer
**I want** cleanup on exit
**So that** resources are freed

**Acceptance Criteria:**
- [ ] Kill workers on exit
- [ ] Save state on exit
- [ ] Close watchers
- [ ] Clean temp files

### US-236: Orchestrator Logging
**As a** developer
**I want** orchestrator logging
**So that** decisions are tracked

**Acceptance Criteria:**
- [ ] Log phase transitions
- [ ] Log epic transitions
- [ ] Log worker events
- [ ] Log errors

### US-237: Orchestrator Metrics
**As a** developer
**I want** orchestrator metrics
**So that** performance is tracked

**Acceptance Criteria:**
- [ ] Phase durations
- [ ] Epic durations
- [ ] Worker restarts
- [ ] Error counts

### US-238: Concurrent Request Handling
**As a** developer
**I want** request serialization
**So that** race conditions are avoided

**Acceptance Criteria:**
- [ ] Queue concurrent requests
- [ ] Process one at a time
- [ ] Maintain order
- [ ] Timeout handling

---

## Epic 8: UI Screens (48 stories)

UI layer providing all screen components.

### US-239: App Component
**As a** user
**I want** the app to start
**So that** I can use the pipeline

**Acceptance Criteria:**
- [ ] Renders on launch
- [ ] Shows launcher screen
- [ ] Handles keyboard globally
- [ ] Provides store context

### US-240: Router Component
**As a** developer
**I want** screen routing
**So that** navigation works

**Acceptance Criteria:**
- [ ] Tracks current screen
- [ ] Renders active screen
- [ ] navigate(screen) function
- [ ] goBack() function

### US-241: Launcher Screen
**As a** user
**I want** a launcher screen
**So that** I can start a pipeline

**Acceptance Criteria:**
- [ ] Project path input
- [ ] Pipeline type selection
- [ ] Mode selection
- [ ] Start button

### US-242: Launcher Path Input
**As a** user
**I want** to enter project path
**So that** I specify where to work

**Acceptance Criteria:**
- [ ] Text input field
- [ ] Browse button (opens picker)
- [ ] Validates path exists
- [ ] Shows validation error

### US-243: Launcher Type Selection
**As a** user
**I want** to select pipeline type
**So that** correct commands run

**Acceptance Criteria:**
- [ ] Desktop option
- [ ] Terminal option
- [ ] Radio button selection
- [ ] Default based on history

### US-244: Launcher Mode Selection
**As a** user
**I want** to select mode
**So that** correct workflow runs

**Acceptance Criteria:**
- [ ] New Project option
- [ ] Add Feature option
- [ ] Fix Bug option
- [ ] Radio button selection

### US-245: Launcher Start Action
**As a** user
**I want** to start the pipeline
**So that** work begins

**Acceptance Criteria:**
- [ ] Validates inputs
- [ ] Shows errors if invalid
- [ ] Initiates pipeline
- [ ] Navigates to split view

### US-246: Launcher Recent Projects
**As a** user
**I want** recent projects list
**So that** I can quickly resume

**Acceptance Criteria:**
- [ ] Shows last 5 projects
- [ ] Click to select
- [ ] Shows project name and path
- [ ] Delete from history

### US-247: Resume Screen
**As a** user
**I want** a resume screen
**So that** I can continue work

**Acceptance Criteria:**
- [ ] Shows last state
- [ ] Shows phase and epic
- [ ] Shows cost and duration
- [ ] Resume/Cancel buttons

### US-248: Resume State Display
**As a** user
**I want** to see last state
**So that** I know where I left off

**Acceptance Criteria:**
- [ ] Current phase name
- [ ] Current epic if Phase 4
- [ ] Progress percentage
- [ ] Last activity time

### US-249: Resume Cost Display
**As a** user
**I want** to see costs
**So that** I know spending

**Acceptance Criteria:**
- [ ] Previous sessions cost
- [ ] Calculated from ccusage
- [ ] Formatted as currency
- [ ] Duration shown too

### US-250: Resume Action
**As a** user
**I want** to resume
**So that** work continues

**Acceptance Criteria:**
- [ ] Click Resume button
- [ ] Recalculates costs
- [ ] Spawns worker
- [ ] Navigates to split view

### US-251: Resume Cancel
**As a** user
**I want** to cancel resume
**So that** I can go back

**Acceptance Criteria:**
- [ ] Click Cancel button
- [ ] Returns to launcher
- [ ] No changes made

### US-252: Resume Delete Option
**As a** user
**I want** to delete and restart
**So that** I can start fresh

**Acceptance Criteria:**
- [ ] Delete option shown
- [ ] Confirmation required
- [ ] Clears manifest
- [ ] Returns to launcher

### US-253: Split View Screen
**As a** user
**I want** a split view
**So that** I see both panes

**Acceptance Criteria:**
- [ ] Left pane: orchestrator
- [ ] Right pane: worker
- [ ] Resizable divider
- [ ] Minimum pane widths

### US-254: Split View Resize
**As a** user
**I want** to resize panes
**So that** I control layout

**Acceptance Criteria:**
- [ ] Arrow keys resize
- [ ] Shows current ratio
- [ ] Saves preference
- [ ] Respects minimums

### US-255: Orchestrator Pane
**As a** user
**I want** an orchestrator pane
**So that** I see pipeline status

**Acceptance Criteria:**
- [ ] Project name
- [ ] Current phase
- [ ] Progress bar
- [ ] Todo list
- [ ] Epic list (Phase 4)
- [ ] Cost/duration

### US-256: Orchestrator Project Display
**As a** user
**I want** to see project info
**So that** I know what I'm working on

**Acceptance Criteria:**
- [ ] Project name
- [ ] Pipeline type
- [ ] Mode
- [ ] Path (truncated)

### US-257: Orchestrator Phase Display
**As a** user
**I want** to see current phase
**So that** I know progress

**Acceptance Criteria:**
- [ ] Phase number
- [ ] Phase name
- [ ] Phase status
- [ ] Highlighted current

### US-258: Orchestrator Progress Bar
**As a** user
**I want** to see progress bar
**So that** I see completion

**Acceptance Criteria:**
- [ ] Visual progress bar
- [ ] Percentage number
- [ ] Updates in real-time

### US-259: Orchestrator Todo List
**As a** user
**I want** to see todos
**So that** I see current tasks

**Acceptance Criteria:**
- [ ] List of todos
- [ ] Status icons (✓, ●, ○)
- [ ] Scrollable if long
- [ ] Current task highlighted

### US-260: Orchestrator Epic List
**As a** user
**I want** to see epics
**So that** I see epic progress

**Acceptance Criteria:**
- [ ] Only shows in Phase 4
- [ ] List of epics
- [ ] Status icons
- [ ] Current epic highlighted

### US-261: Orchestrator Cost Display
**As a** user
**I want** to see cost
**So that** I track spending

**Acceptance Criteria:**
- [ ] Shows current cost
- [ ] Updates in real-time
- [ ] Formatted as currency

### US-262: Orchestrator Duration Display
**As a** user
**I want** to see duration
**So that** I track time

**Acceptance Criteria:**
- [ ] Shows elapsed time
- [ ] Updates every second
- [ ] Formatted as hh:mm:ss

### US-263: Worker Pane
**As a** user
**I want** a worker pane
**So that** I see Claude output

**Acceptance Criteria:**
- [ ] Shows worker stdout
- [ ] Scrolls automatically
- [ ] Preserves ANSI colors
- [ ] Shows activity indicator

### US-264: Worker Output Display
**As a** user
**I want** to see worker output
**So that** I see what Claude does

**Acceptance Criteria:**
- [ ] Raw terminal output
- [ ] ANSI colors preserved
- [ ] Auto-scroll to bottom
- [ ] Scrollback buffer

### US-265: Worker Fullscreen
**As a** user
**I want** fullscreen worker
**So that** I see more output

**Acceptance Criteria:**
- [ ] Press 'f' or F11
- [ ] Worker fills screen
- [ ] Status bar at bottom
- [ ] Esc to exit

### US-266: Worker Fullscreen Status
**As a** user
**I want** status in fullscreen
**So that** I see progress

**Acceptance Criteria:**
- [ ] Phase and epic
- [ ] Progress percentage
- [ ] Cost and duration
- [ ] Minimal, one line

### US-267: Pause Functionality
**As a** user
**I want** to pause
**So that** I can take a break

**Acceptance Criteria:**
- [ ] Press 'p' to pause
- [ ] Worker pauses
- [ ] Shows paused indicator
- [ ] State saved

### US-268: Resume Functionality
**As a** user
**I want** to resume after pause
**So that** work continues

**Acceptance Criteria:**
- [ ] Press 'r' when paused
- [ ] Worker resumes
- [ ] Paused indicator gone
- [ ] Continues from same point

### US-269: Quit Functionality
**As a** user
**I want** to quit
**So that** I can exit

**Acceptance Criteria:**
- [ ] Press 'q' to quit
- [ ] Confirmation if running
- [ ] Saves state
- [ ] Clean exit

### US-270: Quit Confirmation
**As a** user
**I want** quit confirmation
**So that** I don't quit accidentally

**Acceptance Criteria:**
- [ ] Shows confirmation dialog
- [ ] "Are you sure?"
- [ ] Yes/No options
- [ ] No quits without save

### US-271: Complete Screen
**As a** user
**I want** a complete screen
**So that** I see success

**Acceptance Criteria:**
- [ ] Shows success message
- [ ] Shows summary
- [ ] Shows next steps
- [ ] New/Exit buttons

### US-272: Complete Summary
**As a** user
**I want** to see summary
**So that** I know what was done

**Acceptance Criteria:**
- [ ] Phases completed
- [ ] Epics completed
- [ ] Tests passing
- [ ] Total cost
- [ ] Total duration

### US-273: Complete Next Steps
**As a** user
**I want** to see next steps
**So that** I know what to do

**Acceptance Criteria:**
- [ ] npm publish option
- [ ] GitLab link
- [ ] Documentation link

### US-274: Complete Actions
**As a** user
**I want** action buttons
**So that** I can proceed

**Acceptance Criteria:**
- [ ] New Project button
- [ ] Exit button
- [ ] View Log option

### US-275: Help Overlay
**As a** user
**I want** help overlay
**So that** I see keyboard shortcuts

**Acceptance Criteria:**
- [ ] Press '?' to show
- [ ] Shows all shortcuts
- [ ] Grouped by context
- [ ] Esc to close

### US-276: Help Content
**As a** user
**I want** help content
**So that** I learn shortcuts

**Acceptance Criteria:**
- [ ] Navigation shortcuts
- [ ] Pipeline control shortcuts
- [ ] View shortcuts
- [ ] Global shortcuts

### US-277: Error Dialog
**As a** user
**I want** error dialogs
**So that** I see errors

**Acceptance Criteria:**
- [ ] Shows error message
- [ ] Shows error details
- [ ] Recovery options
- [ ] Close button

### US-278: Error Recovery Options
**As a** user
**I want** recovery options
**So that** I can handle errors

**Acceptance Criteria:**
- [ ] Retry option
- [ ] Skip option
- [ ] Abort option
- [ ] Help link

### US-279: Loading States
**As a** user
**I want** loading indicators
**So that** I know things are working

**Acceptance Criteria:**
- [ ] Spinner on loading
- [ ] Message explaining wait
- [ ] Progress if known
- [ ] Cancel if possible

### US-280: Status Bar
**As a** user
**I want** a status bar
**So that** I see key info

**Acceptance Criteria:**
- [ ] Shows at bottom
- [ ] Current context
- [ ] Key shortcuts hint
- [ ] Updates dynamically

### US-281: Notification Toast
**As a** user
**I want** notifications
**So that** I see events

**Acceptance Criteria:**
- [ ] Shows briefly
- [ ] Auto-dismisses
- [ ] Different types (info, success, error)
- [ ] Stacks multiple

### US-282: Log View
**As a** user
**I want** to view logs
**So that** I see history

**Acceptance Criteria:**
- [ ] Press 'l' to toggle
- [ ] Shows recent log entries
- [ ] Scrollable
- [ ] Filter options

### US-283: Keyboard Focus Indicator
**As a** user
**I want** focus indicators
**So that** I see where I am

**Acceptance Criteria:**
- [ ] Current element highlighted
- [ ] Border or inverse
- [ ] Clear visual distinction

### US-284: Screen Transitions
**As a** user
**I want** smooth transitions
**So that** navigation feels good

**Acceptance Criteria:**
- [ ] Clear screen changes
- [ ] No flicker
- [ ] Instant response

### US-285: Responsive Layout
**As a** user
**I want** responsive layout
**So that** different terminal sizes work

**Acceptance Criteria:**
- [ ] Adapts to terminal size
- [ ] Handles resize
- [ ] Minimum size warning
- [ ] Elements reflow

### US-286: Accessibility
**As a** user
**I want** accessible UI
**So that** screen readers work

**Acceptance Criteria:**
- [ ] Semantic structure
- [ ] Clear labels
- [ ] Keyboard navigable
- [ ] High contrast option

---

## Summary

| Epic | Stories | Cumulative |
|------|---------|------------|
| 1 | 30 | 30 |
| 2 | 40 | 70 |
| 3 | 47 | 117 |
| 4 | 34 | 151 |
| 5 | 29 | 180 |
| 6 | 22 | 202 |
| 7 | 36 | 238 |
| 8 | 48 | 286 |

**Total: 286 User Stories**
