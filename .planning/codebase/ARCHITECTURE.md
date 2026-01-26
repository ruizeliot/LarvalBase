# Architecture

**Analysis Date:** 2026-01-26

## Pattern Overview

**Overall:** Distributed event-driven orchestration with state machine coordination

**Key Characteristics:**
- Event-based communication between orchestrator, dashboard, and workers
- Centralized state machine managing phase lifecycle and transitions
- Modular subsystems (manifest, process manager, composer, analyzer) with clean API boundaries
- Heartbeat monitoring for worker health and progress tracking
- Manifest-driven state persistence enabling recovery and auditing

## Layers

**Orchestrator Core (`lib/orchestrator/`):**
- Purpose: Supervises entire pipeline lifecycle, coordinates all components, manages state transitions
- Location: `lib/orchestrator/runner.cjs`, `lib/orchestrator/index.cjs`
- Contains: Event emitter, state machine, event handlers, worker monitor, error context
- Depends on: Manifest module, process manager, dashboard, composer, analyzer, rating, supervisor checker
- Used by: Slash command entry point (external)
- Responsibilities: Initialize project, spawn processes, monitor heartbeat/todos, detect phase completion, transition phases, collect ratings

**State Management (`lib/orchestrator/state-machine.cjs`):**
- Purpose: Pure state transition logic, defines valid orchestrator states and transitions
- Location: `lib/orchestrator/state-machine.cjs`
- States: INIT → VALIDATING → ASKING_QUESTIONS → CREATING_MANIFEST → SPAWNING_DASHBOARD → SPAWNING_WORKER → SPAWNING_SUPERVISOR → MONITORING → PHASE_COMPLETE → (repeat or PIPELINE_COMPLETE)
- Handles: INIT, VALIDATING, ASKING_QUESTIONS, CREATING_MANIFEST, SPAWNING_DASHBOARD, SPAWNING_WORKER, SPAWNING_SUPERVISOR, MONITORING, PAUSED, PHASE_COMPLETE, TRANSITIONING, PIPELINE_COMPLETE, COLLECTING_RATINGS, ANALYZING, RECOVERING, ERROR, DONE
- Recovery states: RECOVERING for temporary failures, ERROR for fatal conditions

**Event System (`lib/orchestrator/events.cjs`):**
- Purpose: Centralized event definitions and EventEmitter for pub/sub communication
- Location: `lib/orchestrator/events.cjs`
- Event types: START, SHUTDOWN, FILES_VALID, FILES_INVALID, QUESTIONS_ANSWERED, MANIFEST_CREATED, DASHBOARD_READY, WORKER_READY, SUPERVISOR_READY, HEARTBEAT, TODO_UPDATE, PHASE_COMPLETE, PIPELINE_COMPLETE, ERROR, USER_* actions
- Pattern: Event emitter with wildcard listeners for history tracking
- Callbacks: Supervisor checks triggered on todo completion

**Event Handlers (`lib/orchestrator/handlers/`):**
- Purpose: Execute actions on state transitions
- Location: `lib/orchestrator/handlers/startup.cjs`, `phase-transition.cjs`, `worker-monitor.cjs`, `error-handler.cjs`, `shutdown.cjs`
- Responsibilities:
  - `startup.cjs`: Validate brainstorm files, collect user questions, create manifest
  - `phase-transition.cjs`: Handle phase completion detection, trigger next phase spawn
  - `worker-monitor.cjs`: Polling-based todo tracking, heartbeat health checks
  - `error-handler.cjs`: Error context collection and recovery strategies
  - `shutdown.cjs`: Cleanup processes, generate reports

**Manifest Layer (`lib/manifest/`):**
- Purpose: Schema-driven state persistence and validation
- Location: `lib/manifest/index.cjs` (public API), `schema.cjs`, `read-write.cjs`, `validate.cjs`, `migrations.cjs`
- Stores: Project metadata, stack type, phase status, epics, workers, cost tracking, heartbeat config
- Features: Atomic writes, automatic migrations, validation guards, backup before write
- Used by: Orchestrator for state snapshots, dashboard for rendering, workers for phase context

**Process Manager (`lib/process/`):**
- Purpose: Cross-platform process lifecycle management (spawn, kill, PID tracking, message injection)
- Location: `lib/process/index.cjs` (API), `spawn.cjs`, `kill.cjs`, `pid.cjs`, `inject.cjs`
- Spawns: Worker (conhost terminals), Dashboard (Node.js), Supervisor (Claude instance)
- Tracking: PID files in `.pipeline/pids/` directory, role-based identification
- Message injection: PowerShell-based console input for slash commands and heartbeats
- Platform: Windows-specific (conhost.exe required, WriteConsoleInput API for message injection)

**Dashboard (`lib/dashboard/`):**
- Purpose: Real-time terminal UI displaying pipeline progress
- Location: `lib/dashboard/index.cjs` (public API), `render.cjs`, `layout.cjs`, `colors.cjs`, `input.cjs`
- Features: Expandable sections (phases, epics, workers), cost/duration tracking, progress bars, terminal size detection
- Refresh rate: 1000ms (configurable via orchestrator options)
- Interaction: Keyboard input handling (pause, resume, quit), manifest polling
- Used by: Orchestrator spawns dashboard process, renders via Node.js

**CLAUDE.md Composer (`lib/composer/`):**
- Purpose: Template-based generation of phase-specific CLAUDE.md files with injected context
- Location: `lib/composer/index.cjs` (API), `compose.cjs`, `validate.cjs`
- Templates: Stored in project templates directory with placeholder patterns
- Output: `.claude/CLAUDE.md` per project with worker instructions, rules, phase-specific guidance
- Validation: Ensures all required sections present, no unreplaced placeholders

**Analyzer (`lib/analyzer/`):**
- Purpose: Post-phase analysis of performance metrics, token usage, cost breakdown
- Location: `lib/analyzer/index.cjs` (API), `dataset.cjs`, `extract.cjs`, `correlate.cjs`, `predict.cjs`
- Analysis types: Token extraction, cost correlation, performance prediction, meta-analysis

**Rating (`lib/rating/`):**
- Purpose: Collect structured feedback on completed phases
- Location: `lib/rating/index.cjs` (API), `prompt.cjs`, `save.cjs`, `schema.cjs`
- Collects: Satisfaction scores, feedback, pain points per phase

## Data Flow

**Startup Flow:**

1. User runs `/orchestrator` command in project directory
2. Orchestrator validates `docs/brainstorm-notes.md` and `docs/user-stories.md` exist
3. Orchestrator asks user: stack type, pipeline mode, user mode, step mode, starting phase
4. Manifest created in `.pipeline/manifest.json` with initial state
5. Dashboard spawned as separate Node.js process
6. Worker spawned in conhost terminal with phase-specific CLAUDE.md
7. All processes tracked via PID files in `.pipeline/pids/`
8. Orchestrator enters MONITORING state

**Phase Execution Flow:**

1. Orchestrator starts 2-3 second polling of worker todo file (`.claude/todos.json`)
2. Worker executes todos in sequence, updating status: pending → in_progress → completed
3. Supervisor checks completed todos against worker transcript (if enabled)
4. Dashboard polls manifest every 1 second, renders current state
5. Orchestrator detects all todos completed via todo polling
6. Orchestrator emits PHASE_COMPLETE event
7. State machine triggers phase transition
8. Current worker killed gracefully
9. Phase metrics extracted and saved to manifest
10. If phase is not final, new worker spawned for next phase
11. If final phase, analysis and ratings collected, pipeline marked COMPLETE

**Message Flow:**

```
Worker (in conhost)
    ↓ (updates)
.claude/todos.json
    ↓ (polling every 2-3 sec)
Orchestrator
    ↓ (emits events)
Event System
    ↓ (triggers handlers)
Handlers (startup, phase-transition, worker-monitor, error)
    ↓ (updates)
Manifest (.pipeline/manifest.json)
    ↓ (polling every 1 sec)
Dashboard (renders in separate terminal)
```

**Heartbeat System:**

- Dashboard sends heartbeat messages to orchestrator via WriteConsoleInput API
- Message format: `/heartbeat` sent to conhost stdin
- Orchestrator WorkerMonitor tracks consecutive heartbeat timeouts
- Timeout threshold: 5 misses (configurable) triggers HEARTBEAT_TIMEOUT event
- Recovery: Orchestrator can attempt restart or abort phase

**State Persistence:**

- Manifest saved atomically after every state change
- Version-based migrations ensure forward/backward compatibility
- Backup created before write to prevent data loss
- Read with fallback: if current manifest corrupted, load backup

## Key Abstractions

**EventEmitter:**
- Purpose: Publish-subscribe event system for decoupled communication
- Pattern: One-to-many listener registration with wildcard support
- Used for: Orchestrator ↔ State Machine ↔ Handlers
- Location: `lib/orchestrator/events.cjs`

**StateMachine:**
- Purpose: Pure function state transition logic
- Pattern: Current state + event → next state (referential transparency)
- Configuration: Transition table defines valid paths, rejects invalid transitions
- Used by: Orchestrator to track phase lifecycle
- Location: `lib/orchestrator/state-machine.cjs`

**WorkerMonitor:**
- Purpose: Health tracking and progress detection via file polling
- Pattern: Interval-based polling of `.claude/todos.json`, detects completion
- Configuration: Todo check interval, heartbeat interval, timeout thresholds
- Used by: Orchestrator to detect phase completion and worker health
- Location: `lib/orchestrator/handlers/worker-monitor.cjs`

**ProcessManager:**
- Purpose: Abstract away Windows process lifecycle details
- Pattern: PID-based tracking with role identification, PowerShell for Win32 integration
- API: spawn*, kill*, inject* methods with success/failure callbacks
- Used by: Orchestrator to manage worker, dashboard, supervisor processes
- Location: `lib/process/index.cjs`

**Manifest:**
- Purpose: Single source of truth for pipeline state
- Pattern: Schema-validated JSON with atomic writes and migrations
- API: read(), write(), updatePhase(), updateWorker() with validation
- Used by: All components for state queries and updates
- Location: `lib/manifest/index.cjs`

## Entry Points

**Slash Command (`/orchestrator`):**
- Location: `~/.claude/commands/orchestrator.md` (Claude system integration)
- Invokes: `lib/orchestrator/runner.cjs` → OrchestratorRunner class
- Responsibilities: Parse project path, initialize runner, start event loop
- Returns: Pipeline completion status/manifest

**Dashboard Standalone:**
- Location: `lib/dashboard-runner-v11.cjs`
- Purpose: Run dashboard independently for monitoring without orchestrator
- Invokes: `lib/dashboard/index.cjs` → createDashboard()
- Responsibilities: Read manifest, render, accept keyboard input

**Worker Phase Commands:**
- Location: `~/.claude/commands/` with versions per phase (e.g., `/1-new-pipeline-desktop-v11.0`)
- Invokes: Phase-specific logic injected via composed CLAUDE.md
- Responsibilities: Execute todos, update todo file, emit completion signal
- Input: `.claude/CLAUDE.md` provides rules and tasks
- Output: Updated `.claude/todos.json`, artifacts in project

## Error Handling

**Strategy:** Layered recovery with escalation

**Patterns:**
- Recoverable: HEARTBEAT_TIMEOUT, WORKER_FAILED → RECOVERING state → retry spawn
- Fatal: FILE_INVALID, MANIFEST_CORRUPTION → ERROR state → abort pipeline
- Graceful shutdown: Clean process termination, manifest finalization
- Error context: ErrorContext class captures stack traces, timestamps, recovery attempts

**Error Handlers (`lib/orchestrator/handlers/error-handler.cjs`):**
- Catches: Uncaught exceptions from runners and handlers
- Actions: Log error, emit ERROR event, optionally transition to RECOVERING
- Recovery strategy: Check process health, retry spawn, escalate to user if max retries exceeded

## Cross-Cutting Concerns

**Logging:**
- Pattern: Console.log with `[COMPONENT]` prefix (e.g., `[ORCHESTRATOR]`, `[DASHBOARD]`, `[SUPERVISOR]`)
- Levels: Info (default), no explicit logging framework (suitable for single-machine orchestration)
- Stdout: Goes to terminal of running process (orchestrator in main terminal, worker in conhost, dashboard in separate terminal)

**Validation:**
- Manifest: JSON schema validation on read/write via `lib/manifest/validate.cjs`
- Brainstorm files: Path existence checks in startup handler
- Phase transitions: `validatePhaseCanStart()` prevents invalid phase skips
- File composition: `lib/composer/validate.cjs` ensures no placeholder leakage

**Authentication:**
- Not needed: Orchestrator, workers, dashboard all run in single user session
- Claude API: Handled by Claude CLI (external to Pipeline-Office)
- ProcessManager: PowerShell execution uses current user credentials

**State Consistency:**
- Atomic manifest writes: Temp file + rename pattern prevents partial updates
- Version migrations: `lib/manifest/migrations.cjs` handles schema evolution
- Recovery: Manifest backup used if corruption detected
- Checkpoints: Phase boundaries ensure clear state snapshots

---

*Architecture analysis: 2026-01-26*
