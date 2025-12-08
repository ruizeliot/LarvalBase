# Pipeline v7 - User Stories

**Date:** 2025-12-08
**Total Stories:** 225
**Epics:** 8
**Architecture:** Two-Window (Dashboard + Worker)

---

## Epic Overview

| Epic | Name | Layer | Stories | Dependencies |
|------|------|-------|---------|--------------|
| 1 | TUI Framework | Foundation | 25 | None |
| 2 | Test Infrastructure | Foundation | 30 | Epic 1 |
| 3 | State Management | Data | 35 | Epic 1, 2 |
| 4 | Filesystem Service | Services | 25 | Epic 3 |
| 5 | Process Service (wt.exe) | Services | 25 | Epic 3 |
| 6 | Cost Service | Services | 20 | Epic 3 |
| 7 | Pipeline Orchestrator | Logic | 30 | Epic 4, 5, 6 |
| 8 | UI Screens (Dashboard) | UI | 35 | Epic 7 |

---

## Epic 1: TUI Framework (25 stories)

Foundation layer providing Ink v5 components and keyboard handling for the dashboard.

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
- [ ] Supports bold, italic, underline
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
- [ ] Shows current selection indicator
- [ ] Navigates with arrow keys
- [ ] Selects with Enter
- [ ] Calls onChange with selected value

### US-005: Radio Group Component
**As a** developer
**I want** a RadioGroup component
**So that** users can select one option from a group

**Acceptance Criteria:**
- [ ] Displays options with radio indicators
- [ ] Only one option selected at a time
- [ ] Navigates with arrow keys
- [ ] Selects with Enter or Space

### US-006: Button Component
**As a** developer
**I want** a Button component
**So that** users can trigger actions

**Acceptance Criteria:**
- [ ] Displays button text
- [ ] Shows focus state
- [ ] Activates with Enter
- [ ] Supports disabled state
- [ ] Calls onPress callback

### US-007: Progress Bar Component
**As a** developer
**I want** a ProgressBar component
**So that** I can show completion progress

**Acceptance Criteria:**
- [ ] Displays progress as filled bar
- [ ] Shows percentage value
- [ ] Accepts value prop (0-100)
- [ ] Configurable width

### US-008: Spinner Component
**As a** developer
**I want** a Spinner component
**So that** I can show loading state

**Acceptance Criteria:**
- [ ] Animates through spinner frames
- [ ] Displays optional label text
- [ ] Can be stopped/started

### US-009: Divider Component
**As a** developer
**I want** a Divider component
**So that** I can visually separate sections

**Acceptance Criteria:**
- [ ] Renders horizontal line
- [ ] Fills available width
- [ ] Supports optional title in middle

### US-010: Badge Component
**As a** developer
**I want** a Badge component
**So that** I can show status indicators

**Acceptance Criteria:**
- [ ] Displays short text with background
- [ ] Supports variants (success, error, warning, info)

### US-011: List Component
**As a** developer
**I want** a List component
**So that** I can display scrollable lists

**Acceptance Criteria:**
- [ ] Renders list items
- [ ] Supports item prefixes
- [ ] Scrolls when items exceed height
- [ ] Shows scroll indicator

### US-012: useInput Hook
**As a** developer
**I want** a useInput hook
**So that** I can handle keyboard input

**Acceptance Criteria:**
- [ ] Receives character input
- [ ] Receives special keys (arrow, enter, escape, tab)
- [ ] Receives modifier keys (ctrl, shift)
- [ ] Can be conditionally active

### US-013: useApp Hook
**As a** developer
**I want** a useApp hook
**So that** I can control the application lifecycle

**Acceptance Criteria:**
- [ ] Provides exit() function
- [ ] Provides clear() function
- [ ] Exposes app dimensions

### US-014: useFocus Hook
**As a** developer
**I want** a useFocus hook
**So that** I can manage focus state

**Acceptance Criteria:**
- [ ] Returns isFocused boolean
- [ ] Provides focus() function
- [ ] Works with Tab navigation

### US-015: Screen Container Component
**As a** developer
**I want** a Screen component
**So that** I can create full-screen views

**Acceptance Criteria:**
- [ ] Fills terminal dimensions
- [ ] Provides header/footer areas
- [ ] Clears previous content

### US-016: Modal Component
**As a** developer
**I want** a Modal component
**So that** I can show overlay dialogs

**Acceptance Criteria:**
- [ ] Renders on top of content
- [ ] Captures keyboard focus
- [ ] Has visible border
- [ ] Closes with Escape

### US-017: StatusBar Component
**As a** developer
**I want** a StatusBar component
**So that** I can show persistent status information

**Acceptance Criteria:**
- [ ] Renders at screen bottom
- [ ] Shows key hints
- [ ] Updates dynamically

### US-018: Tab Navigation
**As a** developer
**I want** Tab key to navigate between focusable elements
**So that** keyboard navigation is intuitive

**Acceptance Criteria:**
- [ ] Tab moves to next focusable
- [ ] Shift+Tab moves to previous
- [ ] Focus wraps at boundaries

### US-019: Arrow Key Navigation
**As a** developer
**I want** arrow keys to navigate within components
**So that** users can select options

**Acceptance Criteria:**
- [ ] Up/Down for vertical lists
- [ ] Left/Right for horizontal layouts
- [ ] Stops at boundaries

### US-020: Enter/Space Activation
**As a** developer
**I want** Enter and Space to activate focused elements
**So that** users can trigger actions

**Acceptance Criteria:**
- [ ] Enter activates buttons
- [ ] Space toggles checkboxes
- [ ] Enter selects list items

### US-021: Escape Cancellation
**As a** developer
**I want** Escape to cancel/close/go-back
**So that** users can exit current context

**Acceptance Criteria:**
- [ ] Closes modals
- [ ] Returns to previous screen

### US-022: Global Keyboard Shortcuts
**As a** developer
**I want** global shortcuts (q, ?, Ctrl+L)
**So that** common actions are always available

**Acceptance Criteria:**
- [ ] q shows quit confirmation
- [ ] ? shows help overlay
- [ ] Ctrl+L clears screen

### US-023: Toast/Notification Component
**As a** developer
**I want** a Toast component
**So that** I can show temporary messages

**Acceptance Criteria:**
- [ ] Displays message at screen edge
- [ ] Auto-dismisses after timeout
- [ ] Supports different types

### US-024: Table Component
**As a** developer
**I want** a Table component
**So that** I can display tabular data

**Acceptance Criteria:**
- [ ] Renders headers and rows
- [ ] Aligns columns
- [ ] Draws borders

### US-025: Responsive Layout
**As a** developer
**I want** responsive layout
**So that** different terminal sizes work

**Acceptance Criteria:**
- [ ] Adapts to terminal size
- [ ] Handles resize
- [ ] Minimum size warning

---

## Epic 2: Test Infrastructure (30 stories)

Foundation layer providing Mock Claude, Mock Windows Terminal, and test utilities.

### US-026: Mock Claude Binary
**As a** test developer
**I want** a mock Claude binary
**So that** E2E tests don't call real Claude API

**Acceptance Criteria:**
- [ ] Executes as standalone Node script
- [ ] Reads fixture file from environment variable
- [ ] Outputs lines from fixture with timing
- [ ] Exits with code from fixture

### US-027: Mock Claude Output Streaming
**As a** test developer
**I want** mock Claude to stream output
**So that** it simulates real Claude behavior

**Acceptance Criteria:**
- [ ] Outputs lines sequentially
- [ ] Respects timing delays from fixture
- [ ] Supports JSON progress markers

### US-028: Mock Claude Todo File Updates
**As a** test developer
**I want** mock Claude to update todo files
**So that** orchestrator todo detection can be tested

**Acceptance Criteria:**
- [ ] Creates todo files at specified timestamps
- [ ] Updates todo content per fixture
- [ ] Uses correct file path pattern

### US-029: Mock Claude Exit Codes
**As a** test developer
**I want** mock Claude to exit with configurable codes
**So that** error handling can be tested

**Acceptance Criteria:**
- [ ] Exits with code from fixture (0, 1, etc.)
- [ ] Supports timeout simulation
- [ ] Supports crash simulation

### US-030: Fixture File Format
**As a** test developer
**I want** a well-defined fixture format
**So that** test data is consistent

**Acceptance Criteria:**
- [ ] JSON format with schema validation
- [ ] output[] array for stdout lines
- [ ] todoStates[] array for todo updates
- [ ] finalState object for exit behavior

### US-031: Phase-Specific Fixtures
**As a** test developer
**I want** fixtures for each phase
**So that** phase-specific behavior can be tested

**Acceptance Criteria:**
- [ ] phase-1-success.json (brainstorm)
- [ ] phase-2-success.json (specs)
- [ ] phase-3-success.json (bootstrap)
- [ ] phase-4-success.json (implement)
- [ ] phase-5-success.json (finalize)

### US-032: Error Scenario Fixtures
**As a** test developer
**I want** fixtures for error scenarios
**So that** error handling can be tested

**Acceptance Criteria:**
- [ ] claude-timeout.json
- [ ] claude-crash.json
- [ ] claude-context-limit.json

### US-033: Mock Windows Terminal Service
**As a** test developer
**I want** mock Windows Terminal spawning
**So that** worker spawning can be tested without opening windows

**Acceptance Criteria:**
- [ ] Mocks wt.exe spawn command
- [ ] Returns mock process handle
- [ ] Simulates process lifecycle

### US-034: Mock Windows Terminal PID Tracking
**As a** test developer
**I want** mock PID tracking
**So that** worker identification can be tested

**Acceptance Criteria:**
- [ ] Assigns mock PIDs
- [ ] Tracks which processes are "running"
- [ ] Simulates process kill

### US-035: Mock Filesystem Module
**As a** test developer
**I want** a mock filesystem
**So that** file operations are isolated

**Acceptance Criteria:**
- [ ] In-memory file storage
- [ ] Provides fs API compatible methods
- [ ] Can be pre-populated for tests

### US-036: Mock Filesystem Watch
**As a** test developer
**I want** mock filesystem watching
**So that** todo file watching can be tested

**Acceptance Criteria:**
- [ ] watch() returns watcher object
- [ ] Emits change events on file updates
- [ ] Can be triggered programmatically

### US-037: Mock ccusage Integration
**As a** test developer
**I want** mock ccusage responses
**So that** cost calculation can be tested

**Acceptance Criteria:**
- [ ] Returns fixture cost data
- [ ] Supports session filtering
- [ ] Returns duration data

### US-038: Test Harness Setup
**As a** test developer
**I want** a test harness
**So that** tests have consistent setup

**Acceptance Criteria:**
- [ ] beforeEach resets all mocks
- [ ] afterEach cleans up resources
- [ ] Sets up mock environment variables

### US-039: CLET Test Runner Integration
**As a** test developer
**I want** CLET integrated
**So that** CLI E2E tests work

**Acceptance Criteria:**
- [ ] runner() function available
- [ ] fork() spawns CLI
- [ ] wait() for output patterns

### US-040: Test Assertions for TUI
**As a** test developer
**I want** TUI-specific assertions
**So that** output verification is easy

**Acceptance Criteria:**
- [ ] toContainText(pattern)
- [ ] toShowScreen(name)
- [ ] toShowProgress(percent)

### US-041: Test Assertions for State
**As a** test developer
**I want** state assertions
**So that** store verification is easy

**Acceptance Criteria:**
- [ ] toHaveManifestPhase(n)
- [ ] toHaveEpicStatus(epicId, status)
- [ ] toHaveTodoCount(n)

### US-042: Test Timing Utilities
**As a** test developer
**I want** timing utilities
**So that** async behavior is testable

**Acceptance Criteria:**
- [ ] advanceTimers(ms) function
- [ ] waitFor(condition) utility
- [ ] flushPromises() function

### US-043: Test Data Factories
**As a** test developer
**I want** test data factories
**So that** test data creation is easy

**Acceptance Criteria:**
- [ ] buildManifest() factory
- [ ] buildProject() factory
- [ ] buildTodo() factory

### US-044: Mock Process Spawn
**As a** test developer
**I want** mock process spawning
**So that** worker spawning can be tested

**Acceptance Criteria:**
- [ ] spawn() returns mock process
- [ ] Tracks spawned processes
- [ ] Simulates exit events

### US-045: Mock Process Kill
**As a** test developer
**I want** mock process killing
**So that** worker termination can be tested

**Acceptance Criteria:**
- [ ] kill(pid) marks process dead
- [ ] Emits exit event
- [ ] Records kill history

### US-046: Test Isolation Verification
**As a** test developer
**I want** tests to be isolated
**So that** tests don't affect each other

**Acceptance Criteria:**
- [ ] Each test has fresh mock state
- [ ] No shared mutable state
- [ ] Parallel test execution works

### US-047: Fixture Validation
**As a** test developer
**I want** fixture validation
**So that** invalid fixtures are caught

**Acceptance Criteria:**
- [ ] JSON schema validation
- [ ] Required fields checked
- [ ] Error messages for invalid fixtures

### US-048: Test Helper Functions
**As a** test developer
**I want** helper functions
**So that** common patterns are reusable

**Acceptance Criteria:**
- [ ] createMockProject() helper
- [ ] createMockManifest() helper
- [ ] simulatePhaseComplete() helper

### US-049: Integration Test Patterns
**As a** test developer
**I want** integration test patterns
**So that** component integration is tested

**Acceptance Criteria:**
- [ ] Mount component with providers
- [ ] Inject mock dependencies
- [ ] Assert on rendered output

### US-050: E2E Test Patterns
**As a** test developer
**I want** E2E test patterns
**So that** full flows are tested

**Acceptance Criteria:**
- [ ] Launch full CLI
- [ ] Navigate through screens
- [ ] Verify state changes

### US-051: Test Error Simulation
**As a** test developer
**I want** error simulation
**So that** error paths are tested

**Acceptance Criteria:**
- [ ] Simulate file read errors
- [ ] Simulate process spawn errors
- [ ] Verify error handling

### US-052: Performance Test Utilities
**As a** test developer
**I want** performance utilities
**So that** slow tests are detected

**Acceptance Criteria:**
- [ ] Test timeout enforcement
- [ ] Execution time tracking

### US-053: Mock Git Operations
**As a** test developer
**I want** mock git operations
**So that** commit verification works

**Acceptance Criteria:**
- [ ] Mock git status
- [ ] Mock git commit
- [ ] Track git operation history

### US-054: Debug Logging for Tests
**As a** test developer
**I want** debug logging
**So that** test failures can be diagnosed

**Acceptance Criteria:**
- [ ] Capture mock interactions
- [ ] Log state changes
- [ ] Output on test failure

### US-055: Test Coverage Reporting
**As a** test developer
**I want** coverage reports
**So that** test completeness is tracked

**Acceptance Criteria:**
- [ ] Line coverage percentage
- [ ] Function coverage percentage
- [ ] Uncovered lines highlighted

---

## Epic 3: State Management (35 stories)

Data layer providing all state stores for the application.

### US-056: ManifestStore Creation
**As a** developer
**I want** a ManifestStore
**So that** pipeline state is managed

**Acceptance Criteria:**
- [ ] In-memory state object
- [ ] Initial state with defaults
- [ ] Subscribe for changes
- [ ] Get current state

### US-057: ManifestStore Manifest Fields
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

### US-058: ManifestStore Phase Updates
**As a** developer
**I want** to update phase state
**So that** phase progression is tracked

**Acceptance Criteria:**
- [ ] setPhaseStatus(phase, status)
- [ ] setCurrentPhase(phase)
- [ ] getPhaseStatus(phase)
- [ ] Emits change event

### US-059: ManifestStore Epic Updates
**As a** developer
**I want** to update epic state
**So that** epic progression is tracked

**Acceptance Criteria:**
- [ ] setEpicStatus(epicId, status)
- [ ] setCurrentEpic(epicId)
- [ ] getEpicStatus(epicId)
- [ ] addEpic(epic)

### US-060: ManifestStore Worker Tracking
**As a** developer
**I want** to track workers
**So that** worker sessions are managed

**Acceptance Criteria:**
- [ ] addWorker(worker) with sessionId
- [ ] updateWorkerStatus(sessionId, status)
- [ ] removeWorker(sessionId)
- [ ] getActiveWorkers()

### US-061: ManifestStore Cost Updates
**As a** developer
**I want** to update costs
**So that** spending is tracked

**Acceptance Criteria:**
- [ ] addCost(amount, phase)
- [ ] getTotalCost()
- [ ] getCostByPhase(phase)

### US-062: ManifestStore Duration Updates
**As a** developer
**I want** to update duration
**So that** time is tracked

**Acceptance Criteria:**
- [ ] addDuration(seconds, phase)
- [ ] getTotalDuration()
- [ ] getDurationByPhase(phase)

### US-063: ProjectStore Creation
**As a** developer
**I want** a ProjectStore
**So that** project config is managed

**Acceptance Criteria:**
- [ ] In-memory state object
- [ ] Project name, path, type, mode
- [ ] Subscribe for changes

### US-064: ProjectStore Validation
**As a** developer
**I want** project validation
**So that** invalid projects are rejected

**Acceptance Criteria:**
- [ ] Path exists validation
- [ ] Path is directory validation
- [ ] Type is valid validation
- [ ] Mode is valid validation

### US-065: SessionStore Creation
**As a** developer
**I want** a SessionStore
**So that** worker sessions are managed

**Acceptance Criteria:**
- [ ] In-memory session map
- [ ] Add/remove sessions
- [ ] Get session by ID

### US-066: SessionStore Session Fields
**As a** developer
**I want** session fields
**So that** session info is complete

**Acceptance Criteria:**
- [ ] sessionId (UUID)
- [ ] projectPath
- [ ] phase
- [ ] epic (if applicable)
- [ ] pid (process ID)
- [ ] status (running/paused/complete)

### US-067: SessionStore Session Lifecycle
**As a** developer
**I want** session lifecycle management
**So that** sessions transition correctly

**Acceptance Criteria:**
- [ ] createSession() generates UUID
- [ ] startSession(id) sets running
- [ ] completeSession(id) sets complete

### US-068: TodoStore Creation
**As a** developer
**I want** a TodoStore
**So that** worker todos are managed

**Acceptance Criteria:**
- [ ] In-memory todo list per session
- [ ] Add/update/remove todos
- [ ] Get todos by session

### US-069: TodoStore Session Scoping
**As a** developer
**I want** todos scoped to sessions
**So that** workers don't see each other's todos

**Acceptance Criteria:**
- [ ] getTodosBySession(sessionId)
- [ ] addTodo(todo, sessionId)
- [ ] Only returns matching session

### US-070: TodoStore Progress Calculation
**As a** developer
**I want** progress calculation
**So that** completion percentage is known

**Acceptance Criteria:**
- [ ] getProgress(sessionId) returns 0-100
- [ ] Counts completed vs total
- [ ] Recalculates on changes

### US-071: TodoStore Completion Detection
**As a** developer
**I want** completion detection
**So that** phase/epic completion is detected

**Acceptance Criteria:**
- [ ] isComplete(sessionId) returns boolean
- [ ] True when all todos completed
- [ ] Emits completion event

### US-072: CostStore Creation
**As a** developer
**I want** a CostStore
**So that** costs are tracked separately

**Acceptance Criteria:**
- [ ] In-memory cost data
- [ ] Total cost
- [ ] Cost by phase

### US-073: DurationStore Creation
**As a** developer
**I want** a DurationStore
**So that** duration is tracked

**Acceptance Criteria:**
- [ ] In-memory duration data
- [ ] Total duration in seconds
- [ ] Duration by phase

### US-074: DurationStore Timer
**As a** developer
**I want** duration timer
**So that** time is tracked automatically

**Acceptance Criteria:**
- [ ] startTimer(phase, session)
- [ ] stopTimer()
- [ ] pauseTimer()
- [ ] resumeTimer()

### US-075: Store Persistence Interface
**As a** developer
**I want** persistence interface
**So that** stores can be saved/loaded

**Acceptance Criteria:**
- [ ] toJSON() serializes state
- [ ] fromJSON(data) deserializes
- [ ] Validates data on load

### US-076: Store Change Events
**As a** developer
**I want** change events
**So that** UI reacts to state changes

**Acceptance Criteria:**
- [ ] subscribe(listener) registers
- [ ] unsubscribe(listener) removes
- [ ] Listener called on change

### US-077: Store Immutability
**As a** developer
**I want** immutable state updates
**So that** changes are predictable

**Acceptance Criteria:**
- [ ] State objects not mutated
- [ ] New objects on update

### US-078: Store Selectors
**As a** developer
**I want** state selectors
**So that** specific data is easy to get

**Acceptance Criteria:**
- [ ] selectPhase(state)
- [ ] selectEpics(state)
- [ ] selectTodos(state)

### US-079: Store Initialization
**As a** developer
**I want** store initialization
**So that** stores start correctly

**Acceptance Criteria:**
- [ ] Default state on create
- [ ] Load from file if exists
- [ ] Merge with defaults

### US-080: Store Reset
**As a** developer
**I want** store reset
**So that** state can be cleared

**Acceptance Criteria:**
- [ ] reset() to defaults
- [ ] Clears all data
- [ ] Preserves subscriptions

### US-081: useManifest Hook
**As a** developer
**I want** useManifest hook
**So that** components access manifest

**Acceptance Criteria:**
- [ ] Returns current manifest
- [ ] Re-renders on change
- [ ] Provides update functions

### US-082: useProject Hook
**As a** developer
**I want** useProject hook
**So that** components access project

**Acceptance Criteria:**
- [ ] Returns current project
- [ ] Re-renders on change

### US-083: useSession Hook
**As a** developer
**I want** useSession hook
**So that** components access session

**Acceptance Criteria:**
- [ ] Returns current session
- [ ] Re-renders on change

### US-084: useTodos Hook
**As a** developer
**I want** useTodos hook
**So that** components access todos

**Acceptance Criteria:**
- [ ] Returns todos for session
- [ ] Returns progress percentage

### US-085: useCost Hook
**As a** developer
**I want** useCost hook
**So that** components access cost

**Acceptance Criteria:**
- [ ] Returns total cost
- [ ] Returns cost by phase
- [ ] Formats as currency

### US-086: useDuration Hook
**As a** developer
**I want** useDuration hook
**So that** components access duration

**Acceptance Criteria:**
- [ ] Returns total duration
- [ ] Returns duration by phase
- [ ] Formats as hh:mm:ss

### US-087: Store Provider Component
**As a** developer
**I want** StoreProvider
**So that** stores are available to tree

**Acceptance Criteria:**
- [ ] Wraps application
- [ ] Provides all stores via context
- [ ] Initializes stores

### US-088: Store Hydration
**As a** developer
**I want** store hydration
**So that** state loads on startup

**Acceptance Criteria:**
- [ ] Load from manifest file
- [ ] Handle missing file
- [ ] Validate schema

### US-089: Store Dehydration
**As a** developer
**I want** store dehydration
**So that** state saves on shutdown

**Acceptance Criteria:**
- [ ] Save to manifest file
- [ ] Atomic write (temp + rename)
- [ ] Trigger on quit

### US-090: Multi-Store Coordination
**As a** developer
**I want** store coordination
**So that** stores stay in sync

**Acceptance Criteria:**
- [ ] Transaction support
- [ ] Atomic multi-store updates
- [ ] Consistent state

---

## Epic 4: Filesystem Service (25 stories)

Services layer providing all filesystem operations.

### US-091: FilesystemService Creation
**As a** developer
**I want** a FilesystemService
**So that** file operations are centralized

**Acceptance Criteria:**
- [ ] Class with fs methods
- [ ] Injected file system (real or mock)
- [ ] Error handling

### US-092: Project Directory Creation
**As a** developer
**I want** to create project directories
**So that** new projects have structure

**Acceptance Criteria:**
- [ ] createProjectDir(path) creates folder
- [ ] Creates .pipeline subdirectory
- [ ] Creates docs subdirectory

### US-093: Project Directory Validation
**As a** developer
**I want** to validate project directories
**So that** invalid paths are rejected

**Acceptance Criteria:**
- [ ] validateProjectDir(path) checks exists
- [ ] Checks is directory
- [ ] Checks write permission

### US-094: Project Discovery
**As a** developer
**I want** to discover existing projects
**So that** resume works

**Acceptance Criteria:**
- [ ] discoverProject(path) finds manifest
- [ ] Returns project info
- [ ] Returns null if not found

### US-095: Manifest Read
**As a** developer
**I want** to read manifests
**So that** state is loaded

**Acceptance Criteria:**
- [ ] readManifest(path) returns data
- [ ] Parses JSON
- [ ] Validates schema

### US-096: Manifest Write
**As a** developer
**I want** to write manifests
**So that** state is persisted

**Acceptance Criteria:**
- [ ] writeManifest(path, data) saves
- [ ] Writes to temp file first
- [ ] Renames to final (atomic)

### US-097: Manifest Watch
**As a** developer
**I want** to watch manifest changes
**So that** external changes are detected

**Acceptance Criteria:**
- [ ] watchManifest(path, callback)
- [ ] Callback on file change
- [ ] Debounces rapid changes

### US-098: Todo File Watch
**As a** developer
**I want** to watch todo files
**So that** worker progress is detected

**Acceptance Criteria:**
- [ ] watchTodoDir(callback) watches ~/.claude/todos/
- [ ] Filters by session ID pattern
- [ ] Callback on todo file change

### US-099: Todo File Parsing
**As a** developer
**I want** to parse todo files
**So that** todo state is extracted

**Acceptance Criteria:**
- [ ] parseTodoFile(path) returns todos
- [ ] Handles JSONL format
- [ ] Extracts session ID from filename

### US-100: Todo Session Filtering
**As a** developer
**I want** todos filtered by session
**So that** only relevant todos are used

**Acceptance Criteria:**
- [ ] Session ID embedded in filename
- [ ] Filter by pattern match
- [ ] Ignore other sessions

### US-101: Config File Read
**As a** developer
**I want** to read config files
**So that** settings are loaded

**Acceptance Criteria:**
- [ ] readConfig(path) returns data
- [ ] Returns defaults if missing

### US-102: Config File Write
**As a** developer
**I want** to write config files
**So that** settings are persisted

**Acceptance Criteria:**
- [ ] writeConfig(path, data) saves
- [ ] Pretty-prints JSON
- [ ] Atomic write

### US-103: Log File Write
**As a** developer
**I want** to write log files
**So that** activity is recorded

**Acceptance Criteria:**
- [ ] appendLog(path, message)
- [ ] Timestamp prefix
- [ ] Creates file if missing

### US-104: Log File Read
**As a** developer
**I want** to read log files
**So that** history is viewable

**Acceptance Criteria:**
- [ ] readLog(path, lines) returns lines
- [ ] Reads last N lines

### US-105: File Exists Check
**As a** developer
**I want** to check file existence
**So that** operations can be conditional

**Acceptance Criteria:**
- [ ] exists(path) returns boolean
- [ ] Works for files and dirs

### US-106: Path Resolution
**As a** developer
**I want** to resolve paths
**So that** relative paths work

**Acceptance Criteria:**
- [ ] resolvePath(path) returns absolute
- [ ] Handles ~ for home
- [ ] Cross-platform

### US-107: Path Joining
**As a** developer
**I want** to join paths
**So that** paths are built correctly

**Acceptance Criteria:**
- [ ] joinPath(...parts) returns path
- [ ] Cross-platform

### US-108: Temp File Creation
**As a** developer
**I want** to create temp files
**So that** atomic writes work

**Acceptance Criteria:**
- [ ] createTempFile(prefix) returns path
- [ ] Unique filename

### US-109: Atomic File Write
**As a** developer
**I want** atomic file writes
**So that** partial writes don't corrupt

**Acceptance Criteria:**
- [ ] atomicWrite(path, data)
- [ ] Writes to temp
- [ ] Renames to final

### US-110: Home Directory
**As a** developer
**I want** home directory path
**So that** user paths work

**Acceptance Criteria:**
- [ ] getHomeDir() returns path
- [ ] Cross-platform

### US-111: ccusage Directory
**As a** developer
**I want** ccusage directory path
**So that** cost files are found

**Acceptance Criteria:**
- [ ] getCcusageDir() returns path
- [ ] Default fallback

### US-112: Session File Naming
**As a** developer
**I want** session-scoped filenames
**So that** sessions don't conflict

**Acceptance Criteria:**
- [ ] getSessionFilename(sessionId, type)
- [ ] Unique per session
- [ ] Predictable pattern

### US-113: File Watch Debounce
**As a** developer
**I want** debounced file watching
**So that** rapid changes are batched

**Acceptance Criteria:**
- [ ] Configurable debounce time
- [ ] Groups rapid changes

### US-114: JSON Schema Validation
**As a** developer
**I want** JSON schema validation
**So that** data is validated

**Acceptance Criteria:**
- [ ] validateSchema(data, schema)
- [ ] Returns errors array

### US-115: File System Error Handling
**As a** developer
**I want** consistent error handling
**So that** errors are predictable

**Acceptance Criteria:**
- [ ] Consistent error types
- [ ] Error codes (ENOENT, etc.)

---

## Epic 5: Process Service - wt.exe (25 stories)

Services layer providing worker spawning via Windows Terminal.

### US-116: ProcessService Creation
**As a** developer
**I want** a ProcessService
**So that** process operations are centralized

**Acceptance Criteria:**
- [ ] Class with process methods
- [ ] Injected spawn function (real or mock)
- [ ] Error handling

### US-117: Windows Terminal Detection
**As a** developer
**I want** to detect Windows Terminal
**So that** correct spawning method is used

**Acceptance Criteria:**
- [ ] Check if wt.exe exists
- [ ] Check Windows Terminal installation
- [ ] Fallback detection

### US-118: Worker Spawn via wt.exe
**As a** developer
**I want** to spawn workers via Windows Terminal
**So that** workers run in separate windows

**Acceptance Criteria:**
- [ ] spawnWorker(command, args, options)
- [ ] Uses wt.exe -w 0 nt -d "path"
- [ ] Returns process handle

### US-119: Worker Spawn Fallback
**As a** developer
**I want** fallback spawning
**So that** non-Windows-Terminal systems work

**Acceptance Criteria:**
- [ ] Falls back to cmd /c start on Windows
- [ ] Falls back to terminal on macOS/Linux
- [ ] Works when wt.exe unavailable

### US-120: Worker Session ID Assignment
**As a** developer
**I want** session IDs for workers
**So that** workers are uniquely identified

**Acceptance Criteria:**
- [ ] UUID v4 generation
- [ ] Passed to worker as env var
- [ ] Recorded in manifest

### US-121: Worker Environment Setup
**As a** developer
**I want** proper environment for workers
**So that** workers run correctly

**Acceptance Criteria:**
- [ ] PIPELINE_SESSION_ID set
- [ ] PIPELINE_PROJECT_PATH set
- [ ] PIPELINE_PHASE set

### US-122: Worker PID Tracking
**As a** developer
**I want** PID tracking
**So that** processes are identifiable

**Acceptance Criteria:**
- [ ] Store PID on spawn
- [ ] Update manifest with PID
- [ ] Use PID for kill

### US-123: Worker Kill by Session
**As a** developer
**I want** to kill by session ID
**So that** correct process is killed

**Acceptance Criteria:**
- [ ] Looks up PID from session
- [ ] No wildcard matching
- [ ] Updates session status

### US-124: Worker Graceful Shutdown
**As a** developer
**I want** graceful shutdown
**So that** work isn't lost

**Acceptance Criteria:**
- [ ] Sends SIGTERM/taskkill
- [ ] Waits for exit
- [ ] Force kill after timeout

### US-125: Worker Exit Detection
**As a** developer
**I want** exit detection
**So that** completion is known

**Acceptance Criteria:**
- [ ] Monitor process status
- [ ] Detect exit code
- [ ] Update session status

### US-126: Worker State Tracking
**As a** developer
**I want** state tracking
**So that** worker state is known

**Acceptance Criteria:**
- [ ] running state
- [ ] completed state
- [ ] errored state
- [ ] killed state

### US-127: Process List
**As a** developer
**I want** process listing
**So that** active workers are known

**Acceptance Criteria:**
- [ ] listWorkers() returns array
- [ ] Includes session ID, PID, state

### US-128: Process Cleanup
**As a** developer
**I want** process cleanup
**So that** zombie processes don't linger

**Acceptance Criteria:**
- [ ] cleanupWorkers() kills all
- [ ] Called on app exit

### US-129: Focus Worker Window
**As a** developer
**I want** to focus worker window
**So that** user can see worker output

**Acceptance Criteria:**
- [ ] Brings Windows Terminal to front
- [ ] Focuses correct tab if multiple

### US-130: Command Injection Prevention
**As a** developer
**I want** injection prevention
**So that** commands are safe

**Acceptance Criteria:**
- [ ] Escape special characters
- [ ] Validate command
- [ ] No shell interpretation

### US-131: Cross-Platform Spawn
**As a** developer
**I want** cross-platform support
**So that** Windows/Mac/Linux work

**Acceptance Criteria:**
- [ ] Windows: wt.exe or cmd
- [ ] macOS: Terminal.app or iTerm
- [ ] Linux: gnome-terminal, etc.

### US-132: Process Timeout
**As a** developer
**I want** process timeout
**So that** stuck processes don't hang

**Acceptance Criteria:**
- [ ] Configurable timeout
- [ ] Kill after timeout
- [ ] Emit timeout event

### US-133: Worker Health Check
**As a** developer
**I want** health checks
**So that** stuck workers are detected

**Acceptance Criteria:**
- [ ] Check todo file activity
- [ ] Check manifest updates
- [ ] Timeout on inactivity

### US-134: Worker Status Polling
**As a** developer
**I want** status polling
**So that** worker state is current

**Acceptance Criteria:**
- [ ] Poll process status
- [ ] Check if PID still running
- [ ] Update on change

### US-135: Spawn Command Building
**As a** developer
**I want** command building
**So that** spawn commands are correct

**Acceptance Criteria:**
- [ ] Build wt.exe command string
- [ ] Include working directory
- [ ] Include environment vars

### US-136: wt.exe Argument Handling
**As a** developer
**I want** proper wt.exe arguments
**So that** Windows Terminal works correctly

**Acceptance Criteria:**
- [ ] -w 0 for existing window
- [ ] nt for new tab
- [ ] -d for directory

### US-137: Worker Window Title
**As a** developer
**I want** custom window title
**So that** worker windows are identifiable

**Acceptance Criteria:**
- [ ] Set title via wt.exe --title
- [ ] Include project name
- [ ] Include phase

### US-138: Worker Restart
**As a** developer
**I want** worker restart
**So that** crashed workers can restart

**Acceptance Criteria:**
- [ ] restartWorker(sessionId)
- [ ] Kills existing if running
- [ ] Spawns new with same session

### US-139: Concurrent Worker Limit
**As a** developer
**I want** concurrency limit
**So that** resources aren't exhausted

**Acceptance Criteria:**
- [ ] Max workers setting (default 1)
- [ ] Queue excess requests

### US-140: Worker Communication Check
**As a** developer
**I want** to verify worker is communicating
**So that** stuck workers are detected

**Acceptance Criteria:**
- [ ] Monitor todo file updates
- [ ] Monitor manifest updates
- [ ] Alert on no activity

---

## Epic 6: Cost Service (20 stories)

Services layer providing cost and duration tracking.

### US-141: CostService Creation
**As a** developer
**I want** a CostService
**So that** cost operations are centralized

**Acceptance Criteria:**
- [ ] Class with cost methods
- [ ] Injected ccusage interface
- [ ] Error handling

### US-142: ccusage Binary Detection
**As a** developer
**I want** ccusage detection
**So that** availability is known

**Acceptance Criteria:**
- [ ] Check if ccusage in PATH
- [ ] Check version
- [ ] Fallback if missing

### US-143: ccusage Session Query
**As a** developer
**I want** session queries
**So that** costs are retrieved

**Acceptance Criteria:**
- [ ] querySessions(filter) returns data
- [ ] Filter by project path
- [ ] Returns cost and duration

### US-144: ccusage Cost Parsing
**As a** developer
**I want** cost parsing
**So that** costs are extracted

**Acceptance Criteria:**
- [ ] Parse ccusage output
- [ ] Extract total cost
- [ ] Handle currency format

### US-145: ccusage Duration Parsing
**As a** developer
**I want** duration parsing
**So that** time is extracted

**Acceptance Criteria:**
- [ ] Parse ccusage output
- [ ] Extract total duration
- [ ] Handle time format

### US-146: Cost Recalculation
**As a** developer
**I want** cost recalculation
**So that** resume has correct costs

**Acceptance Criteria:**
- [ ] recalculateCost(projectPath) queries ccusage
- [ ] Sums all session costs
- [ ] Updates cost store

### US-147: Duration Recalculation
**As a** developer
**I want** duration recalculation
**So that** resume has correct duration

**Acceptance Criteria:**
- [ ] recalculateDuration(projectPath) queries ccusage
- [ ] Sums all session durations
- [ ] Updates duration store

### US-148: Real-Time Duration Timer
**As a** developer
**I want** real-time timer
**So that** duration updates during work

**Acceptance Criteria:**
- [ ] Timer increments seconds
- [ ] Starts on phase start
- [ ] Stops on complete

### US-149: Cost by Phase Breakdown
**As a** developer
**I want** phase breakdown
**So that** costs per phase are known

**Acceptance Criteria:**
- [ ] getCostByPhase() returns object
- [ ] Key by phase number

### US-150: Duration by Phase Breakdown
**As a** developer
**I want** phase breakdown
**So that** duration per phase is known

**Acceptance Criteria:**
- [ ] getDurationByPhase() returns object
- [ ] Key by phase number

### US-151: Cost Formatting
**As a** developer
**I want** cost formatting
**So that** costs display nicely

**Acceptance Criteria:**
- [ ] formatCost(amount) returns string
- [ ] Dollar sign prefix
- [ ] Two decimal places

### US-152: Duration Formatting
**As a** developer
**I want** duration formatting
**So that** duration displays nicely

**Acceptance Criteria:**
- [ ] formatDuration(seconds) returns string
- [ ] hh:mm:ss format

### US-153: Cost History
**As a** developer
**I want** cost history
**So that** past costs are visible

**Acceptance Criteria:**
- [ ] getCostHistory(projectPath)
- [ ] Returns array of sessions

### US-154: Session Correlation
**As a** developer
**I want** session correlation
**So that** ccusage sessions match workers

**Acceptance Criteria:**
- [ ] Match by session ID
- [ ] Match by timestamp

### US-155: Offline Cost Handling
**As a** developer
**I want** offline handling
**So that** missing ccusage works

**Acceptance Criteria:**
- [ ] Detect ccusage unavailable
- [ ] Show "N/A" for cost
- [ ] Continue pipeline

### US-156: Cost Export
**As a** developer
**I want** cost export
**So that** costs can be reported

**Acceptance Criteria:**
- [ ] exportCosts(format)
- [ ] JSON format

### US-157: Cost Reset
**As a** developer
**I want** cost reset
**So that** tracking can restart

**Acceptance Criteria:**
- [ ] resetCost(projectPath)
- [ ] Clears cost store

### US-158: Cost Update Events
**As a** developer
**I want** cost events
**So that** UI updates on cost change

**Acceptance Criteria:**
- [ ] Emit event on cost update
- [ ] Include new total

### US-159: Duration Update Events
**As a** developer
**I want** duration events
**So that** UI updates on duration change

**Acceptance Criteria:**
- [ ] Emit event on duration update
- [ ] Include new total

### US-160: Cost Estimation
**As a** developer
**I want** cost estimation
**So that** projected cost is shown

**Acceptance Criteria:**
- [ ] estimateCost(currentPhase, totalPhases)
- [ ] Uses historical data

---

## Epic 7: Pipeline Orchestrator (30 stories)

Logic layer providing pipeline orchestration.

### US-161: Orchestrator Creation
**As a** developer
**I want** an Orchestrator
**So that** pipeline flow is managed

**Acceptance Criteria:**
- [ ] Class with orchestration methods
- [ ] Injected services
- [ ] State machine for phases

### US-162: Pipeline Initialization
**As a** developer
**I want** pipeline init
**So that** new pipelines start correctly

**Acceptance Criteria:**
- [ ] initPipeline(project) creates manifest
- [ ] Sets up initial state
- [ ] Creates directories

### US-163: Phase Progression
**As a** developer
**I want** phase progression
**So that** phases advance correctly

**Acceptance Criteria:**
- [ ] advancePhase() moves to next
- [ ] Validates current complete
- [ ] Updates manifest

### US-164: Phase 1 Handling
**As a** developer
**I want** Phase 1 handling
**So that** brainstorm phase works

**Acceptance Criteria:**
- [ ] Interactive mode
- [ ] Creates user stories
- [ ] Detects completion

### US-165: Phase 2 Handling
**As a** developer
**I want** Phase 2 handling
**So that** specs phase works

**Acceptance Criteria:**
- [ ] Autonomous mode
- [ ] Creates E2E specs
- [ ] Detects completion

### US-166: Phase 3 Handling
**As a** developer
**I want** Phase 3 handling
**So that** bootstrap phase works

**Acceptance Criteria:**
- [ ] Autonomous mode
- [ ] Creates skeleton
- [ ] Detects completion

### US-167: Phase 4 Handling
**As a** developer
**I want** Phase 4 handling
**So that** implement phase works

**Acceptance Criteria:**
- [ ] Epic looping
- [ ] Per-epic workers
- [ ] Test verification

### US-168: Phase 5 Handling
**As a** developer
**I want** Phase 5 handling
**So that** finalize phase works

**Acceptance Criteria:**
- [ ] Autonomous mode
- [ ] Final verification
- [ ] Detects completion

### US-169: Epic Loop Management
**As a** developer
**I want** epic looping
**So that** epics iterate correctly

**Acceptance Criteria:**
- [ ] Track current epic
- [ ] Advance to next epic
- [ ] Detect all complete

### US-170: Epic Completion Detection
**As a** developer
**I want** epic completion detection
**So that** loop advances

**Acceptance Criteria:**
- [ ] Monitor todo completion
- [ ] Update epic status
- [ ] Emit complete event

### US-171: Todo Monitoring
**As a** developer
**I want** todo monitoring
**So that** progress is tracked

**Acceptance Criteria:**
- [ ] Watch todo files
- [ ] Filter by session
- [ ] Calculate progress

### US-172: Todo Completion Detection
**As a** developer
**I want** completion detection
**So that** phase ends correctly

**Acceptance Criteria:**
- [ ] All todos completed = done
- [ ] Emit completion event
- [ ] Trigger phase advance

### US-173: Worker Lifecycle Management
**As a** developer
**I want** worker lifecycle
**So that** workers are managed

**Acceptance Criteria:**
- [ ] Spawn worker for phase
- [ ] Monitor worker status
- [ ] Handle worker crash

### US-174: Worker Crash Recovery
**As a** developer
**I want** crash recovery
**So that** work isn't lost

**Acceptance Criteria:**
- [ ] Detect worker crash
- [ ] Offer resume option
- [ ] Preserve progress

### US-175: Resume Pipeline
**As a** developer
**I want** resume capability
**So that** interrupted work continues

**Acceptance Criteria:**
- [ ] resumePipeline(path) loads state
- [ ] Recalculates costs
- [ ] Spawns worker at correct point

### US-176: Pause Pipeline
**As a** developer
**I want** pause capability
**So that** work can be interrupted

**Acceptance Criteria:**
- [ ] pausePipeline() saves state
- [ ] Updates manifest
- [ ] Worker keeps running

### US-177: Cancel Pipeline
**As a** developer
**I want** cancel capability
**So that** work can be abandoned

**Acceptance Criteria:**
- [ ] cancelPipeline() kills worker
- [ ] Updates manifest
- [ ] Preserves progress

### US-178: Pipeline State Machine
**As a** developer
**I want** state machine
**So that** transitions are valid

**Acceptance Criteria:**
- [ ] States: idle, running, paused, complete, error
- [ ] Valid transitions defined
- [ ] Invalid transitions rejected

### US-179: Pipeline Events
**As a** developer
**I want** pipeline events
**So that** UI reacts to changes

**Acceptance Criteria:**
- [ ] onPhaseStart event
- [ ] onPhaseComplete event
- [ ] onEpicComplete event
- [ ] onProgress event

### US-180: Error Handling
**As a** developer
**I want** error handling
**So that** errors are managed

**Acceptance Criteria:**
- [ ] Catch worker errors
- [ ] Update state
- [ ] Offer recovery

### US-181: Error Recovery Options
**As a** developer
**I want** recovery options
**So that** errors can be handled

**Acceptance Criteria:**
- [ ] Retry option
- [ ] Skip option
- [ ] Abort option

### US-182: Progress Calculation
**As a** developer
**I want** progress calculation
**So that** overall progress is known

**Acceptance Criteria:**
- [ ] Calculate phase progress
- [ ] Calculate overall progress

### US-183: Pipeline Validation
**As a** developer
**I want** pipeline validation
**So that** invalid states are caught

**Acceptance Criteria:**
- [ ] Validate manifest state
- [ ] Validate phase order

### US-184: Event Bus
**As a** developer
**I want** event bus
**So that** components communicate

**Acceptance Criteria:**
- [ ] emit(event, data) publishes
- [ ] on(event, callback) subscribes

### US-185: Pipeline Type Handling
**As a** developer
**I want** type-specific handling
**So that** desktop/terminal differ

**Acceptance Criteria:**
- [ ] Desktop: Tauri commands
- [ ] Terminal: Ink commands

### US-186: Pipeline Mode Handling
**As a** developer
**I want** mode-specific handling
**So that** new/feature/fix differ

**Acceptance Criteria:**
- [ ] New: Full pipeline
- [ ] Feature: Partial pipeline
- [ ] Fix: Minimal pipeline

### US-187: Orchestrator Cleanup
**As a** developer
**I want** cleanup on exit
**So that** resources are freed

**Acceptance Criteria:**
- [ ] Kill workers on exit
- [ ] Save state on exit
- [ ] Close watchers

### US-188: Orchestrator Logging
**As a** developer
**I want** orchestrator logging
**So that** decisions are tracked

**Acceptance Criteria:**
- [ ] Log phase transitions
- [ ] Log epic transitions
- [ ] Log errors

### US-189: Manual Phase Advance
**As a** developer
**I want** manual advance
**So that** stuck phases can be forced

**Acceptance Criteria:**
- [ ] manualAdvance() forces next phase
- [ ] Requires confirmation
- [ ] Logs action

### US-190: Worker Communication Timeout
**As a** developer
**I want** communication timeout
**So that** silent workers are detected

**Acceptance Criteria:**
- [ ] Timeout if no file updates
- [ ] Alert user
- [ ] Offer restart

---

## Epic 8: UI Screens - Dashboard (35 stories)

UI layer providing all screen components for the dashboard.

### US-191: App Component
**As a** user
**I want** the app to start
**So that** I can use the pipeline

**Acceptance Criteria:**
- [ ] Renders on launch
- [ ] Shows launcher screen
- [ ] Provides store context

### US-192: Router Component
**As a** developer
**I want** screen routing
**So that** navigation works

**Acceptance Criteria:**
- [ ] Tracks current screen
- [ ] Renders active screen
- [ ] navigate(screen) function

### US-193: Launcher Screen
**As a** user
**I want** a launcher screen
**So that** I can start a pipeline

**Acceptance Criteria:**
- [ ] Project path input
- [ ] Pipeline type selection
- [ ] Mode selection
- [ ] Start button

### US-194: Launcher Path Input
**As a** user
**I want** to enter project path
**So that** I specify where to work

**Acceptance Criteria:**
- [ ] Text input field
- [ ] Validates path exists
- [ ] Shows validation error

### US-195: Launcher Type Selection
**As a** user
**I want** to select pipeline type
**So that** correct commands run

**Acceptance Criteria:**
- [ ] Desktop option
- [ ] Terminal option
- [ ] Radio button selection

### US-196: Launcher Mode Selection
**As a** user
**I want** to select mode
**So that** correct workflow runs

**Acceptance Criteria:**
- [ ] New Project option
- [ ] Add Feature option
- [ ] Fix Bug option

### US-197: Launcher Start Action
**As a** user
**I want** to start the pipeline
**So that** work begins

**Acceptance Criteria:**
- [ ] Validates inputs
- [ ] Spawns worker in new window
- [ ] Navigates to dashboard

### US-198: Launcher Recent Projects
**As a** user
**I want** recent projects list
**So that** I can quickly resume

**Acceptance Criteria:**
- [ ] Shows last 5 projects
- [ ] Click to select

### US-199: Resume Screen
**As a** user
**I want** a resume screen
**So that** I can continue work

**Acceptance Criteria:**
- [ ] Shows last state
- [ ] Shows cost and duration
- [ ] Resume/Cancel buttons

### US-200: Resume State Display
**As a** user
**I want** to see last state
**So that** I know where I left off

**Acceptance Criteria:**
- [ ] Current phase name
- [ ] Current epic if Phase 4
- [ ] Progress percentage

### US-201: Resume Cost Display
**As a** user
**I want** to see costs
**So that** I know spending

**Acceptance Criteria:**
- [ ] Previous sessions cost
- [ ] Calculated from ccusage

### US-202: Resume Action
**As a** user
**I want** to resume
**So that** work continues

**Acceptance Criteria:**
- [ ] Click Resume button
- [ ] Recalculates costs
- [ ] Spawns worker

### US-203: Dashboard Screen
**As a** user
**I want** a dashboard screen
**So that** I see pipeline status

**Acceptance Criteria:**
- [ ] Project info
- [ ] Current phase
- [ ] Progress bar
- [ ] Todo list
- [ ] Epic list
- [ ] Cost/duration

### US-204: Dashboard Project Display
**As a** user
**I want** to see project info
**So that** I know what I'm working on

**Acceptance Criteria:**
- [ ] Project name
- [ ] Pipeline type
- [ ] Mode

### US-205: Dashboard Phase Display
**As a** user
**I want** to see current phase
**So that** I know progress

**Acceptance Criteria:**
- [ ] Phase number
- [ ] Phase name
- [ ] Phase status

### US-206: Dashboard Progress Bar
**As a** user
**I want** to see progress bar
**So that** I see completion

**Acceptance Criteria:**
- [ ] Visual progress bar
- [ ] Percentage number
- [ ] Updates in real-time

### US-207: Dashboard Todo List
**As a** user
**I want** to see todos
**So that** I see current tasks

**Acceptance Criteria:**
- [ ] List of todos
- [ ] Status icons
- [ ] Current task highlighted

### US-208: Dashboard Epic List
**As a** user
**I want** to see epics
**So that** I see epic progress

**Acceptance Criteria:**
- [ ] Only shows in Phase 4
- [ ] List of epics
- [ ] Status icons

### US-209: Dashboard Cost Display
**As a** user
**I want** to see cost
**So that** I track spending

**Acceptance Criteria:**
- [ ] Shows current cost
- [ ] Formatted as currency

### US-210: Dashboard Duration Display
**As a** user
**I want** to see duration
**So that** I track time

**Acceptance Criteria:**
- [ ] Shows elapsed time
- [ ] Updates every second
- [ ] Formatted as hh:mm:ss

### US-211: Dashboard Worker Status
**As a** user
**I want** to see worker status
**So that** I know worker is running

**Acceptance Criteria:**
- [ ] Shows "Running" or "Stopped"
- [ ] Shows PID
- [ ] Shows session ID

### US-212: Pause Functionality
**As a** user
**I want** to pause
**So that** I can take a break

**Acceptance Criteria:**
- [ ] Press 'p' to pause
- [ ] State saved
- [ ] Shows paused indicator

### US-213: Resume Functionality
**As a** user
**I want** to resume after pause
**So that** work continues

**Acceptance Criteria:**
- [ ] Press 'r' when paused
- [ ] Spawns new worker if needed

### US-214: Focus Worker Window
**As a** user
**I want** to focus worker window
**So that** I can see Claude output

**Acceptance Criteria:**
- [ ] Press 'w' to focus
- [ ] Brings Windows Terminal to front

### US-215: Manual Advance
**As a** user
**I want** to manually advance phase
**So that** I can skip stuck phases

**Acceptance Criteria:**
- [ ] Press 'a' to advance
- [ ] Confirmation required

### US-216: Quit Functionality
**As a** user
**I want** to quit
**So that** I can exit

**Acceptance Criteria:**
- [ ] Press 'q' to quit
- [ ] Confirmation if running
- [ ] Saves state

### US-217: Complete Screen
**As a** user
**I want** a complete screen
**So that** I see success

**Acceptance Criteria:**
- [ ] Shows success message
- [ ] Shows summary
- [ ] New/Exit buttons

### US-218: Complete Summary
**As a** user
**I want** to see summary
**So that** I know what was done

**Acceptance Criteria:**
- [ ] Phases completed
- [ ] Epics completed
- [ ] Tests passing
- [ ] Total cost
- [ ] Total duration

### US-219: Help Overlay
**As a** user
**I want** help overlay
**So that** I see keyboard shortcuts

**Acceptance Criteria:**
- [ ] Press '?' to show
- [ ] Shows all shortcuts
- [ ] Esc to close

### US-220: Error Dialog
**As a** user
**I want** error dialogs
**So that** I see errors

**Acceptance Criteria:**
- [ ] Shows error message
- [ ] Recovery options

### US-221: Loading States
**As a** user
**I want** loading indicators
**So that** I know things are working

**Acceptance Criteria:**
- [ ] Spinner on loading
- [ ] Message explaining wait

### US-222: Status Bar
**As a** user
**I want** a status bar
**So that** I see key info

**Acceptance Criteria:**
- [ ] Shows at bottom
- [ ] Key shortcuts hint

### US-223: Notification Toast
**As a** user
**I want** notifications
**So that** I see events

**Acceptance Criteria:**
- [ ] Shows briefly
- [ ] Auto-dismisses

### US-224: Keyboard Focus Indicator
**As a** user
**I want** focus indicators
**So that** I see where I am

**Acceptance Criteria:**
- [ ] Current element highlighted

### US-225: Screen Transitions
**As a** user
**I want** smooth transitions
**So that** navigation feels good

**Acceptance Criteria:**
- [ ] Clear screen changes
- [ ] No flicker

---

## Summary

| Epic | Stories | Cumulative |
|------|---------|------------|
| 1 | 25 | 25 |
| 2 | 30 | 55 |
| 3 | 35 | 90 |
| 4 | 25 | 115 |
| 5 | 25 | 140 |
| 6 | 20 | 160 |
| 7 | 30 | 190 |
| 8 | 35 | 225 |

**Total: 225 User Stories**

---

## Key Changes from v6 Architecture

1. **Removed**: Split-pane view with embedded worker output
2. **Removed**: PTY management in dashboard
3. **Added**: Windows Terminal spawning (wt.exe)
4. **Added**: File-based worker communication
5. **Added**: Worker window focus functionality
6. **Simplified**: Dashboard is monitor-only, no embedded terminal
