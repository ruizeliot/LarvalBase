# Codebase Structure

**Analysis Date:** 2026-01-26

## Directory Layout

```
Pipeline-Office/
├── lib/                          # Core orchestration modules (v11.0)
│   ├── orchestrator/             # Main orchestrator: events, state machine, handlers
│   ├── manifest/                 # Manifest schema, validation, persistence
│   ├── process/                  # Process spawning, PID tracking, message injection
│   ├── dashboard/                # Terminal UI rendering, colors, layout
│   ├── composer/                 # CLAUDE.md template composition and validation
│   ├── analyzer/                 # Post-phase metrics extraction and analysis
│   ├── rating/                   # Phase feedback collection
│   ├── hooks/                    # Git hooks and validation scripts
│   ├── templates/                # CLAUDE.md templates for phases
│   ├── dashboard-runner-v11.cjs  # Standalone dashboard entry point
│   ├── dashboard-v2.cjs          # Legacy dashboard (v2)
│   ├── dashboard-v3.cjs          # Current dashboard (v3)
│   ├── demo-animation.cjs        # Animation demo for UI testing
│   ├── animation-player.cjs      # Animation playback engine
│   ├── obs-recorder.cjs          # OBS integration for recording pipeline runs
│   ├── spawn-*.ps1               # PowerShell scripts for spawning processes
│   ├── kill-*.ps1                # PowerShell scripts for killing processes
│   ├── inject-*.ps1              # PowerShell scripts for message injection
│   └── analyze-*.cjs             # Analysis and reporting scripts
├── live-canvas-mcp/              # Live Canvas MCP (visualization server)
│   ├── src/
│   │   ├── index.ts              # Main MCP entry point
│   │   ├── tools/                # MCP tools: canvas, diagram, notes
│   │   ├── server/               # HTTP/WebSocket servers for viewer
│   │   └── persistence/          # File storage for canvas state
│   ├── viewer/                   # React viewer for canvas visualization
│   └── dist/                     # Compiled MCP bundle
├── docs/                         # Documentation
│   ├── architecture-documentation/  # Detailed architecture docs
│   ├── plans/                    # Phase plans and implementation specs
│   ├── analysis/                 # Analysis reports and findings
│   └── brainstorm-notes.md       # Template for project brainstorming
├── archive/                      # Legacy v6.x-v8.x code (reference only)
│   └── 2025-12-09-cleanup/       # Historical cleanup snapshot
├── .planning/                    # GSD codebase mapper outputs
│   └── codebase/                 # Architecture documentation
├── commands/                     # Test/reference command files
├── package.json                  # Node.js configuration (v11.0.0)
├── README.md                     # Project overview and quick start
├── CLAUDE.md                     # Pipeline-Office documentation
└── [test directories]            # Temporary test/development dirs (tmp*, test-*)
```

## Directory Purposes

**`lib/orchestrator/`:**
- Purpose: Core orchestrator logic - state machine, event system, event handlers
- Contains: Runner, state machine, events, handlers for startup/phase-transition/worker-monitoring/errors/shutdown
- Tests: `__tests__/` subdirectory with orchestrator unit tests
- Key files: `runner.cjs` (main orchestrator loop), `index.cjs` (public API), `state-machine.cjs` (state transitions)

**`lib/manifest/`:**
- Purpose: Manifest schema definition, validation, and persistence
- Contains: JSON schema, validation rules, read/write operations, migrations
- Stores: Project metadata, phase states, worker info, cost/token tracking
- Key files: `schema.cjs` (structure), `validate.cjs` (rules), `read-write.cjs` (I/O), `migrations.cjs` (version upgrades)

**`lib/process/`:**
- Purpose: Windows process lifecycle management (spawn, kill, PID tracking, message injection)
- Contains: Spawn scripts, kill functions, PID file management, PowerShell integration
- Spawns: Worker (conhost), Dashboard (Node.js), Supervisor (Claude)
- Key files: `spawn.cjs` (process creation), `kill.cjs` (termination), `pid.cjs` (tracking), `inject.cjs` (message sending)

**`lib/dashboard/`:**
- Purpose: Terminal UI rendering for real-time pipeline progress
- Contains: Render functions, layout calculations, color definitions, keyboard input handling
- Features: Expandable sections, progress bars, cost/duration display, responsive terminal sizing
- Key files: `render.cjs` (drawing), `layout.cjs` (spacing/sizing), `colors.cjs` (styling), `input.cjs` (keyboard)

**`lib/composer/`:**
- Purpose: Generate phase-specific CLAUDE.md files from templates with context injection
- Contains: Template loading, placeholder replacement, validation, output writing
- Templates: Loaded from `lib/templates/` and populated with project context
- Key files: `compose.cjs` (composition logic), `validate.cjs` (validation rules), `index.cjs` (public API)

**`lib/analyzer/`:**
- Purpose: Extract and analyze post-phase metrics (tokens, cost, performance)
- Contains: Dataset creation, metric extraction, correlation analysis, prediction
- Output: Metadata appended to manifest for dashboard display
- Key files: `extract.cjs` (metric parsing), `correlate.cjs` (relationship finding), `dataset.cjs` (data structures)

**`lib/rating/`:**
- Purpose: Collect structured feedback on completed phases
- Contains: Prompt templates, response schema, persistence
- Output: Ratings saved to manifest for historical analysis
- Key files: `prompt.cjs` (question generation), `save.cjs` (persistence), `schema.cjs` (response structure)

**`lib/hooks/`:**
- Purpose: Git hooks and pre-commit validation
- Contains: Hook scripts for enforcing rules before commits

**`lib/templates/`:**
- Purpose: Source CLAUDE.md templates for different phases and contexts
- Contains: Template markdown with placeholder patterns (e.g., `[PLACEHOLDER_NAME]`)
- Usage: Loaded by composer, populated with project context, written to `.claude/CLAUDE.md`

**`live-canvas-mcp/`:**
- Purpose: Visualization MCP server for live whiteboarding/diagrams during development
- Contains: TypeScript source, compiled MCP bundle, React viewer component
- Features: Canvas drawing, diagram creation, persistent storage, HTTP/WebSocket servers
- Entry points: `src/index.ts` (MCP server), `viewer/` (React UI)

**`docs/`:**
- Purpose: Design, planning, and analysis documentation
- Contains: Architecture plans, phase specifications, analysis reports
- Key directories: `plans/` (implementation specs), `architecture-documentation/` (design docs), `analysis/` (findings)

**`archive/`:**
- Purpose: Reference code from previous Pipeline versions (v6.x-v8.x)
- Status: Not used in v11.0 - kept for historical reference and pattern lookup
- Usage: Avoid - use current modules in `lib/` instead

## Key File Locations

**Entry Points:**

- `lib/orchestrator/runner.cjs`: OrchestratorRunner class instantiated by `/orchestrator` slash command
- `lib/orchestrator/index.cjs`: Public API exporting runner, events, state constants
- `lib/dashboard-runner-v11.cjs`: Standalone dashboard (can run without orchestrator)
- `~/.claude/commands/orchestrator.md`: Slash command definition (external to this repo)

**Configuration:**

- `package.json`: Node.js config, Jest test config, npm scripts
- `lib/orchestrator/runner.cjs` (lines 35-43): DEFAULT_CONFIG object with heartbeat/check intervals
- Project manifest: `.pipeline/manifest.json` (created per project, not checked in)

**Core Logic:**

- `lib/orchestrator/runner.cjs`: Main event loop and lifecycle
- `lib/orchestrator/state-machine.cjs`: State transition table
- `lib/orchestrator/events.cjs`: Event definitions and EventEmitter
- `lib/orchestrator/handlers/`: Individual handler modules (startup, phase-transition, worker-monitor, error, shutdown)
- `lib/manifest/index.cjs`: Public manifest API
- `lib/process/index.cjs`: Public process manager API

**Testing:**

- `lib/orchestrator/__tests__/orchestrator.test.cjs`: Main orchestrator tests
- `lib/manifest/__tests__/`: Manifest validation and read/write tests
- `lib/analyzer/__tests__/analyzer.test.cjs`: Analyzer tests
- `lib/composer/__tests__/composer.test.cjs`: Composer tests
- `package.json` scripts: `test`, `test:watch`, `test:coverage`

## Naming Conventions

**Files:**

- `.cjs`: CommonJS files (server/CLI code)
- `.ts`: TypeScript files (live-canvas-mcp only)
- `.md`: Markdown documentation
- `.ps1`: PowerShell scripts (Windows process management)
- `index.cjs`: Public module API (exports)
- `*-handler.cjs`: Event handler implementations
- `*-manager.cjs`: Resource manager implementations
- `*.test.cjs`: Jest test files

**Directories:**

- `lib/`: Core orchestration logic (v11.0)
- `src/`: TypeScript source code (live-canvas-mcp)
- `docs/`: Documentation and planning
- `.pipeline/`: Per-project runtime files (manifest, PIDs, logs)
- `.claude/`: Per-project Claude files (CLAUDE.md, todos)
- `__tests__/`: Jest test directories

**Modules:**

- PascalCase for classes: `OrchestratorRunner`, `EventEmitter`, `StateMachine`, `WorkerMonitor`
- camelCase for functions: `createDashboard()`, `spawnWorker()`, `updateManifest()`
- UPPER_CASE for constants: `EVENTS`, `STATES`, `DEFAULT_CONFIG`

## Where to Add New Code

**New Feature / Component:**

1. **If orchestrator-level feature** (e.g., new state, event type):
   - Add event to `lib/orchestrator/events.cjs`
   - Add state to `lib/orchestrator/state-machine.cjs`
   - Create handler: `lib/orchestrator/handlers/[feature-name].cjs`
   - Register handler in `lib/orchestrator/runner.cjs` setupEventListeners()
   - Test in `lib/orchestrator/__tests__/[feature-name].test.cjs`

2. **If manifest operation** (e.g., new field, validation rule):
   - Update schema in `lib/manifest/schema.cjs`
   - Add validation in `lib/manifest/validate.cjs`
   - Add migration in `lib/manifest/migrations.cjs`
   - Add API function in `lib/manifest/index.cjs`
   - Test in `lib/manifest/__tests__/[feature-name].test.cjs`

3. **If process management** (e.g., new spawn type, kill strategy):
   - Add function to `lib/process/[subsystem].cjs` (spawn/kill/pid/inject)
   - Add public API in `lib/process/index.cjs`
   - Test in `lib/process/__tests__/[subsystem].test.cjs`

4. **If dashboard feature** (e.g., new section, interaction):
   - Add rendering in `lib/dashboard/render.cjs`
   - Add layout in `lib/dashboard/layout.cjs`
   - Add colors/symbols in `lib/dashboard/colors.cjs`
   - Add input handler in `lib/dashboard/input.cjs`
   - Test in `lib/dashboard/__tests__/[feature-name].test.cjs`

5. **If analysis feature**:
   - Add extraction in `lib/analyzer/extract.cjs`
   - Add correlation in `lib/analyzer/correlate.cjs`
   - Add prediction in `lib/analyzer/predict.cjs`
   - Public API in `lib/analyzer/index.cjs`

**New Phase/Template:**

1. Create template: `lib/templates/phase-[N]-[stack].md`
2. Define placeholders following pattern: `[PLACEHOLDER_NAME]`
3. Add placeholder list to `lib/composer/compose.cjs`
4. Register template in composer's `listTemplates()`
5. Test via `lib/composer/__tests__/[phase].test.cjs`

**New Test:**

1. Create file: `lib/[module]/__tests__/[feature].test.cjs`
2. Import test utilities from `package.json` jest config
3. Run: `npm test` or `npm run test:watch`
4. Coverage: `npm run test:coverage`

## Special Directories

**`.pipeline/` (per project, runtime):**
- Purpose: Runtime state and metadata
- Generated: Yes (created by orchestrator)
- Committed: No (.gitignore)
- Contains:
  - `manifest.json`: Pipeline state (main state file)
  - `pids/`: PID tracking files for orchestrator, worker, dashboard
  - `dashboard.cjs`: Dashboard script copy for project
  - Logs and temporary files during execution

**`.claude/` (per project, runtime):**
- Purpose: Claude-specific context and progress tracking
- Generated: Yes (created by composer and workers)
- Committed: No (.gitignore)
- Contains:
  - `CLAUDE.md`: Phase-specific rules and tasks (injected by composer)
  - `todos.json`: Task progress tracking (updated by workers)
  - `heartbeat` file: Timestamp of last successful message (updated by dashboard)

**`archive/` (checked in, reference only):**
- Purpose: Historical code snapshots for reference
- Contains: Pipeline v6.x, v7.x, v8.x implementations
- Status: Deprecated - do NOT use for current development
- Usage: Consult for design patterns only, copy code to current structure if needed

**`docs/plans/` (checked in, persistent):**
- Purpose: Design and implementation specifications
- Contains: Phase plans, technical specs, user story definitions
- Per-project files: Created during Phase 1/2 and stored here

**`live-canvas-mcp/` (checked in, active):**
- Purpose: Visualization tool for whiteboarding/diagrams
- Separate repo integrated as subdirectory
- TypeScript source + compiled MCP + React viewer
- Can run independently or via MCP integration

---

*Structure analysis: 2026-01-26*
